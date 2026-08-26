-- =====================================================================
-- ATHROS V6.2 — Project Booking System + Razorpay Integration
-- =====================================================================

-- ---------- 1. BOOKING STATUS ENUM ----------
do $$ begin
  create type public.booking_status as enum (
    'draft',
    'payment_pending',
    'token_paid',
    'under_review',
    'approved',
    'rejected',
    'cancelled',
    'expired'
  );
exception when duplicate_object then null; end $$;

-- ---------- 2. PACKAGE ENUM ----------
do $$ begin
  create type public.package_tier as enum ('mvp', 'production_ready', 'enterprise');
exception when duplicate_object then null; end $$;

-- ---------- 3. ENSURE PAYMENT_STATUS HAS payment_review_required ----------
alter type public.payment_status add value if not exists 'payment_review_required';

-- ---------- 4. PROJECT BOOKINGS ----------
create table if not exists public.project_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique,
  lead_id uuid references public.leads(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  package public.package_tier not null,
  region text not null,
  currency text not null references public.currencies(code),
  full_amount_cents bigint not null check (full_amount_cents >= 0),
  token_amount_cents bigint not null check (token_amount_cents >= 0),
  token_percentage numeric(5,2) not null check (token_percentage > 0 and token_percentage <= 100),
  status public.booking_status not null default 'draft',
  payment_status public.payment_status not null default 'created',
  razorpay_order_id text,
  razorpay_payment_id text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  company_name text,
  project_summary text,
  estimated_requirements text,
  preferred_contact_method text,
  company_website text,
  existing_app_url text,
  reference_links jsonb not null default '[]'::jsonb,
  expires_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_bookings_lead_idx on public.project_bookings(lead_id);
create index if not exists project_bookings_project_idx on public.project_bookings(project_id);
create index if not exists project_bookings_user_idx on public.project_bookings(user_id);
create index if not exists project_bookings_status_idx on public.project_bookings(status, created_at desc);
create index if not exists project_bookings_razorpay_order_idx on public.project_bookings(razorpay_order_id) where razorpay_order_id is not null;
create unique index if not exists project_bookings_razorpay_payment_idx on public.project_bookings(razorpay_payment_id) where razorpay_payment_id is not null;

grant select, insert, update on public.project_bookings to authenticated;
grant all on public.project_bookings to service_role;
alter table public.project_bookings enable row level security;

-- Clients can read their own bookings (by user_id or email match)
create policy "Clients read own bookings" on public.project_bookings
  for select to authenticated using (
    user_id = auth.uid()
    or (user_id is null and customer_email = (select email from auth.users where id = auth.uid()))
  );

-- Staff can read all bookings
create policy "Staff read bookings" on public.project_bookings
  for select to authenticated using (public.auth_is_staff());

-- Public can create bookings (lead capture)
create policy "Public create bookings" on public.project_bookings
  for insert to anon with check (true);

-- Authenticated users can create bookings
create policy "Authenticated create bookings" on public.project_bookings
  for insert to authenticated with check (true);

-- Only admins can update booking status/payment fields (server-owned)
create policy "Admins manage bookings" on public.project_bookings
  for update to authenticated using (public.auth_is_admin()) with check (public.auth_is_admin());

-- ---------- 5. PAYMENT WEBHOOK EVENTS (extend existing) ----------
alter table public.webhook_events
  add column if not exists payload_hash text,
  add column if not exists payload_reference text,
  add column if not exists processing_status text not null default 'received';

create index if not exists webhook_events_provider_type_idx on public.webhook_events(provider, event_type);
create index if not exists webhook_events_status_idx on public.webhook_events(processing_status);

-- ---------- 6. BOOKING STATUS HISTORY ----------
create table if not exists public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.project_bookings(id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_status_history_booking_idx on public.booking_status_history(booking_id, created_at desc);

grant select, insert on public.booking_status_history to authenticated;
grant all on public.booking_status_history to service_role;
alter table public.booking_status_history enable row level security;

create policy "Read booking status history" on public.booking_status_history
  for select to authenticated using (
    exists (select 1 from public.project_bookings pb
      where pb.id = booking_id
      and (pb.user_id = auth.uid() or public.auth_is_staff()))
  );

create policy "Staff write booking status history" on public.booking_status_history
  for insert to authenticated with check (public.auth_is_staff());

-- ---------- 7. EXTEND REGIONAL PRICING FOR PACKAGES ----------
-- Add package column with default
alter table public.regional_pricing
  add column if not exists package public.package_tier;

-- Update existing rows to have package = 'production_ready' where null
update public.regional_pricing
set package = 'production_ready'
where package is null;

-- Now make it not null
alter table public.regional_pricing
  alter column package set not null,
  alter column package set default 'production_ready';

-- Drop old unique constraint if it exists (handle both possible names)
do $$
declare
  constraint_name text;
begin
  -- Check for the old constraint name
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.regional_pricing'::regclass
    and contype = 'u'
    and conname in ('regional_pricing_tier_currency_code_key', 'regional_pricing_currency_code_tier_key');
  
  if constraint_name is not null then
    execute 'alter table public.regional_pricing drop constraint ' || constraint_name;
  end if;
end $$;

-- Add new unique constraint (will fail if duplicates exist, so clean first)
-- First, deduplicate: keep the latest version for each (package, currency_code)
with ranked as (
  select id,
         row_number() over (partition by package, currency_code order by version desc, effective_from desc) as rn
  from public.regional_pricing
)
delete from public.regional_pricing
where id in (select id from ranked where rn > 1);

-- Now add the constraint
alter table public.regional_pricing
  add constraint regional_pricing_package_currency_unique unique (package, currency_code);

-- Update index
drop index if exists regional_pricing_lookup_idx;
create index if not exists regional_pricing_lookup_idx
  on public.regional_pricing (package, currency_code, active, effective_from desc);

-- ---------- 8. SEED REGIONAL PRICING FOR ALL PACKAGES ----------
-- Map package to tier for backward compatibility with existing 'tier' column
insert into public.regional_pricing (package, tier, currency_code, amount_cents, compare_at_cents, reservation_cents, active, version, effective_from) values
  -- MVP tier (maps to 'launch' tier)
  ('mvp', 'launch', 'INR', 2999900, 4999900, 499900, true, 1, now()),
  ('mvp', 'launch', 'USD', 49900, 89900, 9900, true, 1, now()),
  ('mvp', 'launch', 'GBP', 39900, 69900, 7900, true, 1, now()),
  ('mvp', 'launch', 'EUR', 49900, 89900, 9900, true, 1, now()),
  ('mvp', 'launch', 'AED', 199900, 349900, 29900, true, 1, now()),
  ('mvp', 'launch', 'SGD', 69900, 119900, 9900, true, 1, now()),
  
  -- Production Ready tier (maps to 'scale' tier - primary conversion)
  ('production_ready', 'scale', 'INR', 6999900, 12000000, 999900, true, 1, now()),
  ('production_ready', 'scale', 'USD', 149900, 260000, 19900, true, 1, now()),
  ('production_ready', 'scale', 'GBP', 129900, 220000, 17900, true, 1, now()),
  ('production_ready', 'scale', 'EUR', 149900, 260000, 19900, true, 1, now()),
  ('production_ready', 'scale', 'AED', 549900, 940000, 74900, true, 1, now()),
  ('production_ready', 'scale', 'SGD', 199900, 340000, 24900, true, 1, now()),
  
  -- Enterprise tier
  ('enterprise', 'enterprise', 'INR', 19999900, 34000000, 2499900, true, 1, now()),
  ('enterprise', 'enterprise', 'USD', 499900, 850000, 49900, true, 1, now()),
  ('enterprise', 'enterprise', 'GBP', 429900, 730000, 44900, true, 1, now()),
  ('enterprise', 'enterprise', 'EUR', 499900, 850000, 49900, true, 1, now()),
  ('enterprise', 'enterprise', 'AED', 1799900, 3060000, 179900, true, 1, now()),
  ('enterprise', 'enterprise', 'SGD', 649900, 1100000, 64900, true, 1, now())
on conflict (package, currency_code) do nothing;

-- ---------- 9. UPDATED_AT TRIGGERS ----------
create trigger project_bookings_set_updated_at before update on public.project_bookings
  for each row execute function public.set_updated_at();

drop trigger if exists webhook_events_set_updated_at on public.webhook_events;
create trigger webhook_events_set_updated_at before update on public.webhook_events
  for each row execute function public.set_updated_at();

-- ---------- 10. BOOKING NUMBER GENERATOR FUNCTION ----------
create or replace function public.generate_booking_number()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  prefix text := 'ATH';
  date_part text := to_char(now(), 'YYYYMMDD');
  seq int;
  candidate text;
begin
  loop
    select count(*) + 1 into seq
    from public.project_bookings
    where booking_number like prefix || date_part || '%';
    
    candidate := prefix || date_part || lpad(seq::text, 4, '0');
    
    if not exists (select 1 from public.project_bookings where booking_number = candidate) then
      return candidate;
    end if;
  end loop;
end $$;

grant execute on function public.generate_booking_number() to authenticated, service_role;