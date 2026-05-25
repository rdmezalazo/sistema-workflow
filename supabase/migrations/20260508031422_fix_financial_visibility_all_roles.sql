-- Enable financial visibility for ALL roles (asesor, auxiliar, practicante included)
-- so users from each sede can see income, financial data and payment calendar.
INSERT INTO public.configuracion (clave, valor, descripcion)
VALUES (
  'visibilidad_financiera',
  '{"administrador":true,"gerente":true,"supervisor":true,"contador":true,"asesor":true,"auxiliar":true,"practicante":true}'::jsonb,
  'Visibilidad de información financiera por rol'
)
ON CONFLICT (clave) DO UPDATE
SET valor = EXCLUDED.valor,
    updated_at = now();
