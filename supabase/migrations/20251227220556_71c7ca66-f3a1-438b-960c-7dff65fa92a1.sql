-- Add new fields to clientes table
ALTER TABLE public.clientes
ADD COLUMN contacto_telefono2 text,
ADD COLUMN contacto_nombre2 text,
ADD COLUMN regimen_tributario text,
ADD COLUMN regimen_laboral text,
ADD COLUMN actividad_economica text,
ADD COLUMN usuario_sunat text,
ADD COLUMN clave_sunat text,
ADD COLUMN nro_trabajadores integer;