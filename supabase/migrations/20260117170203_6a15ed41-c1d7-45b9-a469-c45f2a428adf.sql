-- Add new columns to proforma_secuencias for better configuration
ALTER TABLE public.proforma_secuencias
ADD COLUMN IF NOT EXISTS anio_vigente INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
ADD COLUMN IF NOT EXISTS digitos_correlativo INTEGER NOT NULL DEFAULT 5;

-- Update existing rows with current year
UPDATE public.proforma_secuencias SET anio_vigente = EXTRACT(YEAR FROM CURRENT_DATE) WHERE anio_vigente IS NULL;

-- Normalize tipo values to match the 3 groups
UPDATE public.proforma_secuencias SET tipo = 'Contabilidad' WHERE tipo = 'contabilidad';
UPDATE public.proforma_secuencias SET tipo = 'Trámites' WHERE tipo = 'tramites';

-- Ensure all three groups exist
INSERT INTO public.proforma_secuencias (tipo, prefijo, ultimo_numero, anio_vigente, digitos_correlativo)
VALUES 
  ('Contabilidad', 'PC', 0, EXTRACT(YEAR FROM CURRENT_DATE), 5),
  ('Trámites', 'PT', 0, EXTRACT(YEAR FROM CURRENT_DATE), 5),
  ('Auditoría y Control Interno', 'PA', 0, EXTRACT(YEAR FROM CURRENT_DATE), 5)
ON CONFLICT DO NOTHING;

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_next_proforma_number(text);

-- Recreate with updated logic including year and digits
CREATE OR REPLACE FUNCTION public.get_next_proforma_number(p_tipo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prefijo TEXT;
  v_numero INTEGER;
  v_anio INTEGER;
  v_digitos INTEGER;
  v_formatted TEXT;
BEGIN
  -- Get and update the number atomically
  UPDATE public.proforma_secuencias
  SET ultimo_numero = ultimo_numero + 1,
      updated_at = now()
  WHERE tipo = p_tipo
  RETURNING prefijo, ultimo_numero, anio_vigente, digitos_correlativo 
  INTO v_prefijo, v_numero, v_anio, v_digitos;
  
  -- If no record found, return error
  IF v_prefijo IS NULL THEN
    RAISE EXCEPTION 'No sequence found for type: %', p_tipo;
  END IF;
  
  -- Format number with configured digits
  v_formatted := LPAD(v_numero::TEXT, v_digitos, '0');
  
  -- Return format: PREFIX-YEAR-NUMBER (e.g., PC-2026-00001)
  RETURN v_prefijo || '-' || v_anio::TEXT || '-' || v_formatted;
END;
$function$;

-- Allow insert and delete for admins on proforma_secuencias
DROP POLICY IF EXISTS "Admins can manage proforma_secuencias" ON public.proforma_secuencias;
CREATE POLICY "Admins can manage proforma_secuencias"
ON public.proforma_secuencias
FOR ALL
USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'gerente'))
WITH CHECK (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'gerente'));