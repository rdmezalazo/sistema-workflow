-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dni text,
ADD COLUMN IF NOT EXISTS puesto text;

-- Create index on dni for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_dni ON public.profiles(dni);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.dni IS 'Documento Nacional de Identidad';
COMMENT ON COLUMN public.profiles.puesto IS 'Puesto o cargo del personal';