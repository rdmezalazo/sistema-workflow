import { useMemo } from "react";
import {
  Activity,
  Database,
  ListTodo,
  Package,
  ShieldCheck,
  FileText,
  CalendarDays,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Building2,
  Hash,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TreeNode } from "./WorkFlowTreeSidebar";
import { calculateActivityProgressFromNode } from "@/hooks/useActivityProgress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";

interface ContratoDashboardProps {
  node: TreeNode;
  onViewDetail: (contractId: string) => void;
}

interface ItemStats {
  total: number;
  completados: number;
  pendientes: number;
  porcentaje: number;
}

interface ActivityStats extends ItemStats {
  progressSum: number;
}

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

const COLORS = {
  actividades: { primary: "#22c55e", secondary: "#bbf7d0" },
  inputs: { primary: "#10b981", secondary: "#a7f3d0" },
  procesos: { primary: "#f59e0b", secondary: "#fde68a" },
  outputs: { primary: "#8b5cf6", secondary: "#ddd6fe" },
  supervision: { primary: "#06b6d4", secondary: "#a5f3fc" },
};

export function ContratoDashboard({ node, onViewDetail }: ContratoDashboardProps) {
  const data = node.data || {};

  // Calculate stats from workflow items with real progress from categories
  const workflowStats = useMemo(() => {
    const stats = {
      actividades: { total: 0, completados: 0, pendientes: 0, porcentaje: 0, progressSum: 0 } as ActivityStats,
      inputs: { total: 0, completados: 0, pendientes: 0, porcentaje: 0 } as ItemStats,
      procesos: { total: 0, completados: 0, pendientes: 0, porcentaje: 0 } as ItemStats,
      outputs: { total: 0, completados: 0, pendientes: 0, porcentaje: 0 } as ItemStats,
      supervision: { total: 0, completados: 0, pendientes: 0, porcentaje: 0 } as ItemStats,
    };

    const processNode = (n: TreeNode) => {
      if (n.type === "actividad" && n.id !== `actividades-${node.id}`) {
        stats.actividades.total++;
        // Calculate real progress from activity's categories
        const activityProgress = calculateActivityProgressFromNode(n);
        stats.actividades.progressSum += activityProgress;
        if (activityProgress >= 100 || n.isCompleted) {
          stats.actividades.completados++;
        }
      } else if (n.type === "input") {
        stats.inputs.total++;
        const progress = n.data?.progreso || 0;
        if (progress >= 100 || n.isCompleted) stats.inputs.completados++;
      } else if (n.type === "tarea") {
        stats.procesos.total++;
        const progress = n.data?.progreso || 0;
        if (progress >= 100 || n.isCompleted) stats.procesos.completados++;
      } else if (n.type === "output") {
        stats.outputs.total++;
        const progress = n.data?.progreso || 0;
        if (progress >= 100 || n.isCompleted) stats.outputs.completados++;
      } else if (n.type === "supervision_item") {
        stats.supervision.total++;
        const progress = n.data?.progreso || 0;
        if (progress >= 100 || n.isCompleted) stats.supervision.completados++;
      }

      if (n.children) {
        n.children.forEach(processNode);
      }
    };

    if (node.children) {
      node.children.forEach(processNode);
    }

    // Calculate percentages and pending
    // For activities, use average progress
    stats.actividades.pendientes = stats.actividades.total - stats.actividades.completados;
    stats.actividades.porcentaje = stats.actividades.total > 0 
      ? Math.round(stats.actividades.progressSum / stats.actividades.total) 
      : 0;

    // For other categories, use completed ratio
    (['inputs', 'procesos', 'outputs', 'supervision'] as const).forEach((key) => {
      const s = stats[key];
      s.pendientes = s.total - s.completados;
      s.porcentaje = s.total > 0 ? Math.round((s.completados / s.total) * 100) : 0;
    });

    return stats;
  }, [node]);

  // Overall progress
  const overallProgress = useMemo(() => {
    const total = Object.values(workflowStats).reduce((sum, s) => sum + s.total, 0);
    const completed = Object.values(workflowStats).reduce((sum, s) => sum + s.completados, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [workflowStats]);

  // Chart data
  const radialData = useMemo(() => [
    {
      name: "Actividades",
      value: workflowStats.actividades.porcentaje,
      fill: COLORS.actividades.primary,
    },
    {
      name: "Data",
      value: workflowStats.inputs.porcentaje,
      fill: COLORS.inputs.primary,
    },
    {
      name: "Procesos",
      value: workflowStats.procesos.porcentaje,
      fill: COLORS.procesos.primary,
    },
    {
      name: "Outputs",
      value: workflowStats.outputs.porcentaje,
      fill: COLORS.outputs.primary,
    },
    {
      name: "Supervisión",
      value: workflowStats.supervision.porcentaje,
      fill: COLORS.supervision.primary,
    },
  ], [workflowStats]);

  const barData = useMemo(() => [
    {
      name: "Actividades",
      completados: workflowStats.actividades.completados,
      pendientes: workflowStats.actividades.pendientes,
    },
    {
      name: "Data",
      completados: workflowStats.inputs.completados,
      pendientes: workflowStats.inputs.pendientes,
    },
    {
      name: "Procesos",
      completados: workflowStats.procesos.completados,
      pendientes: workflowStats.procesos.pendientes,
    },
    {
      name: "Outputs",
      completados: workflowStats.outputs.completados,
      pendientes: workflowStats.outputs.pendientes,
    },
    {
      name: "Supervisión",
      completados: workflowStats.supervision.completados,
      pendientes: workflowStats.supervision.pendientes,
    },
  ], [workflowStats]);

  const pieData = useMemo(() => {
    const completed = Object.values(workflowStats).reduce((sum, s) => sum + s.completados, 0);
    const pending = Object.values(workflowStats).reduce((sum, s) => sum + s.pendientes, 0);
    return [
      { name: "Completados", value: completed, fill: "#22c55e" },
      { name: "Pendientes", value: pending, fill: "#e5e7eb" },
    ];
  }, [workflowStats]);

  const chartConfig = {
    actividades: { label: "Actividades", color: COLORS.actividades.primary },
    inputs: { label: "Data", color: COLORS.inputs.primary },
    procesos: { label: "Procesos", color: COLORS.procesos.primary },
    outputs: { label: "Outputs", color: COLORS.outputs.primary },
    supervision: { label: "Supervisión", color: COLORS.supervision.primary },
    completados: { label: "Completados", color: "#22c55e" },
    pendientes: { label: "Pendientes", color: "#e5e7eb" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{data.cliente || node.label}</h2>
            <p className="text-sm text-muted-foreground font-medium">{data.numero}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5"
          onClick={() => onViewDetail(data.contrato_id || node.id)}
        >
          <Eye className="h-4 w-4" />
          Ver Detalle Completo
        </Button>
      </div>

      {/* Contract Info Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Servicio</p>
            <p className="font-semibold">{data.tipo_servicio || "-"}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Estado</p>
            <Badge className={cn("font-semibold", statusStyles[data.status])}>
              {statusLabels[data.status] || data.status || "Activo"}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Fecha de Inicio</p>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">
                {data.fecha_inicio 
                  ? format(parseISO(data.fecha_inicio), "dd MMM yyyy", { locale: es })
                  : "-"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Progreso Total</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="font-bold text-xl text-green-600">{overallProgress}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.descripcion && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Descripción</p>
            <p className="text-sm">{data.descripcion}</p>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Overall Progress Pie */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              Progreso General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[180px]">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Completados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-200" />
                <span className="text-xs text-muted-foreground">Pendientes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Radial Progress by Category */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center">
                <Activity className="h-4 w-4 text-white" />
              </div>
              Avance por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[180px]">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="90%"
                data={radialData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={4}
                  background={{ fill: "#f3f4f6" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadialBarChart>
            </ChartContainer>
            <div className="flex justify-center flex-wrap gap-3 mt-2">
              {radialData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-[10px] text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart - Items by Category */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
              <ListTodo className="h-4 w-4 text-white" />
            </div>
            Detalle de Items por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80} 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="completados" 
                fill="#22c55e" 
                radius={[0, 4, 4, 0]}
                stackId="stack"
              />
              <Bar 
                dataKey="pendientes" 
                fill="#e5e7eb" 
                radius={[0, 4, 4, 0]}
                stackId="stack"
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Detailed Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        {/* Actividades */}
        <Card className="overflow-hidden border-t-4 border-t-green-500">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <CardTitle className="text-sm font-semibold">Actividades</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{workflowStats.actividades.porcentaje}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Completado</p>
            </div>
            <Progress value={workflowStats.actividades.porcentaje} className="h-2" />
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                {workflowStats.actividades.completados}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {workflowStats.actividades.pendientes}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Data/Inputs */}
        <Card className="overflow-hidden border-t-4 border-t-emerald-500">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-sm font-semibold">Data</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">{workflowStats.inputs.porcentaje}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Completado</p>
            </div>
            <Progress value={workflowStats.inputs.porcentaje} className="h-2" />
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                {workflowStats.inputs.completados}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {workflowStats.inputs.pendientes}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Procesos */}
        <Card className="overflow-hidden border-t-4 border-t-amber-500">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-sm font-semibold">Procesos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{workflowStats.procesos.porcentaje}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Completado</p>
            </div>
            <Progress value={workflowStats.procesos.porcentaje} className="h-2" />
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1 text-amber-600">
                <CheckCircle2 className="h-3 w-3" />
                {workflowStats.procesos.completados}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {workflowStats.procesos.pendientes}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Outputs */}
        <Card className="overflow-hidden border-t-4 border-t-purple-500">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-sm font-semibold">Outputs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{workflowStats.outputs.porcentaje}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Completado</p>
            </div>
            <Progress value={workflowStats.outputs.porcentaje} className="h-2" />
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1 text-purple-600">
                <CheckCircle2 className="h-3 w-3" />
                {workflowStats.outputs.completados}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {workflowStats.outputs.pendientes}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Supervisión */}
        <Card className="overflow-hidden border-t-4 border-t-cyan-500">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
              <CardTitle className="text-sm font-semibold">Supervisión</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-cyan-600">{workflowStats.supervision.porcentaje}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Completado</p>
            </div>
            <Progress value={workflowStats.supervision.porcentaje} className="h-2" />
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1 text-cyan-600">
                <CheckCircle2 className="h-3 w-3" />
                {workflowStats.supervision.completados}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {workflowStats.supervision.pendientes}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
