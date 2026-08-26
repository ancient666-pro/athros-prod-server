/**
 * Payment state machine (pure, client-safe).
 * Gateway callbacks are untrusted input: every status change must pass through
 * `validatePaymentTransition` before it reaches the database.
 */
export const PAYMENT_STATUSES = [
  "created",
  "checkout_pending",
  "pending",
  "authorized",
  "captured",
  "paid",
  "partially_refunded",
  "refunded",
  "failed",
  "cancelled",
  "payment_review_required",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const NEXT: Record<PaymentStatus, readonly PaymentStatus[]> = {
  created: ["checkout_pending", "cancelled", "failed", "payment_review_required"],
  checkout_pending: ["pending", "authorized", "failed", "cancelled", "payment_review_required"],
  pending: ["authorized", "captured", "paid", "failed", "cancelled", "payment_review_required"],
  authorized: ["captured", "failed", "cancelled", "payment_review_required"],
  captured: ["paid", "partially_refunded", "refunded"],
  paid: ["partially_refunded", "refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
  failed: ["checkout_pending"],
  cancelled: [],
  payment_review_required: ["paid", "captured", "failed", "cancelled"],
};

export const SETTLED_STATUSES: readonly PaymentStatus[] = ["captured", "paid"];
export const TERMINAL_PAYMENT_STATUSES: readonly PaymentStatus[] = ["refunded", "cancelled"];

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true; // idempotent gateway retries are a no-op, not an error
  return NEXT[from].includes(to);
}

export interface PaymentTransitionCheck {
  readonly ok: boolean;
  /** True when the target equals the current status (duplicate webhook). */
  readonly noop: boolean;
  readonly reason?: string;
}

export function validatePaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): PaymentTransitionCheck {
  if (from === to) return { ok: true, noop: true };
  if (!NEXT[from].includes(to)) {
    return { ok: false, noop: false, reason: `Illegal payment transition ${from} -> ${to}` };
  }
  return { ok: true, noop: false };
}

/** Money is always integer minor units; reject anything else early. */
export function assertMinorUnits(amount: number): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Amount must be a non-negative integer in minor units");
  }
}
