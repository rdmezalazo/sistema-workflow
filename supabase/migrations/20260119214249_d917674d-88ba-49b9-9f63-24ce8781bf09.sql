-- Add accounting/invoice fields to pagos table for sales record generation
ALTER TABLE public.pagos
ADD COLUMN IF NOT EXISTS tipo_comprobante text DEFAULT 'factura',
ADD COLUMN IF NOT EXISTS serie_comprobante text,
ADD COLUMN IF NOT EXISTS numero_comprobante text,
ADD COLUMN IF NOT EXISTS fecha_emision date,
ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS igv numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tipo_igv text DEFAULT 'gravado',
ADD COLUMN IF NOT EXISTS detraccion_porcentaje numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS detraccion_monto numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS retencion_porcentaje numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS retencion_monto numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_neto numeric,
ADD COLUMN IF NOT EXISTS cuenta_bancaria text,
ADD COLUMN IF NOT EXISTS banco text,
ADD COLUMN IF NOT EXISTS observaciones_contables text;

-- Add comments for documentation
COMMENT ON COLUMN public.pagos.tipo_comprobante IS 'Tipo: factura, boleta, recibo, nota_credito, nota_debito';
COMMENT ON COLUMN public.pagos.serie_comprobante IS 'Serie del comprobante (ej: F001)';
COMMENT ON COLUMN public.pagos.numero_comprobante IS 'Número correlativo del comprobante';
COMMENT ON COLUMN public.pagos.fecha_emision IS 'Fecha de emisión del comprobante';
COMMENT ON COLUMN public.pagos.tipo_igv IS 'Tipo IGV: gravado, exonerado, inafecto';
COMMENT ON COLUMN public.pagos.detraccion_porcentaje IS 'Porcentaje de detracción aplicado';
COMMENT ON COLUMN public.pagos.retencion_porcentaje IS 'Porcentaje de retención aplicado';