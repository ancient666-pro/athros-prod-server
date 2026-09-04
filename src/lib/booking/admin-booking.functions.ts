import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();

export interface BookingServiceSnapshot {
  serviceId: string;
  serviceLabel: string;
  planId: string;
  planName: string;
  currency: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
  deliveryDuration: string;
  isRecurring: boolean;
  allocationHours: string | null;
}

export interface AdminBooking {
  id: string;
  booking_number: string;
  lead_id: string | null;
  project_id: string | null;
  user_id: string | null;
  package: string;
  region: string;
  currency: string;
  full_amount_cents: number;
  token_amount_cents: number;
  token_percentage: number;
  status: string;
  payment_status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  company_name: string | null;
  project_summary: string | null;
  estimated_requirements: string | null;
  preferred_contact_method: string | null;
  company_website: string | null;
  existing_app_url: string | null;
  reference_links: string[];
  /** Immutable snapshot of selected modular services at booking time. Empty array for single-package bookings. */
  selected_services: BookingServiceSnapshot[];
  expires_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminBookingsStats {
  total: number;
  draft: number;
  payment_pending: number;
  token_paid: number;
  under_review: number;
  approved: number;
  rejected: number;
  cancelled: number;
  expired: number;
}

export interface AdminBookingsResult {
  bookings: AdminBooking[];
  stats: AdminBookingsStats;
}

const bookingStatusEnum = z.enum([
  "draft",
  "payment_pending",
  "token_paid",
  "under_review",
  "approved",
  "rejected",
  "cancelled",
  "expired",
]);
const paymentStatusEnum = z.enum([
  "created",
  "checkout_pending",
  "pending",
  "authorized",
  "captured",
  "paid",
  "partially_refunded",
  "failed",
  "refunded",
  "cancelled",
  "payment_review_required",
]);
const packageEnum = z.enum(["mvp", "production_ready", "enterprise"]);

export const getAdminBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        filters: z
          .object({
            status: z.string().optional(),
            payment_status: z.string().optional(),
            package: z.string().optional(),
            region: z.string().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            search: z.string().optional(),
          })
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: context.userId });
    if (!isStaff) throw new Error("Forbidden");

    let query = supabase
      .from("project_bookings")
      .select("*")
      .order("created_at", { ascending: false });

    const f = data.filters;
    if (f?.status && bookingStatusEnum.safeParse(f.status).success)
      query = query.eq(
        "status",
        f.status as
          | "draft"
          | "payment_pending"
          | "token_paid"
          | "under_review"
          | "approved"
          | "rejected"
          | "cancelled"
          | "expired",
      );
    if (f?.payment_status && paymentStatusEnum.safeParse(f.payment_status).success)
      query = query.eq(
        "payment_status",
        f.payment_status as
          | "created"
          | "checkout_pending"
          | "pending"
          | "authorized"
          | "captured"
          | "paid"
          | "partially_refunded"
          | "failed"
          | "refunded"
          | "cancelled"
          | "payment_review_required",
      );
    if (f?.package && packageEnum.safeParse(f.package).success)
      query = query.eq("package", f.package as "mvp" | "production_ready" | "enterprise");
    if (f?.region) query = query.eq("region", f.region);
    if (f?.dateFrom) query = query.gte("created_at", f.dateFrom);
    if (f?.dateTo) query = query.lte("created_at", f.dateTo);
    if (f?.search) {
      const term = `%${f.search}%`;
      query = query.or(
        `booking_number.ilike.${term},customer_name.ilike.${term},customer_email.ilike.${term},company_name.ilike.${term}`,
      );
    }

    const [{ data: bookings }] = await Promise.all([query.limit(100)]);

    const bookingsArray = (bookings ?? []) as AdminBooking[];

    // Calculate stats
    const stats: AdminBookingsStats = {
      total: bookingsArray.length,
      draft: bookingsArray.filter((b) => b.status === "draft").length,
      payment_pending: bookingsArray.filter((b) => b.status === "payment_pending").length,
      token_paid: bookingsArray.filter((b) => b.status === "token_paid").length,
      under_review: bookingsArray.filter((b) => b.status === "under_review").length,
      approved: bookingsArray.filter((b) => b.status === "approved").length,
      rejected: bookingsArray.filter((b) => b.status === "rejected").length,
      cancelled: bookingsArray.filter((b) => b.status === "cancelled").length,
      expired: bookingsArray.filter((b) => b.status === "expired").length,
    };

    return { bookings: bookingsArray, stats } as AdminBookingsResult;
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid, status: bookingStatusEnum }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: context.userId });
    if (!isStaff) throw new Error("Forbidden");

    const { error } = await supabase
      .from("project_bookings")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    // Record status history
    await supabase.from("booking_status_history").insert({
      booking_id: data.id,
      to_status: data.status,
      changed_by: context.userId,
      reason: `Status changed by admin`,
    });

    return { ok: true as const };
  });
