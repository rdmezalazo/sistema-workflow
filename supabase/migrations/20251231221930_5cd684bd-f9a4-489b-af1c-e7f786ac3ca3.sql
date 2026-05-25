-- Update contract_status enum to include new workflow states
-- First, create a new enum type with all values
CREATE TYPE contract_status_new AS ENUM (
  'borrador',
  'en_gestion', 
  'aprobado',
  'anulado',
  'activo',
  'pausado',
  'finalizado',
  'cancelado'
);

-- Add a new column with the new type
ALTER TABLE public.contratos 
ADD COLUMN status_new contract_status_new DEFAULT 'borrador';

-- Migrate existing data
UPDATE public.contratos 
SET status_new = status::text::contract_status_new;

-- Drop the old column and rename the new one
ALTER TABLE public.contratos DROP COLUMN status;
ALTER TABLE public.contratos RENAME COLUMN status_new TO status;

-- Add NOT NULL constraint
ALTER TABLE public.contratos ALTER COLUMN status SET NOT NULL;

-- Set default
ALTER TABLE public.contratos ALTER COLUMN status SET DEFAULT 'borrador'::contract_status_new;

-- Drop old enum type
DROP TYPE contract_status;

-- Rename new type to original name
ALTER TYPE contract_status_new RENAME TO contract_status;

-- Add new columns to link contract with proforma and template
ALTER TABLE public.contratos
ADD COLUMN IF NOT EXISTS proforma_id uuid REFERENCES public.proformas(id),
ADD COLUMN IF NOT EXISTS plantilla_id uuid REFERENCES public.contrato_plantillas(id),
ADD COLUMN IF NOT EXISTS datos_plantilla jsonb DEFAULT '{}'::jsonb;