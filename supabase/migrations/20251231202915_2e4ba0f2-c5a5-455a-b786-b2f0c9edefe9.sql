-- Add servicios column to proforma_plantillas to separate campos (custom fields) from servicios (selected services)
ALTER TABLE public.proforma_plantillas 
ADD COLUMN IF NOT EXISTS servicios jsonb NOT NULL DEFAULT '[]'::jsonb;