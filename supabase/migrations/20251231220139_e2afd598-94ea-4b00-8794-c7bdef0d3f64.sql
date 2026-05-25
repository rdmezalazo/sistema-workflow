-- Crear tabla para plantillas de contrato
CREATE TABLE public.contrato_plantillas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'servicios', -- laboral, arrendamiento, compraventa, servicios, confidencialidad
  descripcion TEXT,
  jurisdiccion TEXT DEFAULT 'Perú',
  lenguaje_formal BOOLEAN DEFAULT true,
  activa BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para partes contratantes de plantilla
CREATE TABLE public.contrato_plantilla_partes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plantilla_id UUID NOT NULL REFERENCES public.contrato_plantillas(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 1,
  denominacion TEXT NOT NULL DEFAULT 'PRIMERA', -- PRIMERA, SEGUNDA, etc.
  tipo_persona TEXT NOT NULL DEFAULT 'juridica', -- natural, juridica
  es_obligatoria BOOLEAN DEFAULT true,
  campos JSONB NOT NULL DEFAULT '[]', -- campos requeridos para esta parte
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para cláusulas de plantilla
CREATE TABLE public.contrato_plantilla_clausulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plantilla_id UUID NOT NULL REFERENCES public.contrato_plantillas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  es_obligatoria BOOLEAN DEFAULT false,
  es_editable BOOLEAN DEFAULT true,
  variantes JSONB DEFAULT '[]', -- variantes de redacción alternativas
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para anexos de plantilla
CREATE TABLE public.contrato_plantilla_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plantilla_id UUID NOT NULL REFERENCES public.contrato_plantillas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  es_obligatorio BOOLEAN DEFAULT false,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contrato_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_plantilla_partes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_plantilla_clausulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_plantilla_anexos ENABLE ROW LEVEL SECURITY;

-- Políticas para contrato_plantillas
CREATE POLICY "Authenticated users can view contrato_plantillas"
ON public.contrato_plantillas
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage contrato_plantillas"
ON public.contrato_plantillas
FOR ALL
USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'gerente'));

-- Políticas para contrato_plantilla_partes
CREATE POLICY "Authenticated users can view contrato_plantilla_partes"
ON public.contrato_plantilla_partes
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage contrato_plantilla_partes"
ON public.contrato_plantilla_partes
FOR ALL
USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'gerente'));

-- Políticas para contrato_plantilla_clausulas
CREATE POLICY "Authenticated users can view contrato_plantilla_clausulas"
ON public.contrato_plantilla_clausulas
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage contrato_plantilla_clausulas"
ON public.contrato_plantilla_clausulas
FOR ALL
USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'gerente'));

-- Políticas para contrato_plantilla_anexos
CREATE POLICY "Authenticated users can view contrato_plantilla_anexos"
ON public.contrato_plantilla_anexos
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage contrato_plantilla_anexos"
ON public.contrato_plantilla_anexos
FOR ALL
USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'gerente'));

-- Triggers para updated_at
CREATE TRIGGER update_contrato_plantillas_updated_at
BEFORE UPDATE ON public.contrato_plantillas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contrato_plantilla_clausulas_updated_at
BEFORE UPDATE ON public.contrato_plantilla_clausulas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();