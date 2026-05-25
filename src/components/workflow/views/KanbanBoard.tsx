import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format, parseISO, isPast } from "date-fns";
import { es } from "date-fns/locale";
import {
  ListTodo,
  Plus,
  Trash2,
  Loader2,
  Clock,
  User,
  AlertTriangle,
  Calendar,
  CalendarDays,
  Settings2,
  X,
  Pencil,
  Check,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TreeNode } from "../WorkFlowTreeSidebar";
import { useWorkflowItemProgress } from "@/hooks/useWorkflowItemProgress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KanbanBoardProps {
  node: TreeNode;
  workflowId?: string;
  profiles: { id: string; full_name: string | null }[];
  onRefresh?: () => void;
  canEditAll?: boolean;
  currentUserId?: string | null;
}

interface KanbanCard {
  id: string;
  titulo: string;
  descripcion?: string;
  status: string;
  orden: number;
  asignado_a?: string;
  asignados?: string[];
  fecha_vencimiento?: string;
  prioridad: string;
  etiquetas: { color: string; label: string }[];
  color_tarjeta?: string;
}

interface KanbanColumn {
  id: string;
  label: string;
  color: string;
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "pendiente", label: "Pendiente", color: "bg-gray-100 dark:bg-gray-800" },
  { id: "en_progreso", label: "En Progreso", color: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "en_revision", label: "En Revisión", color: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "completado", label: "Completado", color: "bg-green-50 dark:bg-green-950/30" },
];

const PRIORITIES = [
  { value: "baja", label: "Baja", color: "bg-gray-100 text-gray-700" },
  { value: "media", label: "Media", color: "bg-blue-100 text-blue-700" },
  { value: "alta", label: "Alta", color: "bg-orange-100 text-orange-700" },
  { value: "urgente", label: "Urgente", color: "bg-red-100 text-red-700" },
];

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6",
  "#ec4899", "#14b8a6", "#6366f1", "#f43f5e",
];

const CARD_COLORS = [
  { color: "", label: "Sin color" },
  { color: "#fef2f2", label: "Rojo suave" },
  { color: "#fff7ed", label: "Naranja suave" },
  { color: "#fefce8", label: "Amarillo suave" },
  { color: "#f0fdf4", label: "Verde suave" },
  { color: "#eff6ff", label: "Azul suave" },
  { color: "#faf5ff", label: "Violeta suave" },
  { color: "#fdf2f8", label: "Rosa suave" },
  { color: "#f0fdfa", label: "Teal suave" },
];

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const formatDateSafe = (dateStr: string | undefined): string | null => {
  if (!dateStr || !dateStr.trim()) return null;
  try {
    const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const [year, month, day] = datePart.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "dd MMM yyyy", { locale: es });
  } catch {
    return null;
  }
};

// --- Tag Editor Popover ---
function TagEditorPopover({
  tag,
  onSave,
  onDelete,
}: {
  tag: { color: string; label: string };
  onSave: (updated: { color: string; label: string }) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(tag.label);
  const [color, setColor] = useState(tag.color);

  useEffect(() => {
    setLabel(tag.label);
    setColor(tag.color);
  }, [tag, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="group relative rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer flex items-center gap-1"
          style={{ backgroundColor: color }}
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        >
          {label || <span className="opacity-70">—</span>}
          <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 space-y-3" align="start" onClick={(e) => e.stopPropagation()}>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre</label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nombre de etiqueta"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                className={cn(
                  "h-6 w-6 rounded-full transition-all",
                  color === c ? "ring-2 ring-offset-1 ring-primary scale-110" : "hover:scale-110"
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => { onDelete(); setOpen(false); }}>
            <Trash2 className="h-3 w-3 mr-1" /> Quitar
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => { onSave({ color, label }); setOpen(false); }}>
            <Check className="h-3 w-3 mr-1" /> Guardar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --- Column Config Dialog ---
function ColumnConfigDialog({
  open,
  onOpenChange,
  columns,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  columns: KanbanColumn[];
  onSave: (cols: KanbanColumn[]) => void;
}) {
  const [cols, setCols] = useState<KanbanColumn[]>(columns);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    setCols(columns);
  }, [columns, open]);

  const addColumn = () => {
    if (!newLabel.trim()) return;
    const id = newLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (cols.find((c) => c.id === id)) {
      toast.error("Ya existe una columna con ese ID");
      return;
    }
    setCols([...cols, { id, label: newLabel.trim(), color: "bg-gray-50 dark:bg-gray-900/30" }]);
    setNewLabel("");
  };

  const removeColumn = (id: string) => {
    if (cols.length <= 2) {
      toast.error("Debe haber al menos 2 columnas");
      return;
    }
    setCols(cols.filter((c) => c.id !== id));
  };

  const updateLabel = (id: string, label: string) => {
    setCols(cols.map((c) => (c.id === id ? { ...c, label } : c)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Configurar Columnas</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {cols.map((col, idx) => (
            <div key={col.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5">{idx + 1}</span>
              <Input
                value={col.label}
                onChange={(e) => updateLabel(col.id, e.target.value)}
                className="h-8 text-sm flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeColumn(col.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nueva columna..."
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => e.key === "Enter" && addColumn()}
            />
            <Button size="sm" className="h-8" onClick={addColumn} disabled={!newLabel.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onSave(cols); onOpenChange(false); }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KanbanBoard({ node, workflowId, profiles, onRefresh, canEditAll = false, currentUserId }: KanbanBoardProps) {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>(DEFAULT_COLUMNS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [showNewCardDialog, setShowNewCardDialog] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [newCardColumn, setNewCardColumn] = useState<string>("pendiente");
  const [newCardTitle, setNewCardTitle] = useState("");
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});

  // Fetch cartera member roles for role badges
  useEffect(() => {
    const fetchMemberRoles = async () => {
      const { data } = await supabase.from("cartera_miembros").select("user_id, rol_en_cartera");
      if (data) {
        const roles: Record<string, string> = {};
        data.forEach((r) => { roles[r.user_id] = r.rol_en_cartera; });
        setMemberRoles(roles);
      }
    };
    fetchMemberRoles();
  }, []);

  // Calculate card progress based on column position
  const getCardProgress = useCallback((card: KanbanCard) => {
    const colIndex = columns.findIndex((c) => c.id === card.status);
    if (colIndex < 0 || columns.length <= 1) return 0;
    return Math.round((colIndex / (columns.length - 1)) * 100);
  }, [columns]);

  // Get unique roles for cards in a column
  const getColumnRoles = useCallback((columnCards: KanbanCard[]) => {
    const roles = new Set<string>();
    columnCards.forEach((card) => {
      const assignees = card.asignados?.length ? card.asignados : card.asignado_a ? [card.asignado_a] : [];
      assignees.forEach((uid) => {
        const role = memberRoles[uid];
        if (role) roles.add(role);
      });
    });
    return [...roles];
  }, [memberRoles]);

  const { syncProgress } = useWorkflowItemProgress(workflowId, node.id, onRefresh);

  // Ownership check: can the current user edit this specific card?
  const canEditCard = useCallback((card: KanbanCard) => {
    if (canEditAll) return true;
    if (!currentUserId) return false;
    // Check single assignee
    if (card.asignado_a === currentUserId) return true;
    // Check multiple assignees
    if (card.asignados && card.asignados.includes(currentUserId)) return true;
    return false;
  }, [canEditAll, currentUserId]);

  // Can the user create new cards? (always yes, they'll be assigned to themselves)
  const canCreate = canEditAll || !!currentUserId;

  // Find the "completed" column (last column or one named completado)
  const completedColumnId = useMemo(() => {
    const comp = columns.find((c) => c.id === "completado");
    return comp ? comp.id : columns[columns.length - 1]?.id;
  }, [columns]);

  const progress = useMemo(() => {
    if (cards.length === 0) return 0;
    const completed = cards.filter((c) => c.status === completedColumnId).length;
    return Math.round((completed / cards.length) * 100);
  }, [cards, completedColumnId]);

  useEffect(() => {
    if (!loading && cards.length > 0) {
      syncProgress(progress);
    }
  }, [progress, loading, cards.length, syncProgress]);

  // Fetch cards and column config
  useEffect(() => {
    if (workflowId) {
      fetchData();
    }
  }, [workflowId, node.id]);

  const fetchData = async () => {
    if (!workflowId) return;
    setLoading(true);
    try {
      const [cardsRes, configRes] = await Promise.all([
        supabase
          .from("workflow_kanban_cards")
          .select("*")
          .eq("workflow_id", workflowId)
          .eq("workflow_item_id", node.id)
          .order("orden"),
        supabase
          .from("workflow_kanban_config" as any)
          .select("*")
          .eq("workflow_id", workflowId)
          .eq("workflow_item_id", node.id)
          .maybeSingle(),
      ]);

      if (cardsRes.error) throw cardsRes.error;

      setCards(
        (cardsRes.data || []).map((c: any) => ({
          id: c.id,
          titulo: c.titulo,
          descripcion: c.descripcion,
          status: c.status,
          orden: c.orden,
          asignado_a: c.asignado_a,
          asignados: Array.isArray(c.asignados) ? c.asignados : c.asignado_a ? [c.asignado_a] : [],
          fecha_vencimiento: c.fecha_vencimiento,
          prioridad: c.prioridad || "media",
          etiquetas: Array.isArray(c.etiquetas) ? c.etiquetas : [],
          color_tarjeta: c.color_tarjeta || undefined,
        }))
      );

      if (configRes.data && Array.isArray((configRes.data as any).columnas)) {
        setColumns((configRes.data as any).columnas);
      } else {
        setColumns(DEFAULT_COLUMNS);
      }
    } catch (error) {
      console.error("Error fetching kanban data:", error);
    }
    setLoading(false);
  };

  const saveColumns = async (newCols: KanbanColumn[]) => {
    if (!workflowId) return;
    setColumns(newCols);
    try {
      const { error } = await (supabase.from("workflow_kanban_config" as any) as any).upsert(
        {
          workflow_id: workflowId,
          workflow_item_id: node.id,
          columnas: newCols,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workflow_id,workflow_item_id" }
      );
      if (error) throw error;
      toast.success("Columnas actualizadas");
    } catch (error) {
      console.error("Error saving columns:", error);
      toast.error("Error al guardar columnas");
    }
  };

  const addCard = async () => {
    if (!workflowId || !newCardTitle.trim()) return;
    setSaving(true);
    try {
      const columnCards = cards.filter((c) => c.status === newCardColumn);
      const orden = columnCards.length;

      const { data, error } = await supabase
        .from("workflow_kanban_cards")
        .insert({
          workflow_id: workflowId,
          workflow_item_id: node.id,
          titulo: newCardTitle.trim(),
          status: newCardColumn,
          orden,
          prioridad: "media",
          etiquetas: [],
        })
        .select()
        .single();

      if (error) throw error;

      setCards([
        ...cards,
        {
          id: data.id,
          titulo: data.titulo,
          descripcion: data.descripcion || undefined,
          status: data.status,
          orden: data.orden,
          asignado_a: data.asignado_a || undefined,
          asignados: [],
          fecha_vencimiento: data.fecha_vencimiento || undefined,
          prioridad: data.prioridad || "media",
          etiquetas: [],
          color_tarjeta: undefined,
        },
      ]);
      setNewCardTitle("");
      setShowNewCardDialog(false);
      toast.success("Tarjeta creada");
    } catch (error) {
      console.error("Error adding card:", error);
      toast.error("Error al crear tarjeta");
    }
    setSaving(false);
  };

  const updateCard = async (cardId: string, updates: Partial<KanbanCard>) => {
    setSaving(true);
    try {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.titulo !== undefined) dbUpdates.titulo = updates.titulo;
      if (updates.descripcion !== undefined) dbUpdates.descripcion = updates.descripcion;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.prioridad !== undefined) dbUpdates.prioridad = updates.prioridad;
      if (updates.asignado_a !== undefined) dbUpdates.asignado_a = updates.asignado_a;
      if (updates.asignados !== undefined) dbUpdates.asignados = updates.asignados;
      if (updates.fecha_vencimiento !== undefined) dbUpdates.fecha_vencimiento = updates.fecha_vencimiento;
      if (updates.etiquetas !== undefined) dbUpdates.etiquetas = updates.etiquetas;
      if (updates.color_tarjeta !== undefined) dbUpdates.color_tarjeta = updates.color_tarjeta || null;
      if (updates.orden !== undefined) dbUpdates.orden = updates.orden;

      const { error } = await supabase
        .from("workflow_kanban_cards")
        .update(dbUpdates)
        .eq("id", cardId);

      if (error) throw error;
      setCards(cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)));
      toast.success("Tarjeta actualizada");
    } catch (error) {
      console.error("Error updating card:", error);
      toast.error("Error al actualizar");
    }
    setSaving(false);
  };

  const deleteCard = async (cardId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("workflow_kanban_cards").delete().eq("id", cardId);
      if (error) throw error;
      setCards(cards.filter((c) => c.id !== cardId));
      setEditingCard(null);
      toast.success("Tarjeta eliminada");
    } catch (error) {
      console.error("Error deleting card:", error);
      toast.error("Error al eliminar");
    }
    setSaving(false);
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggingCard(cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    if (!draggingCard) return;
    const card = cards.find((c) => c.id === draggingCard);
    if (!card || card.status === targetColumn) {
      setDraggingCard(null);
      return;
    }
    const columnCards = cards.filter((c) => c.status === targetColumn);
    await updateCard(draggingCard, { status: targetColumn, orden: columnCards.length });
    setDraggingCard(null);
  };

  const getProfileName = (userId?: string) => {
    if (!userId) return null;
    return profiles.find((p) => p.id === userId)?.full_name;
  };

  const stats = useMemo(
    () => ({
      total: cards.length,
      completado: cards.filter((c) => c.status === completedColumnId).length,
    }),
    [cards, completedColumnId]
  );

  const renderCard = (card: KanbanCard) => {
    const isOverdue =
      card.fecha_vencimiento &&
      card.status !== completedColumnId &&
      isPast(parseISO(card.fecha_vencimiento));
    const assignees = card.asignados?.length ? card.asignados : card.asignado_a ? [card.asignado_a] : [];
    const priority = PRIORITIES.find((p) => p.value === card.prioridad);

    return (
      <div
        key={card.id}
        className={cn(
          "border rounded-lg p-3 cursor-grab shadow-sm hover:shadow-md transition-all",
          draggingCard === card.id && "opacity-50",
          isOverdue && "border-red-300 dark:border-red-700",
          !card.color_tarjeta && "bg-card"
        )}
        style={card.color_tarjeta ? { backgroundColor: card.color_tarjeta } : undefined}
        draggable={canEditCard(card)}
        onDragStart={(e) => canEditCard(card) && handleDragStart(e, card.id)}
        onClick={() => canEditCard(card) && setEditingCard({ ...card })}
      >
        {/* Tags - now show label text */}
        {card.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.etiquetas.map((tag, idx) => (
              <span
                key={idx}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.label || "—"}
              </span>
            ))}
          </div>
        )}

        <h4 className="font-medium text-sm mb-2 line-clamp-2">{card.titulo}</h4>

        {card.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{card.descripcion}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {priority && (
              <Badge variant="secondary" className={cn("text-[10px] h-5", priority.color)}>
                {priority.label}
              </Badge>
            )}
            {card.fecha_vencimiento && (
              <span
                className={cn(
                  "text-[10px] flex items-center gap-1",
                  isOverdue ? "text-red-600" : "text-muted-foreground"
                )}
              >
                {isOverdue && <AlertTriangle className="h-3 w-3" />}
                <Clock className="h-3 w-3" />
                {format(parseISO(card.fecha_vencimiento), "dd MMM", { locale: es })}
              </span>
            )}
          </div>

          {/* Assignees - show multiple avatars */}
          <TooltipProvider>
            <div className="flex -space-x-1.5">
              {assignees.slice(0, 3).map((uid) => {
                const name = getProfileName(uid);
                return (
                  <Tooltip key={uid}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-6 w-6 border-2 border-card">
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {name || "Sin nombre"}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {assignees.length > 3 && (
                <Avatar className="h-6 w-6 border-2 border-card">
                  <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                    +{assignees.length - 3}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </TooltipProvider>
        </div>

        {/* Discrete progress indicator */}
        {(() => {
          const cardProg = getCardProgress(card);
          return (
            <div className="mt-2 flex items-center gap-1.5">
              <Progress
                value={cardProg}
                className={cn(
                  "h-1 flex-1",
                  cardProg >= 100 && "[&>div]:bg-emerald-500",
                  cardProg > 0 && cardProg < 100 && "[&>div]:bg-amber-400",
                  cardProg === 0 && "[&>div]:bg-muted-foreground/30"
                )}
              />
              <span className="text-[9px] text-muted-foreground/70 min-w-[24px] text-right">
                {cardProg}%
              </span>
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <ListTodo className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold">{node.label}</h3>
            <p className="text-xs text-muted-foreground">
              {stats.completado}/{stats.total} tareas completadas
            </p>
            {(node.data?.asignado_nombre ||
              (node.data?.fecha_inicio && node.data.fecha_inicio.trim()) ||
              (node.data?.fecha_termino && node.data.fecha_termino.trim())) && (
              <div className="flex items-center gap-3 mt-1">
                {node.data?.asignado_nombre && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{node.data.asignado_nombre}</span>
                  </div>
                )}
                {((node.data?.fecha_inicio && node.data.fecha_inicio.trim()) ||
                  (node.data?.fecha_termino && node.data.fecha_termino.trim())) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    <span>
                      {formatDateSafe(node.data.fecha_inicio) || "—"} -{" "}
                      {formatDateSafe(node.data.fecha_termino) || "—"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Progress
              value={progress}
              className={cn(
                "w-32 h-2",
                progress >= 100 && "[&>div]:bg-green-500",
                progress > 0 && progress < 100 && "[&>div]:bg-amber-500"
              )}
            />
            <span
              className={cn(
                "text-sm font-bold min-w-[40px] text-right",
                progress >= 100 && "text-green-600",
                progress > 0 && progress < 100 && "text-amber-600"
              )}
            >
              {progress}%
            </span>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setShowColumnConfig(true)}>
            <Settings2 className="h-3.5 w-3.5" />
            Columnas
          </Button>
          {canCreate && (
            <Button
              size="sm"
              className="gap-1.5 h-8"
              onClick={() => {
                setNewCardColumn(columns[0]?.id || "pendiente");
                setShowNewCardDialog(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Tarjeta
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const columnCards = cards
              .filter((c) => c.status === column.id)
              .sort((a, b) => a.orden - b.orden);

            return (
              <div
                key={column.id}
                className={cn("flex-shrink-0 w-72 rounded-lg", column.color)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{column.label}</h3>
                      <Badge variant="secondary" className="h-5 text-xs">
                        {columnCards.length}
                      </Badge>
                    </div>
                    {canCreate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setNewCardColumn(column.id);
                          setShowNewCardDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {/* Role badges for column assignees */}
                  {(() => {
                    const roles = getColumnRoles(columnCards);
                    if (roles.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-1">
                        {roles.map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className="text-[10px] h-5 font-normal bg-primary/5 text-primary border-primary/20"
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <ScrollArea className="h-[calc(100vh-350px)]">
                  <div className="p-2 space-y-2">
                    {columnCards.map(renderCard)}
                    {columnCards.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        Sin tarjetas
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      )}

      {/* New Card Dialog */}
      <Dialog open={showNewCardDialog} onOpenChange={setShowNewCardDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Nueva Tarjeta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Título de la tarjeta"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCard()}
            />
            <Select value={newCardColumn} onValueChange={setNewCardColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Columna" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCardDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={addCard} disabled={!newCardTitle.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Config Dialog */}
      <ColumnConfigDialog
        open={showColumnConfig}
        onOpenChange={setShowColumnConfig}
        columns={columns}
        onSave={saveColumns}
      />

      {/* Edit Card Dialog */}
      {editingCard && (
        <Dialog open={!!editingCard} onOpenChange={() => setEditingCard(null)}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Editar Tarjeta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título"
                value={editingCard.titulo}
                onChange={(e) => setEditingCard({ ...editingCard, titulo: e.target.value })}
              />
              <Textarea
                placeholder="Descripción"
                value={editingCard.descripcion || ""}
                onChange={(e) => setEditingCard({ ...editingCard, descripcion: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
                  <Select
                    value={editingCard.status}
                    onValueChange={(v) => setEditingCard({ ...editingCard, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Prioridad</label>
                  <Select
                    value={editingCard.prioridad}
                    onValueChange={(v) => setEditingCard({ ...editingCard, prioridad: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Multiple Assignees */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Asignados</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        {editingCard.asignados?.length
                          ? `${editingCard.asignados.length} asignado(s)`
                          : "Sin asignar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-2" align="start">
                      <ScrollArea className="max-h-[200px]">
                        <div className="space-y-1">
                          {profiles.map((p) => {
                            const isSelected = editingCard.asignados?.includes(p.id) || false;
                            return (
                              <label
                                key={p.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const current = editingCard.asignados || [];
                                    setEditingCard({
                                      ...editingCard,
                                      asignados: checked
                                        ? [...current, p.id]
                                        : current.filter((id) => id !== p.id),
                                      asignado_a: checked
                                        ? p.id
                                        : current.filter((id) => id !== p.id)[0] || undefined,
                                    });
                                  }}
                                />
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                    {getInitials(p.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm truncate">{p.full_name || "Sin nombre"}</span>
                              </label>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                  {/* Show selected names */}
                  {editingCard.asignados && editingCard.asignados.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {editingCard.asignados.map((uid) => (
                        <Badge key={uid} variant="secondary" className="text-[10px] h-5 gap-1">
                          {getProfileName(uid) || "—"}
                          <button
                            className="ml-0.5 hover:text-destructive"
                            onClick={() =>
                              setEditingCard({
                                ...editingCard,
                                asignados: editingCard.asignados!.filter((id) => id !== uid),
                                asignado_a:
                                  editingCard.asignados!.filter((id) => id !== uid)[0] || undefined,
                              })
                            }
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Due date */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Vencimiento</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {editingCard.fecha_vencimiento
                          ? format(parseISO(editingCard.fecha_vencimiento), "dd MMM yyyy", { locale: es })
                          : "Seleccionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={
                          editingCard.fecha_vencimiento
                            ? parseISO(editingCard.fecha_vencimiento)
                            : undefined
                        }
                        onSelect={(date) =>
                          setEditingCard({
                            ...editingCard,
                            fecha_vencimiento: date?.toISOString().split("T")[0],
                          })
                        }
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Card Color */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  <Palette className="h-3 w-3 inline mr-1" />
                  Color de tarjeta
                </label>
                <div className="flex flex-wrap gap-2">
                  {CARD_COLORS.map((cc) => (
                    <button
                      key={cc.color || "none"}
                      className={cn(
                        "h-7 w-7 rounded-md border transition-all",
                        editingCard.color_tarjeta === cc.color
                          ? "ring-2 ring-primary ring-offset-1"
                          : "hover:scale-110",
                        !cc.color && "bg-card"
                      )}
                      style={cc.color ? { backgroundColor: cc.color } : undefined}
                      title={cc.label}
                      onClick={() =>
                        setEditingCard({ ...editingCard, color_tarjeta: cc.color || undefined })
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Tags - Editable */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Etiquetas</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {editingCard.etiquetas.map((tag, idx) => (
                    <TagEditorPopover
                      key={idx}
                      tag={tag}
                      onSave={(updated) => {
                        const newTags = [...editingCard.etiquetas];
                        newTags[idx] = updated;
                        setEditingCard({ ...editingCard, etiquetas: newTags });
                      }}
                      onDelete={() => {
                        setEditingCard({
                          ...editingCard,
                          etiquetas: editingCard.etiquetas.filter((_, i) => i !== idx),
                        });
                      }}
                    />
                  ))}
                  {/* Add new tag */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors">
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                      <p className="text-xs text-muted-foreground mb-2">Selecciona un color</p>
                      <div className="flex flex-wrap gap-1.5">
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c}
                            className="h-6 w-6 rounded-full hover:scale-110 transition-all"
                            style={{ backgroundColor: c }}
                            onClick={() => {
                              setEditingCard({
                                ...editingCard,
                                etiquetas: [...editingCard.etiquetas, { color: c, label: "" }],
                              });
                            }}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <Button variant="destructive" size="sm" onClick={() => deleteCard(editingCard.id)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingCard(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    updateCard(editingCard.id, {
                      titulo: editingCard.titulo,
                      descripcion: editingCard.descripcion,
                      status: editingCard.status,
                      prioridad: editingCard.prioridad,
                      asignado_a: editingCard.asignados?.[0] || editingCard.asignado_a,
                      asignados: editingCard.asignados,
                      fecha_vencimiento: editingCard.fecha_vencimiento,
                      etiquetas: editingCard.etiquetas,
                      color_tarjeta: editingCard.color_tarjeta,
                    });
                    setEditingCard(null);
                  }}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
