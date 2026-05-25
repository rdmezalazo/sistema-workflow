-- Create table for portfolio members (users assigned to a portfolio)
CREATE TABLE IF NOT EXISTS public.cartera_miembros (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cartera_id uuid NOT NULL REFERENCES public.carteras(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rol_en_cartera text NOT NULL DEFAULT 'miembro',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(cartera_id, user_id)
);

-- Enable RLS
ALTER TABLE public.cartera_miembros ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cartera_miembros
CREATE POLICY "Authenticated users can view cartera_miembros"
ON public.cartera_miembros
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage cartera_miembros"
ON public.cartera_miembros
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add specialty column to carteras if not exists
ALTER TABLE public.carteras 
ADD COLUMN IF NOT EXISTS especialidad text DEFAULT 'Mixta';

-- Add comments
COMMENT ON TABLE public.cartera_miembros IS 'Miembros asignados a cada cartera';
COMMENT ON COLUMN public.cartera_miembros.rol_en_cartera IS 'Rol del usuario dentro de la cartera (ej: asesor, auxiliar)';