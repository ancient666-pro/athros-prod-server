import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const createAccountSchema = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().min(2).max(120),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  projectName: z.string().trim().min(2).max(120),
});

function generateTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

/**
 * Invitation-only account provisioning. Staff-verified through the caller's own
 * RLS-scoped client before any privileged (service role) work happens.
 */
export const createClientAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createAccountSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isStaff } = await context.supabase.rpc("is_staff", {
      _user_id: context.userId,
    });
    if (!isStaff) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tempPassword = generateTempPassword();
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, company: data.company || null },
    });
    if (createError || !created.user) {
      throw new Error(createError?.message ?? "Could not create the account");
    }

    const clientId = created.user.id;

    const { error: projectError } = await supabaseAdmin.from("projects").insert({
      client_id: clientId,
      name: data.projectName,
      status: "discovery",
      progress: 0,
    });
    if (projectError) throw new Error(projectError.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "client_account_created",
      entity: "auth.users",
      entity_id: clientId,
      detail: { email: data.email, project: data.projectName },
    });

    // Returned once so staff can hand the credentials over; never stored in plain text.
    return { ok: true as const, email: data.email, tempPassword };
  });

export const getAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select(
        "id, actor_id, action, entity, entity_id, detail, old_value, new_value, user_agent, created_at",
      )

      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
