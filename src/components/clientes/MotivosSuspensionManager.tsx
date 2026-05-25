import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MotivoSuspension {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  orden: number;
}

interface MotivosSuspensionManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function MotivosSuspensionManager({
  open,
  onOpenChange,
  onUpdate,
}: MotivosSuspensionManagerProps) {
  const [motivos, setMotivos] = useState<MotivoSuspension[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMotivo, setNewMotivo] = useState("");

  const fetchMotivos = async () => {
    const { data, error } = await supabase
      .from("motivos_suspension")
      .select("*")
      .order("orden");

    if (error) {
      toast.error("Error al cargar motivos: " + error.message);
      return;
    }
    setMotivos(data || []);
  };

  useEffect(() => {
    if (open) {
      fetchMotivos();
    }
  }, [open]);

  const handleAddMotivo = async () => {
    if (!newMotivo.trim()) return;

    setLoading(true);
    try {
      const maxOrden = motivos.length > 0 
        ? Math.max(...motivos.map(m => m.orden)) + 1 
        : 1;

      const { error } = await supabase
        .from("motivos_suspension")
        .insert({ nombre: newMotivo.trim(), orden: maxOrden });

      if (error) throw error;

      toast.success("Motivo agregado");
      setNewMotivo("");
      fetchMotivos();
      onUpdate();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivo = async (id: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from("motivos_suspension")
        .update({ activo })
        .eq("id", id);

      if (error) throw error;

      setMotivos(prev => 
        prev.map(m => m.id === id ? { ...m, activo } : m)
      );
      onUpdate();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("motivos_suspension")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Motivo eliminado");
      fetchMotivos();
      onUpdate();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestionar Motivos de Suspensión</DialogTitle>
          <DialogDescription>
            Agregue, edite o elimine los motivos de suspensión de clientes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new motivo */}
          <div className="flex gap-2">
            <Input
              placeholder="Nuevo motivo..."
              value={newMotivo}
              onChange={(e) => setNewMotivo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMotivo()}
            />
            <Button onClick={handleAddMotivo} disabled={loading || !newMotivo.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* List of motivos */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {motivos.map((motivo) => (
              <div
                key={motivo.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <span className="flex-1 text-sm font-medium">{motivo.nombre}</span>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`activo-${motivo.id}`} className="text-xs text-muted-foreground">
                    Activo
                  </Label>
                  <Switch
                    id={`activo-${motivo.id}`}
                    checked={motivo.activo}
                    onCheckedChange={(checked) => handleToggleActivo(motivo.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(motivo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
