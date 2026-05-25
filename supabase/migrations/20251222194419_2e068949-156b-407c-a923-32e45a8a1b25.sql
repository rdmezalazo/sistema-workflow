-- Add tipo_proforma enum
CREATE TYPE public.proforma_tipo AS ENUM ('contabilidad', 'tramites');

-- Add new columns to proformas table
ALTER TABLE public.proformas 
ADD COLUMN tipo public.proforma_tipo NOT NULL DEFAULT 'contabilidad',
ADD COLUMN campos_personalizados jsonb DEFAULT '{}';

-- Create proforma templates table for the designer
CREATE TABLE public.proforma_plantillas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo public.proforma_tipo NOT NULL,
  descripcion text,
  campos jsonb NOT NULL DEFAULT '[]',
  activa boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.proforma_plantillas ENABLE ROW LEVEL SECURITY;

-- Policies for proforma_plantillas
CREATE POLICY "Authenticated users can view plantillas"
ON public.proforma_plantillas
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage plantillas"
ON public.proforma_plantillas
FOR ALL
USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'gerente'));

-- Add trigger for updated_at
CREATE TRIGGER update_proforma_plantillas_updated_at
BEFORE UPDATE ON public.proforma_plantillas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.proforma_plantillas (nombre, tipo, descripcion, campos) VALUES
('Plantilla Contabilidad Estándar', 'contabilidad', 'Plantilla base para servicios contables', 
 '[{"id": "regimen_tributario", "label": "Régimen Tributario", "type": "select", "options": ["RUS", "RER", "Régimen MYPE", "Régimen General"], "required": true}, {"id": "tipo_declaracion", "label": "Tipo de Declaración", "type": "select", "options": ["Mensual", "Anual"], "required": true}, {"id": "periodo", "label": "Período", "type": "text", "required": true}]'),
('Plantilla Trámites Estándar', 'tramites', 'Plantilla base para trámites administrativos', 
 '[{"id": "tipo_tramite", "label": "Tipo de Trámite", "type": "select", "options": ["Constitución de Empresa", "Modificación de Estatutos", "Licencia de Funcionamiento", "Otros"], "required": true}, {"id": "entidad", "label": "Entidad", "type": "text", "required": true}, {"id": "plazo_estimado", "label": "Plazo Estimado (días)", "type": "number", "required": false}]');