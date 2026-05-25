
ALTER TABLE public.workflows ALTER COLUMN contrato_id DROP NOT NULL;

ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS workflows_contrato_required_check;
ALTER TABLE public.workflows ADD CONSTRAINT workflows_contrato_required_check
  CHECK (
    (tipo = 'plantilla') OR (tipo = 'asignado' AND contrato_id IS NOT NULL)
  );
