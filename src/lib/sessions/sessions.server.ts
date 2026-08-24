import { logger } from "@/lib/observability/logger.server";
import { parseUserAgent } from "@/lib/security/device";

/**
 * Enterprise session lifecycle over `public.user_sessions`: creation with device
 * metadata, refresh-token rotation, idle timeout, revocation (self + admin
 * forced logout) and automatic cleanup. Supabase Auth still owns the JWTs; this
 * layer is the auditable device registry on top of it.
 */

export const SESSION_POLICY = {
  /** Absolute lifetime without "remember me". */
  lifetimeMs: 12 * 60 * 60 * 1000,
  /** Absolute lifetime with "remember me". */
  rememberLifetimeMs: 30 * 24 * 60 * 60 * 1000,
  /** Inactivity window before a session is considered idle-expired. */
  idleMs: 45 * 60 * 1000,
} as const;

export interface SessionRequestMeta {
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly country: string | null;
  readonly fingerprint: string | null;
  readonly rememberMe: boolean;
}

export interface SessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly ip: string | null;
  readonly browser: string | null;
  readonly os: string | null;
  readonly device: string | null;
  readonly country: string | null;
  readonly fingerprint: string | null;
  readonly rememberMe: boolean;
  readonly createdAt: string;
  readonly expiresAt: string | null;
  readonly idleExpiresAt: string | null;
  readonly lastSeenAt: string;
  readonly revoked: boolean;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function expiries(rememberMe: boolean) {
  const now = Date.now();
  const lifetime = rememberMe ? SESSION_POLICY.rememberLifetimeMs : SESSION_POLICY.lifetimeMs;
  return {
    expiresAt: new Date(now + lifetime).toISOString(),
    idleExpiresAt: new Date(now + SESSION_POLICY.idleMs).toISOString(),
  };
}

/** Registers a device session at sign-in. Multiple concurrent devices are allowed. */
export async function createSession(
  userId: string,
  refreshToken: string | null,
  meta: SessionRequestMeta,
): Promise<string> {
  const db = await admin();
  const device = parseUserAgent(meta.userAgent);
  const { expiresAt, idleExpiresAt } = expiries(meta.rememberMe);

  const { data, error } = await db
    .from("user_sessions")
    .insert({
      user_id: userId,
      refresh_token_hash: refreshToken ? await hashToken(refreshToken) : null,
      device: device.device,
      browser: device.browser,
      os: device.os,
      user_agent: meta.userAgent,
      ip: meta.ip,
      country: meta.country,
      fingerprint: meta.fingerprint,
      remember_me: meta.rememberMe,
      expires_at: expiresAt,
      idle_expires_at: idleExpiresAt,
      last_seen_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(`session create failed: ${error.message}`);
  await db.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", userId);
  return data.id;
}

/**
 * Refresh-token rotation: the previous row is revoked and replaced, so a replayed
 * old token can be detected (its row is already revoked).
 */
export async function rotateSession(
  sessionId: string,
  nextRefreshToken: string,
): Promise<{ sessionId: string; reused: boolean }> {
  const db = await admin();
  const { data: current } = await db
    .from("user_sessions")
    .select("id, user_id, revoked, remember_me, ip, user_agent, country, fingerprint, device, browser, os")
    .eq("id", sessionId)
    .maybeSingle();

  if (!current) return { sessionId, reused: false };
  if (current.revoked) {
    // Token reuse after rotation — kill every session for this user.
    await revokeAllSessions(current.user_id, null, "refresh token reuse detected");
    logger.channel("security").warn("refresh token reuse detected", { userId: current.user_id });
    return { sessionId, reused: true };
  }

  const { expiresAt, idleExpiresAt } = expiries(current.remember_me);
  const { data: next, error } = await db
    .from("user_sessions")
    .insert({
      user_id: current.user_id,
      refresh_token_hash: await hashToken(nextRefreshToken),
      device: current.device,
      browser: current.browser,
      os: current.os,
      user_agent: current.user_agent,
      ip: current.ip,
      country: current.country,
      fingerprint: current.fingerprint,
      remember_me: current.remember_me,
      rotated_from: current.id,
      expires_at: expiresAt,
      idle_expires_at: idleExpiresAt,
    })
    .select("id")
    .single();
  if (error) throw new Error(`session rotate failed: ${error.message}`);

  await db
    .from("user_sessions")
    .update({ revoked: true, revoked_at: new Date().toISOString(), revoke_reason: "rotated" })
    .eq("id", current.id);

  return { sessionId: next.id, reused: false };
}

/** Heartbeat: extends the idle window and records last activity. */
export async function touchSession(sessionId: string): Promise<void> {
  const db = await admin();
  await db
    .from("user_sessions")
    .update({
      last_seen_at: new Date().toISOString(),
      idle_expires_at: new Date(Date.now() + SESSION_POLICY.idleMs).toISOString(),
    })
    .eq("id", sessionId)
    .eq("revoked", false);
}

export async function listSessions(userId: string): Promise<SessionRecord[]> {
  const db = await admin();
  const { data } = await db
    .from("user_sessions")
    .select(
      "id, user_id, device, browser, os, country, fingerprint, remember_me, created_at, expires_at, idle_expires_at, last_seen_at, revoked, ip::text",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    ip: (row as { ip?: string | null }).ip ?? null,
    browser: row.browser,
    os: row.os,
    device: row.device,
    country: row.country,
    fingerprint: row.fingerprint,
    rememberMe: row.remember_me,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    idleExpiresAt: row.idle_expires_at,
    lastSeenAt: row.last_seen_at,
    revoked: row.revoked,
  }));
}

export async function revokeSession(
  sessionId: string,
  revokedBy: string | null,
  reason = "user revoked",
): Promise<void> {
  const db = await admin();
  await db
    .from("user_sessions")
    .update({
      revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
      revoke_reason: reason,
    })
    .eq("id", sessionId);
}

/** Forced logout across every device (self-service or admin action). */
export async function revokeAllSessions(
  userId: string,
  revokedBy: string | null,
  reason = "forced logout",
): Promise<number> {
  const db = await admin();
  const { data } = await db
    .from("user_sessions")
    .update({
      revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
      revoke_reason: reason,
    })
    .eq("user_id", userId)
    .eq("revoked", false)
    .select("id");

  // Invalidate the Supabase refresh tokens too, so JWTs cannot be renewed.
  await db.auth.admin.signOut(userId, "global").catch(() => undefined);
  return data?.length ?? 0;
}

/** Marks expired/idle sessions revoked and prunes ancient rows. Called by the cleanup job. */
export async function cleanupSessions(): Promise<{ expired: number; pruned: number }> {
  const db = await admin();
  const now = new Date().toISOString();

  const { data: expired } = await db
    .from("user_sessions")
    .update({ revoked: true, revoked_at: now, revoke_reason: "expired" })
    .eq("revoked", false)
    .or(`expires_at.lt.${now},idle_expires_at.lt.${now}`)
    .select("id");

  const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: pruned } = await db
    .from("user_sessions")
    .delete()
    .lt("created_at", cutoff)
    .select("id");

  return { expired: expired?.length ?? 0, pruned: pruned?.length ?? 0 };
}
