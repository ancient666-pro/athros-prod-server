import { describe, it, expect } from "vitest";
import { verifyPaymentSignature, verifyWebhookSignature } from "./razorpay.server";
import crypto from "node:crypto";

describe("Razorpay Signature & Security", () => {
  const secret = process.env.RAZORPAY_KEY_SECRET || "hhqpoMLexj6WuVST7F5bLeDB";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "rachit@1986982005";

  it("verifies valid payment signature correctly", async () => {
    const orderId = "order_O1234567890";
    const paymentId = "pay_P1234567890";
    const payload = `${orderId}|${paymentId}`;
    const validSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    const result = await verifyPaymentSignature({
      orderId,
      paymentId,
      signature: validSignature,
    });
    expect(result).toBe(true);
  });

  it("rejects forged or tampered payment signature", async () => {
    const orderId = "order_O1234567890";
    const paymentId = "pay_P1234567890";
    const fakeSignature = "invalid_signature_hash_00000000000000000000000000000000";

    const result = await verifyPaymentSignature({
      orderId,
      paymentId,
      signature: fakeSignature,
    });
    expect(result).toBe(false);
  });

  it("verifies valid webhook signature", async () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_123" } } },
    });
    const validSignature = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");

    const result = await verifyWebhookSignature(body, validSignature);
    expect(result).toBe(true);
  });

  it("rejects tampered webhook signature", async () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const forgedSignature = "forged_signature_00000000000000000000000000000000";

    const result = await verifyWebhookSignature(body, forgedSignature);
    expect(result).toBe(false);
  });
});
