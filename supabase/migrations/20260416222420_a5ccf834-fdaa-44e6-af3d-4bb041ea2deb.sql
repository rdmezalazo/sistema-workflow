
-- Function to auto-assign sede from current user
CREATE OR REPLACE FUNCTION public.set_sede_from_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sede_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.sede_id := public.get_user_sede(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Apply to relevant tables
CREATE TRIGGER set_sede_clientes
  BEFORE INSERT ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_sede_from_user();

CREATE TRIGGER set_sede_contratos
  BEFORE INSERT ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.set_sede_from_user();

CREATE TRIGGER set_sede_proformas
  BEFORE INSERT ON public.proformas
  FOR EACH ROW EXECUTE FUNCTION public.set_sede_from_user();

CREATE TRIGGER set_sede_pagos
  BEFORE INSERT ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.set_sede_from_user();

CREATE TRIGGER set_sede_asignaciones
  BEFORE INSERT ON public.asignaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_sede_from_user();

CREATE TRIGGER set_sede_carteras
  BEFORE INSERT ON public.carteras
  FOR EACH ROW EXECUTE FUNCTION public.set_sede_from_user();

CREATE TRIGGER set_sede_workflows
  BEFORE INSERT ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_sede_from_user();
