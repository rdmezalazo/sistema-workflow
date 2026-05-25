-- Add foreign key from cartera_miembros.user_id to profiles.id
ALTER TABLE public.cartera_miembros
ADD CONSTRAINT cartera_miembros_profile_fk 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;