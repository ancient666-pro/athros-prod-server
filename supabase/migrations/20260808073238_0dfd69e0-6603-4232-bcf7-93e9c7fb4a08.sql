-- =====================================================================
-- ATHROS V6.1 — additive production hardening
-- =====================================================================

-- ---------- 1. SESSION MANAGEMENT ------------------------------------
alter table public.user_sessions
  add column if not exists browser text,
  add column if not exists os text,
  add column if not exists country text,
  add column if not exists fingerprint text,
  add column if not exists remember_me boolean not null default false,
  add column if not exists idle_expires_at timestamptz,
  add column if not exists rotated_from uuid references public.user_sessions(id) on delete set null,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references auth.users(id) on delete set null,
  add column if not exists revoke_reason text;

create index if not exists user_sessions_user_idx on public.user_sessions(user_id, created_at desc);
create index if not exists user_sessions_expiry_idx on public.user_sessions(expires_at);

-- ---------- 2. ACCOUNT SECURITY --------------------------------------
create table if not exists public.account_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_login_count integer not null default 0,
  last_failed_login_at timestamptz,
  locked_until timestamptz,
  password_changed_at timestamptz not null default now(),
  password_expires_at timestamptz,
  email_verified boolean not null default false,
  two_factor_enabled boolean not null default false,
  two_factor_secret text,
  otp_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.account_security to authenticated;
grant all on public.account_security to service_role;
alter table public.account_security enable row level security;
create policy "own security state readable" on public.account_security
  for select to authenticated using (user_id = auth.uid() or public.auth_is_admin());

create table if not exists public.password_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now()
);
grant select on public.password_history to authenticated;
grant all on public.password_history to service_role;
alter table public.password_history enable row level security;
create policy "own password history readable" on public.password_history
  for select to authenticated using (user_id = auth.uid());
create index if not exists password_history_user_idx on public.password_history(user_id, created_at desc);

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  success boolean not null default false,
  ip inet,
  user_agent text,
  country text,
  fingerprint text,
  reason text,
  created_at timestamptz not null default now()
);
grant select on public.login_attempts to authenticated;
grant all on public.login_attempts to service_role;
alter table public.login_attempts enable row level security;
create policy "login history readable" on public.login_attempts
  for select to authenticated using (user_id = auth.uid() or public.auth_is_staff());
create index if not exists login_attempts_email_idx on public.login_attempts(lower(email), created_at desc);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null,
  severity text not null default 'info',
  message text,
  detail jsonb not null default '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
grant select on public.security_events to authenticated;
grant all on public.security_events to service_role;
alter table public.security_events enable row level security;
create policy "security events readable" on public.security_events
  for select to authenticated using (user_id = auth.uid() or public.auth_is_staff());
create index if not exists security_events_created_idx on public.security_events(created_at desc);

-- ---------- 3. WEBHOOK FRAMEWORK -------------------------------------
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text,
  external_id text,
  signature_verified boolean not null default false,
  status text not null default 'received',
  attempts integer not null default 0,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  headers jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists webhook_events_provider_external_idx
  on public.webhook_events(provider, external_id) where external_id is not null;
grant select on public.webhook_events to authenticated;
grant all on public.webhook_events to service_role;
alter table public.webhook_events enable row level security;
create policy "staff read webhook events" on public.webhook_events
  for select to authenticated using (public.auth_is_staff());

-- ---------- 4. EMAIL INFRASTRUCTURE ----------------------------------
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  template text not null,
  to_email text not null,
  subject text,
  user_id uuid references auth.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  status text not null default 'queued',
  attempts integer not null default 0,
  last_error text,
  provider_id text,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.email_messages to authenticated;
grant all on public.email_messages to service_role;
alter table public.email_messages enable row level security;
create policy "email log readable" on public.email_messages
  for select to authenticated using (user_id = auth.uid() or public.auth_is_staff());
create index if not exists email_messages_status_idx on public.email_messages(status, created_at desc);

-- ---------- 5. BACKGROUND JOBS ---------------------------------------
create table if not exists public.job_queue (
  id uuid primary key default gen_random_uuid(),
  queue text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  priority integer not null default 0,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.job_queue to authenticated;
grant all on public.job_queue to service_role;
alter table public.job_queue enable row level security;
create policy "staff read jobs" on public.job_queue
  for select to authenticated using (public.auth_is_staff());
create index if not exists job_queue_dispatch_idx on public.job_queue(status, run_at, priority desc);

-- ---------- 6. OBSERVABILITY -----------------------------------------
create table if not exists public.app_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info',
  channel text not null default 'app',
  message text not null,
  request_id text,
  correlation_id text,
  user_id uuid references auth.users(id) on delete set null,
  duration_ms integer,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.app_logs to authenticated;
grant all on public.app_logs to service_role;
alter table public.app_logs enable row level security;
create policy "staff read app logs" on public.app_logs
  for select to authenticated using (public.auth_is_staff());
create index if not exists app_logs_created_idx on public.app_logs(created_at desc);

-- ---------- 7. REGION & CURRENCY FOUNDATION --------------------------
create table if not exists public.currencies (
  code text primary key,
  name text not null,
  symbol text not null,
  minor_units integer not null default 2,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.currencies to anon, authenticated;
grant all on public.currencies to service_role;
alter table public.currencies enable row level security;
create policy "currencies public read" on public.currencies for select using (true);
create policy "admins manage currencies" on public.currencies
  for all to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

create table if not exists public.countries (
  code text primary key,
  name text not null,
  currency_code text references public.currencies(code),
  region text,
  default_locale text,
  default_timezone text,
  calling_code text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.countries to anon, authenticated;
grant all on public.countries to service_role;
alter table public.countries enable row level security;
create policy "countries public read" on public.countries for select using (true);
create policy "admins manage countries" on public.countries
  for all to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

create table if not exists public.regional_pricing (
  id uuid primary key default gen_random_uuid(),
  tier text not null,
  currency_code text not null references public.currencies(code),
  amount_cents bigint not null,
  compare_at_cents bigint,
  reservation_cents bigint,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tier, currency_code)
);
grant select on public.regional_pricing to anon, authenticated;
grant all on public.regional_pricing to service_role;
alter table public.regional_pricing enable row level security;
create policy "regional pricing public read" on public.regional_pricing for select using (active);
create policy "admins manage regional pricing" on public.regional_pricing
  for all to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

create table if not exists public.exchange_metadata (
  base_code text not null references public.currencies(code),
  quote_code text not null references public.currencies(code),
  rate numeric(18,8) not null,
  source text not null default 'manual',
  fetched_at timestamptz not null default now(),
  primary key (base_code, quote_code)
);
grant select on public.exchange_metadata to anon, authenticated;
grant all on public.exchange_metadata to service_role;
alter table public.exchange_metadata enable row level security;
create policy "exchange metadata public read" on public.exchange_metadata for select using (true);
create policy "admins manage exchange metadata" on public.exchange_metadata
  for all to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

alter table public.projects
  add column if not exists country text,
  add column if not exists locale text,
  add column if not exists timezone text,
  add column if not exists preferred_language text not null default 'en';

-- ---------- 8. PROJECT LIFECYCLE ENGINE ------------------------------
create table if not exists public.project_status_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  note text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);
grant select, insert on public.project_status_history to authenticated;
grant all on public.project_status_history to service_role;
alter table public.project_status_history enable row level security;
create policy "read project status history" on public.project_status_history
  for select to authenticated using (public.auth_can_read_project(project_id));
create policy "write project status history" on public.project_status_history
  for insert to authenticated with check (public.auth_can_write_project(project_id));
create index if not exists project_status_history_project_idx
  on public.project_status_history(project_id, created_at desc);

-- ---------- updated_at triggers --------------------------------------
create trigger account_security_set_updated_at before update on public.account_security
  for each row execute function public.set_updated_at();
create trigger webhook_events_set_updated_at before update on public.webhook_events
  for each row execute function public.set_updated_at();
create trigger email_messages_set_updated_at before update on public.email_messages
  for each row execute function public.set_updated_at();
create trigger job_queue_set_updated_at before update on public.job_queue
  for each row execute function public.set_updated_at();
create trigger regional_pricing_set_updated_at before update on public.regional_pricing
  for each row execute function public.set_updated_at();

-- ---------- seed reference data --------------------------------------
insert into public.currencies (code, name, symbol, minor_units) values
  ('INR','Indian Rupee','₹',2),
  ('USD','US Dollar','$',2),
  ('GBP','Pound Sterling','£',2),
  ('EUR','Euro','€',2),
  ('AED','UAE Dirham','AED',2),
  ('SGD','Singapore Dollar','S$',2)
on conflict (code) do nothing;

insert into public.countries (code, name, currency_code, region, default_locale, default_timezone, calling_code) values
  ('IN','India','INR','APAC','en-IN','Asia/Kolkata','+91'),
  ('US','United States','USD','AMER','en-US','America/New_York','+1'),
  ('GB','United Kingdom','GBP','EMEA','en-GB','Europe/London','+44'),
  ('DE','Germany','EUR','EMEA','de-DE','Europe/Berlin','+49'),
  ('FR','France','EUR','EMEA','fr-FR','Europe/Paris','+33'),
  ('AE','United Arab Emirates','AED','EMEA','en-AE','Asia/Dubai','+971'),
  ('SA','Saudi Arabia','AED','EMEA','en-SA','Asia/Riyadh','+966'),
  ('SG','Singapore','SGD','APAC','en-SG','Asia/Singapore','+65'),
  ('CA','Canada','USD','AMER','en-CA','America/Toronto','+1'),
  ('AU','Australia','USD','APAC','en-AU','Australia/Sydney','+61')
on conflict (code) do nothing;

insert into public.regional_pricing (tier, currency_code, amount_cents, compare_at_cents, reservation_cents) values
  ('launch','INR',6999900,12000000,999900),
  ('scale','INR',19999900,34000000,2499900),
  ('launch','USD',149900,260000,19900),
  ('scale','USD',499900,850000,49900),
  ('launch','GBP',129900,220000,17900),
  ('scale','GBP',429900,730000,44900),
  ('launch','EUR',149900,260000,19900),
  ('scale','EUR',499900,850000,49900),
  ('launch','AED',549900,940000,74900),
  ('scale','AED',1799900,3060000,179900),
  ('launch','SGD',199900,340000,24900),
  ('scale','SGD',649900,1100000,64900)
on conflict (tier, currency_code) do nothing;

insert into public.exchange_metadata (base_code, quote_code, rate, source) values
  ('USD','INR',87.50000000,'seed'),
  ('USD','GBP',0.78000000,'seed'),
  ('USD','EUR',0.92000000,'seed'),
  ('USD','AED',3.67250000,'seed'),
  ('USD','SGD',1.34000000,'seed')
on conflict (base_code, quote_code) do nothing;
