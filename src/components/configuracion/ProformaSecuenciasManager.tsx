import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Hash, Calendar, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProformaSecuencia {
  id: string;
  tipo: string;
  prefijo: string;
  ultimo_numero: number;
  anio_vigente: number;
  digitos_correlativo: number;
}

const TIPO_LABELS: Record<string, string> = {
  "Contabilidad": "Contabilidad",
  "Trámites": "Trámites",
  "Auditoría y Control Interno": "Auditoría y Control Interno",
};

export function ProformaSecuenciasManager() {
  const queryClient = useQueryClient();
  const [editedSecuencias, setEditedSecuencias] = useState<Record<string, Partial<ProformaSecuencia>>>({});
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetingTipo, setResetingTipo] = useState<string | null>(null);

  const { data: secuencias, isLoading } = useQuery({
    queryKey: ["proforma_secuencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proforma_secuencias")
        .select("*")
        .in("tipo", ["Contabilidad", "Trámites", "Auditoría y Control Interno"])
        .order("tipo");
      
      if (error) throw error;
      return data as ProformaSecuencia[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProformaSecuencia> }) => {
      const { error } = await supabase
        .from("proforma_secuencias")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proforma_secuencias"] });
      toast.success("Configuración guardada correctamente");
    },
    onError: (error) => {
      console.error("Error updating secuencia:", error);
      toast.error("Error al guardar la configuración");
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (tipo: string) => {
      const { error } = await supabase
        .from("proforma_secuencias")
        .update({ ultimo_numero: 0 })
        .eq("tipo", tipo);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proforma_secuencias"] });
      toast.success("Correlativo reiniciado correctamente");
      setResetDialogOpen(false);
      setResetingTipo(null);
    },
    onError: (error) => {
      console.error("Error resetting secuencia:", error);
      toast.error("Error al reiniciar el correlativo");
    },
  });

  const handleEdit = (id: string, field: keyof ProformaSecuencia, value: string | number) => {
    setEditedSecuencias(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSave = async (secuencia: ProformaSecuencia) => {
    const updates = editedSecuencias[secuencia.id];
    if (!updates) return;

    await updateMutation.mutateAsync({ id: secuencia.id, updates });
    setEditedSecuencias(prev => {
      const newState = { ...prev };
      delete newState[secuencia.id];
      return newState;
    });
  };

  const handleReset = (tipo: string) => {
    setResetingTipo(tipo);
    setResetDialogOpen(true);
  };

  const confirmReset = () => {
    if (resetingTipo) {
      resetMutation.mutate(resetingTipo);
    }
  };

  const getValue = (secuencia: ProformaSecuencia, field: keyof ProformaSecuencia) => {
    return editedSecuencias[secuencia.id]?.[field] ?? secuencia[field];
  };

  const hasChanges = (id: string) => {
    return editedSecuencias[id] && Object.keys(editedSecuencias[id]).length > 0;
  };

  const getPreview = (secuencia: ProformaSecuencia) => {
    const prefijo = getValue(secuencia, "prefijo") as string;
    const anio = getValue(secuencia, "anio_vigente") as number;
    const digitos = getValue(secuencia, "digitos_correlativo") as number;
    const numero = (secuencia.ultimo_numero + 1).toString().padStart(digitos, "0");
    return `${prefijo}-${anio}-${numero}`;
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Hash className="h-5 w-5 text-primary" />
          Codificación de Proformas
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure el formato de numeración para cada tipo de proforma
        </p>

        <div className="space-y-6">
          {secuencias?.map((secuencia) => (
            <div
              key={secuencia.id}
              className="border border-border rounded-lg p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">
                  {TIPO_LABELS[secuencia.tipo] || secuencia.tipo}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Vista previa:</span>
                  <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {getPreview(secuencia)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`prefijo-${secuencia.id}`}>
                    Abreviatura (Prefijo)
                  </Label>
                  <Input
                    id={`prefijo-${secuencia.id}`}
                    value={getValue(secuencia, "prefijo") as string}
                    onChange={(e) => handleEdit(secuencia.id, "prefijo", e.target.value.toUpperCase())}
                    maxLength={4}
                    placeholder="PC"
                    className="font-mono uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`anio-${secuencia.id}`}>
                    Año Vigente
                  </Label>
                  <Input
                    id={`anio-${secuencia.id}`}
                    type="number"
                    value={getValue(secuencia, "anio_vigente") as number}
                    onChange={(e) => handleEdit(secuencia.id, "anio_vigente", parseInt(e.target.value) || new Date().getFullYear())}
                    min={2020}
                    max={2100}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`digitos-${secuencia.id}`}>
                    Dígitos Correlativo
                  </Label>
                  <Select
                    value={String(getValue(secuencia, "digitos_correlativo"))}
                    onValueChange={(v) => handleEdit(secuencia.id, "digitos_correlativo", parseInt(v))}
                  >
                    <SelectTrigger id={`digitos-${secuencia.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 dígitos (001)</SelectItem>
                      <SelectItem value="4">4 dígitos (0001)</SelectItem>
                      <SelectItem value="5">5 dígitos (00001)</SelectItem>
                      <SelectItem value="6">6 dígitos (000001)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`ultimo-${secuencia.id}`}>
                    Último Número Usado
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`ultimo-${secuencia.id}`}
                      type="number"
                      value={getValue(secuencia, "ultimo_numero") as number}
                      onChange={(e) => handleEdit(secuencia.id, "ultimo_numero", parseInt(e.target.value) || 0)}
                      min={0}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleReset(secuencia.tipo)}
                      title="Reiniciar a 0"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {hasChanges(secuencia.id) && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSave(secuencia)}
                    disabled={updateMutation.isPending}
                    className="gap-2"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Guardar cambios
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reiniciar correlativo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto reiniciará el correlativo de {resetingTipo} a 0. La próxima proforma
              de este tipo comenzará desde el número 1. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset}>
              Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
