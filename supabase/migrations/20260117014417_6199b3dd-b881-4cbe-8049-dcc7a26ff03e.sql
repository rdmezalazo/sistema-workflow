-- Add field to store whether calendar projection should be included in PDF print
ALTER TABLE public.proformas 
ADD COLUMN IF NOT EXISTS incluir_proyeccion_pdf BOOLEAN NOT NULL DEFAULT false;