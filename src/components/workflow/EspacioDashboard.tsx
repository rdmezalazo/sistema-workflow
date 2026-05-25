import { useMemo } from "react";
import { format, parseISO, isThisMonth, isThisWeek } from "date-fns";
import { es } from "date-fns/locale";
import {
  Briefcase,
  FileText,
  ListTodo,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Activity,
  Users,
  CalendarDays,
  Target,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { TreeNode } from "./WorkFlowTreeSidebar";

interface EspacioDashboardProps {
  node: TreeNode;
  allNodes: TreeNode[];
}

interface WorkflowMetrics {
  totalContratos: number;
  contratosEnGestion: number;
  contratosActivos: number;
  contratosFinalizados: number;
  totalTareas: number;
  tareasCompletadas: number;
  totalEntregables: number;
  entregablesCompletados: number;
  totalInputs: number;
  inputsCompletados: number;
  recentContratos: any[];
  recentTareas: any[];
  recentEntregables: any[];
}

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const statusColors: Record<string, string> = {
  borrador: "bg-gray-500",
  en_gestion: "bg-amber-500",
  aprobado: "bg-blue-500",
  activo: "bg-green-500",
  finalizado: "bg-purple-500",
};

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  en_gestion: "En Gestión",
  aprobado: "Aprobado",
  activo: "Activo",
  finalizado: "Finalizado",
};

export function EspacioDashboard({ node, allNodes }: EspacioDashboardProps) {
  const data = node.data || {};

  // Calculate metrics from the tree structure
  const metrics = useMemo<WorkflowMetrics>(() => {
    const result: WorkflowMetrics = {
      totalContratos: 0,
      contratosEnGestion: 0,
      contratosActivos: 0,
      contratosFinalizados: 0,
      totalTareas: 0,
      tareasCompletadas: 0,
      totalEntregables: 0,
      entregablesCompletados: 0,
      totalInputs: 0,
      inputsCompletados: 0,
      recentContratos: [],
      recentTareas: [],
      recentEntregables: [],
    };

    // Recursive function to traverse tree
    const traverseNode = (n: TreeNode) => {
      if (n.type === "contrato" && n.data) {
        result.totalContratos++;
        const status = n.data.status;
        if (status === "en_gestion") result.contratosEnGestion++;
        if (status === "activo" || status === "aprobado") result.contratosActivos++;
        if (status === "finalizado") result.contratosFinalizados++;
        
        result.recentContratos.push({
          id: n.id,
          label: n.label,
          ...n.data,
        });
      }
      
      if (n.type === "tarea") {
        result.totalTareas++;
        if (n.isCompleted) result.tareasCompletadas++;
        
        result.recentTareas.push({
          id: n.id,
          label: n.label,
          isCompleted: n.isCompleted,
          ...n.data,
        });
      }
      
      if (n.type === "output") {
        result.totalEntregables++;
        if (n.isCompleted) result.entregablesCompletados++;
        
        result.recentEntregables.push({
          id: n.id,
          label: n.label,
          isCompleted: n.isCompleted,
          ...n.data,
        });
      }

      if (n.type === "input") {
        result.totalInputs++;
        if (n.isCompleted) result.inputsCompletados++;
      }
      
      // Traverse children
      if (n.children) {
        n.children.forEach(traverseNode);
      }
    };

    // Traverse only children of this space node
    if (node.children) {
      node.children.forEach(traverseNode);
    }

    // Sort by date and limit recent items
    result.recentContratos = result.recentContratos
      .sort((a, b) => new Date(b.fecha_inicio || 0).getTime() - new Date(a.fecha_inicio || 0).getTime())
      .slice(0, 5);
    
    result.recentTareas = result.recentTareas.slice(0, 6);
    result.recentEntregables = result.recentEntregables.slice(0, 6);

    return result;
  }, [node]);

  const tareasProgress = metrics.totalTareas > 0 
    ? Math.round((metrics.tareasCompletadas / metrics.totalTareas) * 100)
    : 0;

  const entregablesProgress = metrics.totalEntregables > 0 
    ? Math.round((metrics.entregablesCompletados / metrics.totalEntregables) * 100)
    : 0;

  const inputsProgress = metrics.totalInputs > 0
    ? Math.round((metrics.inputsCompletados / metrics.totalInputs) * 100)
    : 0;

  const overallProgress = (tareasProgress + entregablesProgress + inputsProgress) / 3;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
              <Briefcase className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{node.label}</h2>
              <p className="text-sm text-muted-foreground">
                {data.especialidad || "Dashboard de Cartera"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            {Math.round(overallProgress)}% Progreso General
          </Badge>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Contratos */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.totalContratos}</p>
                  <p className="text-xs text-muted-foreground">Contratos</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  {metrics.contratosEnGestion} en gestión
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tareas */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ListTodo className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.totalTareas}</p>
                  <p className="text-xs text-muted-foreground">Tareas</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{metrics.tareasCompletadas} completadas</span>
                  <span className="font-medium text-blue-600">{tareasProgress}%</span>
                </div>
                <Progress value={tareasProgress} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* Entregables */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.totalEntregables}</p>
                  <p className="text-xs text-muted-foreground">Entregables</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{metrics.entregablesCompletados} entregados</span>
                  <span className="font-medium text-purple-600">{entregablesProgress}%</span>
                </div>
                <Progress value={entregablesProgress} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* Inputs */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Target className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.totalInputs}</p>
                  <p className="text-xs text-muted-foreground">Inputs</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{metrics.inputsCompletados} recibidos</span>
                  <span className="font-medium text-emerald-600">{inputsProgress}%</span>
                </div>
                <Progress value={inputsProgress} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Contracts */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <CardTitle className="text-sm font-semibold">Contratos Recientes</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {metrics.totalContratos} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {metrics.recentContratos.length > 0 ? (
                  metrics.recentContratos.map((contrato, idx) => (
                    <div 
                      key={contrato.id || idx}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                    >
                      <div className={cn(
                        "h-2 w-2 rounded-full flex-shrink-0",
                        statusColors[contrato.status] || "bg-gray-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {contrato.cliente || contrato.label}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{contrato.numero}</span>
                          {contrato.fecha_inicio && (
                            <>
                              <span>•</span>
                              <span>{format(parseISO(contrato.fecha_inicio), "dd MMM", { locale: es })}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {statusLabels[contrato.status] || contrato.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay contratos registrados</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold">Tareas del WorkFlow</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {metrics.tareasCompletadas}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                    <Clock className="h-3 w-3 mr-1" />
                    {metrics.totalTareas - metrics.tareasCompletadas}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {metrics.recentTareas.length > 0 ? (
                  metrics.recentTareas.map((tarea, idx) => (
                    <div 
                      key={tarea.id || idx}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg transition-colors",
                        tarea.isCompleted 
                          ? "bg-green-50/50 dark:bg-green-900/10" 
                          : "bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      {tarea.isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm truncate",
                          tarea.isCompleted && "line-through text-muted-foreground"
                        )}>
                          {tarea.label}
                        </p>
                        {tarea.asignado_nombre && (
                          <p className="text-xs text-muted-foreground">
                            Asignado a: {tarea.asignado_nombre}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay tareas registradas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Entregables */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-600" />
                  <CardTitle className="text-sm font-semibold">Entregables</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {metrics.entregablesCompletados}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {metrics.totalEntregables - metrics.entregablesCompletados}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {metrics.recentEntregables.length > 0 ? (
                  metrics.recentEntregables.map((entregable, idx) => (
                    <div 
                      key={entregable.id || idx}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg transition-colors",
                        entregable.isCompleted 
                          ? "bg-green-50/50 dark:bg-green-900/10" 
                          : "bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      {entregable.isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <Package className="h-4 w-4 text-purple-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm truncate",
                          entregable.isCompleted && "line-through text-muted-foreground"
                        )}>
                          {entregable.label}
                        </p>
                      </div>
                      {entregable.enlaceSharepoint && (
                        <Badge variant="outline" className="text-[10px]">
                          <Zap className="h-3 w-3 mr-1" />
                          SharePoint
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay entregables registrados</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team Section */}
          {data.miembros && data.miembros.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-violet-600" />
                    <CardTitle className="text-sm font-semibold">Equipo de Trabajo</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {data.miembros.length} miembro{data.miembros.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {data.miembros.map((m: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(m.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.profile?.full_name || m.profile?.email}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {m.rol_en_cartera}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Resumen de Progreso</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tareas Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tareas</span>
                  <span className="text-sm font-semibold">{tareasProgress}%</span>
                </div>
                <Progress value={tareasProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {metrics.tareasCompletadas} de {metrics.totalTareas} completadas
                </p>
              </div>

              {/* Entregables Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Entregables</span>
                  <span className="text-sm font-semibold">{entregablesProgress}%</span>
                </div>
                <Progress value={entregablesProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {metrics.entregablesCompletados} de {metrics.totalEntregables} entregados
                </p>
              </div>

              {/* Inputs Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Inputs</span>
                  <span className="text-sm font-semibold">{inputsProgress}%</span>
                </div>
                <Progress value={inputsProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {metrics.inputsCompletados} de {metrics.totalInputs} recibidos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
