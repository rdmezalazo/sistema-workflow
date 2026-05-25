
-- Add multiple assignees support (JSON array of user IDs)
ALTER TABLE public.workflow_kanban_cards 
ADD COLUMN IF NOT EXISTS asignados jsonb DEFAULT '[]'::jsonb;

-- Add optional card background color
ALTER TABLE public.workflow_kanban_cards 
ADD COLUMN IF NOT EXISTS color_tarjeta text;

-- Add custom kanban columns config per board (stored per workflow+item combo)
CREATE TABLE IF NOT EXISTS public.workflow_kanban_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workflow_item_id text NOT NULL,
  columnas jsonb NOT NULL DEFAULT '[{"id":"pendiente","label":"Pendiente","color":"bg-gray-100 dark:bg-gray-800"},{"id":"en_progreso","label":"En Progreso","color":"bg-blue-50 dark:bg-blue-950/30"},{"id":"en_revision","label":"En Revisión","color":"bg-amber-50 dark:bg-amber-950/30"},{"id":"completado","label":"Completado","color":"bg-green-50 dark:bg-green-950/30"}]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, workflow_item_id)
);

-- Enable RLS
ALTER TABLE public.workflow_kanban_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view kanban config"
ON public.workflow_kanban_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert kanban config"
ON public.workflow_kanban_config FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update kanban config"
ON public.workflow_kanban_config FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete kanban config"
ON public.workflow_kanban_config FOR DELETE
TO authenticated
USING (true);
