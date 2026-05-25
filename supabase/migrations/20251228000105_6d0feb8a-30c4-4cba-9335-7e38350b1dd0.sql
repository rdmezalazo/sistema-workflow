-- Create table for role permissions configuration
CREATE TABLE public.role_permisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  nombre_display text NOT NULL,
  descripcion text,
  permisos jsonb NOT NULL DEFAULT '{}',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_permisos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view role_permisos"
ON public.role_permisos
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage role_permisos"
ON public.role_permisos
FOR ALL
USING (has_role(auth.uid(), 'administrador'));

-- Create trigger for updated_at
CREATE TRIGGER update_role_permisos_updated_at
BEFORE UPDATE ON public.role_permisos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default roles with permissions
INSERT INTO public.role_permisos (role, nombre_display, descripcion, permisos) VALUES
('administrador', 'Administrador', 'Acceso completo al sistema', '{"clientes": {"ver": true, "crear": true, "editar": true, "eliminar": true}, "contratos": {"ver": true, "crear": true, "editar": true, "eliminar": true}, "proformas": {"ver": true, "crear": true, "editar": true, "eliminar": true}, "usuarios": {"ver": true, "crear": true, "editar": true, "eliminar": true}, "configuracion": {"ver": true, "editar": true}, "reportes": {"ver": true, "exportar": true}}'),
('gerente', 'Gerente', 'Gestión de equipos y operaciones', '{"clientes": {"ver": true, "crear": true, "editar": true, "eliminar": false}, "contratos": {"ver": true, "crear": true, "editar": true, "eliminar": false}, "proformas": {"ver": true, "crear": true, "editar": true, "eliminar": false}, "usuarios": {"ver": true, "crear": false, "editar": false, "eliminar": false}, "configuracion": {"ver": true, "editar": false}, "reportes": {"ver": true, "exportar": true}}'),
('asesor', 'Asesor', 'Consulta y registro de información', '{"clientes": {"ver": true, "crear": true, "editar": true, "eliminar": false}, "contratos": {"ver": true, "crear": false, "editar": false, "eliminar": false}, "proformas": {"ver": true, "crear": true, "editar": false, "eliminar": false}, "usuarios": {"ver": false, "crear": false, "editar": false, "eliminar": false}, "configuracion": {"ver": false, "editar": false}, "reportes": {"ver": true, "exportar": false}}');