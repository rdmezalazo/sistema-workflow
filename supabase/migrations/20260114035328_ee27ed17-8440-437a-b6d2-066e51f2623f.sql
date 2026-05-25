-- Allow authenticated users with administrador role to insert profiles for personal (without auth account)
CREATE POLICY "Admins can insert profiles for personal"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'administrador'
  )
);

-- Allow authenticated users with administrador role to delete profiles (for personal without auth account)
CREATE POLICY "Admins can delete profiles for personal"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'administrador'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = profiles.id
  )
);