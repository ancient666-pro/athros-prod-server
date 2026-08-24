-- =========================================================
-- ATHROS V6 PHASE 1 — production backend foundation (additive)
-- =========================================================

-- ---------- helper enums ----------
do $$ begin
  create type public.entity_status as enum ('active','inactive','suspended','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.priority_level as enum ('low','medium','high','urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_status as enum ('draft','submitted','approved','rejected','changes_requested');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('created','pending','paid','failed','refunded','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum ('draft','issued','paid','void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_role as enum ('project_manager','developer','support');
exception when duplicate_object then null; end $$;

-- =========================================================
-- SECURITY HELPERS (self-scoped: derive identity from auth.uid())
-- =========================================================
create or replace function public.auth_has_any_role(_roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = any(_roles)
  )
$$;

create or replace function public.auth_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.auth_has_any_role(array['admin','super_admin']::public.app_role[])
$$;

create or replace function public.auth_is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.auth_has_any_role(
    array['admin','super_admin','project_manager','developer','support']::public.app_role[]
  )
$$;

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.assignment_role not null default 'developer',
  created_at timestamptz not null default now(),
  unique (project_id, user_id, role)
);

-- projects columns needed by the helper functions below
alter table public.projects
  add column if not exists manager_id uuid references auth.users(id) on delete set null;

create or replace function public.auth_is_assigned(_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_assignments pa
    where pa.project_id = _project_id and pa.user_id = auth.uid()
  ) or exists (
    select 1 from public.projects p
    where p.id = _project_id and p.manager_id = auth.uid()
  )
$$;

create or replace function public.auth_owns_project(_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects p
    where p.id = _project_id and p.client_id = auth.uid() and auth.uid() is not null
  )
$$;

-- read: owner, admin, support (read-only), or assigned staff
create or replace function public.auth_can_read_project(_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.auth_owns_project(_project_id)
    or public.auth_is_admin()
    or public.auth_has_any_role(array['support']::public.app_role[])
    or public.auth_is_assigned(_project_id)
  )
$$;

-- write: admin, or assigned PM/developer
create or replace function public.auth_can_write_project(_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.auth_is_admin()
    or (
      public.auth_has_any_role(array['project_manager','developer']::public.app_role[])
      and public.auth_is_assigned(_project_id)
    )
  )
$$;

revoke all on function public.auth_has_any_role(public.app_role[]) from public, anon;
revoke all on function public.auth_is_admin() from public, anon;
revoke all on function public.auth_is_staff() from public, anon;
revoke all on function public.auth_is_assigned(uuid) from public, anon;
revoke all on function public.auth_owns_project(uuid) from public, anon;
revoke all on function public.auth_can_read_project(uuid) from public, anon;
revoke all on function public.auth_can_write_project(uuid) from public, anon;
grant execute on function public.auth_has_any_role(public.app_role[]) to authenticated, service_role;
grant execute on function public.auth_is_admin() to authenticated, service_role;
grant execute on function public.auth_is_staff() to authenticated, service_role;
grant execute on function public.auth_is_assigned(uuid) to authenticated, service_role;
grant execute on function public.auth_owns_project(uuid) to authenticated, service_role;
grant execute on function public.auth_can_read_project(uuid) to authenticated, service_role;
grant execute on function public.auth_can_write_project(uuid) to authenticated, service_role;

-- shared updated_at trigger fn
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- =========================================================
-- ROLES CATALOGUE + PERMISSION MATRIX
-- =========================================================
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name public.app_role not null unique,
  label text not null,
  description text,
  permissions text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.roles to authenticated;
grant all on public.roles to service_role;
alter table public.roles enable row level security;

drop policy if exists "Authenticated read roles" on public.roles;
create policy "Authenticated read roles" on public.roles
  for select to authenticated using (true);

drop trigger if exists roles_set_updated_at on public.roles;
create trigger roles_set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();

insert into public.roles (name, label, description, permissions) values
  ('super_admin','Super Admin','Unrestricted platform access', array['*']),
  ('admin','Admin','Full operational access across clients and projects', array[
    'users:read','users:write','projects:read','projects:write','payments:read','payments:write',
    'invoices:read','invoices:write','leads:read','leads:write','requirements:read','requirements:write',
    'enhancements:read','enhancements:write','issues:read','issues:write','delivery:read','delivery:write',
    'meetings:read','meetings:write','notifications:read','notifications:write','audit:read']),
  ('project_manager','Project Manager','Manages assigned projects end to end', array[
    'projects:read','projects:write','requirements:read','requirements:write','enhancements:read',
    'enhancements:write','issues:read','issues:write','delivery:read','delivery:write','meetings:read',
    'meetings:write','payments:read','invoices:read']),
  ('developer','Developer','Delivers work on assigned projects', array[
    'projects:read','requirements:read','issues:read','issues:write','enhancements:read',
    'delivery:read','delivery:write','meetings:read']),
  ('support','Support','Read-only visibility for client support', array[
    'projects:read','issues:read','requirements:read','enhancements:read','delivery:read','meetings:read','payments:read']),
  ('client','Client','Owns their own projects and records', array[
    'projects:read:own','requirements:read:own','requirements:write:own','enhancements:read:own',
    'enhancements:write:own','issues:read:own','issues:write:own','delivery:read:own',
    'payments:read:own','invoices:read:own','meetings:read:own','notifications:read:own'])
on conflict (name) do update set
  label = excluded.label, description = excluded.description, permissions = excluded.permissions;

-- =========================================================
-- PROFILES (extend)
-- =========================================================
alter table public.profiles
  add column if not exists email text,
  add column if not exists avatar_url text,
  add column if not exists status public.entity_status not null default 'active',
  add column if not exists country text,
  add column if not exists currency text not null default 'USD',
  add column if not exists timezone text,
  add column if not exists last_login_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create index if not exists profiles_status_idx on public.profiles(status) where deleted_at is null;
create unique index if not exists profiles_email_key on public.profiles(lower(email)) where email is not null;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop policy if exists "Staff read profiles" on public.profiles;
create policy "Staff read profiles" on public.profiles
  for select to authenticated using (public.auth_is_staff());

drop policy if exists "Admins write profiles" on public.profiles;
create policy "Admins write profiles" on public.profiles
  for update to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

-- =========================================================
-- PROJECTS (extend)
-- =========================================================
alter table public.projects
  add column if not exists manager_id uuid references auth.users(id) on delete set null,
  add column if not exists package text,
  add column if not exists region text,
  add column if not exists currency text not null default 'USD',
  add column if not exists priority public.priority_level not null default 'medium',
  add column if not exists reservation_paid boolean not null default false,
  add column if not exists started_at timestamptz,
  add column if not exists estimated_delivery date,
  add column if not exists completed_at timestamptz,
  add column if not exists github_repo text,
  add column if not exists deployment_url text,
  add column if not exists deleted_at timestamptz;

create index if not exists projects_client_idx on public.projects(client_id);
create index if not exists projects_manager_idx on public.projects(manager_id);
create index if not exists projects_status_created_idx on public.projects(status, created_at desc);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

drop policy if exists "Clients read own projects" on public.projects;
create policy "Project read access" on public.projects
  for select to authenticated using (public.auth_can_read_project(id));

drop policy if exists "Assigned staff update projects" on public.projects;
create policy "Assigned staff update projects" on public.projects
  for update to authenticated using (public.auth_can_write_project(id))
  with check (public.auth_can_write_project(id));

-- ---------- project assignments ----------
create index if not exists project_assignments_project_idx on public.project_assignments(project_id);
create index if not exists project_assignments_user_idx on public.project_assignments(user_id);

grant select on public.project_assignments to authenticated;
grant all on public.project_assignments to service_role;
alter table public.project_assignments enable row level security;

drop policy if exists "Read project assignments" on public.project_assignments;
create policy "Read project assignments" on public.project_assignments
  for select to authenticated
  using (user_id = auth.uid() or public.auth_can_read_project(project_id));

drop policy if exists "Admins manage assignments" on public.project_assignments;
create policy "Admins manage assignments" on public.project_assignments
  for all to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());
grant insert, update, delete on public.project_assignments to authenticated;

-- =========================================================
-- PAYMENTS
-- =========================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete restrict,
  client_id uuid not null references auth.users(id) on delete restrict,
  gateway text not null default 'razorpay',
  order_id text,
  payment_id text,
  currency text not null default 'USD',
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  is_reservation boolean not null default false,
  invoice_id uuid,
  status public.payment_status not null default 'created',
  failure_reason text,
  webhook_verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_gateway_order_key on public.payments(gateway, order_id) where order_id is not null;
create unique index if not exists payments_gateway_payment_key on public.payments(gateway, payment_id) where payment_id is not null;
create index if not exists payments_client_idx on public.payments(client_id, created_at desc);
create index if not exists payments_project_status_idx on public.payments(project_id, status);

grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;

create policy "Read own or permitted payments" on public.payments
  for select to authenticated
  using (
    client_id = auth.uid()
    or public.auth_is_admin()
    or (project_id is not null and public.auth_can_read_project(project_id))
  );

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- =========================================================
-- INVOICES
-- =========================================================
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  payment_id uuid references public.payments(id) on delete set null,
  project_id uuid references public.projects(id) on delete restrict,
  client_id uuid not null references auth.users(id) on delete restrict,
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  currency text not null default 'USD',
  pdf_url text,
  status public.invoice_status not null default 'draft',
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_client_idx on public.invoices(client_id, created_at desc);
create index if not exists invoices_project_idx on public.invoices(project_id);

grant select on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;

create policy "Read own or permitted invoices" on public.invoices
  for select to authenticated
  using (
    client_id = auth.uid()
    or public.auth_is_admin()
    or (project_id is not null and public.auth_can_read_project(project_id))
  );

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

alter table public.payments
  drop constraint if exists payments_invoice_id_fkey;
alter table public.payments
  add constraint payments_invoice_id_fkey foreign key (invoice_id)
  references public.invoices(id) on delete set null;

-- =========================================================
-- REQUIREMENTS (versioned)
-- =========================================================
create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  title text not null,
  body text,
  files jsonb not null default '[]'::jsonb,
  approval_status public.approval_status not null default 'draft',
  created_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, version)
);

create index if not exists requirements_project_idx on public.requirements(project_id, version desc);

grant select, insert, update on public.requirements to authenticated;
grant all on public.requirements to service_role;
alter table public.requirements enable row level security;

create policy "Read permitted requirements" on public.requirements
  for select to authenticated using (public.auth_can_read_project(project_id));
create policy "Create requirements on permitted projects" on public.requirements
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.auth_owns_project(project_id) or public.auth_can_write_project(project_id))
  );
create policy "Update requirements on permitted projects" on public.requirements
  for update to authenticated
  using (public.auth_can_write_project(project_id) or (public.auth_owns_project(project_id) and approval_status = 'draft'))
  with check (public.auth_can_write_project(project_id) or public.auth_owns_project(project_id));

drop trigger if exists requirements_set_updated_at on public.requirements;
create trigger requirements_set_updated_at before update on public.requirements
  for each row execute function public.set_updated_at();

-- =========================================================
-- ENHANCEMENTS + COMMENTS
-- =========================================================
create table if not exists public.enhancements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  priority public.priority_level not null default 'medium',
  status text not null default 'requested',
  requested_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enhancements_project_idx on public.enhancements(project_id, created_at desc);

grant select, insert, update on public.enhancements to authenticated;
grant all on public.enhancements to service_role;
alter table public.enhancements enable row level security;

create policy "Read permitted enhancements" on public.enhancements
  for select to authenticated using (public.auth_can_read_project(project_id));
create policy "Request enhancements" on public.enhancements
  for insert to authenticated
  with check (requested_by = auth.uid()
    and (public.auth_owns_project(project_id) or public.auth_can_write_project(project_id)));
create policy "Update enhancements" on public.enhancements
  for update to authenticated
  using (public.auth_can_write_project(project_id)) with check (public.auth_can_write_project(project_id));

drop trigger if exists enhancements_set_updated_at on public.enhancements;
create trigger enhancements_set_updated_at before update on public.enhancements
  for each row execute function public.set_updated_at();

create table if not exists public.enhancement_comments (
  id uuid primary key default gen_random_uuid(),
  enhancement_id uuid not null references public.enhancements(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists enhancement_comments_parent_idx on public.enhancement_comments(enhancement_id, created_at);

grant select, insert on public.enhancement_comments to authenticated;
grant all on public.enhancement_comments to service_role;
alter table public.enhancement_comments enable row level security;

create policy "Read enhancement comments" on public.enhancement_comments
  for select to authenticated
  using (exists (select 1 from public.enhancements e
    where e.id = enhancement_id and public.auth_can_read_project(e.project_id)));
create policy "Write enhancement comments" on public.enhancement_comments
  for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.enhancements e
    where e.id = enhancement_id and public.auth_can_read_project(e.project_id)));

-- =========================================================
-- ISSUES (extend) + REPLIES
-- =========================================================
create sequence if not exists public.issue_number_seq;

alter table public.project_issues
  add column if not exists issue_number bigint not null default nextval('public.issue_number_seq'),
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists reported_by uuid references auth.users(id) on delete set null,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists resolved_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists project_issues_number_key on public.project_issues(issue_number);
create index if not exists project_issues_project_status_idx on public.project_issues(project_id, status);
create index if not exists project_issues_assigned_idx on public.project_issues(assigned_to);

drop trigger if exists project_issues_set_updated_at on public.project_issues;
create trigger project_issues_set_updated_at before update on public.project_issues
  for each row execute function public.set_updated_at();

drop policy if exists "Clients read own project_issues" on public.project_issues;
create policy "Read permitted issues" on public.project_issues
  for select to authenticated using (public.auth_can_read_project(project_id));
create policy "Clients report issues" on public.project_issues
  for insert to authenticated
  with check (public.auth_owns_project(project_id) or public.auth_can_write_project(project_id));
create policy "Assigned staff update issues" on public.project_issues
  for update to authenticated
  using (public.auth_can_write_project(project_id)) with check (public.auth_can_write_project(project_id));
grant insert, update on public.project_issues to authenticated;

create table if not exists public.issue_replies (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.project_issues(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists issue_replies_issue_idx on public.issue_replies(issue_id, created_at);

grant select, insert on public.issue_replies to authenticated;
grant all on public.issue_replies to service_role;
alter table public.issue_replies enable row level security;

create policy "Read issue replies" on public.issue_replies
  for select to authenticated
  using (exists (select 1 from public.project_issues i
    where i.id = issue_id and public.auth_can_read_project(i.project_id)));
create policy "Write issue replies" on public.issue_replies
  for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.project_issues i
    where i.id = issue_id and public.auth_can_read_project(i.project_id)));

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  description text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id) where read = false;

grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create policy "Read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "Mark own notifications" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================
-- MEETINGS
-- =========================================================
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  agenda text,
  meeting_link text,
  recording_url text,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 480),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meetings_project_idx on public.meetings(project_id, scheduled_at desc);

grant select, insert, update on public.meetings to authenticated;
grant all on public.meetings to service_role;
alter table public.meetings enable row level security;

create policy "Read permitted meetings" on public.meetings
  for select to authenticated using (public.auth_can_read_project(project_id));
create policy "Staff create meetings" on public.meetings
  for insert to authenticated with check (public.auth_can_write_project(project_id));
create policy "Staff update meetings" on public.meetings
  for update to authenticated
  using (public.auth_can_write_project(project_id)) with check (public.auth_can_write_project(project_id));

drop trigger if exists meetings_set_updated_at on public.meetings;
create trigger meetings_set_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

-- =========================================================
-- DELIVERY (extend)
-- =========================================================
alter table public.project_deliveries
  add column if not exists github_url text,
  add column if not exists apk_url text,
  add column if not exists ipa_url text,
  add column if not exists credentials jsonb,
  add column if not exists documentation_url text,
  add column if not exists status text not null default 'pending',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists project_deliveries_project_idx on public.project_deliveries(project_id, created_at desc);

drop trigger if exists project_deliveries_set_updated_at on public.project_deliveries;
create trigger project_deliveries_set_updated_at before update on public.project_deliveries
  for each row execute function public.set_updated_at();

drop policy if exists "Clients read own project_deliveries" on public.project_deliveries;
create policy "Read permitted deliveries" on public.project_deliveries
  for select to authenticated using (public.auth_can_read_project(project_id));
create policy "Staff update deliveries" on public.project_deliveries
  for update to authenticated
  using (public.auth_can_write_project(project_id)) with check (public.auth_can_write_project(project_id));
grant update on public.project_deliveries to authenticated;

-- =========================================================
-- MILESTONES / PAYMENT SCHEDULE policy alignment
-- =========================================================
drop policy if exists "Clients read own project_milestones" on public.project_milestones;
create policy "Read permitted milestones" on public.project_milestones
  for select to authenticated using (public.auth_can_read_project(project_id));

drop policy if exists "Clients read own project_payments" on public.project_payments;
create policy "Read permitted project payments" on public.project_payments
  for select to authenticated using (public.auth_can_read_project(project_id));

-- =========================================================
-- LEADS (extend)
-- =========================================================
alter table public.leads
  add column if not exists country text,
  add column if not exists package text,
  add column if not exists utm jsonb not null default '{}'::jsonb,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists leads_status_created_idx on public.leads(status, created_at desc);
create index if not exists leads_email_idx on public.leads(lower(email));

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create policy "Staff read leads" on public.leads
  for select to authenticated using (public.auth_is_staff());
create policy "Admins update leads" on public.leads
  for update to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());
grant select, update on public.leads to authenticated;

-- =========================================================
-- SESSIONS (app-level session tracking)
-- =========================================================
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  refresh_token_hash text,
  device text,
  user_agent text,
  ip inet,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists user_sessions_user_idx on public.user_sessions(user_id, created_at desc);

grant select on public.user_sessions to authenticated;
grant all on public.user_sessions to service_role;
alter table public.user_sessions enable row level security;

create policy "Read own sessions" on public.user_sessions
  for select to authenticated using (user_id = auth.uid() or public.auth_is_admin());

-- =========================================================
-- AUDIT LOGS (extend)
-- =========================================================
alter table public.audit_logs
  add column if not exists old_value jsonb,
  add column if not exists new_value jsonb,
  add column if not exists ip inet,
  add column if not exists user_agent text;

create index if not exists audit_logs_entity_idx on public.audit_logs(entity, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);