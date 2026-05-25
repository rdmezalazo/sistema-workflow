-- Crear tabla para servicios
CREATE TABLE public.servicios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('contabilidad', 'tramites')),
  categoria TEXT NOT NULL,
  servicio TEXT NOT NULL,
  producto TEXT,
  variante TEXT,
  precio NUMERIC NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view servicios"
ON public.servicios
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage servicios"
ON public.servicios
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_servicios_updated_at
BEFORE UPDATE ON public.servicios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();