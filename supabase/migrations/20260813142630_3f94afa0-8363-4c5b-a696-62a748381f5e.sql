ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'checkout_pending' AFTER 'created';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'authorized' AFTER 'pending';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'captured' AFTER 'authorized';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'partially_refunded' AFTER 'paid';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tier text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS pricing_version integer;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_uidx
  ON public.payments (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.regional_pricing ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.regional_pricing ADD COLUMN IF NOT EXISTS effective_from timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.regional_pricing ADD COLUMN IF NOT EXISTS effective_until timestamptz;
CREATE INDEX IF NOT EXISTS regional_pricing_lookup_idx
  ON public.regional_pricing (tier, currency_code, active, effective_from DESC);

ALTER TABLE public.project_status_history ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.project_status_history ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_valid;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_valid CHECK (
  status IN (
    'discovery','requirements','design','development','testing',
    'uat','delivery','live','maintenance','on_hold','completed','cancelled'
  )
);