-- Add PDF styles column to proforma_plantillas table
ALTER TABLE public.proforma_plantillas 
ADD COLUMN IF NOT EXISTS estilos_pdf jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.proforma_plantillas.estilos_pdf IS 'Configuración de estilos para la generación de PDF (colores, tipografía, layout)';