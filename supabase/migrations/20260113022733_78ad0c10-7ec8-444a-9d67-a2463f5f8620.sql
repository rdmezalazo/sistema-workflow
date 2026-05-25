-- Drop the existing enum type constraint on proforma_plantillas
-- First remove the default
ALTER TABLE public.proforma_plantillas 
ALTER COLUMN tipo DROP DEFAULT;

-- Change the column type from enum to text
ALTER TABLE public.proforma_plantillas 
ALTER COLUMN tipo TYPE text USING tipo::text;

-- Update existing values to new format
UPDATE public.proforma_plantillas 
SET tipo = 'Contabilidad' 
WHERE tipo = 'contabilidad';

UPDATE public.proforma_plantillas 
SET tipo = 'Trámites' 
WHERE tipo = 'tramites';

-- Add new check constraint that accepts all 3 groups
ALTER TABLE public.proforma_plantillas 
ADD CONSTRAINT proforma_plantillas_grupo_check 
CHECK (tipo IN ('Contabilidad', 'Trámites', 'Auditoría y Control Interno'));

-- Set new default
ALTER TABLE public.proforma_plantillas 
ALTER COLUMN tipo SET DEFAULT 'Contabilidad';

-- Same for proformas table
ALTER TABLE public.proformas 
ALTER COLUMN tipo DROP DEFAULT;

ALTER TABLE public.proformas 
ALTER COLUMN tipo TYPE text USING tipo::text;

UPDATE public.proformas 
SET tipo = 'Contabilidad' 
WHERE tipo = 'contabilidad';

UPDATE public.proformas 
SET tipo = 'Trámites' 
WHERE tipo = 'tramites';

ALTER TABLE public.proformas 
ADD CONSTRAINT proformas_grupo_check 
CHECK (tipo IN ('Contabilidad', 'Trámites', 'Auditoría y Control Interno'));

ALTER TABLE public.proformas 
ALTER COLUMN tipo SET DEFAULT 'Contabilidad';