import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Circle,
  User,
  Calendar,
  ClipboardCheck,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TreeNode } from "../WorkFlowTreeSidebar";
import { useWorkflowItemProgress } from "@/hooks/useWorkflowItemProgress";

interface SupervisionViewProps {
  node: TreeNode;
  workflowId?: string;
  profiles: { id: string; full_name: string | null }[];
  onRefresh?: () => void;
  canEditAll?: boolean;
  currentUserId?: string | null;
}

interface ChecklistData {
  id: string;
  titulo: string;
  items: ChecklistItem[];
  estado: string;
  porcentaje_completado: number;
  verificado_por?: string;
  fecha_verificacion?: string;
}

interface ChecklistItem {
  id: string;
  texto: string;
  completado: boolean;
  verificado_por?: string;
  fecha_verificacion?: string;
}

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

// Helper to format dates safely - handles ISO format with time component
const formatDateSafe = (dateStr: string | undefined): string | null => {
  if (!dateStr || !dateStr.trim()) return null;
  try {
    // Handle ISO format with T separator (e.g., "2026-02-05T00:00:00.000Z")
    const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const [year, month, day] = datePart.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "dd MMM yyyy", { locale: es });
  } catch {
    return null;
  }
};

// Debounce delay in ms
const DEBOUNCE_DELAY = 800;

export function SupervisionView({ node, workflowId, profiles, onRefresh, canEditAll = false, currentUserId }: SupervisionViewProps) {
  const [checklists, setChecklists] = useState<ChecklistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");

  // Determine if current user can edit this item
  const canEdit = canEditAll || (currentUserId != null && currentUserId === node.data?.asignado_a);

  // Local state for text inputs to allow fluid typing
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Hook to sync progress to workflow JSON
  const { syncProgress } = useWorkflowItemProgress(workflowId, node.id, onRefresh);

  // Overall stats
  const { totalItems, completedItems, overallProgress } = useMemo(() => {
    const total = checklists.reduce((acc, c) => acc + c.items.length, 0);
    const completed = checklists.reduce((acc, c) => acc + c.items.filter(i => i.completado).length, 0);
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalItems: total, completedItems: completed, overallProgress: progress };
  }, [checklists]);

  // Sync progress when it changes
  useEffect(() => {
    if (!loading && checklists.length > 0) {
      syncProgress(overallProgress);
    }
  }, [overallProgress, loading, checklists.length, syncProgress]);

  // Fetch checklists
  useEffect(() => {
    if (workflowId) {
      fetchChecklists();
    }
  }, [workflowId, node.id]);

  const fetchChecklists = async () => {
    if (!workflowId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workflow_checklists")
        .select("*")
        .eq("workflow_id", workflowId)
        .eq("workflow_item_id", node.id)
        .order("created_at");

      if (error) throw error;

      setChecklists((data || []).map((c: any) => ({
        id: c.id,
        titulo: c.titulo,
        items: Array.isArray(c.items) ? c.items as ChecklistItem[] : [],
        estado: c.estado || "pendiente",
        porcentaje_completado: c.porcentaje_completado || 0,
        verificado_por: c.verificado_por,
        fecha_verificacion: c.fecha_verificacion,
      })));
    } catch (error) {
      console.error("Error fetching checklists:", error);
    }
    setLoading(false);
  };

  // Add new checklist
  const addChecklist = async () => {
    if (!workflowId || !newChecklistTitle.trim()) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("workflow_checklists")
        .insert({
          workflow_id: workflowId,
          workflow_item_id: node.id,
          titulo: newChecklistTitle.trim(),
          items: [],
          estado: "pendiente",
          porcentaje_completado: 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newChecklist: ChecklistData = {
        id: data.id,
        titulo: data.titulo,
        items: [],
        estado: data.estado || "pendiente",
        porcentaje_completado: data.porcentaje_completado || 0,
      };
      setChecklists([...checklists, newChecklist]);
      setNewChecklistTitle("");
      toast.success("Checklist creado");
    } catch (error) {
      console.error("Error adding checklist:", error);
      toast.error("Error al crear checklist");
    }
    setSaving(false);
  };

  // Update checklist (saves to DB)
  const updateChecklist = async (checklistId: string, updates: Partial<ChecklistData>, showToast = false) => {
    setSaving(true);
    try {
      // Calculate progress
      let porcentaje = 0;
      let estado = "pendiente";
      
      const checklist = checklists.find(c => c.id === checklistId);
      const itemsToUse = updates.items || checklist?.items || [];
      
      if (itemsToUse.length > 0) {
        const completed = itemsToUse.filter(i => i.completado).length;
        porcentaje = Math.round((completed / itemsToUse.length) * 100);
        estado = porcentaje === 100 ? "completado" : porcentaje > 0 ? "parcial" : "pendiente";
      }

      // Prepare update object for database - convert items to JSON-compatible format
      const dbUpdates: Record<string, any> = {
        porcentaje_completado: porcentaje,
        estado,
        updated_at: new Date().toISOString(),
      };

      if (updates.titulo !== undefined) {
        dbUpdates.titulo = updates.titulo;
      }

      if (updates.items !== undefined) {
        dbUpdates.items = JSON.parse(JSON.stringify(updates.items));
      }

      const { error } = await supabase
        .from("workflow_checklists")
        .update(dbUpdates)
        .eq("id", checklistId);

      if (error) throw error;

      setChecklists(prev => prev.map(c => 
        c.id === checklistId 
          ? { ...c, ...updates, porcentaje_completado: porcentaje, estado } 
          : c
      ));
      
      if (showToast) {
        toast.success("Guardado", { duration: 1500 });
      }
    } catch (error) {
      console.error("Error updating checklist:", error);
      toast.error("Error al actualizar");
    }
    setSaving(false);
  };

  // Debounced update for text fields
  const debouncedUpdateChecklist = useCallback((
    checklistId: string,
    updates: Partial<ChecklistData>,
    localKey: string,
    localValue: string
  ) => {
    // Update local state immediately for fluid typing
    setLocalValues(prev => ({ ...prev, [localKey]: localValue }));
    
    // Clear existing timer for this key
    if (debounceTimers.current[localKey]) {
      clearTimeout(debounceTimers.current[localKey]);
    }
    
    // Set new timer for DB save
    debounceTimers.current[localKey] = setTimeout(() => {
      updateChecklist(checklistId, updates, false);
      // Clear local value after save to use DB value
      setLocalValues(prev => {
        const newValues = { ...prev };
        delete newValues[localKey];
        return newValues;
      });
    }, DEBOUNCE_DELAY);
  }, []);

  // Get value with local override for fluid typing
  const getLocalOrDbValue = (localKey: string, dbValue: string) => {
    return localValues[localKey] !== undefined ? localValues[localKey] : dbValue;
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Delete checklist
  const deleteChecklist = async (checklistId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("workflow_checklists")
        .delete()
        .eq("id", checklistId);

      if (error) throw error;

      setChecklists(checklists.filter(c => c.id !== checklistId));
      toast.success("Checklist eliminado");
    } catch (error) {
      console.error("Error deleting checklist:", error);
      toast.error("Error al eliminar");
    }
    setSaving(false);
  };

  // Add item to checklist
  const addItem = (checklist: ChecklistData) => {
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      texto: "Nuevo item de verificación",
      completado: false,
    };
    updateChecklist(checklist.id, { items: [...checklist.items, newItem] });
  };

  // Toggle item
  const toggleItem = async (checklist: ChecklistData, itemIdx: number) => {
    const newItems = [...checklist.items];
    const item = newItems[itemIdx];
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    newItems[itemIdx] = {
      ...item,
      completado: !item.completado,
      verificado_por: !item.completado ? user?.id : undefined,
      fecha_verificacion: !item.completado ? new Date().toISOString() : undefined,
    };
    
    updateChecklist(checklist.id, { items: newItems });
  };

  // Update item text with debounce
  const updateItemTextDebounced = (checklist: ChecklistData, itemIdx: number, texto: string, itemId: string) => {
    const localKey = `${checklist.id}-item-${itemId}`;
    const newItems = [...checklist.items];
    newItems[itemIdx] = { ...newItems[itemIdx], texto };
    debouncedUpdateChecklist(checklist.id, { items: newItems }, localKey, texto);
  };

  // Delete item
  const deleteItem = (checklist: ChecklistData, itemIdx: number) => {
    const newItems = checklist.items.filter((_, i) => i !== itemIdx);
    updateChecklist(checklist.id, { items: newItems });
  };

  // Get profile name
  const getProfileName = (userId?: string) => {
    if (!userId) return null;
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name;
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "completado":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completado</Badge>;
      case "parcial":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Parcial</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">Pendiente</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold">{node.label}</h3>
            <p className="text-xs text-muted-foreground">
              {completedItems}/{totalItems} verificaciones completadas
            </p>
            {/* Metadata: Responsable and dates */}
            {(node.data?.asignado_nombre || (node.data?.fecha_inicio && node.data.fecha_inicio.trim()) || (node.data?.fecha_termino && node.data.fecha_termino.trim())) && (
              <div className="flex items-center gap-3 mt-1">
                {node.data?.asignado_nombre && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{node.data.asignado_nombre}</span>
                  </div>
                )}
                {((node.data?.fecha_inicio && node.data.fecha_inicio.trim()) || (node.data?.fecha_termino && node.data.fecha_termino.trim())) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    <span>
                      {formatDateSafe(node.data.fecha_inicio) || "—"} - {formatDateSafe(node.data.fecha_termino) || "—"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <Progress 
                value={overallProgress} 
                className={cn(
                  "w-32 h-2",
                  overallProgress >= 100 && "[&>div]:bg-green-500",
                  overallProgress > 0 && overallProgress < 100 && "[&>div]:bg-amber-500"
                )} 
              />
              <span className={cn(
                "text-sm font-bold min-w-[40px] text-right",
                overallProgress >= 100 && "text-green-600",
                overallProgress > 0 && overallProgress < 100 && "text-amber-600"
              )}>
                {overallProgress}%
              </span>
            </div>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Add checklist */}
      {canEdit && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nombre del checklist de supervisión..."
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChecklist()}
                className="flex-1"
              />
              <Button onClick={addChecklist} disabled={!newChecklistTitle.trim() || saving}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Checklist
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklists */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : checklists.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Sin checklists</p>
            <p className="text-sm">Crea checklists de verificación para supervisar el proceso</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {checklists.map((checklist) => (
            <Card key={checklist.id} className="overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="h-5 w-5 text-destructive" />
                  <div>
                    <Input
                      value={getLocalOrDbValue(`${checklist.id}-titulo`, checklist.titulo)}
                      onChange={(e) => debouncedUpdateChecklist(
                        checklist.id, 
                        { titulo: e.target.value },
                        `${checklist.id}-titulo`,
                        e.target.value
                      )}
                      className="h-7 font-semibold border-none shadow-none focus-visible:ring-0 px-0 bg-transparent"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getEstadoBadge(checklist.estado)}
                  <span className="text-xs text-muted-foreground">{checklist.porcentaje_completado}%</span>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => deleteChecklist(checklist.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <Progress value={checklist.porcentaje_completado} className="h-1.5 mb-4" />
                
                {checklist.items.map((item, idx) => {
                  const verifierName = getProfileName(item.verificado_por);
                  
                  return (
                    <div key={item.id} className="flex items-start gap-3 group py-2 border-b last:border-0">
                      <button
                        className={cn(
                          "h-5 w-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
                          item.completado
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 hover:border-primary"
                        )}
                        onClick={() => canEdit && toggleItem(checklist, idx)}
                        disabled={!canEdit}
                      >
                        {item.completado && <CheckCircle2 className="h-3 w-3" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <Input
                          value={getLocalOrDbValue(`${checklist.id}-item-${item.id}`, item.texto)}
                          onChange={(e) => updateItemTextDebounced(checklist, idx, e.target.value, item.id)}
                          className={cn(
                            "h-auto py-0 px-0 text-sm border-none shadow-none focus-visible:ring-0 bg-transparent",
                            item.completado && "line-through text-muted-foreground"
                          )}
                          readOnly={!canEdit}
                        />
                        
                        {item.completado && verifierName && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="text-[8px]">
                                {getInitials(verifierName)}
                              </AvatarFallback>
                            </Avatar>
                            <span>Verificado por {verifierName}</span>
                            {item.fecha_verificacion && (
                              <span>
                                • {format(parseISO(item.fecha_verificacion), "dd MMM yyyy HH:mm", { locale: es })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => deleteItem(checklist, idx)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
                
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1 mt-2"
                    onClick={() => addItem(checklist)}
                  >
                    <Plus className="h-3 w-3" />
                    Agregar verificación
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
