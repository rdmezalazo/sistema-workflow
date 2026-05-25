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
import { Loader2, Hash, Save, RotateCcw } from "lucide-react";
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

interface ContratoSecuencia {
  id: string;
  tipo: string;
  prefijo: string;
  ultimo_numero: number;
  anio_vigente: number;
  digitos_correlativo: number;
}

export function ContratoSecuenciasManager() {
  const queryClient = useQueryClient();
  const [editedSecuencia, setEditedSecuencia] = useState<Partial<ContratoSecuencia>>({});
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const { data: secuencia, isLoading } = useQuery({
    queryKey: ["contrato_secuencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrato_secuencias")
        .select("*")
        .eq("tipo", "general")
        .single();
      
      if (error) throw error;
      return data as ContratoSecuencia;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ContratoSecuencia>) => {
      if (!secuencia) return;
      const { error } = await supabase
        .from("contrato_secuencias")
        .update(updates)
        .eq("id", secuencia.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrato_secuencias"] });
      toast.success("Configuración guardada correctamente");
      setEditedSecuencia({});
    },
    onError: (error) => {
      console.error("Error updating secuencia:", error);
      toast.error("Error al guardar la configuración");
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!secuencia) return;
      const { error } = await supabase
        .from("contrato_secuencias")
        .update({ ultimo_numero: 0 })
        .eq("id", secuencia.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrato_secuencias"] });
      toast.success("Correlativo reiniciado correctamente");
      setResetDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error resetting secuencia:", error);
      toast.error("Error al reiniciar el correlativo");
    },
  });

  const handleEdit = (field: keyof ContratoSecuencia, value: string | number) => {
    setEditedSecuencia(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (Object.keys(editedSecuencia).length === 0) return;
    await updateMutation.mutateAsync(editedSecuencia);
  };

  const getValue = (field: keyof ContratoSecuencia) => {
    return editedSecuencia[field] ?? secuencia?.[field];
  };

  const hasChanges = Object.keys(editedSecuencia).length > 0;

  const getPreview = () => {
    if (!secuencia) return "";
    const prefijo = getValue("prefijo") as string;
    const anio = getValue("anio_vigente") as number;
    const digitos = getValue("digitos_correlativo") as number;
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

  if (!secuencia) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <p className="text-muted-foreground">No se encontró configuración de secuencia.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Hash className="h-5 w-5 text-primary" />
          Codificación de Contratos
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure el formato de numeración para los contratos
        </p>

        <div className="border border-border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">Contratos</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Vista previa:</span>
              <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                {getPreview()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prefijo-contrato">
                Abreviatura (Prefijo)
              </Label>
              <Input
                id="prefijo-contrato"
                value={getValue("prefijo") as string}
                onChange={(e) => handleEdit("prefijo", e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="CT"
                className="font-mono uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anio-contrato">
                Año Vigente
              </Label>
              <Input
                id="anio-contrato"
                type="number"
                value={getValue("anio_vigente") as number}
                onChange={(e) => handleEdit("anio_vigente", parseInt(e.target.value) || new Date().getFullYear())}
                min={2020}
                max={2100}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="digitos-contrato">
                Dígitos Correlativo
              </Label>
              <Select
                value={String(getValue("digitos_correlativo"))}
                onValueChange={(v) => handleEdit("digitos_correlativo", parseInt(v))}
              >
                <SelectTrigger id="digitos-contrato">
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
              <Label htmlFor="ultimo-contrato">
                Último Número Usado
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="ultimo-contrato"
                  type="number"
                  value={getValue("ultimo_numero") as number}
                  onChange={(e) => handleEdit("ultimo_numero", parseInt(e.target.value) || 0)}
                  min={0}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setResetDialogOpen(true)}
                  title="Reiniciar a 0"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {hasChanges && (
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
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
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reiniciar correlativo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto reiniciará el correlativo de contratos a 0. El próximo contrato
              comenzará desde el número 1. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetMutation.mutate()}>
              Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
