-- Create table for suspension reasons (configurable)
CREATE TABLE public.motivos_suspension (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.motivos_suspension ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view motivos_suspension" 
ON public.motivos_suspension 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage motivos_suspension" 
ON public.motivos_suspension 
FOR ALL 
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));

-- Insert default suspension reasons
INSERT INTO public.motivos_suspension (nombre, descripcion, orden) VALUES
('Por Deuda', 'Cliente suspendido por deudas pendientes', 1),
('Por Inactividad', 'Cliente suspendido por falta de actividad', 2),
('Incumplimiento de políticas internas', 'Cliente suspendido por incumplir políticas del estudio', 3);

-- Add suspension reason field to clientes table
ALTER TABLE public.clientes 
ADD COLUMN motivo_suspension_id UUID REFERENCES public.motivos_suspension(id),
ADD COLUMN fecha_suspension TIMESTAMP WITH TIME ZONE;

-- Create trigger for updated_at
CREATE TRIGGER update_motivos_suspension_updated_at
BEFORE UPDATE ON public.motivos_suspension
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();