import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  clientName: string;
  onSuccess: () => void;
}

export function DeleteClientDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSuccess,
}: DeleteClientDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", clientId);

      if (error) throw error;

      toast.success("Cliente eliminado exitosamente");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error("Error al eliminar cliente: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Eliminar Cliente
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar al cliente{" "}
            <span className="font-semibold text-foreground">{clientName}</span>?
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
