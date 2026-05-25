-- Drop and recreate the function with proper WHERE clause using LIMIT 1
CREATE OR REPLACE FUNCTION public.get_next_workflow_code()
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
  v_id UUID;
BEGIN
  -- First get the id of the sequence record
  SELECT id INTO v_id FROM public.workflow_secuencias LIMIT 1;
  
  -- If no record exists, create one
  IF v_id IS NULL THEN
    INSERT INTO public.workflow_secuencias (prefijo, ultimo_numero, anio_vigente, digitos_correlativo)
    VALUES ('WF', 0, EXTRACT(year FROM CURRENT_DATE)::INTEGER, 5)
    RETURNING id INTO v_id;
  END IF;
  
  -- Now update with explicit WHERE clause
  UPDATE public.workflow_secuencias
  SET ultimo_numero = ultimo_numero + 1,
      updated_at = now()
  WHERE id = v_id
  RETURNING prefijo, ultimo_numero, anio_vigente, digitos_correlativo 
  INTO v_prefijo, v_numero, v_anio, v_digitos;
  
  -- Format number with configured digits
  v_formatted := LPAD(v_numero::TEXT, v_digitos, '0');
  
  -- Return format: PREFIX-YEAR-NUMBER (e.g., WF-2026-00001)
  RETURN v_prefijo || '-' || v_anio::TEXT || '-' || v_formatted;
END;
$function$;