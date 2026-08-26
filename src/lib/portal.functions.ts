import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();

/** Client-facing portal payload: profile, role, project and all project detail. */
export const getMyPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: roles }, { data: projects }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("projects")
        .select("*")
        .eq("client_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    const project = projects?.[0] ?? null;
    const isAdmin = (roles ?? []).some((row) => row.role === "admin");

    if (!project) {
      return {
        profile,
        isAdmin,
        project: null,
        milestones: [],
        issues: [],
        payments: [],
        deliveries: [],
      };
    }

    const [{ data: milestones }, { data: issues }, { data: payments }, { data: deliveries }] =
      await Promise.all([
        supabase
          .from("project_milestones")
          .select("*")
          .eq("project_id", project.id)
          .order("position", { ascending: true }),
        supabase
          .from("project_issues")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_payments")
          .select("*")
          .eq("project_id", project.id)
          .order("due_date", { ascending: true }),
        supabase
          .from("project_deliveries")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
      ]);

    return {
      profile,
      isAdmin,
      project,
      milestones: milestones ?? [],
      issues: issues ?? [],
      payments: payments ?? [],
      deliveries: deliveries ?? [],
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        fullName: z.string().trim().max(120).optional(),
        company: z.string().trim().max(120).optional(),
        phone: z.string().trim().max(32).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").upsert({
      id: context.userId,
      full_name: data.fullName ?? null,
      company: data.company ?? null,
      phone: data.phone ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Admin console payload — RLS only returns these rows for admins. */
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!isStaff) throw new Error("Forbidden");

    const [
      { data: clients },
      { data: projects },
      { data: deliveries },
      { data: payments },
      { data: issues },
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("project_deliveries").select("*").order("created_at", { ascending: false }),
      supabase.from("project_payments").select("*").order("due_date", { ascending: true }),
      supabase.from("project_issues").select("*").order("created_at", { ascending: false }),
    ]);

    return {
      clients: clients ?? [],
      projects: projects ?? [],
      deliveries: deliveries ?? [],
      payments: payments ?? [],
      issues: issues ?? [],
    };
  });

export const upsertProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid.optional(),
        clientId: uuid,
        name: z.string().trim().min(2).max(120),
        summary: z.string().trim().max(600).optional(),
        platforms: z.array(z.string().trim().max(30)).max(8).default([]),
        status: z.string().trim().max(40).default("discovery"),
        progress: z.number().int().min(0).max(100).default(0),
        launchDate: z.string().trim().max(20).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const row = {
      client_id: data.clientId,
      name: data.name,
      summary: data.summary || null,
      platforms: data.platforms,
      status: data.status,
      progress: data.progress,
      launch_date: data.launchDate || null,
      updated_at: new Date().toISOString(),
    };
    const query = data.id
      ? context.supabase.from("projects").update(row).eq("id", data.id)
      : context.supabase.from("projects").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setProjectProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        projectId: uuid,
        progress: z.number().int().min(0).max(100),
        status: z.string().trim().max(40).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({
        progress: data.progress,
        ...(data.status ? { status: data.status } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const addMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        projectId: uuid,
        title: z.string().trim().min(2).max(140),
        detail: z.string().trim().max(600).optional(),
        status: z.string().trim().max(30).default("pending"),
        dueDate: z.string().trim().max(20).optional(),
        position: z.number().int().min(0).max(200).default(0),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("project_milestones").insert({
      project_id: data.projectId,
      title: data.title,
      detail: data.detail || null,
      status: data.status,
      due_date: data.dueDate || null,
      position: data.position,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setRowStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        table: z.enum(["project_milestones", "project_issues", "project_payments"]),
        id: uuid,
        status: z.string().trim().min(2).max(30),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from(data.table)
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const upsertDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        projectId: uuid,
        label: z.string().trim().min(2).max(120),
        kind: z.string().trim().max(20).default("apk"),
        version: z.string().trim().max(30).optional(),
        downloadUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("project_deliveries").insert({
      project_id: data.projectId,
      label: data.label,
      kind: data.kind,
      version: data.version || null,
      download_url: data.downloadUrl || null,
      unlocked: false,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setDeliveryLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid, unlocked: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_deliveries")
      .update({ unlocked: data.unlocked })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
