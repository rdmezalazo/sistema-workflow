-- Create enum for contract condition
CREATE TYPE public.contract_condition AS ENUM ('Vigente', 'Terminado', 'Anulado', 'Suspendido');

-- Add condicion column to contratos table
ALTER TABLE public.contratos 
ADD COLUMN condicion public.contract_condition NOT NULL DEFAULT 'Vigente';