
ALTER TABLE public.workflows 
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'asignado',
  ADD COLUMN IF NOT EXISTS nombre_plantilla text;

ALTER TABLE public.workflows 
  DROP CONSTRAINT IF EXISTS workflows_tipo_check;

ALTER TABLE public.workflows 
  ADD CONSTRAINT workflows_tipo_check CHECK (tipo IN ('asignado', 'plantilla'));

CREATE INDEX IF NOT EXISTS idx_workflows_tipo ON public.workflows(tipo);
