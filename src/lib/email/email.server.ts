import { logger } from "@/lib/observability/logger.server";
import { EMAIL_TEMPLATES, SUBJECTS, type EmailPayload, type EmailTemplate } from "./templates";
import { enqueue } from "@/lib/queue/queue.server";

/**
 * Email delivery with durable tracking in `public.email_messages`.
 * Transport is pluggable; the default renders + hands off to Lovable's managed
 * email API when a sender is configured, and otherwise records the intent so
 * nothing is silently dropped in preview environments.
 */

export interface EmailTransport {
  send(message: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ providerId: string | null }>;
}

class LoggingTransport implements EmailTransport {
  async send(message: { to: string; subject: string }): Promise<{ providerId: string | null }> {
    logger.channel("email").info("email suppressed (no transport configured)", {
      to: message.to,
      subject: message.subject,
    });
    return { providerId: null };
  }
}

let transport: EmailTransport = new LoggingTransport();

export function setEmailTransport(next: EmailTransport): void {
  transport = next;
}

const BRAND = {
  bg: "#05070a",
  card: "#0b1015",
  text: "#e6edf3",
  muted: "#94a3b8",
  accent: "#76b900",
};

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:${BRAND.bg};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:${BRAND.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:${BRAND.card};border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px">
<tr><td style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:${BRAND.accent};padding-bottom:16px">Athros</td></tr>
<tr><td style="font-size:22px;font-weight:600;padding-bottom:12px">${title}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:${BRAND.muted}">${bodyHtml}</td></tr>
<tr><td style="padding-top:28px;font-size:12px;color:rgba(148,163,184,.7)">Athros — AI native app studio</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${href}" style="display:inline-block;background:${BRAND.accent};color:#05070a;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:10px">${label}</a></p>`;
}

function render<T extends EmailTemplate>(
  template: T,
  payload: EmailPayload<T>,
): { subject: string; html: string; text: string } {
  const data = payload as Record<string, unknown>;
  const subject = SUBJECTS[template];
  let body = "";

  switch (template) {
    case "account.invite":
      body = `<p>Hi ${data["fullName"]},</p><p>Your Athros client portal account is ready. Sign in with the credentials below and change your password on first login.</p>
<p><strong>Email:</strong> ${data["email"]}<br/><strong>Temporary password:</strong> ${data["tempPassword"]}</p>${button(String(data["loginUrl"]), "Open the portal")}`;
      break;
    case "account.password-reset":
      body = `<p>We received a request to reset your password. This link expires in ${data["expiresInMinutes"]} minutes.</p>${button(String(data["resetUrl"]), "Reset password")}<p>If you did not request this, you can ignore this email.</p>`;
      break;
    case "account.locked":
      body = `<p>Your account was temporarily locked after repeated failed sign-in attempts. Access is restored automatically in ${data["unlockMinutes"]} minutes.</p>`;
      break;
    case "project.status":
      body = `<p><strong>${data["projectName"]}</strong> moved to <strong>${data["status"]}</strong> — now ${data["progress"]}% complete.</p>${button(String(data["projectUrl"]), "View progress")}`;
      break;
    case "project.milestone":
      body = `<p>Milestone <strong>${data["milestone"]}</strong> on ${data["projectName"]} is complete.</p>${button(String(data["projectUrl"]), "View timeline")}`;
      break;
    case "delivery.ready":
      body = `<p><strong>${data["label"]}</strong> for ${data["projectName"]} is now available in your portal.</p>${button(String(data["projectUrl"]), "Download build")}`;
      break;
    case "payment.receipt":
      body = `<p>We received your payment of <strong>${data["amount"]}</strong>. Invoice ${data["invoiceNumber"]}.</p>${
        data["invoiceUrl"] ? button(String(data["invoiceUrl"]), "Download invoice") : ""
      }`;
      break;
    case "meeting.scheduled":
      body = `<p><strong>${data["title"]}</strong> for ${data["projectName"]} is scheduled for ${data["scheduledAt"]}.</p>${
        data["meetingLink"] ? button(String(data["meetingLink"]), "Join the call") : ""
      }`;
      break;
    default:
      body = `<p>Hi ${data["fullName"] ?? "there"}, thanks for reaching out — our team will reply within one business day.</p>`;
  }

  const text = body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { subject, html: layout(subject, body), text };
}

export interface SendOptions {
  readonly userId?: string | null;
  readonly projectId?: string | null;
}

/** Sends immediately and records the outcome. Never throws into the caller's path. */
export async function sendEmail<T extends EmailTemplate>(
  template: T,
  to: string,
  payload: EmailPayload<T>,
  options: SendOptions = {},
): Promise<{ sent: boolean; messageId: string | null }> {
  const parsed = EMAIL_TEMPLATES[template].parse(payload) as EmailPayload<T>;
  const { subject, html, text } = render(template, parsed);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: row } = await supabaseAdmin
    .from("email_messages")
    .insert({
      template,
      to_email: to.toLowerCase(),
      subject,
      payload: parsed as never,
      user_id: options.userId ?? null,
      project_id: options.projectId ?? null,
      status: "pending",
    })
    .select("id, attempts")
    .single();

  try {
    const { providerId } = await transport.send({ to, subject, html, text });
    if (row) {
      await supabaseAdmin
        .from("email_messages")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_id: providerId,
          attempts: row.attempts + 1,
        })
        .eq("id", row.id);
    }
    return { sent: true, messageId: row?.id ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.channel("email").error("email send failed", error, { template, to });
    if (row) {
      await supabaseAdmin
        .from("email_messages")
        .update({ status: "failed", last_error: message.slice(0, 1000), attempts: row.attempts + 1 })
        .eq("id", row.id);
      await enqueue("email", { messageId: row.id }).catch(() => undefined);
    }
    return { sent: false, messageId: row?.id ?? null };
  }
}

/** Retries a previously failed message (used by the `email` queue handler). */
export async function retryEmail(messageId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("email_messages")
    .select("id, template, to_email, payload, user_id, project_id, status")
    .eq("id", messageId)
    .maybeSingle();
  if (!data || data.status === "sent") return true;

  const template = data.template as EmailTemplate;
  const schema = EMAIL_TEMPLATES[template];
  if (!schema) return false;
  const parsed = schema.safeParse(data.payload);
  if (!parsed.success) return false;

  const result = await sendEmail(template, data.to_email, parsed.data as never, {
    userId: data.user_id,
    projectId: data.project_id,
  });
  return result.sent;
}
