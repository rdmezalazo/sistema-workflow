import { useState, useEffect, useMemo } from "react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
  Activity,
  Timer,
  ArrowRight,
  Calendar,
  BarChart3,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { TreeNode } from "./WorkFlowTreeSidebar";

interface ProcesosDashboardProps {
  node: TreeNode;
  workflowId?: string;
  profiles: { id: string; full_name: string | null }[];
  onNavigateToTask?: (taskNode: TreeNode) => void;
}

interface KanbanCard {
  id: string;
  titulo: string;
  descripcion?: string;
  status: string;
  asignado_a?: string;
  fecha_vencimiento?: string;
  prioridad: string;
  workflow_item_id: string;
}

const COLUMNS = [
  { id: "pendiente", label: "Pendiente", color: "bg-muted", iconColor: "text-muted-foreground" },
  { id: "en_progreso", label: "En Progreso", color: "bg-blue-500", iconColor: "text-blue-500" },
  { id: "en_revision", label: "En Revisión", color: "bg-amber-500", iconColor: "text-amber-500" },
  { id: "completado", label: "Completado", color: "bg-emerald-500", iconColor: "text-emerald-500" },
];

const PRIORITIES = {
  baja: { label: "Baja", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  media: { label: "Media", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  urgente: { label: "Urgente", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export function ProcesosDashboard({ 
  node, 
  workflowId, 
  profiles,
  onNavigateToTask 
}: ProcesosDashboardProps) {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Collect all task node IDs from children
  const taskNodeIds = useMemo(() => {
    const ids: string[] = [];
    const collectTaskIds = (n: TreeNode) => {
      if (n.type === "tarea") {
        ids.push(n.id);
      }
      if (n.children) {
        n.children.forEach(collectTaskIds);
      }
    };
    if (node.children) {
      node.children.forEach(collectTaskIds);
    }
    return ids;
  }, [node]);

  // Fetch all kanban cards for these task nodes
  useEffect(() => {
    if (!workflowId || taskNodeIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchCards = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("workflow_kanban_cards")
          .select("*")
          .eq("workflow_id", workflowId)
          .in("workflow_item_id", taskNodeIds)
          .order("orden");

        if (error) throw error;

        setCards((data || []).map((c: any) => ({
          id: c.id,
          titulo: c.titulo,
          descripcion: c.descripcion,
          status: c.status,
          asignado_a: c.asignado_a,
          fecha_vencimiento: c.fecha_vencimiento,
          prioridad: c.prioridad || "media",
          workflow_item_id: c.workflow_item_id,
        })));
      } catch (error) {
        console.error("Error fetching kanban cards:", error);
      }
      setLoading(false);
    };

    fetchCards();
  }, [workflowId, taskNodeIds]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = cards.length;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byAssignee: Record<string, { count: number; completed: number }> = {};
    let overdue = 0;
    let dueToday = 0;

    COLUMNS.forEach(col => {
      byStatus[col.id] = 0;
    });

    cards.forEach(card => {
      // Status count
      byStatus[card.status] = (byStatus[card.status] || 0) + 1;
      
      // Priority count
      byPriority[card.prioridad] = (byPriority[card.prioridad] || 0) + 1;
      
      // Assignee stats
      if (card.asignado_a) {
        if (!byAssignee[card.asignado_a]) {
          byAssignee[card.asignado_a] = { count: 0, completed: 0 };
        }
        byAssignee[card.asignado_a].count++;
        if (card.status === "completado") {
          byAssignee[card.asignado_a].completed++;
        }
      }

      // Due date checks
      if (card.fecha_vencimiento) {
        const dueDate = parseISO(card.fecha_vencimiento);
        if (card.status !== "completado") {
          if (isPast(dueDate) && !isToday(dueDate)) {
            overdue++;
          } else if (isToday(dueDate)) {
            dueToday++;
          }
        }
      }
    });

    const completed = byStatus["completado"] || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      byStatus,
      byPriority,
      byAssignee,
      overdue,
      dueToday,
      completed,
      progress,
    };
  }, [cards]);

  // Get profile name
  const getProfileName = (userId?: string) => {
    if (!userId) return null;
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name;
  };

  // Get urgent/high priority cards
  const urgentCards = useMemo(() => {
    return cards
      .filter(c => 
        (c.prioridad === "urgente" || c.prioridad === "alta") && 
        c.status !== "completado"
      )
      .slice(0, 5);
  }, [cards]);

  // Get overdue cards
  const overdueCards = useMemo(() => {
    return cards
      .filter(c => {
        if (!c.fecha_vencimiento || c.status === "completado") return false;
        const dueDate = parseISO(c.fecha_vencimiento);
        return isPast(dueDate) && !isToday(dueDate);
      })
      .slice(0, 5);
  }, [cards]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
          <ListTodo className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{node.label}</h2>
          <p className="text-sm text-muted-foreground">
            {node.children?.length || 0} tareas • {stats.total} tarjetas Kanban
          </p>
        </div>
        
        {/* Overall progress */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Progreso General</p>
            <p className={cn(
              "text-lg font-bold",
              stats.progress >= 100 ? "text-emerald-600" : 
              stats.progress >= 50 ? "text-amber-600" : "text-muted-foreground"
            )}>
              {stats.progress}%
            </p>
          </div>
          <div className="w-24">
            <Progress 
              value={stats.progress} 
              className={cn(
                "h-2",
                stats.progress >= 100 && "[&>div]:bg-emerald-500",
                stats.progress >= 50 && stats.progress < 100 && "[&>div]:bg-amber-500"
              )} 
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const count = stats.byStatus[col.id] || 0;
          const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
          
          return (
            <Card key={col.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("h-3 w-3 rounded-full", col.color)} />
                  <span className="text-2xl font-bold">{count}</span>
                </div>
                <p className="text-sm font-medium mb-1">{col.label}</p>
                <div className="flex items-center gap-2">
                  <Progress value={percentage} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">{percentage}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alerts Row */}
      {(stats.overdue > 0 || stats.dueToday > 0) && (
        <div className="flex gap-4">
          {stats.overdue > 0 && (
            <Card className="flex-1 border-destructive/50 bg-destructive/5">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-destructive">
                    {stats.overdue} tarea{stats.overdue !== 1 ? "s" : ""} vencida{stats.overdue !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {stats.dueToday > 0 && (
            <Card className="flex-1 border-amber-500/50 bg-amber-500/5">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {stats.dueToday} tarea{stats.dueToday !== 1 ? "s" : ""} vence{stats.dueToday !== 1 ? "n" : ""} hoy
                  </p>
                  <p className="text-xs text-muted-foreground">Completar antes del cierre</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Rendimiento del Equipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(stats.byAssignee).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin asignaciones</p>
              </div>
            ) : (
              Object.entries(stats.byAssignee)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
                .map(([userId, data]) => {
                  const name = getProfileName(userId);
                  const progress = data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0;
                  
                  return (
                    <div key={userId} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">{name || "Sin nombre"}</p>
                          <span className="text-xs text-muted-foreground">
                            {data.completed}/{data.count}
                          </span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Distribución por Prioridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(PRIORITIES).map(([key, priority]) => {
                const count = stats.byPriority[key] || 0;
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                
                return (
                  <div key={key} className="flex items-center gap-3">
                    <Badge className={cn("w-20 justify-center", priority.color)}>
                      {priority.label}
                    </Badge>
                    <div className="flex-1">
                      <Progress value={percentage} className="h-2" />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Tasks & Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent/High Priority Tasks */}
        {urgentCards.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Tareas Prioritarias
              </CardTitle>
              <CardDescription>Alta y urgente prioridad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {urgentCards.map((card) => {
                  const assigneeName = getProfileName(card.asignado_a);
                  const priority = PRIORITIES[card.prioridad as keyof typeof PRIORITIES];
                  
                  return (
                    <div 
                      key={card.id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Badge className={cn("text-xs", priority?.color)}>
                        {priority?.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{card.titulo}</p>
                        {assigneeName && (
                          <p className="text-xs text-muted-foreground">
                            Asignado a {assigneeName}
                          </p>
                        )}
                      </div>
                      {card.fecha_vencimiento && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(card.fecha_vencimiento), "dd MMM", { locale: es })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue Tasks */}
        {overdueCards.length > 0 && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <Timer className="h-4 w-4" />
                Tareas Vencidas
              </CardTitle>
              <CardDescription>Requieren atención inmediata</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {overdueCards.map((card) => {
                  const assigneeName = getProfileName(card.asignado_a);
                  const dueDate = card.fecha_vencimiento ? parseISO(card.fecha_vencimiento) : null;
                  
                  return (
                    <div 
                      key={card.id} 
                      className="flex items-center gap-3 p-2 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors"
                    >
                      <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{card.titulo}</p>
                        {assigneeName && (
                          <p className="text-xs text-muted-foreground">
                            Asignado a {assigneeName}
                          </p>
                        )}
                      </div>
                      {dueDate && (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(dueDate, "dd MMM", { locale: es })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task List */}
      {node.children && node.children.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Tareas del Proceso
            </CardTitle>
            <CardDescription>
              Haz clic en una tarea para ver su tablero Kanban
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {node.children
                .filter(child => child.type === "tarea")
                .map((taskNode) => {
                  // Count cards for this task
                  const taskCards = cards.filter(c => c.workflow_item_id === taskNode.id);
                  const completedCards = taskCards.filter(c => c.status === "completado").length;
                  const taskProgress = taskCards.length > 0 
                    ? Math.round((completedCards / taskCards.length) * 100) 
                    : 0;
                  
                  return (
                    <div 
                      key={taskNode.id}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer group"
                      onClick={() => onNavigateToTask?.(taskNode)}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        taskProgress >= 100 
                          ? "bg-emerald-100 dark:bg-emerald-900/30"
                          : "bg-primary/10"
                      )}>
                        {taskProgress >= 100 ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <ListTodo className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{taskNode.label}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{taskCards.length} tarjeta{taskCards.length !== 1 ? "s" : ""}</span>
                          <span>•</span>
                          <span>{completedCards} completada{completedCards !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <Progress value={taskProgress} className="h-2" />
                        </div>
                        <span className={cn(
                          "text-sm font-semibold min-w-[40px] text-right",
                          taskProgress >= 100 && "text-emerald-600"
                        )}>
                          {taskProgress}%
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {stats.total === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ListTodo className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Sin tarjetas Kanban</p>
            <p className="text-sm">Selecciona una tarea para agregar tarjetas al tablero</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
