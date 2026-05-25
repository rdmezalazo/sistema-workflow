import { useState, useMemo, useCallback } from "react";
import { addDays, startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GanttTaskRow, GanttTask } from "./GanttTaskRow";
import { GanttTimeline } from "./GanttTimeline";

interface GanttChartProps {
  tasks: GanttTask[];
  profiles: { id: string; full_name: string | null }[];
  onRefresh?: () => void;
}

type ZoomLevel = "day" | "week" | "month";

const CELL_WIDTH = {
  day: 44,
  week: 140,
  month: 220,
};

export function GanttChart({ tasks, profiles, onRefresh }: GanttChartProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("day");
  const [savingTask, setSavingTask] = useState<string | null>(null);

  // Calculate date range
  const dateRange = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(addDays(currentDate, 60));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Group dates by week/month
  const groupedDates = useMemo(() => {
    const groups: { label: string; days: Date[] }[] = [];
    let currentGroup: { label: string; days: Date[] } | null = null;

    dateRange.forEach((date) => {
      const label = zoomLevel === "month" 
        ? format(date, "MMMM yyyy", { locale: es })
        : format(date, "'Semana' w - MMM", { locale: es });

      if (!currentGroup || currentGroup.label !== label) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { label, days: [date] };
      } else {
        currentGroup.days.push(date);
      }
    });

    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [dateRange, zoomLevel]);

  const cellWidth = CELL_WIDTH[zoomLevel];

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const withDates = tasks.filter(t => t.fecha_inicio).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, withDates, progress };
  }, [tasks]);

  // Update workflow item in database
  const updateWorkflowItem = useCallback(async (
    task: GanttTask,
    updates: Partial<{
      fecha_inicio: string;
      fecha_termino: string;
      asignado_a: string | null;
      dependencias: string[];
    }>
  ) => {
    if (!task.contratoId) {
      console.error("No contratoId found for task:", task.id);
      toast.error("No se puede actualizar: falta el ID del contrato");
      return;
    }
    
    setSavingTask(task.id);

    try {
      // First fetch the current workflow
      const { data: workflow, error: wfError } = await supabase
        .from("workflows")
        .select("id, items")
        .eq("contrato_id", task.contratoId)
        .maybeSingle();

      if (wfError) {
        console.error("Error fetching workflow:", wfError);
        throw wfError;
      }
      
      if (!workflow) {
        console.error("No workflow found for contrato_id:", task.contratoId);
        toast.error("No se encontró el workflow");
        setSavingTask(null);
        return;
      }

      const items = (workflow.items as any[]) || [];
      
      // Recursively update the specific item (handles nested children)
      const updateItemRecursive = (itemsArray: any[]): any[] => {
        return itemsArray.map((item: any) => {
          if (item.id === task.id) {
            const newItem = { ...item, ...updates };
            // Find assignee name
            if (updates.asignado_a !== undefined) {
              const profile = profiles.find(p => p.id === updates.asignado_a);
              newItem.asignado_nombre = profile?.full_name || null;
            }
            return newItem;
          }
          // Check children recursively
          if (item.children && Array.isArray(item.children)) {
            return {
              ...item,
              children: updateItemRecursive(item.children),
            };
          }
          return item;
        });
      };
      
      const updatedItems = updateItemRecursive(items);

      // Save to database
      const { error: updateError } = await supabase
        .from("workflows")
        .update({ items: updatedItems, updated_at: new Date().toISOString() })
        .eq("id", workflow.id);

      if (updateError) {
        console.error("Error updating workflow:", updateError);
        throw updateError;
      }

      toast.success("Guardado correctamente");
      
      // Trigger refresh to update UI
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error updating workflow item:", error);
      toast.error("Error al guardar los cambios");
    } finally {
      setSavingTask(null);
    }
  }, [profiles, onRefresh]);

  const handleUpdateDates = useCallback((task: GanttTask, start: Date, end: Date) => {
    // Format dates as ISO strings (just date portion for consistency)
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}T00:00:00.000Z`;
    };
    
    updateWorkflowItem(task, {
      fecha_inicio: formatDate(start),
      fecha_termino: formatDate(end),
    });
  }, [updateWorkflowItem]);

  const handleUpdateAssignee = useCallback((task: GanttTask, userId: string | null) => {
    updateWorkflowItem(task, { asignado_a: userId });
  }, [updateWorkflowItem]);

  const handleAddDependency = useCallback((task: GanttTask, depId: string) => {
    const deps = task.dependencias || [];
    if (!deps.includes(depId)) {
      updateWorkflowItem(task, { dependencias: [...deps, depId] });
    }
  }, [updateWorkflowItem]);

  const handleRemoveDependency = useCallback((task: GanttTask, depId: string) => {
    const deps = task.dependencias || [];
    updateWorkflowItem(task, { dependencias: deps.filter(d => d !== depId) });
  }, [updateWorkflowItem]);

  // Handle reordering tasks
  const handleReorder = useCallback(async (taskId: string, newIndex: number) => {
    // Find the task being moved
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.contratoId) return;

    setSavingTask(taskId);

    try {
      const { data: workflow, error: wfError } = await supabase
        .from("workflows")
        .select("id, items")
        .eq("contrato_id", task.contratoId)
        .maybeSingle();

      if (wfError) throw wfError;
      if (!workflow) {
        toast.error("No se encontró el workflow");
        return;
      }

      const items = (workflow.items as any[]) || [];
      
      // Reorder items
      const oldIndex = items.findIndex((item: any) => item.id === taskId);
      if (oldIndex === -1 || oldIndex === newIndex) {
        setSavingTask(null);
        return;
      }

      const [movedItem] = items.splice(oldIndex, 1);
      items.splice(newIndex, 0, movedItem);

      const { error: updateError } = await supabase
        .from("workflows")
        .update({ items, updated_at: new Date().toISOString() })
        .eq("id", workflow.id);

      if (updateError) throw updateError;

      toast.success("Orden actualizado");
      onRefresh?.();
    } catch (error) {
      console.error("Error reordering:", error);
      toast.error("Error al reordenar");
    }

    setSavingTask(null);
  }, [tasks, onRefresh]);

  const handleDragEnd = useCallback((task: GanttTask, newStart: Date, newEnd: Date) => {
    handleUpdateDates(task, newStart, newEnd);
  }, [handleUpdateDates]);

  if (tasks.length === 0) {
    return (
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Calendar className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">Sin tareas para mostrar</p>
          <p className="text-sm">Esta actividad no tiene pasos definidos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setCurrentDate(addDays(currentDate, -30))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-3" 
            onClick={() => setCurrentDate(new Date())}
          >
            Hoy
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setCurrentDate(addDays(currentDate, 30))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2 capitalize">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-3 text-xs">
            <Badge variant="outline" className="gap-1">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{stats.total}</span>
            </Badge>
            <Badge variant="outline" className="gap-1 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span className="font-semibold">{stats.completed}</span>
            </Badge>
            <div className="flex items-center gap-2">
              <Progress value={stats.progress} className="w-16 h-1.5" />
              <span className="font-medium text-primary">{Math.round(stats.progress)}%</span>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <Button
              variant={zoomLevel === "day" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setZoomLevel("day")}
            >
              Día
            </Button>
            <Button
              variant={zoomLevel === "week" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setZoomLevel("week")}
            >
              Semana
            </Button>
            <Button
              variant={zoomLevel === "month" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setZoomLevel("month")}
            >
              Mes
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex max-h-[calc(100vh-20rem)]">
        {/* Task List Panel */}
        <div className="w-[420px] flex-shrink-0 border-r bg-muted/10 overflow-auto">
          {/* Header */}
          <div className="h-[56px] border-b flex items-center px-3 font-medium text-sm bg-muted/30 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Pasos de la Actividad
            </div>
          </div>

          {/* Task rows */}
          {tasks.map((task, idx) => (
            <GanttTaskRow
              key={task.id}
              task={task}
              index={idx}
              profiles={profiles}
              allTasks={tasks}
              saving={savingTask === task.id}
              onUpdateDates={handleUpdateDates}
              onUpdateAssignee={handleUpdateAssignee}
              onAddDependency={handleAddDependency}
              onRemoveDependency={handleRemoveDependency}
            />
          ))}
        </div>

        {/* Timeline Panel */}
        <GanttTimeline
          tasks={tasks}
          dateRange={dateRange}
          cellWidth={cellWidth}
          groupedDates={groupedDates}
          onDragEnd={handleDragEnd}
          onReorder={handleReorder}
        />
      </div>

      {/* Global loading indicator */}
      {savingTask && (
        <div className="absolute top-2 right-2 flex items-center gap-2 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Guardando...
        </div>
      )}
    </div>
  );
}

export type { GanttTask };
