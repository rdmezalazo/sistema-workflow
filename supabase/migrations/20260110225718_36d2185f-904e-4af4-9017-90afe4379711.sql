-- Agregar nuevas columnas a la tabla servicios
ALTER TABLE public.servicios 
ADD COLUMN grupo_servicio text,
ADD COLUMN regimen_tributario text,
ADD COLUMN compras_ventas_mensual_soles text,
ADD COLUMN compras_ventas_anual_soles text,
ADD COLUMN valoracion text,
ADD COLUMN entidad text,
ADD COLUMN tramite text,
ADD COLUMN base_imponible numeric DEFAULT 0,
ADD COLUMN igv_monto numeric DEFAULT 0,
ADD COLUMN precio_servicio numeric DEFAULT 0;

-- Eliminar columnas antiguas
ALTER TABLE public.servicios 
DROP COLUMN categoria,
DROP COLUMN producto,
DROP COLUMN variante,
DROP COLUMN precio;

-- Agregar comentarios para documentación
COMMENT ON COLUMN public.servicios.grupo_servicio IS 'Grupo de servicio';
COMMENT ON COLUMN public.servicios.tipo IS 'Tipo de servicio (contabilidad/tramites)';
COMMENT ON COLUMN public.servicios.regimen_tributario IS 'Régimen tributario aplicable';
COMMENT ON COLUMN public.servicios.compras_ventas_mensual_soles IS 'Rango de compras/ventas mensual en soles';
COMMENT ON COLUMN public.servicios.compras_ventas_anual_soles IS 'Rango de compras/ventas anual en soles';
COMMENT ON COLUMN public.servicios.valoracion IS 'Valoración del servicio';
COMMENT ON COLUMN public.servicios.entidad IS 'Entidad relacionada';
COMMENT ON COLUMN public.servicios.tramite IS 'Tipo de trámite';
COMMENT ON COLUMN public.servicios.servicio IS 'Descripción del servicio';
COMMENT ON COLUMN public.servicios.base_imponible IS 'Base imponible del servicio';
COMMENT ON COLUMN public.servicios.igv_monto IS 'Monto de IGV';
COMMENT ON COLUMN public.servicios.precio_servicio IS 'Precio total del servicio';