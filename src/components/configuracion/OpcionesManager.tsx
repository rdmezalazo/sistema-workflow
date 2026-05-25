import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

interface Opcion {
  id: string;
  nombre: string;
  activo: boolean;
}

interface OpcionesManagerProps {
  titulo: string;
  descripcion: string;
  opciones: Opcion[];
  onAdd: (nombre: string) => Promise<void>;
  onUpdate: (id: string, nombre: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  icon: React.ReactNode;
  colorClass?: string;
}

export function OpcionesManager({
  titulo,
  descripcion,
  opciones,
  onAdd,
  onUpdate,
  onToggle,
  onDelete,
  icon,
  colorClass = "bg-primary/10 text-primary",
}: OpcionesManagerProps) {
  const [nuevaOpcion, setNuevaOpcion] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNombre, setEditingNombre] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!nuevaOpcion.trim()) return;
    setAdding(true);
    await onAdd(nuevaOpcion.trim());
    setNuevaOpcion("");
    setAdding(false);
  };

  const handleStartEdit = (opcion: Opcion) => {
    setEditingId(opcion.id);
    setEditingNombre(opcion.nombre);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingNombre.trim()) return;
    await onUpdate(editingId, editingNombre.trim());
    setEditingId(null);
    setEditingNombre("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingNombre("");
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    await onDelete(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{titulo}</h3>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>

      {/* Agregar nueva opción */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Nueva opción..."
          value={nuevaOpcion}
          onChange={(e) => setNuevaOpcion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button
          onClick={handleAdd}
          disabled={adding || !nuevaOpcion.trim()}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {/* Lista de opciones */}
      <div className="space-y-2">
        {opciones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay opciones configuradas
          </p>
        ) : (
          opciones.map((opcion) => (
            <div
              key={opcion.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  {icon}
                </div>
                {editingId === opcion.id ? (
                  <Input
                    value={editingNombre}
                    onChange={(e) => setEditingNombre(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    className={`font-medium ${
                      opcion.activo ? "text-foreground" : "text-muted-foreground line-through"
                    }`}
                  >
                    {opcion.nombre}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingId === opcion.id ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSaveEdit}
                      className="h-8 w-8 text-green-600"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCancelEdit}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Switch
                      checked={opcion.activo}
                      onCheckedChange={() => onToggle(opcion.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartEdit(opcion)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(opcion.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta opción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La opción será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
