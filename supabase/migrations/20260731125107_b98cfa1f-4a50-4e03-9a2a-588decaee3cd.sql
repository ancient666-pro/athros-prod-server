CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  project_type TEXT,
  budget TEXT,
  timeline TEXT,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  message TEXT,
  referral_source TEXT,
  attachment_path TEXT,
  source TEXT NOT NULL DEFAULT 'landing_cta',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages leads"
  ON public.leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);