-- Create table for dynamic proforma statuses
CREATE TABLE public.proforma_estados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  nombre_display text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  es_sistema boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proforma_estados ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view proforma_estados"
ON public.proforma_estados
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage proforma_estados"
ON public.proforma_estados
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

-- Insert default statuses from the enum
INSERT INTO public.proforma_estados (nombre, nombre_display, color, orden, es_sistema) VALUES
('borrador', 'Borrador', '#6B7280', 1, true),
('enviada', 'Enviada', '#3B82F6', 2, true),
('aprobada', 'Aprobada', '#10B981', 3, true),
('rechazada', 'Rechazada', '#EF4444', 4, true),
('facturada', 'Facturada', '#8B5CF6', 5, true);

-- Create trigger for updated_at
CREATE TRIGGER update_proforma_estados_updated_at
BEFORE UPDATE ON public.proforma_estados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();