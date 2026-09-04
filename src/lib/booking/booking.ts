/**
 * Booking state machine (pure, client-safe).
 * Booking status and payment status are separate concepts.
 */
export const BOOKING_STATUSES = [
  "draft",
  "payment_pending",
  "token_paid",
  "under_review",
  "approved",
  "rejected",
  "cancelled",
  "expired",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const NEXT: Record<BookingStatus, readonly BookingStatus[]> = {
  draft: ["payment_pending", "cancelled", "expired"],
  payment_pending: ["token_paid", "cancelled", "expired", "draft"],
  token_paid: ["under_review", "cancelled"],
  under_review: ["approved", "rejected", "token_paid"],
  approved: ["cancelled"],
  rejected: ["cancelled"],
  cancelled: [],
  expired: ["payment_pending"],
};

export const TERMINAL_BOOKING_STATUSES: readonly BookingStatus[] = [
  "approved",
  "rejected",
  "cancelled",
  "expired",
];

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true; // idempotent
  return NEXT[from].includes(to);
}

export interface BookingTransitionCheck {
  readonly ok: boolean;
  readonly noop: boolean;
  readonly reason?: string;
}

export function validateBookingTransition(
  from: BookingStatus,
  to: BookingStatus,
): BookingTransitionCheck {
  if (from === to) return { ok: true, noop: true };
  if (TERMINAL_BOOKING_STATUSES.includes(from)) {
    return { ok: false, noop: false, reason: `${from} is a terminal status` };
  }
  if (!NEXT[from].includes(to)) {
    return { ok: false, noop: false, reason: `Illegal booking transition ${from} -> ${to}` };
  }
  return { ok: true, noop: false };
}

export const PACKAGES = ["mvp", "production_ready", "enterprise"] as const;
export type PackageTier = (typeof PACKAGES)[number];

export function isPackageTier(value: unknown): value is PackageTier {
  return typeof value === "string" && (PACKAGES as readonly string[]).includes(value);
}

export interface RegionalPricing {
  readonly package: PackageTier;
  readonly currencyCode: string;
  readonly amountCents: number;
  readonly compareAtCents: number | null;
  readonly reservationCents: number | null;
  readonly active: boolean;
  readonly version: number;
  readonly effectiveFrom: string;
  readonly effectiveUntil: string | null;
}

export function calculateTokenAmount(
  fullAmountCents: number,
  tokenPercentage: number = DEFAULT_TOKEN_PERCENTAGE,
): number {
  return Math.round(fullAmountCents * (tokenPercentage / 100));
}

export const DEFAULT_TOKEN_PERCENTAGE = 15;

/** Authoritative package pricing matrix in integer minor units (cents / paise / fils / pence). */
export const AUTHORITATIVE_PRICING: Record<
  PackageTier,
  Record<string, { amountCents: number; compareAtCents?: number }>
> = {
  mvp: {
    INR: { amountCents: 6999900, compareAtCents: 12000000 },
    USD: { amountCents: 149900, compareAtCents: 260000 },
    GBP: { amountCents: 129900, compareAtCents: 220000 },
    EUR: { amountCents: 149900, compareAtCents: 260000 },
    AED: { amountCents: 549900, compareAtCents: 940000 },
    SGD: { amountCents: 199900, compareAtCents: 340000 },
  },
  production_ready: {
    INR: { amountCents: 19999900, compareAtCents: 34000000 },
    USD: { amountCents: 499900, compareAtCents: 850000 },
    GBP: { amountCents: 429900, compareAtCents: 730000 },
    EUR: { amountCents: 499900, compareAtCents: 850000 },
    AED: { amountCents: 1799900, compareAtCents: 3060000 },
    SGD: { amountCents: 649900, compareAtCents: 1100000 },
  },
  enterprise: {
    INR: { amountCents: 39999900, compareAtCents: 68000000 },
    USD: { amountCents: 999900, compareAtCents: 1700000 },
    GBP: { amountCents: 859900, compareAtCents: 1450000 },
    EUR: { amountCents: 999900, compareAtCents: 1700000 },
    AED: { amountCents: 3599900, compareAtCents: 6100000 },
    SGD: { amountCents: 1299900, compareAtCents: 2200000 },
  },
};

export function getAuthoritativePricing(
  packageTier: PackageTier,
  currencyCode: string,
): { amountCents: number; compareAtCents: number | null } | null {
  const pkg = AUTHORITATIVE_PRICING[packageTier];
  if (!pkg) return null;
  const priced = pkg[currencyCode.toUpperCase()];
  if (!priced) return null;
  return {
    amountCents: priced.amountCents,
    compareAtCents: priced.compareAtCents ?? null,
  };
}
