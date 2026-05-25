-- Update the user's role to administrador
UPDATE public.user_roles 
SET role = 'administrador' 
WHERE user_id = '7b3a1dd3-4d89-4a17-a348-b3f59057f951';

-- Also update role_permisos policies to allow gerentes to manage roles too
DROP POLICY IF EXISTS "Admins can select role_permisos" ON public.role_permisos;
DROP POLICY IF EXISTS "Admins can insert role_permisos" ON public.role_permisos;
DROP POLICY IF EXISTS "Admins can update role_permisos" ON public.role_permisos;
DROP POLICY IF EXISTS "Admins can delete role_permisos" ON public.role_permisos;

-- Create policies that allow both administrador and gerente
CREATE POLICY "Staff can select role_permisos"
ON public.role_permisos
FOR SELECT
USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'gerente'));

CREATE POLICY "Admins can insert role_permisos"
ON public.role_permisos
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can update role_permisos"
ON public.role_permisos
FOR UPDATE
USING (has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can delete role_permisos"
ON public.role_permisos
FOR DELETE
USING (has_role(auth.uid(), 'administrador'));