import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Save, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProformaEstado {
  id: string;
  nombre: string;
  nombre_display: string;
  color: string;
  orden: number;
  activo: boolean;
  es_sistema: boolean;
}

const PRESET_COLORS = [
  "#6B7280", // Gray
  "#3B82F6", // Blue
  "#10B981", // Green
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
];

export function ProformaEstadosManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEstado, setEditingEstado] = useState<ProformaEstado | null>(null);
  const [estadoToDelete, setEstadoToDelete] = useState<ProformaEstado | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    nombre_display: "",
    color: "#6B7280",
  });

  const { data: estados = [], isLoading } = useQuery({
    queryKey: ["proforma-estados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proforma_estados")
        .select("*")
        .order("orden");
      if (error) throw error;
      return data as ProformaEstado[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { nombre: string; nombre_display: string; color: string }) => {
      const maxOrden = estados.length > 0 ? Math.max(...estados.map((e) => e.orden)) : 0;
      const { error } = await supabase.from("proforma_estados").insert({
        nombre: data.nombre.toLowerCase().replace(/\s+/g, "_"),
        nombre_display: data.nombre_display,
        color: data.color,
        orden: maxOrden + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proforma-estados"] });
      toast.success("Estado creado correctamente");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear el estado");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; nombre_display: string; color: string }) => {
      const { error } = await supabase
        .from("proforma_estados")
        .update({
          nombre_display: data.nombre_display,
          color: data.color,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proforma-estados"] });
      toast.success("Estado actualizado correctamente");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar el estado");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from("proforma_estados")
        .update({ activo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proforma-estados"] });
      toast.success("Estado actualizado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar el estado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proforma_estados")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proforma-estados"] });
      toast.success("Estado eliminado correctamente");
      setDeleteDialogOpen(false);
      setEstadoToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar el estado");
    },
  });

  const handleOpenCreate = () => {
    setEditingEstado(null);
    setFormData({ nombre: "", nombre_display: "", color: "#6B7280" });
    setDialogOpen(true);
  };

  const handleOpenEdit = (estado: ProformaEstado) => {
    setEditingEstado(estado);
    setFormData({
      nombre: estado.nombre,
      nombre_display: estado.nombre_display,
      color: estado.color,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEstado(null);
    setFormData({ nombre: "", nombre_display: "", color: "#6B7280" });
  };

  const handleSubmit = () => {
    if (!formData.nombre_display.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    if (editingEstado) {
      updateMutation.mutate({
        id: editingEstado.id,
        nombre_display: formData.nombre_display,
        color: formData.color,
      });
    } else {
      createMutation.mutate({
        nombre: formData.nombre_display,
        nombre_display: formData.nombre_display,
        color: formData.color,
      });
    }
  };

  const handleDelete = (estado: ProformaEstado) => {
    if (estado.es_sistema) {
      toast.error("No se puede eliminar un estado del sistema");
      return;
    }
    setEstadoToDelete(estado);
    setDeleteDialogOpen(true);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Estados de Proforma</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los estados disponibles para las proformas
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="btn-gradient gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Estado
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {estados.map((estado) => (
            <div
              key={estado.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: estado.color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{estado.nombre_display}</p>
                    {estado.es_sistema && (
                      <Badge variant="secondary" className="text-xs">
                        Sistema
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Clave: {estado.nombre}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={estado.activo}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: estado.id, activo: checked })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenEdit(estado)}
                  className="h-8 w-8"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                {!estado.es_sistema && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(estado)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEstado ? "Editar Estado" : "Nuevo Estado"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del Estado</Label>
              <Input
                placeholder="Ej: En Revisión"
                value={formData.nombre_display}
                onChange={(e) =>
                  setFormData({ ...formData, nombre_display: e.target.value })
                }
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-xs text-muted-foreground">Personalizado:</Label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: formData.color }}
              />
              <Badge
                style={{
                  backgroundColor: `${formData.color}20`,
                  color: formData.color,
                  borderColor: formData.color,
                }}
                variant="outline"
              >
                {formData.nombre_display || "Vista previa"}
              </Badge>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending} className="btn-gradient">
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el estado "{estadoToDelete?.nombre_display}". Las
              proformas que tengan este estado se mantendrán pero el estado ya no será
              seleccionable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => estadoToDelete && deleteMutation.mutate(estadoToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
