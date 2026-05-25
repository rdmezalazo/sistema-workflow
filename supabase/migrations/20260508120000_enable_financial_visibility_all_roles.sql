-- Enable financial visibility for all roles so users from each sede
-- can view all elements (income, financial data, payment calendar) of their sede.
UPDATE public.configuracion
SET valor = '{"administrador":true,"gerente":true,"supervisor":true,"contador":true,"asesor":true,"auxiliar":true,"practicante":true}'::jsonb,
    updated_at = now()
WHERE clave = 'visibilidad_financiera';
