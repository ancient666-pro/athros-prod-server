import { logger } from "@/lib/observability/logger.server";

/**
 * Inbound webhook ingestion with signature verification and idempotency.
 * Every delivery is persisted to `public.webhook_events` before processing, so
 * retries from the provider are deduplicated on (provider, external_id).
 */

export interface WebhookHandlerResult {
  readonly ok: boolean;
  readonly reason?: string;
}

export type WebhookHandler = (event: {
  provider: string;
  eventType: string | null;
  payload: unknown;
}) => Promise<WebhookHandlerResult>;

const handlers = new Map<string, WebhookHandler>();

export function registerWebhookHandler(provider: string, handler: WebhookHandler): void {
  handlers.set(provider, handler);
}

/** Timing-safe hex/base64 string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface IngestInput {
  readonly provider: string;
  readonly rawBody: string;
  readonly headers: Record<string, string>;
  readonly signatureVerified: boolean;
  readonly eventType?: string | null;
  readonly externalId?: string | null;
}

/** Stores + processes a verified delivery. Returns the response status to reply with. */
export async function ingestWebhook(input: IngestInput): Promise<{ status: number; body: unknown }> {
  const log = logger.channel("webhook");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (input.externalId) {
    const { data: existing } = await supabaseAdmin
      .from("webhook_events")
      .select("id, status")
      .eq("provider", input.provider)
      .eq("external_id", input.externalId)
      .maybeSingle();
    if (existing?.status === "processed") {
      return { status: 200, body: { ok: true, deduplicated: true } };
    }
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(input.rawBody);
  } catch {
    payload = { raw: input.rawBody.slice(0, 4000) };
  }

  const { data: row } = await supabaseAdmin
    .from("webhook_events")
    .insert({
      provider: input.provider,
      event_type: input.eventType ?? null,
      external_id: input.externalId ?? null,
      payload: payload as never,
      headers: input.headers as never,
      signature_verified: input.signatureVerified,
      status: input.signatureVerified ? "pending" : "rejected",
    })
    .select("id, attempts")
    .single();

  if (!input.signatureVerified) {
    log.warn("rejected webhook with invalid signature", { provider: input.provider });
    return { status: 401, body: { error: { code: "unauthorized", message: "Invalid signature" } } };
  }

  const handler = handlers.get(input.provider);
  if (!handler) {
    return { status: 202, body: { ok: true, queued: true } };
  }

  try {
    const result = await handler({
      provider: input.provider,
      eventType: input.eventType ?? null,
      payload,
    });
    if (row) {
      await supabaseAdmin
        .from("webhook_events")
        .update({
          status: result.ok ? "processed" : "failed",
          processed_at: result.ok ? new Date().toISOString() : null,
          last_error: result.ok ? null : (result.reason ?? "handler rejected"),
          attempts: row.attempts + 1,
        })
        .eq("id", row.id);
    }
    return result.ok
      ? { status: 200, body: { ok: true } }
      : { status: 422, body: { error: { code: "unprocessable", message: result.reason ?? "Rejected" } } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("webhook handler threw", error, { provider: input.provider });
    if (row) {
      await supabaseAdmin
        .from("webhook_events")
        .update({ status: "failed", last_error: message.slice(0, 1000), attempts: row.attempts + 1 })
        .eq("id", row.id);
      const { enqueue } = await import("@/lib/queue/queue.server");
      await enqueue("webhook-retry", { webhookEventId: row.id }).catch(() => undefined);
    }
    return { status: 500, body: { error: { code: "internal", message: "Processing failed" } } };
  }
}

/** Replays a stored failed delivery through its handler (webhook-retry queue). */
export async function replayWebhook(webhookEventId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("webhook_events")
    .select("id, provider, event_type, payload, attempts, status")
    .eq("id", webhookEventId)
    .maybeSingle();
  if (!data || data.status === "processed") return true;

  const handler = handlers.get(data.provider);
  if (!handler) return false;

  const result = await handler({
    provider: data.provider,
    eventType: data.event_type,
    payload: data.payload,
  });
  await supabaseAdmin
    .from("webhook_events")
    .update({
      status: result.ok ? "processed" : "failed",
      processed_at: result.ok ? new Date().toISOString() : null,
      last_error: result.ok ? null : (result.reason ?? "handler rejected"),
      attempts: data.attempts + 1,
    })
    .eq("id", data.id);
  return result.ok;
}
