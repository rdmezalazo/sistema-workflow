-- Drop the existing tipo constraint
ALTER TABLE public.servicios DROP CONSTRAINT IF EXISTS servicios_tipo_check;

-- Rename tipo to tipo_servicio
ALTER TABLE public.servicios RENAME COLUMN tipo TO tipo_servicio;

-- Update grupo_servicio values to standardized names
UPDATE public.servicios 
SET grupo_servicio = 
  CASE 
    WHEN LOWER(grupo_servicio) LIKE '%contab%' THEN 'Contabilidad'
    WHEN LOWER(grupo_servicio) LIKE '%tramit%' OR LOWER(grupo_servicio) LIKE '%trámit%' THEN 'Trámites'
    WHEN LOWER(grupo_servicio) LIKE '%audit%' OR LOWER(grupo_servicio) LIKE '%control%' THEN 'Auditoría y Control Interno'
    ELSE grupo_servicio
  END
WHERE grupo_servicio IS NOT NULL;

-- Add check constraint for grupo_servicio
ALTER TABLE public.servicios 
ADD CONSTRAINT servicios_grupo_servicio_check 
CHECK (grupo_servicio IN ('Contabilidad', 'Trámites', 'Auditoría y Control Interno'));