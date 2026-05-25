-- Add tipo_cliente column
ALTER TABLE public.clientes 
ADD COLUMN tipo_cliente text NOT NULL DEFAULT 'empresa';

-- Rename ruc to codigo
ALTER TABLE public.clientes 
RENAME COLUMN ruc TO codigo;

-- Add nombre_persona_natural column
ALTER TABLE public.clientes 
ADD COLUMN nombre_persona_natural text;

-- Add comment for clarity
COMMENT ON COLUMN public.clientes.codigo IS 'RUC para empresas, DNI para personas naturales';
COMMENT ON COLUMN public.clientes.tipo_cliente IS 'empresa o persona_natural';