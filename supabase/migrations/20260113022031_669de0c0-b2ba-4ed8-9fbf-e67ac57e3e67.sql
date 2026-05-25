-- First drop the constraint on proforma_secuencias if it exists
ALTER TABLE public.proforma_secuencias 
DROP CONSTRAINT IF EXISTS proforma_secuencias_tipo_check;

-- Update proforma_secuencias to use text and add new constraint
ALTER TABLE public.proforma_secuencias 
ADD CONSTRAINT proforma_secuencias_tipo_check 
CHECK (tipo IN ('contabilidad', 'tramites', 'Contabilidad', 'Trámites', 'Auditoría y Control Interno'));

-- Insert new secuencia for Auditoría
INSERT INTO public.proforma_secuencias (tipo, prefijo, ultimo_numero)
VALUES ('Auditoría y Control Interno', 'C', 0)
ON CONFLICT DO NOTHING;