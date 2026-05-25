-- Add new role values to the enum for more flexibility
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'contador';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'asistente';