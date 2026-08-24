import { LOCK_POLICY, evaluatePassword } from "@/lib/security/passwords";
import { logger } from "@/lib/observability/logger.server";

/**
 * Account security state machine: failed-login tracking, temporary lockout,
 * password age/reuse policy, and the security event trail.
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface SecurityContext {
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly country?: string | null;
  readonly fingerprint?: string | null;
}

export type SecuritySeverity = "info" | "warning" | "critical";

export async function recordSecurityEvent(input: {
  type: string;
  userId?: string | null;
  message?: string;
  severity?: SecuritySeverity;
  detail?: Record<string, unknown>;
  context?: SecurityContext;
}): Promise<void> {
  try {
    const db = await admin();
    await db.from("security_events").insert({
      type: input.type,
      user_id: input.userId ?? null,
      message: input.message ?? null,
      severity: input.severity ?? "info",
      detail: (input.detail ?? {}) as never,
      ip: input.context?.ip ?? null,
      user_agent: input.context?.userAgent ?? null,
    });
  } catch (error) {
    logger.channel("security").warn("could not persist security event", {
      type: input.type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export interface LockState {
  readonly locked: boolean;
  readonly lockedUntil: string | null;
  readonly failedCount: number;
}

async function ensureRow(userId: string) {
  const db = await admin();
  await db.from("account_security").upsert({ user_id: userId }, { onConflict: "user_id" });
  return db;
}

export async function getLockState(userId: string): Promise<LockState> {
  const db = await admin();
  const { data } = await db
    .from("account_security")
    .select("failed_login_count, locked_until")
    .eq("user_id", userId)
    .maybeSingle();

  const lockedUntil = data?.locked_until ?? null;
  return {
    locked: Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now()),
    lockedUntil,
    failedCount: data?.failed_login_count ?? 0,
  };
}

/** Records a failed sign-in and locks the account once the threshold is crossed. */
export async function registerFailedLogin(
  email: string,
  userId: string | null,
  context: SecurityContext,
  reason = "invalid_credentials",
): Promise<LockState> {
  const db = await admin();
  await db.from("login_attempts").insert({
    email: email.toLowerCase(),
    user_id: userId,
    success: false,
    reason,
    ip: context.ip,
    user_agent: context.userAgent,
    country: context.country ?? null,
    fingerprint: context.fingerprint ?? null,
  });

  if (!userId) return { locked: false, lockedUntil: null, failedCount: 0 };

  await ensureRow(userId);
  const { data: current } = await db
    .from("account_security")
    .select("failed_login_count")
    .eq("user_id", userId)
    .maybeSingle();

  const failedCount = (current?.failed_login_count ?? 0) + 1;
  const shouldLock = failedCount >= LOCK_POLICY.maxFailedAttempts;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCK_POLICY.lockMinutes * 60_000).toISOString()
    : null;

  await db
    .from("account_security")
    .update({
      failed_login_count: failedCount,
      last_failed_login_at: new Date().toISOString(),
      ...(shouldLock ? { locked_until: lockedUntil } : {}),
    })
    .eq("user_id", userId);

  if (shouldLock) {
    await recordSecurityEvent({
      type: "account.locked",
      userId,
      severity: "critical",
      message: `Locked after ${failedCount} failed attempts`,
      context,
    });
  }

  return { locked: shouldLock, lockedUntil, failedCount };
}

export async function registerSuccessfulLogin(
  email: string,
  userId: string,
  context: SecurityContext,
): Promise<void> {
  const db = await admin();
  await db.from("login_attempts").insert({
    email: email.toLowerCase(),
    user_id: userId,
    success: true,
    ip: context.ip,
    user_agent: context.userAgent,
    country: context.country ?? null,
    fingerprint: context.fingerprint ?? null,
  });
  await ensureRow(userId);
  await db
    .from("account_security")
    .update({ failed_login_count: 0, locked_until: null })
    .eq("user_id", userId);
}

export async function unlockAccount(userId: string, actorId: string | null): Promise<void> {
  const db = await admin();
  await ensureRow(userId);
  await db
    .from("account_security")
    .update({ failed_login_count: 0, locked_until: null })
    .eq("user_id", userId);
  await recordSecurityEvent({
    type: "account.unlocked",
    userId,
    severity: "warning",
    detail: { actorId },
  });
}

export interface PasswordPolicyResult {
  readonly ok: boolean;
  readonly reason?: string;
}

/** Rejects weak passwords and any of the last N previously used passwords. */
export async function assertPasswordAcceptable(
  userId: string,
  password: string,
): Promise<PasswordPolicyResult> {
  const strength = evaluatePassword(password);
  if (!strength.acceptable) return { ok: false, reason: strength.failures.join("; ") };

  const db = await admin();
  const digest = await hash(password);
  const { data } = await db
    .from("password_history")
    .select("password_hash")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(LOCK_POLICY.passwordHistorySize);

  if ((data ?? []).some((row) => row.password_hash === digest)) {
    return { ok: false, reason: "You cannot reuse a recent password" };
  }
  return { ok: true };
}

/** Records the new password digest and refreshes expiry metadata. */
export async function recordPasswordChange(userId: string, password: string): Promise<void> {
  const db = await admin();
  const digest = await hash(password);
  await db.from("password_history").insert({ user_id: userId, password_hash: digest });
  await ensureRow(userId);
  await db
    .from("account_security")
    .update({
      password_changed_at: new Date().toISOString(),
      password_expires_at: new Date(
        Date.now() + LOCK_POLICY.passwordMaxAgeDays * 86_400_000,
      ).toISOString(),
      failed_login_count: 0,
      locked_until: null,
    })
    .eq("user_id", userId);

  // Keep only the most recent N digests.
  const { data: rows } = await db
    .from("password_history")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const stale = (rows ?? []).slice(LOCK_POLICY.passwordHistorySize).map((row) => row.id);
  if (stale.length > 0) await db.from("password_history").delete().in("id", stale);

  await recordSecurityEvent({ type: "password.changed", userId, severity: "warning" });
}

export async function passwordExpired(userId: string): Promise<boolean> {
  const db = await admin();
  const { data } = await db
    .from("account_security")
    .select("password_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  const expiry = data?.password_expires_at;
  return Boolean(expiry && new Date(expiry).getTime() < Date.now());
}
