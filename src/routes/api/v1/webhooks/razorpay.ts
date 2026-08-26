import { createFileRoute } from "@tanstack/react-router";
import { ingestWebhook } from "@/lib/webhooks/webhooks.server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay.server";
import { logger } from "@/lib/observability/logger.server";
import { registerWebhookHandler } from "@/lib/webhooks/webhooks.server";
import { enqueue } from "@/lib/queue/queue.server";
import { recordAudit } from "@/lib/services/audit.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validatePaymentTransition } from "@/lib/payments/payments";
import { validateBookingTransition } from "@/lib/booking/booking";
import type { RazorpayPayment, RazorpayOrder } from "@/lib/payments/razorpay.server";

let handlersRegistered = false;

function registerRazorpayHandler(): void {
  if (handlersRegistered) return;
  handlersRegistered = true;

  registerWebhookHandler("razorpay", async ({ eventType, payload }) => {
    const log = logger.channel("webhook");
    const event = payload as { payment?: RazorpayPayment; order?: RazorpayOrder };

    try {
      // Handle payment events
      if (
        eventType === "payment.authorized" ||
        eventType === "payment.captured" ||
        eventType === "payment.failed"
      ) {
        const payment = event.payment;
        if (!payment) return { ok: false, reason: "Missing payment in payload" };

        // Find booking by Razorpay order ID
        const { data: booking } = await supabaseAdmin
          .from("project_bookings")
          .select("*")
          .eq("razorpay_order_id", payment.order_id)
          .maybeSingle();

        if (!booking) {
          log.warn("No booking found for order", { orderId: payment.order_id });
          return { ok: false, reason: "Booking not found" };
        }

        // Reconcile payment amount
        if (
          booking.token_amount_cents !== payment.amount ||
          booking.currency !== payment.currency
        ) {
          await supabaseAdmin
            .from("project_bookings")
            .update({
              payment_status: "payment_review_required",
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking.id);

          await enqueue("notification", {
            userId: "admin",
            title: "Payment Amount Mismatch",
            description: `Booking ${booking.booking_number}: expected ${booking.currency} ${booking.token_amount_cents / 100}, received ${payment.currency} ${payment.amount / 100}`,
            type: "alert",
          });

          return { ok: true, reason: "Amount mismatch flagged for review" };
        }

        // Update payment record
        const newPaymentStatus = mapRazorpayStatus(payment.status);
        const currentPaymentStatus =
          booking.payment_status as import("@/lib/payments/payments").PaymentStatus;
        const transition = validatePaymentTransition(currentPaymentStatus, newPaymentStatus);
        if (!transition.ok) {
          log.warn("Invalid payment transition", {
            from: booking.payment_status,
            to: newPaymentStatus,
          });
        }

        const { error: paymentError } = await supabaseAdmin.from("payments").upsert(
          {
            project_id: booking.project_id,
            client_id: booking.user_id ?? "",
            gateway: "razorpay",
            order_id: payment.order_id,
            payment_id: payment.id,
            currency: payment.currency,
            amount_cents: payment.amount,
            is_reservation: true,
            status: newPaymentStatus,
            webhook_verified: true,
            metadata: {
              razorpay_event: eventType,
              razorpay_payment: JSON.parse(JSON.stringify(payment)),
            },
          },
          { onConflict: "gateway,order_id" },
        );

        if (paymentError) throw new Error(`Payment upsert failed: ${paymentError.message}`);

        // If payment captured/paid, update booking
        if (["captured", "paid"].includes(payment.status)) {
          const { error: bookingError } = await supabaseAdmin
            .from("project_bookings")
            .update({
              status: "token_paid",
              payment_status: newPaymentStatus,
              razorpay_payment_id: payment.id,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking.id);

          if (bookingError) throw new Error(`Booking update failed: ${bookingError.message}`);

          // Record status history
          await supabaseAdmin.from("booking_status_history").insert({
            booking_id: booking.id,
            from_status: booking.status,
            to_status: "token_paid",
            reason: "Token payment captured via webhook",
            metadata: { razorpay_payment_id: payment.id },
          });

          // Create project if not exists
          if (!booking.project_id) {
            await createProjectFromBooking(booking, payment.id);
          } else {
            // Activate existing project
            await activateProject(booking.project_id);
          }

          // Queue emails
          await enqueue("email", {
            template: "booking.confirmed",
            to: booking.customer_email,
            payload: {
              bookingNumber: booking.booking_number,
              package: booking.package,
              tokenAmount: booking.token_amount_cents / 100,
              currency: booking.currency,
              projectName: booking.project_id ? "Existing project" : "New project",
            },
            userId: booking.user_id,
            projectId: booking.project_id,
          });

          await enqueue("email", {
            template: "booking.admin_notification",
            to: process.env.ADMIN_EMAIL ?? "admin@athros.dev",
            payload: {
              bookingNumber: booking.booking_number,
              customerName: booking.customer_name,
              customerEmail: booking.customer_email,
              customerPhone: booking.customer_phone,
              company: booking.company_name,
              package: booking.package,
              region: booking.region,
              currency: booking.currency,
              fullAmount: booking.full_amount_cents / 100,
              tokenAmount: booking.token_amount_cents / 100,
              paymentStatus: newPaymentStatus,
              razorpayOrderId: payment.order_id,
              razorpayPaymentId: payment.id,
              projectId: booking.project_id,
            },
            type: "alert",
          });
        }

        return { ok: true };
      }

      // Handle order.paid event
      if (eventType === "order.paid") {
        const order = event.order;
        if (!order) return { ok: false, reason: "Missing order in payload" };
        // Payment captured will also come through payment.captured
        return { ok: true };
      }

      return { ok: true };
    } catch (error) {
      log.error("Razorpay webhook handler error", error);
      return { ok: false, reason: error instanceof Error ? error.message : "Handler error" };
    }
  });
}

function mapRazorpayStatus(status: string) {
  switch (status) {
    case "created":
      return "created";
    case "authorized":
      return "authorized";
    case "captured":
      return "captured";
    case "paid":
      return "paid";
    case "failed":
      return "failed";
    case "refunded":
      return "refunded";
    default:
      return "pending";
  }
}

async function createProjectFromBooking(
  booking: {
    id: string;
    user_id: string | null;
    company_name: string | null;
    customer_name: string;
    project_summary: string | null;
    package: "mvp" | "production_ready" | "enterprise";
    region: string;
    currency: string;
  },
  paymentId: string,
) {
  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .insert({
      client_id: booking.user_id ?? "",
      name: `${booking.company_name || booking.customer_name}'s Project`,
      summary: booking.project_summary,
      package: booking.package,
      region: booking.region,
      currency: booking.currency,
      status: "discovery",
      priority: "medium",
      reservation_paid: true,
      platforms: [],
      progress: 5,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Project creation failed: ${error.message}`);

  // Update booking with project_id
  await supabaseAdmin
    .from("project_bookings")
    .update({ project_id: project.id, updated_at: new Date().toISOString() })
    .eq("id", booking.id);

  // Update payment with project_id
  await supabaseAdmin
    .from("payments")
    .update({ project_id: project.id })
    .eq("gateway", "razorpay")
    .eq("payment_id", paymentId);

  // Record project status history
  await supabaseAdmin.from("project_status_history").insert({
    project_id: project.id,
    from_status: null,
    to_status: "discovery",
    owner_id: booking.user_id,
    note: "Project created after token payment",
    metadata: { booking_id: booking.id },
  });

  // Create initial audit event
  await recordAudit(
    supabaseAdmin,
    {
      userId: "system",
      email: null,
      roles: [],
      permissions: new Set(),
      isAdmin: true,
      ip: null,
      userAgent: null,
    },
    {
      action: "project.create",
      entity: "projects",
      entityId: project.id,
      newValue: { booking_id: booking.id, payment_id: paymentId },
    },
  );

  return project;
}

async function activateProject(projectId: string) {
  await supabaseAdmin
    .from("projects")
    .update({
      status: "discovery",
      reservation_paid: true,
      progress: 5,
      started_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  await supabaseAdmin.from("project_status_history").insert({
    project_id: projectId,
    from_status: "discovery",
    to_status: "discovery",
    note: "Token payment confirmed, project activated",
  });
}

/** Razorpay webhook: POST /api/v1/webhooks/razorpay */
export const Route = createFileRoute("/api/v1/webhooks/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        registerRazorpayHandler();

        const rawBody = await request.text();
        const signature = request.headers.get("x-razorpay-signature") ?? "";

        if (!verifyWebhookSignature(rawBody, signature)) {
          return new Response(
            JSON.stringify({ error: { code: "unauthorized", message: "Invalid signature" } }),
            { status: 401, headers: { "content-type": "application/json" } },
          );
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          return new Response(
            JSON.stringify({ error: { code: "bad_request", message: "Invalid JSON" } }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }

        const event = parsed as {
          event: string;
          payload: { payment?: { entity?: { id?: string } }; order?: { entity?: { id?: string } } };
        };
        const eventType = event.event;
        const externalId = `${eventType}:${event.payload?.payment?.entity?.id ?? event.payload?.order?.entity?.id ?? crypto.randomUUID()}`;

        const result = await ingestWebhook({
          provider: "razorpay",
          rawBody,
          headers: Object.fromEntries(request.headers),
          signatureVerified: true,
          eventType,
          externalId,
        });

        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
