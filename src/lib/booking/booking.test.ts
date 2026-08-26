import { describe, it, expect } from "vitest";
import {
  calculateTokenAmount,
  getAuthoritativePricing,
  DEFAULT_TOKEN_PERCENTAGE,
  canTransitionBooking,
  validateBookingTransition,
} from "./booking";
import { canTransitionPayment } from "../payments/payments";
import { currencyForCountry, isCurrency } from "../currency";

describe("Booking & Token Calculation (15% Rule)", () => {
  it("uses 15% as DEFAULT_TOKEN_PERCENTAGE", () => {
    expect(DEFAULT_TOKEN_PERCENTAGE).toBe(15);
  });

  it("calculates 15% token amount and 85% balance correctly for INR MVP", () => {
    // MVP in INR = 69,999 INR = 6,999,900 paise
    const fullAmountPaise = 6999900;
    const tokenPaise = calculateTokenAmount(fullAmountPaise, 15);
    // 6999900 * 0.15 = 1049985
    expect(tokenPaise).toBe(1049985);
    expect(fullAmountPaise - tokenPaise).toBe(5949915);
  });

  it("calculates 15% token amount and 85% balance correctly for INR Production Ready", () => {
    // Production Ready in INR = 199,999 INR = 19,999,900 paise
    const fullAmountPaise = 19999900;
    const tokenPaise = calculateTokenAmount(fullAmountPaise, 15);
    // 19999900 * 0.15 = 2999985
    expect(tokenPaise).toBe(2999985);
    expect(fullAmountPaise - tokenPaise).toBe(16999915);
  });

  it("calculates 15% token amount for USD Production Ready ($4,999)", () => {
    // $4,999 = 499,900 cents -> 15% = 74,985 cents ($749.85)
    const fullCents = 499900;
    const tokenCents = calculateTokenAmount(fullCents, 15);
    expect(tokenCents).toBe(74985);
  });

  it("retrieves authoritative pricing for all packages and currencies", () => {
    const inrMvp = getAuthoritativePricing("mvp", "INR");
    expect(inrMvp).not.toBeNull();
    expect(inrMvp?.amountCents).toBe(6999900);

    const usdProd = getAuthoritativePricing("production_ready", "USD");
    expect(usdProd).not.toBeNull();
    expect(usdProd?.amountCents).toBe(499900);

    const gbpProd = getAuthoritativePricing("production_ready", "GBP");
    expect(gbpProd).not.toBeNull();
    expect(gbpProd?.amountCents).toBe(429900);
  });
});

describe("Payment & Booking State Transitions", () => {
  it("allows valid payment forward transitions", () => {
    expect(canTransitionPayment("created", "checkout_pending")).toBe(true);
    expect(canTransitionPayment("checkout_pending", "authorized")).toBe(true);
    expect(canTransitionPayment("authorized", "captured")).toBe(true);
    expect(canTransitionPayment("captured", "paid")).toBe(true);
  });

  it("allows valid booking forward transitions", () => {
    expect(canTransitionBooking("draft", "payment_pending")).toBe(true);
    expect(canTransitionBooking("payment_pending", "token_paid")).toBe(true);
    expect(canTransitionBooking("token_paid", "under_review")).toBe(true);
    expect(canTransitionBooking("under_review", "approved")).toBe(true);
    expect(validateBookingTransition("draft", "payment_pending").ok).toBe(true);
  });

  it("handles payment review required transitions", () => {
    expect(canTransitionPayment("checkout_pending", "payment_review_required")).toBe(true);
    expect(canTransitionPayment("payment_review_required", "paid")).toBe(true);
    expect(canTransitionPayment("payment_review_required", "failed")).toBe(true);
  });

  it("rejects invalid or backwards transitions", () => {
    expect(canTransitionPayment("paid", "checkout_pending")).toBe(false);
    expect(canTransitionBooking("approved", "draft")).toBe(false);
    expect(canTransitionBooking("rejected", "token_paid")).toBe(false);
  });
});

describe("Regional & Currency Detection", () => {
  it("resolves India country code to INR", () => {
    expect(currencyForCountry("IN")).toBe("INR");
    expect(currencyForCountry("in")).toBe("INR");
  });

  it("resolves US/Canada to USD", () => {
    expect(currencyForCountry("US")).toBe("USD");
    expect(currencyForCountry("CA")).toBe("USD");
  });

  it("resolves UK to GBP and Europe to EUR", () => {
    expect(currencyForCountry("GB")).toBe("GBP");
    expect(currencyForCountry("DE")).toBe("EUR");
    expect(currencyForCountry("FR")).toBe("EUR");
  });

  it("resolves UAE to AED and Singapore to SGD", () => {
    expect(currencyForCountry("AE")).toBe("AED");
    expect(currencyForCountry("SG")).toBe("SGD");
  });

  it("validates currency codes", () => {
    expect(isCurrency("INR")).toBe(true);
    expect(isCurrency("USD")).toBe(true);
    expect(isCurrency("INVALID")).toBe(false);
  });
});
