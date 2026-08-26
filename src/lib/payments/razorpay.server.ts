/**
 * Razorpay server-side payment service.
 * Never expose key secret to browser.
 */
import { hmacHex, safeEqual } from "@/lib/webhooks/webhooks.server";
import {
  assertMinorUnits,
  validatePaymentTransition,
  type PaymentStatus,
} from "@/lib/payments/payments";
import {
  type PackageTier,
  type RegionalPricing,
  getAuthoritativePricing,
  isPackageTier,
} from "@/lib/booking/booking";

function getCredentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured",
    );
  }

  const isTestKey = keyId.startsWith("rzp_test_");
  const isLiveKey = keyId.startsWith("rzp_live_");

  if (!isTestKey && !isLiveKey) {
    console.warn(
      "[Razorpay] Warning: RAZORPAY_KEY_ID does not match expected prefix (rzp_test_ or rzp_live_)",
    );
  }

  return { keyId, keySecret };
}

function getWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Razorpay webhook secret (RAZORPAY_WEBHOOK_SECRET) is not configured");
  }
  return secret;
}

function getAuthHeader(): string {
  const { keyId, keySecret } = getCredentials();
  const token =
    typeof Buffer !== "undefined"
      ? Buffer.from(`${keyId}:${keySecret}`).toString("base64")
      : btoa(`${keyId}:${keySecret}`);
  return `Basic ${token}`;
}

export interface RazorpayOrder {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: "created" | "attempted" | "paid";
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "failed" | "refunded";
  order_id: string;
  method: string;
  captured: boolean;
  description: string | null;
  email: string | null;
  contact: string | null;
  notes: Record<string, string>;
  fee: number;
  tax: number;
  error_code: string | null;
  error_description: string | null;
  created_at: number;
}

export interface CreateOrderInput {
  amountCents: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface WebhookEvent {
  event: string;
  payload: {
    payment?: RazorpayPayment;
    order?: RazorpayOrder;
    [key: string]: unknown;
  };
}

/** Create a Razorpay order for token payment. */
export async function createRazorpayOrder(input: CreateOrderInput): Promise<RazorpayOrder> {
  assertMinorUnits(input.amountCents);
  const authHeader = getAuthHeader();

  const body = new URLSearchParams({
    amount: String(input.amountCents),
    currency: input.currency.toUpperCase(),
    receipt: input.receipt,
    "notes[booking_id]": input.notes?.booking_id ?? "",
    "notes[package]": input.notes?.package ?? "",
    "notes[region]": input.notes?.region ?? "",
  });

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: authHeader,
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Razorpay order creation failed: ${error}`);
  }

  return response.json();
}

/** Verify Razorpay payment signature (client callback). */
export async function verifyPaymentSignature(input: VerifyPaymentInput): Promise<boolean> {
  const { keySecret } = getCredentials();
  const expected = await hmacHex(keySecret, `${input.orderId}|${input.paymentId}`);
  return safeEqual(expected, input.signature);
}

/** Verify Razorpay webhook signature. */
export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const webhookSecret = getWebhookSecret();
  const expected = await hmacHex(webhookSecret, rawBody);
  return safeEqual(expected, signature);
}

/** Map Razorpay payment status to internal payment status. */
export function mapRazorpayStatus(razorpayStatus: string): PaymentStatus {
  switch (razorpayStatus) {
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

/** Validate webhook payment against booking expectations. */
export function reconcilePayment(
  booking: {
    tokenAmountCents: number;
    currency: string;
    razorpayOrderId: string | null;
  },
  payment: RazorpayPayment,
): { ok: boolean; reason?: string } {
  if (booking.razorpayOrderId && payment.order_id !== booking.razorpayOrderId) {
    return { ok: false, reason: "Order ID mismatch" };
  }
  if (payment.amount !== booking.tokenAmountCents) {
    return {
      ok: false,
      reason: `Amount mismatch: expected ${booking.tokenAmountCents}, got ${payment.amount}`,
    };
  }
  if (payment.currency.toUpperCase() !== booking.currency.toUpperCase()) {
    return {
      ok: false,
      reason: `Currency mismatch: expected ${booking.currency}, got ${payment.currency}`,
    };
  }
  return { ok: true };
}

/** Get pricing for a package + currency using authoritative matrix. */
export async function getPricingForBooking(
  packageTier: string,
  currency: string,
): Promise<RegionalPricing | null> {
  if (!isPackageTier(packageTier)) return null;

  const authPricing = getAuthoritativePricing(packageTier, currency);
  if (!authPricing) return null;

  return {
    package: packageTier,
    currencyCode: currency.toUpperCase(),
    amountCents: authPricing.amountCents,
    compareAtCents: authPricing.compareAtCents,
    reservationCents: null,
    active: true,
    version: 1,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
  };
}

/** Validate that a package tier exists. */
export function validatePackageTier(tier: string): tier is PackageTier {
  return isPackageTier(tier);
}

/** Fetch a payment from Razorpay by ID. */
export async function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  const authHeader = getAuthHeader();

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Razorpay fetch payment failed: ${error}`);
  }

  return response.json();
}
