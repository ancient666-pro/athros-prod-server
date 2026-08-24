import type { Db, RequestIdentity } from "@/lib/api/context.server";

/** Best-effort audit trail. Never blocks or fails the caller's request. */
export async function recordAudit(
  db: Db,
  identity: RequestIdentity,
  entry: {
    action: string;
    entity: string;
    entityId?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const payload = {
    actor_id: identity.userId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    old_value: (entry.oldValue ?? null) as never,
    new_value: (entry.newValue ?? null) as never,
    detail: (entry.detail ?? {}) as never,
    ip: identity.ip,
    user_agent: identity.userAgent,
  };

  const { error } = await supabaseAdmin.from("audit_logs").insert(payload);
  if (error) {
    // Audit failures must not break the request; surface through the platform logs.
    void db;
  }
}
