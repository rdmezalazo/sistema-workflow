import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { addDays, differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Loader2, RefreshCw, Save, Maximize2, Minimize2, GitBranch } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface GanttTaskData {
  id: string;
  label: string;
  tipo: string;
  fecha_inicio?: string;
  fecha_termino?: string;
  progreso: number;
  asignado_a?: string;
  asignado_nombre?: string;
  dependencias?: string[];
  isCompleted: boolean;
  contratoId?: string;
}

interface GanttTaskReactProps {
  tasks: GanttTaskData[];
  profiles: { id: string; full_name: string | null }[];
  onRefresh?: () => void;
  contratoId?: string;
  canEditProgress?: boolean;
}

// Color palette by type
const typeColors: Record<string, { bar: string; barProgress: string }> = {
  input: { bar: "#10b981", barProgress: "#059669" },
  tarea: { bar: "#f97316", barProgress: "#ea580c" },
  output: { bar: "#a855f7", barProgress: "#9333ea" },
  supervision: { bar: "#ef4444", barProgress: "#dc2626" },
};

const parseLocalDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDateForDB = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00.000Z`;
};

// Interactive Date Cell Component
function DatePickerCell({ 
  date, 
  label, 
  type, 
  taskId,
  minDate,
  onDateChange,
  isSaving
}: { 
  date: Date;
  label: string;
  type: 'start' | 'end';
  taskId: string;
  minDate?: Date;
  onDateChange: (newDate: Date) => void;
  isSaving: boolean;
}) {
  const [open, setOpen] = useState(false);
  
  const handleSelect = (newDate: Date | undefined) => {
    if (newDate) {
      onDateChange(newDate);
      setOpen(false);
    }
  };
  
  const borderColor = type === 'start' 
    ? 'hover:border-emerald-400 focus:border-emerald-500' 
    : 'hover:border-blue-400 focus:border-blue-500';
  const hoverBg = type === 'start'
    ? 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
    : 'hover:bg-blue-50 dark:hover:bg-blue-950/30';
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={isSaving}
          className={cn(
            "w-full h-full flex items-center justify-center gap-1 text-xs cursor-pointer transition-all rounded-sm border border-transparent",
            borderColor, hoverBg,
            isSaving && "opacity-50 cursor-wait"
          )}
        >
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span>{format(date, "dd MMM", { locale: es })}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[100]" align="start" sideOffset={4}>
        <div className="p-2 border-b bg-muted/30">
          <p className="text-xs font-semibold">
            {type === 'start' ? 'Fecha de Inicio' : 'Fecha de Fin'}
          </p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
        <CalendarPicker
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={minDate ? (d) => d < minDate : undefined}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

// Task List Table with Calendar Controls
function TaskListTableWithCalendar({ 
  tableTasks, 
  rowHeight, 
  localTasks,
  onDateChange,
  savingTask,
  canEdit
}: { 
  tableTasks: Task[];
  rowHeight: number;
  localTasks: GanttTaskData[];
  onDateChange: (task: Task) => void;
  savingTask: string | null;
  canEdit: boolean;
}) {
  return (
    <div className="text-xs">
      {tableTasks.map((task) => {
        const duration = differenceInDays(task.end, task.start) + 1;
        const originalTask = localTasks.find(t => t.id === task.id);
        const colors = typeColors[originalTask?.tipo || 'tarea'];
        const isSaving = savingTask === task.id;
        
        const handleStartChange = (newDate: Date) => {
          const newTask = { ...task, start: newDate };
          // If end is before new start, adjust it
          if (newTask.end < newDate) {
            newTask.end = addDays(newDate, 1);
          }
          onDateChange(newTask);
        };
        
        const handleEndChange = (newDate: Date) => {
          const newTask = { ...task, end: newDate };
          // If start is after new end, adjust it
          if (newTask.start > newDate) {
            newTask.start = newDate;
          }
          onDateChange(newTask);
        };
        
        return (
          <div
            key={task.id}
            className="flex items-center border-b border-border hover:bg-muted/50 transition-colors"
            style={{ height: rowHeight }}
          >
            <div className="flex-1 px-2 flex items-center gap-2 min-w-[140px] overflow-hidden">
              <div 
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: colors?.bar || '#6b7280' }}
              />
              <span className="truncate font-medium" title={task.name}>
                {task.name}
              </span>
              {isSaving && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            </div>
            <div className="w-[70px] px-0.5 border-l border-border">
              {canEdit ? (
                <DatePickerCell
                  date={task.start}
                  label={task.name}
                  type="start"
                  taskId={task.id}
                  onDateChange={handleStartChange}
                  isSaving={isSaving}
                />
              ) : (
                <span className="flex items-center justify-center text-xs text-muted-foreground h-full">
                  {format(task.start, "dd MMM", { locale: es })}
                </span>
              )}
            </div>
            <div className="w-[70px] px-0.5 border-l border-border">
              {canEdit ? (
                <DatePickerCell
                  date={task.end}
                  label={task.name}
                  type="end"
                  taskId={task.id}
                  minDate={task.start}
                  onDateChange={handleEndChange}
                  isSaving={isSaving}
                />
              ) : (
                <span className="flex items-center justify-center text-xs text-muted-foreground h-full">
                  {format(task.end, "dd MMM", { locale: es })}
                </span>
              )}
            </div>
            <div className="w-[45px] px-1 text-center font-medium border-l border-border">
              {duration}
            </div>
            <div className="w-[45px] px-1 text-center border-l border-border">
              <span 
                className={cn(
                  "font-medium",
                  task.progress >= 100 ? 'text-green-600 dark:text-green-400' : 
                  task.progress > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                )}
              >
                {task.progress}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function GanttTaskReact({
  tasks: propTasks,
  profiles,
  onRefresh,
  contratoId,
  canEditProgress = false,
}: GanttTaskReactProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showArrows, setShowArrows] = useState(false);
  
  // LOCAL STATE - This is the source of truth for the Gantt chart
  // Only sync from props when there are no pending saves
  const [localTasks, setLocalTasks] = useState<GanttTaskData[]>(propTasks);
  const pendingSaveRef = useRef(false);
  
  // Sync from props only when NOT saving
  useEffect(() => {
    if (!pendingSaveRef.current) {
      setLocalTasks(propTasks);
    }
  }, [propTasks]);

  // Refresh handler - uses parent's onRefresh to maintain proper filtering
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    pendingSaveRef.current = false;
    
    if (onRefresh) {
      onRefresh();
    }
    
    // Reset refreshing state after a short delay
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Diagrama actualizado");
    }, 500);
  }, [onRefresh]);

  // Convert our data format to gantt-task-react format
  const ganttTasks: Task[] = useMemo(() => {
    const today = new Date();
    
    return localTasks.map((task) => {
      const startDate = parseLocalDate(task.fecha_inicio) || today;
      const endDate = parseLocalDate(task.fecha_termino) || addDays(startDate, 1);
      
      const validEndDate = endDate >= startDate ? endDate : addDays(startDate, 1);
      const colors = typeColors[task.tipo] || typeColors.tarea;
      
      // Only include dependencies if arrows are enabled
      const dependencies = showArrows 
        ? (task.dependencias?.filter((depId) => localTasks.some((t) => t.id === depId)) || [])
        : [];

      return {
        id: task.id,
        name: task.label,
        start: startDate,
        end: validEndDate,
        progress: task.progreso || 0,
        type: "task" as const,
        isDisabled: task.isCompleted,
        styles: {
          backgroundColor: colors.bar,
          backgroundSelectedColor: colors.bar,
          progressColor: colors.barProgress,
          progressSelectedColor: colors.barProgress,
        },
        dependencies,
        project: task.contratoId,
      };
    });
  }, [localTasks, showArrows]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = localTasks.length;
    const completed = localTasks.filter((t) => t.isCompleted).length;
    const withDates = localTasks.filter((t) => t.fecha_inicio).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, withDates, progress };
  }, [localTasks]);

  // Save to database in background
  const saveToDatabase = useCallback(
    async (taskId: string, updates: { fecha_inicio?: string; fecha_termino?: string; progreso?: number }) => {
      const task = localTasks.find((t) => t.id === taskId);
      
      if (!task?.contratoId) {
        console.error("No contratoId found for task:", taskId);
        toast.error("No se puede actualizar: falta el ID del contrato");
        pendingSaveRef.current = false;
        return;
      }

      try {
        // Fetch the current workflow
        const { data: workflow, error: wfError } = await supabase
          .from("workflows")
          .select("id, items")
          .eq("contrato_id", task.contratoId)
          .maybeSingle();

        if (wfError) throw wfError;
        if (!workflow) {
          toast.error("No se encontró el workflow");
          pendingSaveRef.current = false;
          return;
        }

        const items = (workflow.items as any[]) || [];
        const itemIndex = items.findIndex((item: any) => item.id === taskId);
        
        if (itemIndex === -1) {
          toast.error("No se encontró el item en el workflow");
          pendingSaveRef.current = false;
          return;
        }

        // Create updated items array
        const updatedItems = [...items];
        updatedItems[itemIndex] = { 
          ...items[itemIndex],
          ...(updates.fecha_inicio !== undefined && { fecha_inicio: updates.fecha_inicio }),
          ...(updates.fecha_termino !== undefined && { fecha_termino: updates.fecha_termino }),
          progreso: updates.progreso !== undefined 
            ? updates.progreso 
            : (items[itemIndex].progreso || 0),
        };

        console.log("Saving to DB:", { taskId, updates });

        // Save to database
        const { error: updateError } = await supabase
          .from("workflows")
          .update({ 
            items: updatedItems, 
            updated_at: new Date().toISOString() 
          })
          .eq("id", workflow.id);

        if (updateError) throw updateError;

        toast.success("Guardado");
        
        // Now safe to allow prop sync
        pendingSaveRef.current = false;
        setSavingTask(null);
        
        // Trigger background refresh (won't overwrite local state while pendingSaveRef is true)
        if (onRefresh) {
          setTimeout(() => onRefresh(), 100);
        }
      } catch (error) {
        console.error("Error saving:", error);
        toast.error("Error al guardar");
        pendingSaveRef.current = false;
        setSavingTask(null);
      }
    },
    [localTasks, onRefresh]
  );

  // Handle date change - update local state IMMEDIATELY, then save in background
  const handleDateChange = useCallback(
    (task: Task) => {
      console.log("Date change:", { id: task.id, start: task.start, end: task.end });
      
      // Block prop sync
      pendingSaveRef.current = true;
      setSavingTask(task.id);
      
      // Update local state IMMEDIATELY
      setLocalTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { 
              ...t, 
              fecha_inicio: formatDateForDB(task.start),
              fecha_termino: formatDateForDB(task.end)
            }
          : t
      ));
      
      // Save in background
      saveToDatabase(task.id, {
        fecha_inicio: formatDateForDB(task.start),
        fecha_termino: formatDateForDB(task.end),
      });
    },
    [saveToDatabase]
  );

  // Handle progress change - update local state IMMEDIATELY, then save in background
  const handleProgressChange = useCallback(
    (task: Task) => {
      console.log("Progress change:", { id: task.id, progress: task.progress });
      
      // Block prop sync
      pendingSaveRef.current = true;
      setSavingTask(task.id);
      
      const newProgress = Math.round(task.progress);
      
      // Update local state IMMEDIATELY
      setLocalTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { ...t, progreso: newProgress }
          : t
      ));
      
      // Save in background
      saveToDatabase(task.id, {
        progreso: newProgress,
      });
    },
    [saveToDatabase]
  );

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    console.log("Task clicked:", task.id);
  }, []);

  if (localTasks.length === 0) {
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

  const ganttContent = (
    <div className={`border rounded-lg bg-card overflow-hidden shadow-sm ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Diagrama Gantt</span>
          
          {/* Refresh button */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
                onClick={handleRefresh}
                disabled={isRefreshing || !!savingTask}
              >
                <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Actualizar diagrama</TooltipContent>
          </Tooltip>
          
          {/* Toggle arrows button */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 hover:bg-muted ${showArrows ? 'bg-primary/10' : ''}`}
                onClick={() => setShowArrows(!showArrows)}
              >
                <GitBranch className={`h-3.5 w-3.5 transition-colors ${showArrows ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {showArrows ? 'Ocultar dependencias' : 'Mostrar dependencias'}
            </TooltipContent>
          </Tooltip>
          
          {/* Fullscreen button */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            </TooltipContent>
          </Tooltip>
          
          {savingTask && (
            <Badge variant="outline" className="gap-1 ml-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando...
            </Badge>
          )}
          {isRefreshing && !savingTask && (
            <Badge variant="outline" className="gap-1 ml-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Actualizando...
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-3 text-xs">
            <Badge variant="outline" className="gap-1">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{stats.total}</span>
            </Badge>
            <Badge
              variant="outline"
              className="gap-1 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
            >
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span className="font-semibold">{stats.completed}</span>
            </Badge>
            <div className="flex items-center gap-2">
              <Progress value={stats.progress} className="w-16 h-1.5" />
              <span className="font-medium text-primary">
                {Math.round(stats.progress)}%
              </span>
            </div>
          </div>

          {/* View mode controls */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <Button
              variant={viewMode === ViewMode.Day ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setViewMode(ViewMode.Day)}
            >
              Día
            </Button>
            <Button
              variant={viewMode === ViewMode.Week ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setViewMode(ViewMode.Week)}
            >
              Semana
            </Button>
            <Button
              variant={viewMode === ViewMode.Month ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setViewMode(ViewMode.Month)}
            >
              Mes
            </Button>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="gantt-wrapper overflow-x-auto gantt-custom-styles">
        <style>{`
          .gantt-custom-styles .gantt-task-list {
            background: hsl(var(--card));
          }
          .gantt-custom-styles .gantt-task-list-header {
            background: hsl(var(--muted));
            font-weight: 600;
            font-size: 11px;
            color: hsl(var(--muted-foreground));
          }
          .gantt-custom-styles .gantt-task-list-wrapper {
            border-right: 1px solid hsl(var(--border));
          }
          .gantt-custom-styles .gantt-task-list-cell {
            border-bottom: 1px solid hsl(var(--border));
            font-size: 12px;
          }
          .gantt-custom-styles ._3_ygE {
            background: hsl(var(--card));
          }
          .gantt-custom-styles ._1nBOt {
            fill: hsl(var(--muted-foreground));
            font-size: 11px;
          }
          .gantt-custom-styles ._9w8d5 {
            stroke: hsl(var(--border));
          }
          .gantt-custom-styles ._CZjuD {
            fill: hsl(var(--primary) / 0.1);
          }
        `}</style>
          <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={canEditProgress ? handleDateChange : undefined}
          onProgressChange={canEditProgress ? handleProgressChange : undefined}
          onClick={handleTaskClick}
          locale="es"
          listCellWidth="155px"
          columnWidth={viewMode === ViewMode.Day ? 44 : viewMode === ViewMode.Week ? 120 : 180}
          rowHeight={42}
          barCornerRadius={4}
          barFill={60}
          handleWidth={8}
          todayColor="rgba(var(--primary), 0.1)"
          projectBackgroundColor="#f3f4f6"
          projectProgressColor="#e5e7eb"
          projectBackgroundSelectedColor="#e5e7eb"
          projectProgressSelectedColor="#d1d5db"
          arrowColor="hsl(var(--primary))"
          arrowIndent={20}
          fontFamily="inherit"
          fontSize="12px"
          TaskListHeader={({ headerHeight }) => (
            <div 
              className="flex text-xs font-semibold text-muted-foreground bg-muted border-b border-border"
              style={{ height: headerHeight }}
            >
              <div className="flex-1 px-2 flex items-center min-w-[140px]">Tarea</div>
              <div className="w-[70px] px-1 flex items-center justify-center border-l border-border">Inicio</div>
              <div className="w-[70px] px-1 flex items-center justify-center border-l border-border">Fin</div>
              <div className="w-[45px] px-1 flex items-center justify-center border-l border-border">Días</div>
              <div className="w-[45px] px-1 flex items-center justify-center border-l border-border">%</div>
            </div>
          )}
          TaskListTable={({ tasks: tableTasks, rowHeight }) => (
            <TaskListTableWithCalendar 
              tableTasks={tableTasks} 
              rowHeight={rowHeight}
              localTasks={localTasks}
              onDateChange={handleDateChange}
              savingTask={savingTask}
              canEdit={canEditProgress}
            />
          )}
          TooltipContent={({ task }) => {
            const originalTask = localTasks.find((t) => t.id === task.id);
            const duration = differenceInDays(task.end, task.start) + 1;
            return (
              <div className="bg-popover border rounded-lg p-3 shadow-lg min-w-[220px]">
                <p className="font-semibold text-sm mb-2">{task.name}</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inicio:</span>
                    <span>{task.start.toLocaleDateString("es", { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fin:</span>
                    <span>{task.end.toLocaleDateString("es", { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duración:</span>
                    <span>{duration} día{duration !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Progreso:</span>
                    <div className="flex items-center gap-2">
                      <Progress value={task.progress} className="w-12 h-1.5" />
                      <span>{task.progress}%</span>
                    </div>
                  </div>
                  {originalTask?.asignado_nombre && (
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-muted-foreground">Asignado:</span>
                      <span className="font-medium">{originalTask.asignado_nombre}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );

  // Fullscreen overlay wrapper
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {ganttContent}
      </div>
    );
  }

  return ganttContent;
}
