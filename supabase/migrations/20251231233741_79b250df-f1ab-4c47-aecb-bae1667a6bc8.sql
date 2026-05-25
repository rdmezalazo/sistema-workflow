-- Add numero_cuotas field to contratos table
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS numero_cuotas integer DEFAULT 1;

-- Add dia_vencimiento field for payment schedule (day of month when payments are due)
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS dia_vencimiento integer DEFAULT 15;

-- Add comment for clarity
COMMENT ON COLUMN public.contratos.numero_cuotas IS 'Número de cuotas para el calendario de pagos';
COMMENT ON COLUMN public.contratos.dia_vencimiento IS 'Día del mes para vencimiento de cuotas';