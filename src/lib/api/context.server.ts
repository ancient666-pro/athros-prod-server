import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { forbidden, unauthorized } from "./errors";

export type Db = SupabaseClient<Database>;

export interface RequestIdentity {
  readonly userId: string;
  readonly email: string | null;
  readonly roles: readonly string[];
  readonly permissions: ReadonlySet<string>;
  readonly isAdmin: boolean;
  readonly ip: string | null;
  readonly userAgent: string | null;
}

export interface RequestContext {
  readonly db: Db;
  readonly identity: RequestIdentity;
  readonly requestId: string;
}

function bearerFrom(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function requestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("cf-connecting-ip");
}

/** Supabase client bound to the caller's bearer token — every query runs under RLS as that user. */
function userClient(accessToken: string): Db {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase server environment is not configured");

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Authenticates the request and resolves the caller's role/permission matrix. */
export async function authenticate(request: Request): Promise<RequestContext> {
  const token = bearerFrom(request);
  if (!token) throw unauthorized();

  const db = userClient(token);
  const { data: userData, error: userError } = await db.auth.getUser(token);
  if (userError || !userData.user) throw unauthorized("Invalid or expired session");

  const userId = userData.user.id;

  const [{ data: roleRows }, { data: roleCatalogue }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", userId),
    db.from("roles").select("name, permissions"),
  ]);

  const roles = (roleRows ?? []).map((row) => String(row.role));
  const permissions = new Set<string>();
  for (const entry of roleCatalogue ?? []) {
    if (!roles.includes(String(entry.name))) continue;
    for (const permission of entry.permissions ?? []) permissions.add(permission);
  }

  return {
    db,
    identity: {
      userId,
      email: userData.user.email ?? null,
      roles,
      permissions,
      isAdmin: roles.includes("admin") || roles.includes("super_admin"),
      ip: requestIp(request),
      userAgent: request.headers.get("user-agent"),
    },
    requestId: crypto.randomUUID(),
  };
}

export function hasPermission(identity: RequestIdentity, permission: string): boolean {
  if (identity.permissions.has("*")) return true;
  if (identity.permissions.has(permission)) return true;
  // Clients hold scoped grants (`projects:read:own`); RLS narrows the rows.
  return identity.permissions.has(`${permission}:own`);
}

export function requirePermission(identity: RequestIdentity, permission: string): void {
  if (!hasPermission(identity, permission)) {
    throw forbidden(`Missing permission: ${permission}`);
  }
}
