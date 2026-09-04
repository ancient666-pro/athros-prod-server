-- =====================================================================
-- ATHROS — Booking Services Snapshot (additive)
-- Adds an immutable JSONB snapshot of selected modular services
-- to project_bookings so historical bookings are never affected
-- by future catalog price changes.
-- =====================================================================

-- Add the selected_services snapshot column (additive, safe default).
-- Each element is a frozen record of exactly what was booked:
--   serviceId, serviceLabel, planId, planName, currency,
--   unitPriceCents, quantity, subtotalCents, deliveryDuration,
--   isRecurring, allocationHours (nullable)
alter table public.project_bookings
  add column if not exists selected_services jsonb not null default '[]'::jsonb;

comment on column public.project_bookings.selected_services is
  'Immutable snapshot of modular services selected at booking time. '
  'Do not recalculate from the current catalog -- use this snapshot for all '
  'historical invoice/admin/dashboard display.';

-- Index for fast querying of bookings that include specific services
-- (e.g. "all bookings with web development"). Uses GIN for JSONB array contains.
create index if not exists project_bookings_services_gin_idx
  on public.project_bookings using gin (selected_services);
