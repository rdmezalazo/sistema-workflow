-- Add asignar_supervision column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN asignar_supervision boolean NOT NULL DEFAULT false;