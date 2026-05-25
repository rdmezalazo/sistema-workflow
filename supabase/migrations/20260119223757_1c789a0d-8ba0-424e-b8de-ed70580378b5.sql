-- Create registro_ventas table for sales register
CREATE TABLE public.registro_ventas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pago_id UUID REFERENCES public.pagos(id) ON DELETE CASCADE,
  fecha_emision DATE NOT NULL,
  tipo_comprobante TEXT NOT NULL DEFAULT 'factura',
  serie_comprobante TEXT,
  numero_comprobante TEXT,
  cliente_ruc TEXT NOT NULL,
  cliente_razon_social TEXT NOT NULL,
  base_imponible NUMERIC NOT NULL DEFAULT 0,
  igv NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL DEFAULT 'PEN',
  glosa TEXT,
  cta_ingreso TEXT DEFAULT '7041',
  cta_igv TEXT DEFAULT '40111',
  cta_otros_tributos TEXT,
  cta_por_cobrar TEXT DEFAULT '1212',
  centro_costo TEXT DEFAULT 'CC001',
  periodo_mes INTEGER NOT NULL,
  periodo_anio INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'registrado',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries by period
CREATE INDEX idx_registro_ventas_periodo ON public.registro_ventas(periodo_anio, periodo_mes);
CREATE INDEX idx_registro_ventas_fecha ON public.registro_ventas(fecha_emision);
CREATE INDEX idx_registro_ventas_pago ON public.registro_ventas(pago_id);

-- Enable RLS
ALTER TABLE public.registro_ventas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view registro_ventas"
ON public.registro_ventas
FOR SELECT
USING (true);

CREATE POLICY "Staff can insert registro_ventas"
ON public.registro_ventas
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff can update registro_ventas"
ON public.registro_ventas
FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete registro_ventas"
ON public.registro_ventas
FOR DELETE
USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'gerente'));

-- Add trigger for updated_at
CREATE TRIGGER update_registro_ventas_updated_at
BEFORE UPDATE ON public.registro_ventas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();