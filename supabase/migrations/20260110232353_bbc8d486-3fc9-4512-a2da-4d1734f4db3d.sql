-- Drop the old check constraint
ALTER TABLE public.servicios DROP CONSTRAINT IF EXISTS servicios_tipo_check;

-- Add updated check constraint with "auditoria" option
ALTER TABLE public.servicios ADD CONSTRAINT servicios_tipo_check 
CHECK (tipo IN ('contabilidad', 'tramites', 'auditoria'));