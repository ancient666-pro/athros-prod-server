import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getPricingForBooking,
  validatePackageTier,
  fetchPayment,
} from "@/lib/payments/razorpay.server";
import { createRazorpayOrder } from "@/lib/payments/razorpay.server";
import { calculateTokenAmount, DEFAULT_TOKEN_PERCENTAGE } from "@/lib/booking/booking";
import { generateBookingNumber } from "@/lib/utils";
import { mapRazorpayStatus, reconcilePayment } from "@/lib/payments/razorpay.server";
import { validatePaymentTransition } from "@/lib/payments/payments";
import { validateBookingTransition } from "@/lib/booking/booking";
import { recordAudit } from "@/lib/services/audit.server";

const uuid = z.string().uuid();

const normalizeUrl = (val: unknown) => {
  if (typeof val !== "string" || !val.trim()) return undefined;
  const trimmed = val.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const optionalUrl = z.preprocess(normalizeUrl, z.string().url().max(300).optional());
const referenceLinks = z.preprocess((val) => {
  if (!Array.isArray(val)) return [];
  return val.map(normalizeUrl).filter((u): u is string => typeof u === "string");
}, z.array(z.string().url()).max(10).default([]));

const bookingInputSchema = z.object({
  package: z.enum(["mvp", "production_ready", "enterprise"]),
  region: z.string().trim().length(2),
  currency: z.string().trim().length(3),
  customer_name: z.string().trim().min(2).max(100),
  customer_email: z.string().email().max(255),
  customer_phone: z.string().trim().max(32).optional(),
  company_name: z.string().trim().max(120).optional(),
  project_summary: z.string().trim().max(2000).optional(),
  estimated_requirements: z.string().trim().max(2000).optional(),
  preferred_contact_method: z.string().trim().max(40).optional(),
  company_website: optionalUrl,
  existing_app_url: optionalUrl,
  reference_links: referenceLinks,
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

export interface BookingCheckoutResult {
  bookingId: string;
  bookingNumber: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amount: number;
  currency: string;
  booking: {
    package: string;
    tokenAmount: number;
    fullAmount: number;
    currency: string;
  };
}

/** Create a booking and Razorpay order for token payment. */
export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bookingInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Validate package
    if (!validatePackageTier(data.package)) {
      throw new Error("Invalid package tier");
    }

    // Get pricing for the package + currency
    const pricing = await getPricingForBooking(data.package, data.currency);
    if (!pricing) {
      throw new Error(`Pricing not available for ${data.package} in ${data.currency}`);
    }

    const fullAmountCents = pricing.amountCents;
    const tokenAmountCents = calculateTokenAmount(fullAmountCents, DEFAULT_TOKEN_PERCENTAGE);
    const tokenPercentage = DEFAULT_TOKEN_PERCENTAGE;

    // Generate booking number
    const bookingNumber = await generateBookingNumber();

    // Create or find lead
    let leadId: string | null = null;
    const { data: existingLead } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("email", data.customer_email.toLowerCase())
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
      await supabaseAdmin
        .from("leads")
        .update({
          package: data.package,
          country: data.region,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    } else {
      const { data: newLead, error: leadError } = await supabaseAdmin
        .from("leads")
        .insert({
          full_name: data.customer_name,
          company: data.company_name,
          email: data.customer_email.toLowerCase(),
          phone: data.customer_phone,
          package: data.package,
          country: data.region,
          source: "booking_form",
          status: "qualified",
        })
        .select("id")
        .single();
      if (leadError) throw new Error(`Lead creation failed: ${leadError.message}`);
      leadId = newLead.id;
    }

    // Create booking record
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("project_bookings")
      .insert({
        booking_number: bookingNumber,
        lead_id: leadId,
        package: data.package,
        region: data.region,
        currency: data.currency,
        full_amount_cents: fullAmountCents,
        token_amount_cents: tokenAmountCents,
        token_percentage: tokenPercentage,
        status: "payment_pending",
        payment_status: "checkout_pending",
        customer_name: data.customer_name,
        customer_email: data.customer_email.toLowerCase(),
        customer_phone: data.customer_phone,
        company_name: data.company_name,
        project_summary: data.project_summary,
        estimated_requirements: data.estimated_requirements,
        preferred_contact_method: data.preferred_contact_method,
        company_website: data.company_website,
        existing_app_url: data.existing_app_url,
        reference_links: data.reference_links,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (bookingError) throw new Error(`Booking creation failed: ${bookingError.message}`);

    // Create Razorpay order
    const receipt = `booking_${booking.id}`;
    const order = await createRazorpayOrder({
      amountCents: tokenAmountCents,
      currency: data.currency,
      receipt,
      notes: {
        booking_id: booking.id,
        package: data.package,
        region: data.region,
      },
    });

    // Update booking with Razorpay order ID
    await supabaseAdmin
      .from("project_bookings")
      .update({ razorpay_order_id: order.id, updated_at: new Date().toISOString() })
      .eq("id", booking.id);

    // Record status history
    await supabaseAdmin.from("booking_status_history").insert({
      booking_id: booking.id,
      from_status: "draft",
      to_status: "payment_pending",
      reason: "Booking created, awaiting token payment",
    });

    // Return safe checkout info (no secrets)
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) throw new Error("Razorpay key ID not configured");
    return {
      bookingId: booking.id,
      bookingNumber,
      razorpayOrderId: order.id,
      razorpayKeyId: keyId,
      amount: tokenAmountCents,
      currency: data.currency,
      booking: {
        package: data.package,
        tokenAmount: tokenAmountCents / 100,
        fullAmount: fullAmountCents / 100,
        currency: data.currency,
      },
    } as BookingCheckoutResult;
  });

/** Verify payment signature from client callback. */
const verifyPaymentSchema = z.object({
  bookingId: uuid,
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const verifyBookingPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => verifyPaymentSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyPaymentSignature } = await import("@/lib/payments/razorpay.server");
    const { mapRazorpayStatus, reconcilePayment } = await import("@/lib/payments/razorpay.server");
    const { validatePaymentTransition } = await import("@/lib/payments/payments");
    const { validateBookingTransition } = await import("@/lib/booking/booking");
    const { recordAudit } = await import("@/lib/services/audit.server");

    // Verify signature
    const valid = await verifyPaymentSignature({
      orderId: data.razorpayOrderId,
      paymentId: data.razorpayPaymentId,
      signature: data.razorpaySignature,
    });

    if (!valid) {
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
          action: "booking.payment.signature_invalid",
          entity: "project_bookings",
          entityId: data.bookingId,
          detail: {
            razorpayOrderId: data.razorpayOrderId,
            razorpayPaymentId: data.razorpayPaymentId,
          },
        },
      );
      throw new Error("Invalid payment signature");
    }

    // Fetch booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("project_bookings")
      .select("*")
      .eq("id", data.bookingId)
      .maybeSingle();

    if (bookingError || !booking) throw new Error("Booking not found");

    // Fetch payment from Razorpay to get full details
    const { fetchPayment } = await import("@/lib/payments/razorpay.server");
    const payment = await fetchPayment(data.razorpayPaymentId);

    // Reconcile
    const reconciliation = reconcilePayment(
      {
        tokenAmountCents: booking.token_amount_cents,
        currency: booking.currency,
        razorpayOrderId: booking.razorpay_order_id,
      },
      payment,
    );

    if (!reconciliation.ok) {
      await supabaseAdmin
        .from("project_bookings")
        .update({ payment_status: "payment_review_required", updated_at: new Date().toISOString() })
        .eq("id", booking.id);

      throw new Error(`Payment reconciliation failed: ${reconciliation.reason}`);
    }

    // Update payment record
    const newPaymentStatus = mapRazorpayStatus(payment.status);
    const currentPaymentStatus =
      booking.payment_status as import("@/lib/payments/payments").PaymentStatus;
    const paymentTransition = validatePaymentTransition(currentPaymentStatus, newPaymentStatus);
    if (!paymentTransition.ok) {
      throw new Error(`Invalid payment transition: ${paymentTransition.reason}`);
    }

    await supabaseAdmin.from("payments").upsert(
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
          verified_via: "client_callback",
          razorpay_payment: JSON.parse(JSON.stringify(payment)),
        },
      },
      { onConflict: "gateway,order_id" },
    );

    // If payment successful, update booking and activate project
    if (["captured", "paid"].includes(payment.status)) {
      const bookingTransition = validateBookingTransition(booking.status, "token_paid");
      if (!bookingTransition.ok) {
        throw new Error(`Invalid booking transition: ${bookingTransition.reason}`);
      }

      await supabaseAdmin
        .from("project_bookings")
        .update({
          status: "token_paid",
          payment_status: newPaymentStatus,
          razorpay_payment_id: payment.id,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      await supabaseAdmin.from("booking_status_history").insert({
        booking_id: booking.id,
        from_status: booking.status,
        to_status: "token_paid",
        reason: "Token payment verified via client callback",
        metadata: { razorpay_payment_id: payment.id },
      });

      // Create/activate project
      if (!booking.project_id) {
        const { data: project } = await supabaseAdmin
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

        if (project) {
          await supabaseAdmin
            .from("project_bookings")
            .update({ project_id: project.id })
            .eq("id", booking.id);

          await supabaseAdmin
            .from("payments")
            .update({ project_id: project.id })
            .eq("gateway", "razorpay")
            .eq("payment_id", payment.id);

          await supabaseAdmin.from("project_status_history").insert({
            project_id: project.id,
            from_status: null,
            to_status: "discovery",
            owner_id: booking.user_id,
            note: "Project created after token payment",
            metadata: { booking_id: booking.id },
          });
        }
      } else {
        await supabaseAdmin
          .from("projects")
          .update({
            status: "discovery",
            reservation_paid: true,
            progress: 5,
            started_at: new Date().toISOString(),
          })
          .eq("id", booking.project_id);
      }

      // Queue confirmation emails
      const { enqueue } = await import("@/lib/queue/queue.server");
      await enqueue("email", {
        template: "booking.confirmed",
        to: booking.customer_email,
        payload: {
          bookingNumber: booking.booking_number,
          package: booking.package,
          tokenAmount: booking.token_amount_cents / 100,
          currency: booking.currency,
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

    return { ok: true, bookingStatus: booking.status, paymentStatus: newPaymentStatus };
  });

/** Fetch booking by ID (for client dashboard). */
const getBookingSchema = z.object({ id: uuid });

export const getBooking = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => getBookingSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: booking, error } = await supabase
      .from("project_bookings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (error || !booking) throw new Error("Booking not found");
    return booking;
  });

/** Fetch booking by booking number (public). */
const getBookingByNumberSchema = z.object({ bookingNumber: z.string().min(1) });

export const getBookingByNumber = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => getBookingByNumberSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: booking, error } = await supabase
      .from("project_bookings")
      .select("*")
      .eq("booking_number", data.bookingNumber)
      .maybeSingle();

    if (error || !booking) throw new Error("Booking not found");
    return booking;
  });
