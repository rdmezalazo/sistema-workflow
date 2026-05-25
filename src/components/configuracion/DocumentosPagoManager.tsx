import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Pencil, Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DocumentoPago {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
}

export const DocumentosPagoManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentoPago | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<DocumentoPago | null>(null);
  const [formData, setFormData] = useState({ nombre: "" });

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["documentos_pago"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_pago")
        .select("*")
        .order("orden", { ascending: true });
      if (error) throw error;
      return data as DocumentoPago[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (nombre: string) => {
      const maxOrden = documentos.length > 0 
        ? Math.max(...documentos.map(d => d.orden)) + 1 
        : 1;
      const { error } = await supabase
        .from("documentos_pago")
        .insert({ nombre, orden: maxOrden });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos_pago"] });
      toast.success("Documento de pago creado");
      handleCloseDialog();
    },
    onError: () => toast.error("Error al crear documento de pago"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const { error } = await supabase
        .from("documentos_pago")
        .update({ nombre })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos_pago"] });
      toast.success("Documento de pago actualizado");
      handleCloseDialog();
    },
    onError: () => toast.error("Error al actualizar documento de pago"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from("documentos_pago")
        .update({ activo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos_pago"] });
      toast.success("Estado actualizado");
    },
    onError: () => toast.error("Error al actualizar estado"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("documentos_pago")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos_pago"] });
      toast.success("Documento de pago eliminado");
      setIsDeleteDialogOpen(false);
      setDeletingDoc(null);
    },
    onError: () => toast.error("Error al eliminar documento de pago"),
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDoc(null);
    setFormData({ nombre: "" });
  };

  const handleOpenEdit = (doc: DocumentoPago) => {
    setEditingDoc(doc);
    setFormData({ nombre: doc.nombre });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (editingDoc) {
      updateMutation.mutate({ id: editingDoc.id, nombre: formData.nombre });
    } else {
      createMutation.mutate(formData.nombre);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Documentos de Pago</h3>
            <p className="text-sm text-muted-foreground">Gestiona los tipos de documentos de pago</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? "Editar Documento de Pago" : "Nuevo Documento de Pago"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ nombre: e.target.value })}
                  placeholder="Ej: Factura"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingDoc ? "Guardar" : "Crear"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {documentos.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`font-medium ${!doc.activo ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {doc.nombre}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={doc.activo}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: doc.id, activo: checked })}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleOpenEdit(doc)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => {
                  setDeletingDoc(doc);
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {documentos.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No hay documentos de pago configurados
          </p>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento de pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente "{deletingDoc?.nombre}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingDoc(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDoc && deleteMutation.mutate(deletingDoc.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
