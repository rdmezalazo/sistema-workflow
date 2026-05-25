-- Remove foreign key constraint on profiles.id to allow personal without auth accounts
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;