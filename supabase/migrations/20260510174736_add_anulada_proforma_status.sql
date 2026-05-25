-- Add 'anulada' value to proforma_status enum and seed proforma_estados row
ALTER TYPE public.proforma_status ADD VALUE IF NOT EXISTS 'anulada';

INSERT INTO public.proforma_estados (nombre, nombre_display, color, orden, activo, es_sistema)
SELECT 'anulada', 'Anulada', '#6B7280', 6, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.proforma_estados WHERE nombre = 'anulada');
