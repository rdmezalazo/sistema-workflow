-- Add new boolean column for Persona Natural with Company
ALTER TABLE public.clientes 
ADD COLUMN persona_natural_con_empresa boolean DEFAULT false;