-- Create workflows table to store complete workflow configurations
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  contrato_id UUID NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for contrato_id lookups
CREATE INDEX idx_workflows_contrato_id ON public.workflows(contrato_id);
CREATE INDEX idx_workflows_codigo ON public.workflows(codigo);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view workflows"
ON public.workflows
FOR SELECT
USING (true);

CREATE POLICY "Staff can manage workflows"
ON public.workflows
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create sequence table for workflow codes
CREATE TABLE public.workflow_secuencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefijo TEXT NOT NULL DEFAULT 'WF',
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  anio_vigente INTEGER NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE),
  digitos_correlativo INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default sequence
INSERT INTO public.workflow_secuencias (prefijo, ultimo_numero, anio_vigente, digitos_correlativo)
VALUES ('WF', 0, EXTRACT(year FROM CURRENT_DATE), 5);

-- Enable RLS
ALTER TABLE public.workflow_secuencias ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view workflow_secuencias"
ON public.workflow_secuencias
FOR SELECT
USING (true);

CREATE POLICY "Staff can update workflow_secuencias"
ON public.workflow_secuencias
FOR UPDATE
USING (true);

-- Create function to get next workflow code
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
BEGIN
  -- Get and update the number atomically
  UPDATE public.workflow_secuencias
  SET ultimo_numero = ultimo_numero + 1,
      updated_at = now()
  RETURNING prefijo, ultimo_numero, anio_vigente, digitos_correlativo 
  INTO v_prefijo, v_numero, v_anio, v_digitos;
  
  -- If no record found, create default and return first code
  IF v_prefijo IS NULL THEN
    INSERT INTO public.workflow_secuencias (prefijo, ultimo_numero, anio_vigente, digitos_correlativo)
    VALUES ('WF', 1, EXTRACT(year FROM CURRENT_DATE), 5)
    RETURNING prefijo, ultimo_numero, anio_vigente, digitos_correlativo 
    INTO v_prefijo, v_numero, v_anio, v_digitos;
  END IF;
  
  -- Format number with configured digits
  v_formatted := LPAD(v_numero::TEXT, v_digitos, '0');
  
  -- Return format: PREFIX-YEAR-NUMBER (e.g., WF-2026-00001)
  RETURN v_prefijo || '-' || v_anio::TEXT || '-' || v_formatted;
END;
$function$;