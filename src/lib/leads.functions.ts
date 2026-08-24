import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const leadSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name").max(100),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  projectType: z.string().trim().max(60).optional().or(z.literal("")),
  budget: z.string().trim().max(60).optional().or(z.literal("")),
  timeline: z.string().trim().max(60).optional().or(z.literal("")),
  platforms: z.array(z.string().trim().max(40)).max(8).default([]),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  referralSource: z.string().trim().max(80).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("leads").insert({
      full_name: data.fullName,
      company: data.company || null,
      email: data.email,
      phone: data.phone || null,
      project_type: data.projectType || null,
      budget: data.budget || null,
      timeline: data.timeline || null,
      platforms: data.platforms,
      message: data.message || null,
      referral_source: data.referralSource || null,
      source: "landing_cta",
    });

    if (error) {
      console.error("lead insert failed", error.message);
      throw new Error("We could not save your request. Please try again.");
    }

    // Optional mirror into a Google Sheet via an Apps Script webhook.
    const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (webhook) {
      try {
        const response = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, submittedAt: new Date().toISOString() }),
        });
        if (!response.ok) {
          console.error(
            `Sheets webhook failed [${response.status}]: ${await response.text()}`,
          );
        }
      } catch (sheetError) {
        console.error("Sheets webhook error", sheetError);
      }
    }

    return { ok: true as const };
  });
