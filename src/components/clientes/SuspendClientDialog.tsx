import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MotivosSuspensionManager } from "./MotivosSuspensionManager";

interface MotivoSuspension {
  id: string;
  nombre: string;
  descripcion: string | null;
}

interface SuspendClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  clientName: string;
  onSuccess: () => void;
}

export function SuspendClientDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSuccess,
}: SuspendClientDialogProps) {
  const [motivos, setMotivos] = useState<MotivoSuspension[]>([]);
  const [selectedMotivo, setSelectedMotivo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  const fetchMotivos = async () => {
    const { data, error } = await supabase
      .from("motivos_suspension")
      .select("id, nombre, descripcion")
      .eq("activo", true)
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
      setSelectedMotivo("");
    }
  }, [open]);

  const handleSuspend = async () => {
    if (!clientId || !selectedMotivo) {
      toast.error("Debe seleccionar un motivo de suspensión");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("clientes")
        .update({
          activo: false,
          motivo_suspension_id: selectedMotivo,
          fecha_suspension: new Date().toISOString(),
        })
        .eq("id", clientId);

      if (error) throw error;

      toast.success("Cliente suspendido exitosamente");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Error al suspender cliente: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suspender Cliente</DialogTitle>
            <DialogDescription>
              Está por suspender al cliente <strong>{clientName}</strong>. 
              Seleccione el motivo de la suspensión.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="motivo">Motivo de suspensión</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setManagerOpen(true)}
                  title="Gestionar motivos"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
              <Select value={selectedMotivo} onValueChange={setSelectedMotivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {motivos.map((motivo) => (
                    <SelectItem key={motivo.id} value={motivo.id}>
                      {motivo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleSuspend}
              disabled={loading || !selectedMotivo}
            >
              {loading ? "Suspendiendo..." : "Suspender"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MotivosSuspensionManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        onUpdate={fetchMotivos}
      />
    </>
  );
}
