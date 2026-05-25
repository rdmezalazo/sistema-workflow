-- Create table for contract sequences
CREATE TABLE public.contrato_secuencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'general',
  prefijo TEXT NOT NULL DEFAULT 'CT',
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  anio_vigente INTEGER NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE),
  digitos_correlativo INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT contrato_secuencias_tipo_key UNIQUE (tipo)
);

-- Enable RLS
ALTER TABLE public.contrato_secuencias ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view contrato_secuencias"
ON public.contrato_secuencias
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage contrato_secuencias"
ON public.contrato_secuencias
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

CREATE POLICY "Staff can update contrato_secuencias"
ON public.contrato_secuencias
FOR UPDATE
USING (true);

-- Insert default record for general contracts
INSERT INTO public.contrato_secuencias (tipo, prefijo, ultimo_numero, anio_vigente, digitos_correlativo)
VALUES ('general', 'CT', 0, EXTRACT(year FROM CURRENT_DATE), 5);