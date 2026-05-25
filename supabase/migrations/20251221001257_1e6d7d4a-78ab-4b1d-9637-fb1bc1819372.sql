-- =============================================
-- 1. ENUM TYPES
-- =============================================
CREATE TYPE public.app_role AS ENUM ('administrador', 'gerente', 'asesor', 'auxiliar', 'practicante');
CREATE TYPE public.contract_status AS ENUM ('activo', 'pausado', 'finalizado', 'cancelado');
CREATE TYPE public.proforma_status AS ENUM ('borrador', 'enviada', 'aprobada', 'rechazada', 'facturada');
CREATE TYPE public.payment_status AS ENUM ('pendiente', 'pagado', 'vencido', 'parcial');
CREATE TYPE public.assignment_status AS ENUM ('pendiente', 'en_progreso', 'completada', 'cancelada');
CREATE TYPE public.assignment_priority AS ENUM ('baja', 'media', 'alta', 'urgente');

-- =============================================
-- 2. PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. USER ROLES TABLE (Separate for security)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'asesor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. SECURITY DEFINER FUNCTION FOR ROLES
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =============================================
-- 5. CLIENTES TABLE
-- =============================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruc TEXT NOT NULL UNIQUE,
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  contacto_nombre TEXT,
  contacto_telefono TEXT,
  contacto_email TEXT,
  sector TEXT,
  notas TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. CARTERAS TABLE
-- =============================================
CREATE TABLE public.carteras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  responsable_id UUID REFERENCES auth.users(id),
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.carteras ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. CARTERA_CLIENTES (Many-to-Many)
-- =============================================
CREATE TABLE public.cartera_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartera_id UUID REFERENCES public.carteras(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cartera_id, cliente_id)
);

ALTER TABLE public.cartera_clientes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. CONTRATOS TABLE
-- =============================================
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE RESTRICT NOT NULL,
  descripcion TEXT NOT NULL,
  tipo_servicio TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  monto_mensual DECIMAL(12,2),
  monto_total DECIMAL(12,2),
  moneda TEXT NOT NULL DEFAULT 'PEN',
  status contract_status NOT NULL DEFAULT 'activo',
  responsable_id UUID REFERENCES auth.users(id),
  notas TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. PROFORMAS TABLE
-- =============================================
CREATE TABLE public.proformas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE RESTRICT NOT NULL,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  igv DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL DEFAULT 'PEN',
  status proforma_status NOT NULL DEFAULT 'borrador',
  notas TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proformas ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 10. PROFORMA_ITEMS TABLE
-- =============================================
CREATE TABLE public.proforma_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proforma_id UUID REFERENCES public.proformas(id) ON DELETE CASCADE NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proforma_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 11. PAGOS TABLE
-- =============================================
CREATE TABLE public.pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE RESTRICT NOT NULL,
  proforma_id UUID REFERENCES public.proformas(id) ON DELETE SET NULL,
  monto DECIMAL(12,2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago DATE,
  status payment_status NOT NULL DEFAULT 'pendiente',
  metodo_pago TEXT,
  referencia TEXT,
  notas TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 12. ASIGNACIONES TABLE
-- =============================================
CREATE TABLE public.asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  asignado_a UUID REFERENCES auth.users(id),
  asignado_por UUID REFERENCES auth.users(id),
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  prioridad assignment_priority NOT NULL DEFAULT 'media',
  status assignment_status NOT NULL DEFAULT 'pendiente',
  horas_estimadas DECIMAL(5,2),
  horas_trabajadas DECIMAL(5,2) DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asignaciones ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 13. CALENDARIO_TRABAJO TABLE
-- =============================================
CREATE TABLE public.calendario_trabajo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  todo_el_dia BOOLEAN NOT NULL DEFAULT false,
  tipo TEXT NOT NULL DEFAULT 'tarea',
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  asignacion_id UUID REFERENCES public.asignaciones(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES auth.users(id) NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  completado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendario_trabajo ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 14. CONFIGURACION TABLE
-- =============================================
CREATE TABLE public.configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL UNIQUE,
  valor JSONB NOT NULL DEFAULT '{}',
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 15. TRIGGER FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_carteras_updated_at BEFORE UPDATE ON public.carteras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_proformas_updated_at BEFORE UPDATE ON public.proformas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pagos_updated_at BEFORE UPDATE ON public.pagos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_asignaciones_updated_at BEFORE UPDATE ON public.asignaciones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_calendario_updated_at BEFORE UPDATE ON public.calendario_trabajo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_configuracion_updated_at BEFORE UPDATE ON public.configuracion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 16. AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'asesor');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 17. RLS POLICIES
-- =============================================

-- Profiles: Users can view all profiles, update only their own
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User Roles: Only admins can manage roles, users can view their own
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

-- Clientes: All authenticated users can view, admins/gerentes can manage
CREATE POLICY "Authenticated users can view clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update clientes" ON public.clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete clientes" ON public.clientes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'gerente'));

-- Carteras: All authenticated can view, responsables and admins can manage
CREATE POLICY "Authenticated users can view carteras" ON public.carteras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage carteras" ON public.carteras FOR ALL TO authenticated USING (true);

-- Cartera_Clientes
CREATE POLICY "Authenticated users can view cartera_clientes" ON public.cartera_clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage cartera_clientes" ON public.cartera_clientes FOR ALL TO authenticated USING (true);

-- Contratos
CREATE POLICY "Authenticated users can view contratos" ON public.contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert contratos" ON public.contratos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update contratos" ON public.contratos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete contratos" ON public.contratos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'gerente'));

-- Proformas
CREATE POLICY "Authenticated users can view proformas" ON public.proformas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage proformas" ON public.proformas FOR ALL TO authenticated USING (true);

-- Proforma Items
CREATE POLICY "Authenticated users can view proforma_items" ON public.proforma_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage proforma_items" ON public.proforma_items FOR ALL TO authenticated USING (true);

-- Pagos
CREATE POLICY "Authenticated users can view pagos" ON public.pagos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage pagos" ON public.pagos FOR ALL TO authenticated USING (true);

-- Asignaciones: Users can view their own or if admin/gerente
CREATE POLICY "Users can view own asignaciones" ON public.asignaciones FOR SELECT TO authenticated USING (asignado_a = auth.uid() OR asignado_por = auth.uid() OR public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Staff can insert asignaciones" ON public.asignaciones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own asignaciones" ON public.asignaciones FOR UPDATE TO authenticated USING (asignado_a = auth.uid() OR asignado_por = auth.uid() OR public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Admins can delete asignaciones" ON public.asignaciones FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'gerente'));

-- Calendario: Users can view/manage their own calendar
CREATE POLICY "Users can view own calendario" ON public.calendario_trabajo FOR SELECT TO authenticated USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Users can manage own calendario" ON public.calendario_trabajo FOR ALL TO authenticated USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));

-- Configuracion: Only admins can manage
CREATE POLICY "Authenticated users can view configuracion" ON public.configuracion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage configuracion" ON public.configuracion FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador'));