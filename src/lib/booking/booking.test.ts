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
import { calculateAggregateProjectPricing, SERVICE_PLANS } from "../pricing-services";

describe("Booking & Token Calculation (15% Rule)", () => {
  it("uses 15% as DEFAULT_TOKEN_PERCENTAGE", () => {
    expect(DEFAULT_TOKEN_PERCENTAGE).toBe(15);
  });

  it("calculates 15% token amount and 85% balance correctly for INR MVP (₹69,999)", () => {
    // MVP in INR = 69,999 INR = 6,999,900 paise
    const fullAmountPaise = 6999900;
    const tokenPaise = calculateTokenAmount(fullAmountPaise, 15);
    // 6999900 * 0.15 = 1049985
    expect(tokenPaise).toBe(1049985);
    expect(fullAmountPaise - tokenPaise).toBe(5949915);
  });

  it("calculates 15% token amount and 85% balance correctly for INR Production Ready (₹1,99,999)", () => {
    // Production Ready in INR = 199,999 INR = 19,999,900 paise
    const fullAmountPaise = 19999900;
    const tokenPaise = calculateTokenAmount(fullAmountPaise, 15);
    // 19999900 * 0.15 = 2999985
    expect(tokenPaise).toBe(2999985);
    expect(fullAmountPaise - tokenPaise).toBe(16999915);
  });

  it("calculates 15% token amount and 85% balance correctly for INR Enterprise (₹3,99,999)", () => {
    // Enterprise in INR = 399,999 INR = 39,999,900 paise
    const fullAmountPaise = 39999900;
    const tokenPaise = calculateTokenAmount(fullAmountPaise, 15);
    // 39999900 * 0.15 = 5999985
    expect(tokenPaise).toBe(5999985);
    expect(fullAmountPaise - tokenPaise).toBe(33999915);
  });

  it("calculates 15% token amount for USD Production Ready ($4,999)", () => {
    // $4,999 = 499,900 cents -> 15% = 74,985 cents ($749.85)
    const fullCents = 499900;
    const tokenCents = calculateTokenAmount(fullCents, 15);
    expect(tokenCents).toBe(74985);
  });

  it("retrieves authoritative pricing for all packages and currencies", () => {
    const inrMvp = getAuthoritativePricing("mvp", "INR");
    expect(inrMvp?.amountCents).toBe(6999900);

    const inrProd = getAuthoritativePricing("production_ready", "INR");
    expect(inrProd?.amountCents).toBe(19999900);

    const inrEnt = getAuthoritativePricing("enterprise", "INR");
    expect(inrEnt?.amountCents).toBe(39999900);

    const usdEnt = getAuthoritativePricing("enterprise", "USD");
    expect(usdEnt?.amountCents).toBe(999900); // $9,999

    const gbpEnt = getAuthoritativePricing("enterprise", "GBP");
    expect(gbpEnt?.amountCents).toBe(859900); // £8,599

    const eurEnt = getAuthoritativePricing("enterprise", "EUR");
    expect(eurEnt?.amountCents).toBe(999900); // €9,999

    const aedEnt = getAuthoritativePricing("enterprise", "AED");
    expect(aedEnt?.amountCents).toBe(3599900); // AED 35,999

    const sgdEnt = getAuthoritativePricing("enterprise", "SGD");
    expect(sgdEnt?.amountCents).toBe(1299900); // SGD 12,999
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

  it("validates currency codes correctly", () => {
    expect(isCurrency("INR")).toBe(true);
    expect(isCurrency("USD")).toBe(true);
    expect(isCurrency("XYZ")).toBe(false);
  });
});

describe("Authoritative Catalog Specifications & India Pricing", () => {
  it("verifies A. Native App pricing: MVP ₹69,999, Production Ready ₹1,99,999, Enterprise ₹3,99,999", () => {
    const plans = SERVICE_PLANS.app;
    const mvp = plans.find((p) => p.id === "mvp");
    const prod = plans.find((p) => p.id === "production_ready");
    const ent = plans.find((p) => p.id === "enterprise");

    expect(mvp?.pricing.INR.amountCents).toBe(6999900);
    expect(mvp?.deliveryDuration).toBe("Delivery in 3 Days");

    expect(prod?.pricing.INR.amountCents).toBe(19999900);
    expect(prod?.deliveryDuration).toBe("Delivered in 5–7 Days");

    expect(ent?.pricing.INR.amountCents).toBe(39999900);
    expect(ent?.deliveryDuration).toContain("Dedicated");
  });

  it("verifies B. Web Development pricing: Launch ₹29,999, Business ₹59,999, Production ₹99,999", () => {
    const plans = SERVICE_PLANS.web;
    const launch = plans.find((p) => p.id === "launch");
    const business = plans.find((p) => p.id === "business");
    const production = plans.find((p) => p.id === "production");

    expect(launch?.pricing.INR.amountCents).toBe(2999900);
    expect(business?.pricing.INR.amountCents).toBe(5999900);
    expect(production?.pricing.INR.amountCents).toBe(9999900);
  });

  it("verifies C. QA & UAT pricing: Functional QA ₹9,999, Full QA ₹19,999, QA + UAT ₹29,999", () => {
    const plans = SERVICE_PLANS.qa_uat;
    const funcQA = plans.find((p) => p.id === "functional_qa");
    const fullQA = plans.find((p) => p.id === "full_qa");
    const qaUAT = plans.find((p) => p.id === "qa_uat");

    expect(funcQA?.pricing.INR.amountCents).toBe(999900);
    expect(fullQA?.pricing.INR.amountCents).toBe(1999900);
    expect(qaUAT?.pricing.INR.amountCents).toBe(2999900);
  });

  it("verifies D. Beta / Store Launch pricing: Beta Testing ₹7,999, Store Launch ₹12,999, Beta + Store Launch ₹17,999", () => {
    const plans = SERVICE_PLANS.beta_release;
    const beta = plans.find((p) => p.id === "beta_testing");
    const store = plans.find((p) => p.id === "store_launch");
    const betaStore = plans.find((p) => p.id === "beta_store_launch");

    expect(beta?.pricing.INR.amountCents).toBe(799900);
    expect(store?.pricing.INR.amountCents).toBe(1299900);
    expect(betaStore?.pricing.INR.amountCents).toBe(1799900);
  });

  it("verifies E. Maintenance pricing: Essential ₹5,999/mo, Growth ₹14,999/mo, Scale ₹49,999/mo with recurring flag", () => {
    const plans = SERVICE_PLANS.maintenance;
    const essential = plans.find((p) => p.id === "essential");
    const growth = plans.find((p) => p.id === "growth");
    const scale = plans.find((p) => p.id === "scale");

    expect(essential?.name).toBe("Essential");
    expect(essential?.pricing.INR.amountCents).toBe(599900);
    expect(essential?.isRecurring).toBe(true);

    expect(growth?.name).toBe("Growth");
    expect(growth?.pricing.INR.amountCents).toBe(1499900);
    expect(growth?.isRecurring).toBe(true);

    // MUST be named Scale, NOT Priority
    expect(scale?.name).toBe("Scale");
    expect(scale?.pricing.INR.amountCents).toBe(4999900);
    expect(scale?.isRecurring).toBe(true);
  });
});

describe("Prompt Verification Examples & Token Calculation Rules", () => {
  it("verifies EXACT example from prompt: App Prod (₹1,99,999) + Web Business (₹59,999) + QA+UAT (₹29,999) + Store Launch (₹12,999) = ₹3,02,996 total -> Token 15% = ₹45,449.40, Balance 85% = ₹2,57,546.60", () => {
    const result = calculateAggregateProjectPricing(
      [
        { serviceId: "app", planId: "production_ready" }, // 19999900
        { serviceId: "web", planId: "business" }, // 5999900
        { serviceId: "qa_uat", planId: "qa_uat" }, // 2999900
        { serviceId: "beta_release", planId: "store_launch" }, // 1299900
      ],
      "INR",
    );

    // Total = 19999900 + 5999900 + 2999900 + 1299900 = 30299600 paise (₹3,02,996)
    expect(result.oneTimeTotalAmountCents).toBe(30299600);
    expect(result.totalAmountCents).toBe(30299600);

    // Token = 30299600 * 0.15 = 4544940 paise (₹45,449.40)
    expect(result.tokenAmountCents).toBe(4544940);

    // Remaining = 30299600 - 4544940 = 25754660 paise (₹2,57,546.60)
    expect(result.balanceAmountCents).toBe(25754660);

    // Confirm maintenance is 0 in this cart
    expect(result.maintenanceMonthlyCents).toBe(0);
    expect(result.hasRecurringPlan).toBe(false);
  });

  it("verifies CRITICAL RULE 5: Maintenance must NEVER be included in 15% token", () => {
    // App Production Ready (₹1,99,999) + Web Business (₹59,999) + Growth Maintenance (₹14,999/month)
    const result = calculateAggregateProjectPricing(
      [
        { serviceId: "app", planId: "production_ready" }, // 19999900
        { serviceId: "web", planId: "business" }, // 5999900
        { serviceId: "maintenance", planId: "growth" }, // 1499900
      ],
      "INR",
    );

    // One-time total = 19999900 + 5999900 = 25999800 paise (₹2,59,998)
    expect(result.oneTimeTotalAmountCents).toBe(25999800);
    expect(result.totalAmountCents).toBe(25999800);

    // Token must be strictly calculated on ₹2,59,998, NOT on ₹2,74,997!
    // 25999800 * 0.15 = 3899970 paise (₹38,999.70)
    expect(result.tokenAmountCents).toBe(3899970);
    expect(result.balanceAmountCents).toBe(25999800 - 3899970); // 22099830 paise (₹2,20,998.30)

    // Maintenance is separated as recurring monthly
    expect(result.maintenanceMonthlyCents).toBe(1499900); // ₹14,999/mo
    expect(result.hasRecurringPlan).toBe(true);
  });

  it("preserves currency conversion across all currencies for App MVP", () => {
    const inr = calculateAggregateProjectPricing([{ serviceId: "app", planId: "mvp" }], "INR");
    expect(inr.totalAmountCents).toBe(6999900);

    const usd = calculateAggregateProjectPricing([{ serviceId: "app", planId: "mvp" }], "USD");
    expect(usd.totalAmountCents).toBe(149900);

    const gbp = calculateAggregateProjectPricing([{ serviceId: "app", planId: "mvp" }], "GBP");
    expect(gbp.totalAmountCents).toBe(129900);

    const eur = calculateAggregateProjectPricing([{ serviceId: "app", planId: "mvp" }], "EUR");
    expect(eur.totalAmountCents).toBe(149900);

    const aed = calculateAggregateProjectPricing([{ serviceId: "app", planId: "mvp" }], "AED");
    expect(aed.totalAmountCents).toBe(549900);

    const sgd = calculateAggregateProjectPricing([{ serviceId: "app", planId: "mvp" }], "SGD");
    expect(sgd.totalAmountCents).toBe(199900);
  });

  it("calculates multi-service delivery timeline dynamically without including maintenance in timeline", () => {
    const result = calculateAggregateProjectPricing(
      [
        { serviceId: "app", planId: "production_ready" }, // 5-7 days
        { serviceId: "web", planId: "business" }, // +5-7 days
        { serviceId: "qa_uat", planId: "qa_uat" }, // +3-4 days
        { serviceId: "maintenance", planId: "scale" }, // recurring monthly, 0 days
      ],
      "INR",
    );
    // 5+5+3 = 13, 7+7+4 = 18 -> 13–18 Days
    expect(result.estimatedTimeline.totalDaysText).toBe("13–18 Days");
    expect(result.estimatedTimeline.additionalDaysText).toBe("+8–11 days");
  });
});

describe("Services Snapshot Structure (booking persistence contract)", () => {
  it("aggregate items carry all fields required for the selected_services DB snapshot", () => {
    const result = calculateAggregateProjectPricing(
      [
        { serviceId: "app", planId: "production_ready" },
        { serviceId: "web", planId: "business" },
      ],
      "INR",
    );

    expect(result.items.length).toBe(2);

    const appItem = result.items.find((i) => i.serviceId === "app");
    expect(appItem).toBeDefined();
    // Fields required by the BookingServiceSnapshot interface
    expect(typeof appItem!.serviceId).toBe("string");
    expect(typeof appItem!.serviceLabel).toBe("string");
    expect(typeof appItem!.planId).toBe("string");
    expect(typeof appItem!.planName).toBe("string");
    expect(typeof appItem!.amountCents).toBe("number");
    expect(typeof appItem!.deliveryDuration).toBe("string");
    expect(typeof appItem!.isRecurring).toBe("boolean");
    expect(appItem!.isRecurring).toBe(false);

    // Verify numeric correctness
    expect(appItem!.amountCents).toBe(19999900);
  });

  it("empty selected_services array produces empty snapshot (single-package booking path)", () => {
    // When no selected_services are passed, the aggregate is NOT called server-side —
    // the AUTHORITATIVE_PRICING path is used instead, and servicesSnapshot stays [].
    // Verify the aggregate engine handles an empty array gracefully.
    const result = calculateAggregateProjectPricing([], "INR");
    expect(result.items.length).toBe(0);
    expect(result.oneTimeTotalAmountCents).toBe(0);
    expect(result.tokenAmountCents).toBe(0);
    expect(result.hasRecurringPlan).toBe(false);
    expect(result.maintenanceMonthlyCents).toBe(0);
  });

  it("maintenance service snapshot item is marked isRecurring=true and carries allocationHours", () => {
    const result = calculateAggregateProjectPricing(
      [{ serviceId: "maintenance", planId: "growth" }],
      "INR",
    );
    const maintenanceItem = result.items.find((i) => i.serviceId === "maintenance");
    expect(maintenanceItem).toBeDefined();
    expect(maintenanceItem!.isRecurring).toBe(true);
    // allocationHours may be a string or null but must exist as a key in the item
    expect("allocationHours" in maintenanceItem!).toBe(true);
  });
});
