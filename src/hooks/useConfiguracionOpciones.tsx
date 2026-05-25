import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConfiguracionOpcion {
  id: string;
  nombre: string;
  activo: boolean;
}

export function useConfiguracionOpciones(clave: string) {
  const [opciones, setOpciones] = useState<ConfiguracionOpcion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOpciones = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracion")
        .select("*")
        .eq("clave", clave)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data && data.valor) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const valorData = data.valor as any;
        setOpciones(valorData.opciones || []);
      } else {
        setOpciones([]);
      }
    } catch (error: unknown) {
      console.error("Error fetching opciones:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpciones();
  }, [clave]);

  const addOpcion = async (nombre: string) => {
    try {
      const nuevaOpcion: ConfiguracionOpcion = {
        id: crypto.randomUUID(),
        nombre,
        activo: true,
      };

      const nuevasOpciones = [...opciones, nuevaOpcion];

      const { data: existing } = await supabase
        .from("configuracion")
        .select("id")
        .eq("clave", clave)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valorJson = { opciones: nuevasOpciones } as any;

      if (existing) {
        const { error } = await supabase
          .from("configuracion")
          .update({ valor: valorJson })
          .eq("clave", clave);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("configuracion").insert([{
          clave,
          valor: valorJson,
          descripcion: `Opciones de ${clave}`,
        }]);

        if (error) throw error;
      }

      setOpciones(nuevasOpciones);
      toast.success("Opción agregada");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al agregar opción: " + message);
    }
  };

  const updateOpcion = async (id: string, nombre: string) => {
    try {
      const nuevasOpciones = opciones.map((op) =>
        op.id === id ? { ...op, nombre } : op
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valorJson = { opciones: nuevasOpciones } as any;

      const { error } = await supabase
        .from("configuracion")
        .update({ valor: valorJson })
        .eq("clave", clave);

      if (error) throw error;

      setOpciones(nuevasOpciones);
      toast.success("Opción actualizada");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al actualizar opción: " + message);
    }
  };

  const toggleOpcion = async (id: string) => {
    try {
      const nuevasOpciones = opciones.map((op) =>
        op.id === id ? { ...op, activo: !op.activo } : op
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valorJson = { opciones: nuevasOpciones } as any;

      const { error } = await supabase
        .from("configuracion")
        .update({ valor: valorJson })
        .eq("clave", clave);

      if (error) throw error;

      setOpciones(nuevasOpciones);
      toast.success("Estado actualizado");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al actualizar estado: " + message);
    }
  };

  const deleteOpcion = async (id: string) => {
    try {
      const nuevasOpciones = opciones.filter((op) => op.id !== id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valorJson = { opciones: nuevasOpciones } as any;

      const { error } = await supabase
        .from("configuracion")
        .update({ valor: valorJson })
        .eq("clave", clave);

      if (error) throw error;

      setOpciones(nuevasOpciones);
      toast.success("Opción eliminada");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar opción: " + message);
    }
  };

  return {
    opciones,
    loading,
    addOpcion,
    updateOpcion,
    toggleOpcion,
    deleteOpcion,
    refetch: fetchOpciones,
  };
}
