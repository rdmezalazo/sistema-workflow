import { useMemo } from "react";
import { format, parseISO, isAfter, isBefore, isToday } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  FileText,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Eye,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { TreeNode } from "./WorkFlowTreeSidebar";

interface MesDashboardProps {
  node: TreeNode;
  allNodes: TreeNode[];
  onViewContractDetail: (contractId: string) => void;
}

interface ContratoData {
  id: string;
  numero: string;
  cliente: string;
  cliente_codigo?: string;
  descripcion?: string;
  tipo_servicio: string;
  status: string;
  fecha_inicio: string;
}

interface TareaData {
  id: string;
  titulo: string;
  completado: boolean;
  asignado_a?: string;
  asignado_nombre?: string;
  fecha_vencimiento?: string;
  contrato_numero?: string;
  contrato_cliente?: string;
}

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const statusStyles: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  aprobado: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  en_gestion: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  activo: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  finalizado: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
};

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  aprobado: "Aprobado",
  en_gestion: "En Gestión",
  activo: "Activo",
  finalizado: "Finalizado",
};

export function MesDashboard({ node, allNodes, onViewContractDetail }: MesDashboardProps) {
  // Extract contracts from the month node
  const contratos = useMemo<ContratoData[]>(() => {
    const contratosFolder = node.children?.find(c => c.type === "contratos_folder");
    if (!contratosFolder?.data?.contratos) return [];
    return contratosFolder.data.contratos;
  }, [node]);

  // Calculate progress for each contract by traversing tree
  const contractProgress = useMemo(() => {
    const progressMap: Record<string, { total: number; completed: number; tareas: TareaData[] }> = {};
    
    const contratosFolder = node.children?.find(c => c.type === "contratos_folder");
    if (!contratosFolder?.children) return progressMap;

    contratosFolder.children.forEach(contratoNode => {
      let total = 0;
      let completed = 0;
      const tareas: TareaData[] = [];
      const contratoData = contratoNode.data || {};

      const traverseNode = (n: TreeNode) => {
        // Count tareas and their completion
        if (n.type === "tarea") {
          total++;
          if (n.isCompleted) completed++;
          tareas.push({
            id: n.id,
            titulo: n.label,
            completado: n.isCompleted || false,
            asignado_a: n.data?.asignado_a,
            asignado_nombre: n.data?.asignado_nombre,
            fecha_vencimiento: n.data?.fecha_vencimiento,
            contrato_numero: contratoData.numero,
            contrato_cliente: contratoData.cliente,
          });
        }
        // Also count inputs, outputs, and supervision items
        if (["input", "output", "supervision_item"].includes(n.type)) {
          total++;
          if (n.isCompleted) completed++;
        }
        n.children?.forEach(traverseNode);
      };

      contratoNode.children?.forEach(traverseNode);
      progressMap[contratoNode.id] = { total, completed, tareas };
    });

    return progressMap;
  }, [node]);

  // Aggregate all tasks across contracts
  const allTareas = useMemo(() => {
    const tareas: TareaData[] = [];
    Object.values(contractProgress).forEach(p => {
      tareas.push(...p.tareas);
    });
    return tareas;
  }, [contractProgress]);

  // Group tasks by assignee
  const tareasByWorker = useMemo(() => {
    const groups: Record<string, TareaData[]> = {};
    allTareas.forEach(tarea => {
      const key = tarea.asignado_nombre || "Sin Asignar";
      if (!groups[key]) groups[key] = [];
      groups[key].push(tarea);
    });
    return groups;
  }, [allTareas]);

  // Stats
  const stats = useMemo(() => {
    const totalContratos = contratos.length;
    const totalTareas = allTareas.length;
    const tareasCompletadas = allTareas.filter(t => t.completado).length;
    const tareasPendientes = totalTareas - tareasCompletadas;
    const tareasVencidas = allTareas.filter(t => {
      if (!t.fecha_vencimiento || t.completado) return false;
      return isBefore(parseISO(t.fecha_vencimiento), new Date());
    }).length;

    return {
      totalContratos,
      totalTareas,
      tareasCompletadas,
      tareasPendientes,
      tareasVencidas,
      progresoGeneral: totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0,
    };
  }, [contratos, allTareas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Calendar className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{node.label}</h2>
          <p className="text-sm text-muted-foreground">
            Dashboard del período • {stats.totalContratos} contratos
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalContratos}</p>
                <p className="text-xs text-muted-foreground">Contratos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.tareasCompletadas}</p>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.tareasPendientes}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.tareasVencidas}</p>
                <p className="text-xs text-muted-foreground">Vencidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso General del Mes</span>
            <span className="text-sm font-bold">{stats.progresoGeneral}%</span>
          </div>
          <Progress value={stats.progresoGeneral} className="h-3" />
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="contratos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contratos" className="gap-2">
            <FileText className="h-4 w-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="progreso" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Progreso
          </TabsTrigger>
          <TabsTrigger value="trabajadores" className="gap-2">
            <Users className="h-4 w-4" />
            Por Trabajador
          </TabsTrigger>
        </TabsList>

        {/* Contracts Tab */}
        <TabsContent value="contratos" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contratos del Período</CardTitle>
              <CardDescription>Vista completa de todos los contratos</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contratos.map((contrato) => (
                      <TableRow key={contrato.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{contrato.cliente}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contrato.numero}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {contrato.tipo_servicio}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", statusStyles[contrato.status])}>
                            {statusLabels[contrato.status] || contrato.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(parseISO(contrato.fecha_inicio), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewContractDetail(contrato.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progreso" className="mt-4">
          <div className="grid gap-3">
            {contratos.map((contrato) => {
              const progress = contractProgress[contrato.id] || { total: 0, completed: 0, tareas: [] };
              const percentage = progress.total > 0 
                ? Math.round((progress.completed / progress.total) * 100) 
                : 0;

              return (
                <Card key={contrato.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-semibold truncate">{contrato.cliente}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{contrato.numero}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold">{percentage}%</span>
                        <p className="text-xs text-muted-foreground">
                          {progress.completed}/{progress.total} tareas
                        </p>
                      </div>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={cn(
                        "h-3",
                        percentage === 100 && "[&>div]:bg-green-500",
                        percentage >= 50 && percentage < 100 && "[&>div]:bg-amber-500",
                        percentage < 50 && "[&>div]:bg-red-500"
                      )}
                    />
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {progress.tareas.filter(t => !t.completado).length} pendientes
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          percentage === 100 && "border-green-500 text-green-600",
                          percentage < 100 && percentage >= 50 && "border-amber-500 text-amber-600",
                          percentage < 50 && "border-red-500 text-red-600"
                        )}
                      >
                        {percentage === 100 ? "Completado" : percentage >= 50 ? "En Progreso" : "Iniciando"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {contratos.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay contratos en este período</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Workers Tab */}
        <TabsContent value="trabajadores" className="mt-4">
          <div className="grid gap-4">
            {Object.entries(tareasByWorker).map(([worker, tareas]) => {
              const completadas = tareas.filter(t => t.completado).length;
              const pendientes = tareas.length - completadas;
              const vencidas = tareas.filter(t => {
                if (!t.fecha_vencimiento || t.completado) return false;
                return isBefore(parseISO(t.fecha_vencimiento), new Date());
              }).length;

              return (
                <Card key={worker}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(worker)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{worker}</CardTitle>
                          <CardDescription>{tareas.length} tareas asignadas</CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {completadas} ✓
                        </Badge>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {pendientes} ⏳
                        </Badge>
                        {vencidas > 0 && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {vencidas} ⚠
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-2">
                        {tareas.map((tarea) => {
                          const isVencida = tarea.fecha_vencimiento && 
                            !tarea.completado && 
                            isBefore(parseISO(tarea.fecha_vencimiento), new Date());
                          const isHoy = tarea.fecha_vencimiento && isToday(parseISO(tarea.fecha_vencimiento));

                          return (
                            <div
                              key={tarea.id}
                              className={cn(
                                "flex items-center justify-between p-2 rounded-lg border",
                                tarea.completado && "bg-muted/50 border-muted",
                                isVencida && "bg-red-50 border-red-200 dark:bg-red-900/20",
                                isHoy && !tarea.completado && "bg-amber-50 border-amber-200 dark:bg-amber-900/20"
                              )}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {tarea.completado ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : isVencida ? (
                                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                ) : (
                                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-sm truncate",
                                    tarea.completado && "line-through text-muted-foreground"
                                  )}>
                                    {tarea.titulo}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {tarea.contrato_cliente} • {tarea.contrato_numero}
                                  </p>
                                </div>
                              </div>
                              {tarea.fecha_vencimiento && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "ml-2 text-xs flex-shrink-0",
                                    isVencida && "border-red-500 text-red-600",
                                    isHoy && !tarea.completado && "border-amber-500 text-amber-600"
                                  )}
                                >
                                  {format(parseISO(tarea.fecha_vencimiento), "dd/MM")}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}

            {Object.keys(tareasByWorker).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay tareas asignadas en este período</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
