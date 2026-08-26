import { z } from "zod";

/**
 * Declarative resource registry. One entry per `/api/v1/<name>` collection.
 * RLS is the enforcement boundary; `permissions` is defense-in-depth so a
 * caller without the capability never reaches Postgres at all.
 * Client-safe: schemas only, no server imports.
 */
export interface ResourceConfig {
  readonly name: string;
  readonly table: string;
  readonly select: string;
  readonly orderColumn: string;
  readonly permissions: { readonly read: string; readonly write: string };
  readonly createSchema: z.ZodType<Record<string, unknown>> | null;
  readonly updateSchema: z.ZodType<Record<string, unknown>> | null;
  /** Columns stripped from responses for non-admin callers. */
  readonly sensitive: readonly string[];
  /** Column used by `?projectId=` filtering. */
  readonly projectColumn: string | null;
  /** Columns eligible for the `?q=` ilike search. */
  readonly searchable: readonly string[];
  /** Server code sets these from the session; clients may never supply them. */
  readonly serverOwnedFields: readonly string[];
}

const uuid = z.string().uuid();
const shortText = z.string().trim().min(1).max(140);
const longText = z.string().trim().max(4000);
const priority = z.enum(["low", "medium", "high", "urgent"]);

const jsonArray = z.array(z.record(z.string(), z.unknown())).max(50);

function resource(config: ResourceConfig): ResourceConfig {
  return config;
}

export const RESOURCES: Record<string, ResourceConfig> = {
  users: resource({
    name: "users",
    table: "profiles",
    select:
      "id, full_name, company, phone, email, avatar_url, status, country, currency, timezone, last_login_at, created_at, updated_at",
    orderColumn: "created_at",
    permissions: { read: "users:read", write: "users:write" },
    createSchema: null,
    updateSchema: z.object({
      full_name: z.string().trim().max(120).nullish(),
      company: z.string().trim().max(120).nullish(),
      phone: z.string().trim().max(32).nullish(),
      country: z.string().trim().length(2).nullish(),
      currency: z.string().trim().length(3).nullish(),
      timezone: z.string().trim().max(60).nullish(),
      status: z.enum(["active", "inactive", "suspended", "archived"]).optional(),
    }),
    sensitive: [],
    projectColumn: null,
    searchable: ["full_name", "company", "email"],
    serverOwnedFields: ["id", "last_login_at", "deleted_at"],
  }),

  projects: resource({
    name: "projects",
    table: "projects",
    select:
      "id, client_id, manager_id, name, summary, platforms, package, region, currency, status, priority, progress, reservation_paid, started_at, estimated_delivery, completed_at, launch_date, github_repo, deployment_url, created_at, updated_at",
    orderColumn: "created_at",
    permissions: { read: "projects:read", write: "projects:write" },
    createSchema: z.object({
      client_id: uuid,
      name: shortText,
      summary: longText.optional(),
      platforms: z.array(z.string().trim().max(30)).max(8).default([]),
      package: z.string().trim().max(60).optional(),
      region: z.string().trim().max(40).optional(),
      currency: z.string().trim().length(3).default("USD"),
      status: z.string().trim().max(40).default("discovery"),
      priority: priority.default("medium"),
      manager_id: uuid.optional(),
      estimated_delivery: z.string().date().optional(),
    }),
    updateSchema: z.object({
      name: shortText.optional(),
      summary: longText.nullish(),
      platforms: z.array(z.string().trim().max(30)).max(8).optional(),
      package: z.string().trim().max(60).nullish(),
      region: z.string().trim().max(40).nullish(),
      status: z.string().trim().max(40).optional(),
      priority: priority.optional(),
      progress: z.number().int().min(0).max(100).optional(),
      manager_id: uuid.nullish(),
      reservation_paid: z.boolean().optional(),
      started_at: z.string().datetime().nullish(),
      estimated_delivery: z.string().date().nullish(),
      completed_at: z.string().datetime().nullish(),
      github_repo: z.string().url().max(300).nullish(),
      deployment_url: z.string().url().max(300).nullish(),
    }),
    sensitive: [],
    projectColumn: "id",
    searchable: ["name", "summary"],
    serverOwnedFields: ["id", "created_at", "updated_at", "deleted_at"],
  }),

  payments: resource({
    name: "payments",
    table: "payments",
    select:
      "id, project_id, client_id, gateway, order_id, payment_id, currency, amount_cents, is_reservation, invoice_id, status, failure_reason, webhook_verified, created_at",
    orderColumn: "created_at",
    permissions: { read: "payments:read", write: "payments:write" },
    createSchema: null, // gateway/webhook owned
    updateSchema: null,
    sensitive: ["failure_reason"],
    projectColumn: "project_id",
    searchable: ["order_id", "payment_id"],
    serverOwnedFields: [],
  }),

  invoices: resource({
    name: "invoices",
    table: "invoices",
    select:
      "id, invoice_number, payment_id, project_id, client_id, amount_cents, currency, pdf_url, status, issued_at, created_at",
    orderColumn: "created_at",
    permissions: { read: "invoices:read", write: "invoices:write" },
    createSchema: null,
    updateSchema: null,
    sensitive: [],
    projectColumn: "project_id",
    searchable: ["invoice_number"],
    serverOwnedFields: [],
  }),

  leads: resource({
    name: "leads",
    table: "leads",
    select:
      "id, full_name, company, email, phone, country, project_type, package, budget, timeline, platforms, message, referral_source, utm, source, status, assigned_to, created_at",
    orderColumn: "created_at",
    permissions: { read: "leads:read", write: "leads:write" },
    createSchema: null, // public funnel writes through submitLead
    updateSchema: z.object({
      status: z.string().trim().max(40).optional(),
      assigned_to: uuid.nullish(),
    }),
    sensitive: [],
    projectColumn: null,
    searchable: ["full_name", "company", "email"],
    serverOwnedFields: ["id", "created_at"],
  }),

  requirements: resource({
    name: "requirements",
    table: "requirements",
    select:
      "id, project_id, version, title, body, files, approval_status, created_by, reviewed_by, reviewed_at, created_at, updated_at",
    orderColumn: "created_at",
    permissions: { read: "requirements:read", write: "requirements:write" },
    createSchema: z.object({
      project_id: uuid,
      title: shortText,
      body: longText.optional(),
      files: jsonArray.default([]),
    }),
    updateSchema: z.object({
      title: shortText.optional(),
      body: longText.nullish(),
      files: jsonArray.optional(),
      approval_status: z
        .enum(["draft", "submitted", "approved", "rejected", "changes_requested"])
        .optional(),
    }),
    sensitive: [],
    projectColumn: "project_id",
    searchable: ["title"],
    serverOwnedFields: ["created_by", "version", "reviewed_by", "reviewed_at"],
  }),

  enhancements: resource({
    name: "enhancements",
    table: "enhancements",
    select:
      "id, project_id, title, description, priority, status, requested_by, created_at, updated_at",
    orderColumn: "created_at",
    permissions: { read: "enhancements:read", write: "enhancements:write" },
    createSchema: z.object({
      project_id: uuid,
      title: shortText,
      description: longText.optional(),
      priority: priority.default("medium"),
    }),
    updateSchema: z.object({
      title: shortText.optional(),
      description: longText.nullish(),
      priority: priority.optional(),
      status: z.string().trim().max(40).optional(),
    }),
    sensitive: [],
    projectColumn: "project_id",
    searchable: ["title", "description"],
    serverOwnedFields: ["requested_by"],
  }),

  issues: resource({
    name: "issues",
    table: "project_issues",
    select:
      "id, issue_number, project_id, title, detail, severity, status, assigned_to, reported_by, attachments, resolved_at, created_at, updated_at",
    orderColumn: "created_at",
    permissions: { read: "issues:read", write: "issues:write" },
    createSchema: z.object({
      project_id: uuid,
      title: shortText,
      detail: longText.optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      attachments: jsonArray.default([]),
    }),
    updateSchema: z.object({
      title: shortText.optional(),
      detail: longText.nullish(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      status: z.string().trim().max(40).optional(),
      assigned_to: uuid.nullish(),
      attachments: jsonArray.optional(),
      resolved_at: z.string().datetime().nullish(),
    }),
    sensitive: [],
    projectColumn: "project_id",
    searchable: ["title", "detail"],
    serverOwnedFields: ["issue_number", "reported_by"],
  }),

  delivery: resource({
    name: "delivery",
    table: "project_deliveries",
    select:
      "id, project_id, label, kind, version, download_url, github_url, apk_url, ipa_url, documentation_url, credentials, status, unlocked, created_at, updated_at",
    orderColumn: "created_at",
    permissions: { read: "delivery:read", write: "delivery:write" },
    createSchema: z.object({
      project_id: uuid,
      label: shortText,
      kind: z.string().trim().max(20).default("apk"),
      version: z.string().trim().max(30).optional(),
      download_url: z.string().url().max(500).optional(),
      github_url: z.string().url().max(300).optional(),
      apk_url: z.string().url().max(500).optional(),
      ipa_url: z.string().url().max(500).optional(),
      documentation_url: z.string().url().max(500).optional(),
    }),
    updateSchema: z.object({
      label: shortText.optional(),
      version: z.string().trim().max(30).nullish(),
      download_url: z.string().url().max(500).nullish(),
      github_url: z.string().url().max(300).nullish(),
      apk_url: z.string().url().max(500).nullish(),
      ipa_url: z.string().url().max(500).nullish(),
      documentation_url: z.string().url().max(500).nullish(),
      status: z.string().trim().max(40).optional(),
      unlocked: z.boolean().optional(),
    }),
    sensitive: ["credentials"],
    projectColumn: "project_id",
    searchable: ["label"],
    serverOwnedFields: ["credentials"],
  }),

  meetings: resource({
    name: "meetings",
    table: "meetings",
    select:
      "id, project_id, title, agenda, meeting_link, recording_url, scheduled_at, duration_minutes, created_by, created_at, updated_at",
    orderColumn: "scheduled_at",
    permissions: { read: "meetings:read", write: "meetings:write" },
    createSchema: z.object({
      project_id: uuid,
      title: shortText,
      agenda: longText.optional(),
      meeting_link: z.string().url().max(500).optional(),
      scheduled_at: z.string().datetime(),
      duration_minutes: z.number().int().min(5).max(480).default(30),
    }),
    updateSchema: z.object({
      title: shortText.optional(),
      agenda: longText.nullish(),
      meeting_link: z.string().url().max(500).nullish(),
      recording_url: z.string().url().max(500).nullish(),
      scheduled_at: z.string().datetime().optional(),
      duration_minutes: z.number().int().min(5).max(480).optional(),
    }),
    sensitive: [],
    projectColumn: "project_id",
    searchable: ["title", "agenda"],
    serverOwnedFields: ["created_by"],
  }),

  notifications: resource({
    name: "notifications",
    table: "notifications",
    select: "id, user_id, type, title, description, link, read, created_at",
    orderColumn: "created_at",
    permissions: { read: "notifications:read", write: "notifications:write" },
    createSchema: null,
    updateSchema: z.object({ read: z.boolean() }),
    sensitive: [],
    projectColumn: null,
    searchable: ["title"],
    serverOwnedFields: ["user_id", "type", "title", "description", "link"],
  }),

  bookings: resource({
    name: "bookings",
    table: "project_bookings",
    select:
      "id, booking_number, lead_id, project_id, user_id, package, region, currency, full_amount_cents, token_amount_cents, token_percentage, status, payment_status, razorpay_order_id, razorpay_payment_id, customer_name, customer_email, customer_phone, company_name, project_summary, estimated_requirements, preferred_contact_method, company_website, existing_app_url, reference_links, expires_at, paid_at, cancelled_at, created_at, updated_at",
    orderColumn: "created_at",
    permissions: { read: "bookings:read", write: "bookings:write" },
    createSchema: z.object({
      package: z.enum(["mvp", "production_ready", "enterprise"]),
      region: z.string().trim().length(2),
      currency: z.string().trim().length(3),
      customer_name: z.string().trim().min(2).max(100),
      customer_email: z.string().email().max(255),
      customer_phone: z.string().trim().max(32).optional(),
      company_name: z.string().trim().max(120).optional(),
      project_summary: z.string().trim().max(2000).optional(),
      estimated_requirements: z.string().trim().max(2000).optional(),
      preferred_contact_method: z.string().trim().max(40).optional(),
      company_website: z.string().url().max(300).optional(),
      existing_app_url: z.string().url().max(300).optional(),
      reference_links: z.array(z.string().url()).max(10).default([]),
    }),
    updateSchema: z.object({
      status: z
        .enum([
          "draft",
          "payment_pending",
          "token_paid",
          "under_review",
          "approved",
          "rejected",
          "cancelled",
          "expired",
        ])
        .optional(),
      project_id: uuid.nullish(),
    }),
    sensitive: ["razorpay_order_id", "razorpay_payment_id"],
    projectColumn: "project_id",
    searchable: ["booking_number", "customer_name", "customer_email", "company_name"],
    serverOwnedFields: [
      "id",
      "booking_number",
      "lead_id",
      "project_id",
      "user_id",
      "full_amount_cents",
      "token_amount_cents",
      "token_percentage",
      "status",
      "payment_status",
      "razorpay_order_id",
      "razorpay_payment_id",
      "expires_at",
      "paid_at",
      "cancelled_at",
      "created_at",
      "updated_at",
    ],
  }),
};

export function getResource(name: string): ResourceConfig | null {
  return Object.hasOwn(RESOURCES, name) ? (RESOURCES[name] as ResourceConfig) : null;
}
