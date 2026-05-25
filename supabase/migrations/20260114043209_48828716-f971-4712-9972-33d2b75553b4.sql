-- Remove FK to auth.users since we use profiles for members (allows personal without user accounts)
ALTER TABLE public.cartera_miembros
DROP CONSTRAINT cartera_miembros_user_id_fkey;