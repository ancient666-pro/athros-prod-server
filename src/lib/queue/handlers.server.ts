import { drainQueues, registerJobHandler } from "@/lib/queue/queue.server";
import { retryEmail } from "@/lib/email/email.server";
import { replayWebhook } from "@/lib/webhooks/webhooks.server";
import { cleanupSessions } from "@/lib/sessions/sessions.server";
import { cleanupExpiredObjects } from "@/lib/storage/storage.server";

let registered = false;

/** Binds every queue to its handler. Idempotent; called by the cron endpoint. */
export function registerJobHandlers(): void {
  if (registered) return;
  registered = true;

  registerJobHandler("email", async (job) => {
    const messageId = String(job.payload["messageId"] ?? "");
    if (!messageId) return;
    const sent = await retryEmail(messageId);
    if (!sent) throw new Error(`email retry failed: ${messageId}`);
  });

  registerJobHandler("webhook-retry", async (job) => {
    const id = String(job.payload["webhookEventId"] ?? "");
    if (!id) return;
    const ok = await replayWebhook(id);
    if (!ok) throw new Error(`webhook replay failed: ${id}`);
  });

  registerJobHandler("session-cleanup", async () => {
    await cleanupSessions();
  });

  registerJobHandler("storage-cleanup", async () => {
    await cleanupExpiredObjects();
  });

  registerJobHandler("notification", async (job) => {
    const userId = String(job.payload["userId"] ?? "");
    const title = String(job.payload["title"] ?? "");
    if (!userId || !title) return;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: String(job.payload["type"] ?? "system"),
      title,
      description: job.payload["description"] ? String(job.payload["description"]) : null,
      link: job.payload["link"] ? String(job.payload["link"]) : null,
    });
    if (error) throw new Error(error.message);
  });
}

/** Entry point for the scheduled worker tick. */
export async function runWorkerTick(): Promise<{ processed: number; failed: number }> {
  registerJobHandlers();
  return drainQueues();
}
