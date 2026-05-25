-- Drop the existing policy that doesn't work for INSERT
DROP POLICY IF EXISTS "Admins can manage role_permisos" ON public.role_permisos;

-- Create separate policies for each operation
CREATE POLICY "Admins can select role_permisos"
ON public.role_permisos
FOR SELECT
USING (has_role(auth.uid(), 'administrador'));

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