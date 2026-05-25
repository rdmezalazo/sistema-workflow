import { useState, useMemo, useCallback } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, isPast, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import {
  Activity,
  Calendar as CalendarIcon,
  Table2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  LayoutGrid,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TreeNode } from "./WorkFlowTreeSidebar";

interface ActividadesBacklogProps {
  node: TreeNode;
  allNodes?: TreeNode[];
  onRefresh?: () => void;
}

interface ActivityItem {
  id: string;
  label: string;
  isCompleted: boolean;
  fecha_inicio?: string;
  fecha_termino?: string;
  totalSteps: number;
  completedSteps: number;
  workflowId?: string;
  contratoId?: string;
}

type PeriodFilter = "hoy" | "mes" | "fecha" | "año";

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export function ActividadesBacklog({ node, allNodes = [], onRefresh }: ActividadesBacklogProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState<"calendario" | "tabla">("calendario");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("mes");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [updatingActivity, setUpdatingActivity] = useState<string | null>(null);

  // Find the contrato node to get workflow info
  const findContratoNode = (n: TreeNode): TreeNode | null => {
    if (n.type === "contrato") return n;
    if (n.children) {
      for (const child of n.children) {
        const found = findContratoNode(child);
        if (found) return found;
      }
    }
    return null;
  };

  // Collect activities with their data (only activities, not steps)
  const activities = useMemo(() => {
    const acts: ActivityItem[] = [];

    const countSteps = (n: TreeNode): { total: number; completed: number } => {
      let total = 0;
      let completed = 0;

      if (["input", "tarea", "output", "supervision_item"].includes(n.type)) {
        total = 1;
        completed = n.isCompleted ? 1 : 0;
      }

      if (n.children) {
        n.children.forEach(child => {
          const childCounts = countSteps(child);
          total += childCounts.total;
          completed += childCounts.completed;
        });
      }

      return { total, completed };
    };

    const findActivities = (n: TreeNode, parentContratoId?: string) => {
      let contratoId = parentContratoId;
      
      // Check for contrato node - use id directly as it's the contrato.id
      if (n.type === "contrato") {
        contratoId = n.id;
      }
      
      if (n.type === "actividad" && !n.label.toLowerCase().includes("actividades")) {
        const data = n.data || {};
        const { total, completed } = countSteps(n);
        
        // Prefer contratoId from data if available, otherwise use parent
        const activityContratoId = data.contratoId || contratoId;
        
        acts.push({
          id: n.id,
          label: n.label,
          isCompleted: n.isCompleted || false,
          fecha_inicio: data.fecha_inicio,
          fecha_termino: data.fecha_termino,
          totalSteps: total,
          completedSteps: completed,
          contratoId: activityContratoId,
        });
      }
      if (n.children) {
        n.children.forEach(child => findActivities(child, contratoId));
      }
    };

    if (node.children) {
      node.children.forEach(child => findActivities(child));
    }

    return acts;
  }, [node]);

  // Function to update activity dates in the database
  const updateActivityDates = useCallback(async (
    activityId: string,
    contratoId: string | undefined,
    field: "fecha_inicio" | "fecha_termino",
    date: Date | undefined
  ) => {
    if (!contratoId) {
      toast.error("No se pudo encontrar el contrato asociado");
      return;
    }

    setUpdatingActivity(activityId);

    try {
      // Get the workflow for this contrato
      const { data: workflow, error: wfError } = await supabase
        .from("workflows")
        .select("id, items")
        .eq("contrato_id", contratoId)
        .maybeSingle();

      if (wfError) throw wfError;

      if (!workflow) {
        toast.error("No se encontró el workflow");
        setUpdatingActivity(null);
        return;
      }

      // Update the activity in the items array
      const items = (workflow.items as any[]) || [];
      const updatedItems = items.map((item: any) => {
        if (item.id === activityId) {
          return {
            ...item,
            [field]: date ? date.toISOString() : null,
          };
        }
        return item;
      });

      // Save back to database
      const { error: updateError } = await supabase
        .from("workflows")
        .update({ 
          items: updatedItems,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workflow.id);

      if (updateError) throw updateError;

      toast.success("Fecha actualizada correctamente");
      
      // Trigger refresh
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error updating activity date:", error);
      toast.error("Error al actualizar la fecha");
    }

    setUpdatingActivity(null);
  }, [onRefresh]);

  // Filter activities based on period (using fecha_inicio or fecha_termino)
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Use fecha_inicio for filtering, fallback to fecha_termino
      const dateStr = activity.fecha_inicio || activity.fecha_termino;
      
      if (!dateStr) {
        return periodFilter === "mes" || periodFilter === "año";
      }

      const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
      const activityDate = new Date(year, month - 1, day);

      switch (periodFilter) {
        case "hoy":
          return isToday(activityDate);
        case "mes":
          return isSameMonth(activityDate, currentDate);
        case "fecha":
          if (!selectedDate) return true;
          return isSameDay(activityDate, selectedDate);
        case "año":
          return activityDate.getFullYear() === currentDate.getFullYear();
        default:
          return true;
      }
    });
  }, [activities, periodFilter, currentDate, selectedDate]);

  // Group activities by date for calendar view
  const activitiesByDate = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};
    filteredActivities.forEach(activity => {
      const dateStr = activity.fecha_inicio || activity.fecha_termino;
      if (dateStr) {
        const dateKey = dateStr.split("T")[0];
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(activity);
      }
    });
    return groups;
  }, [filteredActivities]);

  // Activities without date
  const activitiesWithoutDate = useMemo(() => {
    return filteredActivities.filter(a => !a.fecha_inicio && !a.fecha_termino);
  }, [filteredActivities]);

  // Calendar days based on filter
  const calendarDays = useMemo(() => {
    if (periodFilter === "hoy") {
      return [new Date()];
    } else if (periodFilter === "fecha" && selectedDate) {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, periodFilter, selectedDate]);

  // Stats based on filtered activities
  const stats = useMemo(() => {
    const total = filteredActivities.length;
    const completed = filteredActivities.filter(a => a.isCompleted).length;
    const pending = total - completed;
    const overdue = filteredActivities.filter(a => {
      if (a.isCompleted) return false;
      const dateStr = a.fecha_termino || a.fecha_inicio;
      if (!dateStr) return false;
      const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
      return isPast(new Date(year, month - 1, day));
    }).length;
    return { total, completed, pending, overdue };
  }, [filteredActivities]);

  const renderActivityBadge = (activity: ActivityItem) => {
    const progress = activity.totalSteps > 0 ? (activity.completedSteps / activity.totalSteps) * 100 : 0;
    
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
        activity.isCompleted 
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      )}>
        <Activity className="h-3 w-3" />
        <span className="truncate max-w-[120px]">{activity.label}</span>
        {activity.isCompleted && <CheckCircle2 className="h-3 w-3 ml-auto" />}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Backlog de Actividades</h2>
            <p className="text-sm text-muted-foreground">
              {activities.length} actividad{activities.length !== 1 ? "es" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200/50 dark:border-blue-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <LayoutGrid className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30 border-green-200/50 dark:border-green-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Completadas</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.completed}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200/50 dark:border-amber-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pendientes</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.pending}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/30 border-red-200/50 dark:border-red-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Vencidas</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.overdue}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="calendario" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Backlog Calendario
          </TabsTrigger>
          <TabsTrigger value="tabla" className="gap-2">
            <Table2 className="h-4 w-4" />
            Backlog Tabla
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendario" className="space-y-4">
          {/* Period Filter Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Period Filter Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground mr-2">Filtrar por:</span>
                  <div className="flex items-center rounded-lg border bg-muted/30 p-1">
                    <Button
                      variant={periodFilter === "hoy" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setPeriodFilter("hoy")}
                    >
                      Hoy
                    </Button>
                    <Button
                      variant={periodFilter === "mes" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setPeriodFilter("mes")}
                    >
                      Mes
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={periodFilter === "fecha" ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "h-8 px-3 gap-2",
                            periodFilter === "fecha" && selectedDate && "pr-2"
                          )}
                          onClick={() => {
                            if (periodFilter !== "fecha") {
                              setPeriodFilter("fecha");
                            }
                          }}
                        >
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {periodFilter === "fecha" && selectedDate 
                            ? format(selectedDate, "dd MMM", { locale: es })
                            : "Fecha"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setPeriodFilter("fecha");
                          }}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant={periodFilter === "año" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setPeriodFilter("año")}
                    >
                      Año
                    </Button>
                  </div>
                </div>

                {/* Month/Year Navigation */}
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base capitalize">
                    {periodFilter === "hoy" 
                      ? format(new Date(), "EEEE, dd MMMM yyyy", { locale: es })
                      : periodFilter === "fecha" && selectedDate
                        ? format(selectedDate, "EEEE, dd MMMM yyyy", { locale: es })
                        : periodFilter === "año"
                          ? format(currentDate, "yyyy", { locale: es })
                          : format(currentDate, "MMMM yyyy", { locale: es })
                    }
                  </CardTitle>
                  {(periodFilter === "mes" || periodFilter === "año") && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentDate(periodFilter === "año" 
                          ? new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1)
                          : subMonths(currentDate, 1)
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setCurrentDate(new Date())}
                      >
                        Hoy
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentDate(periodFilter === "año"
                          ? new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1)
                          : addMonths(currentDate, 1)
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: (calendarDays[0]?.getDay() || 7) - 1 }).map((_, i) => (
                  <div key={`empty-start-${i}`} className="min-h-[100px]" />
                ))}

                {calendarDays.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayActivities = activitiesByDate[dateKey] || [];
                  const hasOverdue = dayActivities.some(a => !a.isCompleted && isPast(day));

                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        "min-h-[100px] p-1 rounded-lg border transition-colors",
                        isToday(day) && "border-primary bg-primary/5",
                        !isToday(day) && "border-border hover:bg-muted/30",
                        hasOverdue && !isToday(day) && "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                      )}
                    >
                      <div className={cn(
                        "text-xs font-medium mb-1 px-1",
                        isToday(day) && "text-primary",
                        isPast(day) && !isToday(day) && "text-muted-foreground"
                      )}>
                        {format(day, "d")}
                      </div>
                      <ScrollArea className="h-[80px]">
                        <div className="space-y-1">
                          {dayActivities.slice(0, 3).map((activity) => (
                            <Tooltip key={activity.id} delayDuration={0}>
                              <TooltipTrigger asChild>
                                <div className="cursor-pointer">
                                  {renderActivityBadge(activity)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[250px]">
                                <div className="space-y-1">
                                  <p className="font-medium">{activity.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {activity.completedSteps}/{activity.totalSteps} pasos completados
                                  </p>
                                  {activity.fecha_inicio && (
                                    <p className="text-xs">
                                      Inicio: {format(parseISO(activity.fecha_inicio), "dd MMM yyyy", { locale: es })}
                                    </p>
                                  )}
                                  {activity.fecha_termino && (
                                    <p className="text-xs">
                                      Término: {format(parseISO(activity.fecha_termino), "dd MMM yyyy", { locale: es })}
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {dayActivities.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] w-full justify-center">
                              +{dayActivities.length - 3} más
                            </Badge>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>

              {/* Activities without date */}
              {activitiesWithoutDate.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Sin fecha asignada ({activitiesWithoutDate.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activitiesWithoutDate.map((activity) => (
                      <Tooltip key={activity.id} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="cursor-pointer">{renderActivityBadge(activity)}</div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{activity.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.completedSteps}/{activity.totalSteps} pasos
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table View - Only Activities */}
        <TabsContent value="tabla" className="space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[50px]">Estado</TableHead>
                    <TableHead>Actividad</TableHead>
                    <TableHead className="w-[150px]">Fecha Inicio</TableHead>
                    <TableHead className="w-[150px]">Fecha Término</TableHead>
                    <TableHead className="w-[150px]">Progreso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No hay actividades</p>
                        <p className="text-sm">No se encontraron actividades para el período seleccionado</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActivities.map((activity) => {
                      const progress = activity.totalSteps > 0 ? (activity.completedSteps / activity.totalSteps) * 100 : 0;
                      let isOverdue = false;
                      if (!activity.isCompleted && activity.fecha_termino) {
                        const [year, month, day] = activity.fecha_termino.split("T")[0].split("-").map(Number);
                        isOverdue = isPast(new Date(year, month - 1, day));
                      }

                      const parseDateString = (dateStr: string | undefined): Date | undefined => {
                        if (!dateStr) return undefined;
                        const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
                        return new Date(year, month - 1, day);
                      };

                      const isUpdating = updatingActivity === activity.id;

                      return (
                        <TableRow 
                          key={activity.id}
                          className={cn(
                            isOverdue && "bg-red-50/50 dark:bg-red-950/10",
                            activity.isCompleted && "opacity-60"
                          )}
                        >
                          <TableCell>
                            {activity.isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : isOverdue ? (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <span className="font-medium">{activity.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "h-8 w-full justify-start text-left font-normal",
                                    !activity.fecha_inicio && "text-muted-foreground"
                                  )}
                                  disabled={isUpdating}
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                  ) : (
                                    <CalendarDays className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                  )}
                                  {activity.fecha_inicio
                                    ? format(parseDateString(activity.fecha_inicio)!, "dd MMM yyyy", { locale: es })
                                    : "Seleccionar"
                                  }
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={parseDateString(activity.fecha_inicio)}
                                  onSelect={(date) => {
                                    updateActivityDates(activity.id, activity.contratoId, "fecha_inicio", date);
                                  }}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "h-8 w-full justify-start text-left font-normal",
                                    !activity.fecha_termino && "text-muted-foreground",
                                    isOverdue && activity.fecha_termino && "border-red-300 text-red-600"
                                  )}
                                  disabled={isUpdating}
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                  ) : (
                                    <Clock className="h-3.5 w-3.5 mr-2" />
                                  )}
                                  {activity.fecha_termino
                                    ? format(parseDateString(activity.fecha_termino)!, "dd MMM yyyy", { locale: es })
                                    : "Seleccionar"
                                  }
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={parseDateString(activity.fecha_termino)}
                                  onSelect={(date) => {
                                    updateActivityDates(activity.id, activity.contratoId, "fecha_termino", date);
                                  }}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="h-2 w-20" />
                              <span className="text-xs text-muted-foreground">
                                {activity.completedSteps}/{activity.totalSteps}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
