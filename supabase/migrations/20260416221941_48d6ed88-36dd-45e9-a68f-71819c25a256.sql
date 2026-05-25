
-- 1. Create sedes table
CREATE TABLE public.sedes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL UNIQUE,
  codigo text NOT NULL UNIQUE,
  direccion text,
  telefono text,
  activa boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_sedes_updated_at
BEFORE UPDATE ON public.sedes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Insert default sedes (Arequipa first so we can reference its id)
INSERT INTO public.sedes (nombre, codigo, direccion, activa, orden)
VALUES 
  ('Arequipa', 'AQP', 'Arequipa, Perú', true, 1),
  ('Moquegua', 'MOQ', 'Moquegua, Perú', true, 2);

-- 3. RLS policies for sedes
CREATE POLICY "Authenticated users can view sedes"
  ON public.sedes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage sedes"
  ON public.sedes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- 4. Add sede_id columns to relevant tables (nullable initially)
ALTER TABLE public.profiles ADD COLUMN sede_id uuid REFERENCES public.sedes(id);
ALTER TABLE public.clientes ADD COLUMN sede_id uuid REFERENCES public.sedes(id);
ALTER TABLE public.contratos ADD COLUMN sede_id uuid REFERENCES public.sedes(id);
ALTER TABLE public.proformas ADD COLUMN sede_id uuid REFERENCES public.sedes(id);
ALTER TABLE public.pagos ADD COLUMN sede_id uuid REFERENCES public.sedes(id);
ALTER TABLE public.asignaciones ADD COLUMN sede_id uuid REFERENCES public.sedes(id);
ALTER TABLE public.carteras ADD COLUMN sede_id uuid REFERENCES public.sedes(id);
ALTER TABLE public.workflows ADD COLUMN sede_id uuid REFERENCES public.sedes(id);

-- 5. Backfill existing data with Arequipa sede
DO $$
DECLARE
  v_aqp_id uuid;
BEGIN
  SELECT id INTO v_aqp_id FROM public.sedes WHERE codigo = 'AQP';
  
  UPDATE public.profiles SET sede_id = v_aqp_id WHERE sede_id IS NULL;
  UPDATE public.clientes SET sede_id = v_aqp_id WHERE sede_id IS NULL;
  UPDATE public.contratos SET sede_id = v_aqp_id WHERE sede_id IS NULL;
  UPDATE public.proformas SET sede_id = v_aqp_id WHERE sede_id IS NULL;
  UPDATE public.pagos SET sede_id = v_aqp_id WHERE sede_id IS NULL;
  UPDATE public.asignaciones SET sede_id = v_aqp_id WHERE sede_id IS NULL;
  UPDATE public.carteras SET sede_id = v_aqp_id WHERE sede_id IS NULL;
  UPDATE public.workflows SET sede_id = v_aqp_id WHERE sede_id IS NULL;
END $$;

-- 6. Helper function: get user's sede
CREATE OR REPLACE FUNCTION public.get_user_sede(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sede_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- 7. Helper function: can user see all sedes? (admin/gerente)
CREATE OR REPLACE FUNCTION public.can_view_all_sedes(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'administrador'::app_role) 
    OR has_role(_user_id, 'gerente'::app_role)
$$;

-- 8. Update RLS for clientes (sede isolation)
DROP POLICY IF EXISTS "Authenticated users can view clientes" ON public.clientes;
CREATE POLICY "Users can view clientes by sede"
  ON public.clientes FOR SELECT
  TO authenticated
  USING (
    can_view_all_sedes(auth.uid()) 
    OR sede_id = get_user_sede(auth.uid())
    OR sede_id IS NULL
  );

-- 9. Update RLS for contratos
DROP POLICY IF EXISTS "Authenticated users can view contratos" ON public.contratos;
CREATE POLICY "Users can view contratos by sede"
  ON public.contratos FOR SELECT
  TO authenticated
  USING (
    can_view_all_sedes(auth.uid()) 
    OR sede_id = get_user_sede(auth.uid())
    OR sede_id IS NULL
  );

-- 10. Update RLS for proformas
DROP POLICY IF EXISTS "Authenticated users can view proformas" ON public.proformas;
CREATE POLICY "Users can view proformas by sede"
  ON public.proformas FOR SELECT
  TO authenticated
  USING (
    can_view_all_sedes(auth.uid()) 
    OR sede_id = get_user_sede(auth.uid())
    OR sede_id IS NULL
  );

-- 11. Update RLS for pagos
DROP POLICY IF EXISTS "Authenticated users can view pagos" ON public.pagos;
CREATE POLICY "Users can view pagos by sede"
  ON public.pagos FOR SELECT
  TO authenticated
  USING (
    can_view_all_sedes(auth.uid()) 
    OR sede_id = get_user_sede(auth.uid())
    OR sede_id IS NULL
  );

-- 12. Update RLS for asignaciones (replace existing select policy)
DROP POLICY IF EXISTS "Users can view own asignaciones" ON public.asignaciones;
CREATE POLICY "Users can view asignaciones by sede"
  ON public.asignaciones FOR SELECT
  TO authenticated
  USING (
    can_view_all_sedes(auth.uid())
    OR sede_id = get_user_sede(auth.uid())
    OR sede_id IS NULL
    OR asignado_a = auth.uid()
    OR asignado_por = auth.uid()
  );

-- 13. Update RLS for carteras
DROP POLICY IF EXISTS "Authenticated users can view carteras" ON public.carteras;
CREATE POLICY "Users can view carteras by sede"
  ON public.carteras FOR SELECT
  TO authenticated
  USING (
    can_view_all_sedes(auth.uid()) 
    OR sede_id = get_user_sede(auth.uid())
    OR sede_id IS NULL
  );

-- 14. Update RLS for workflows
DROP POLICY IF EXISTS "Authenticated users can view workflows" ON public.workflows;
CREATE POLICY "Users can view workflows by sede"
  ON public.workflows FOR SELECT
  TO authenticated
  USING (
    can_view_all_sedes(auth.uid()) 
    OR sede_id = get_user_sede(auth.uid())
    OR sede_id IS NULL
  );

-- 15. Indexes for performance
CREATE INDEX idx_clientes_sede ON public.clientes(sede_id);
CREATE INDEX idx_contratos_sede ON public.contratos(sede_id);
CREATE INDEX idx_proformas_sede ON public.proformas(sede_id);
CREATE INDEX idx_pagos_sede ON public.pagos(sede_id);
CREATE INDEX idx_asignaciones_sede ON public.asignaciones(sede_id);
CREATE INDEX idx_carteras_sede ON public.carteras(sede_id);
CREATE INDEX idx_workflows_sede ON public.workflows(sede_id);
CREATE INDEX idx_profiles_sede ON public.profiles(sede_id);
