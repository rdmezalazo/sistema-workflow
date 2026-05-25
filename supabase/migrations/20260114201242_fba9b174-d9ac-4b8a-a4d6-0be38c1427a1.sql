-- Create table for documentos de pago
CREATE TABLE public.documentos_pago (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documentos_pago ENABLE ROW LEVEL SECURITY;

-- Policies for documentos_pago
CREATE POLICY "Authenticated users can view documentos_pago"
ON public.documentos_pago
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage documentos_pago"
ON public.documentos_pago
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

-- Insert initial documentos de pago
INSERT INTO public.documentos_pago (nombre, orden) VALUES
  ('Factura', 1),
  ('Recibo por Honorarios RxH', 2),
  ('Recibo de Ingresos', 3);

-- Create table for métodos de pago
CREATE TABLE public.metodos_pago (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metodos_pago ENABLE ROW LEVEL SECURITY;

-- Policies for metodos_pago
CREATE POLICY "Authenticated users can view metodos_pago"
ON public.metodos_pago
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage metodos_pago"
ON public.metodos_pago
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

-- Insert initial métodos de pago
INSERT INTO public.metodos_pago (nombre, orden) VALUES
  ('Efectivo', 1),
  ('Yape', 2),
  ('IziPay', 3),
  ('Transferencia', 4);

-- Add triggers for updated_at
CREATE TRIGGER update_documentos_pago_updated_at
BEFORE UPDATE ON public.documentos_pago
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metodos_pago_updated_at
BEFORE UPDATE ON public.metodos_pago
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();