-- ============================================================
-- WORKFLOW ENHANCED TABLES FOR KANBAN, NOTES, AND CHECKLISTS
-- ============================================================

-- 1. KANBAN CARDS TABLE (for Proceso/Tarea type activities)
CREATE TABLE public.workflow_kanban_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_item_id TEXT NOT NULL, -- References the item ID in workflows.items JSON
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, en_progreso, en_revision, completado
  orden INTEGER NOT NULL DEFAULT 0,
  asignado_a UUID,
  fecha_vencimiento DATE,
  prioridad TEXT DEFAULT 'media', -- baja, media, alta, urgente
  etiquetas JSONB DEFAULT '[]'::jsonb, -- Array of {color, label}
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_kanban_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kanban_cards
CREATE POLICY "Authenticated users can view workflow_kanban_cards"
  ON public.workflow_kanban_cards
  FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert workflow_kanban_cards"
  ON public.workflow_kanban_cards
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can update workflow_kanban_cards"
  ON public.workflow_kanban_cards
  FOR UPDATE
  USING (true);

CREATE POLICY "Staff can delete workflow_kanban_cards"
  ON public.workflow_kanban_cards
  FOR DELETE
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_workflow_kanban_cards_item ON public.workflow_kanban_cards(workflow_item_id);
CREATE INDEX idx_workflow_kanban_cards_workflow ON public.workflow_kanban_cards(workflow_id);
CREATE INDEX idx_workflow_kanban_cards_status ON public.workflow_kanban_cards(status);

-- 2. WORKFLOW NOTES TABLE (for Data, Output types - Notion style)
CREATE TABLE public.workflow_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_item_id TEXT NOT NULL, -- References the item ID in workflows.items JSON
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  content JSONB DEFAULT '{}'::jsonb, -- Rich text content (blocks style like Notion)
  tipo TEXT NOT NULL DEFAULT 'nota', -- nota, tabla, checklist
  titulo TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb, -- For tables: columns config, for checklists: items
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_notes
CREATE POLICY "Authenticated users can view workflow_notes"
  ON public.workflow_notes
  FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert workflow_notes"
  ON public.workflow_notes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can update workflow_notes"
  ON public.workflow_notes
  FOR UPDATE
  USING (true);

CREATE POLICY "Staff can delete workflow_notes"
  ON public.workflow_notes
  FOR DELETE
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_workflow_notes_item ON public.workflow_notes(workflow_item_id);
CREATE INDEX idx_workflow_notes_workflow ON public.workflow_notes(workflow_id);
CREATE INDEX idx_workflow_notes_tipo ON public.workflow_notes(tipo);

-- 3. WORKFLOW CHECKLISTS TABLE (for Supervision type)
CREATE TABLE public.workflow_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_item_id TEXT NOT NULL, -- References the item ID in workflows.items JSON
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb, -- Array of {id, texto, completado, orden, verificado_por, fecha_verificacion}
  estado TEXT DEFAULT 'pendiente', -- pendiente, parcial, completado
  porcentaje_completado INTEGER DEFAULT 0,
  verificado_por UUID,
  fecha_verificacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_checklists
CREATE POLICY "Authenticated users can view workflow_checklists"
  ON public.workflow_checklists
  FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert workflow_checklists"
  ON public.workflow_checklists
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can update workflow_checklists"
  ON public.workflow_checklists
  FOR UPDATE
  USING (true);

CREATE POLICY "Staff can delete workflow_checklists"
  ON public.workflow_checklists
  FOR DELETE
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_workflow_checklists_item ON public.workflow_checklists(workflow_item_id);
CREATE INDEX idx_workflow_checklists_workflow ON public.workflow_checklists(workflow_id);

-- 4. Add Gantt-specific fields to workflow items JSON structure
-- (These are already handled in the JSON, but we'll add a helper comment)
-- The workflows.items JSON already supports:
-- - fecha_inicio, fecha_termino (existing)
-- - asignado_a (existing)
-- We'll extend via JSON to add:
-- - dependencias: string[] (IDs of predecessor activities)
-- - duracion_dias: number
-- - progreso: number (0-100)

-- 5. Triggers for updated_at
CREATE TRIGGER update_workflow_kanban_cards_updated_at
  BEFORE UPDATE ON public.workflow_kanban_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_notes_updated_at
  BEFORE UPDATE ON public.workflow_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_checklists_updated_at
  BEFORE UPDATE ON public.workflow_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();