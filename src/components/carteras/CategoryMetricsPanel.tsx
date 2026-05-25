import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Database,
  ListTodo,
  Package,
  FileOutput,
  ClipboardCheck,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryScore } from "@/hooks/useCarteraPerformance";

interface CategoryMetricsPanelProps {
  scores: CategoryScore[];
  groupBy: "contract" | "activity" | "responsible";
}

const categoryConfig = {
  data: { icon: Database, label: "Data", color: "text-blue-500", bg: "bg-blue-50" },
  tarea: { icon: ListTodo, label: "Tareas", color: "text-purple-500", bg: "bg-purple-50" },
  entregable: { icon: Package, label: "Entregables", color: "text-emerald-500", bg: "bg-emerald-50" },
  output: { icon: FileOutput, label: "Outputs", color: "text-amber-500", bg: "bg-amber-50" },
  supervision: { icon: ClipboardCheck, label: "Supervisión", color: "text-rose-500", bg: "bg-rose-50" },
};

const statusConfig = {
  pending: { icon: Clock, label: "Pendiente", color: "text-muted-foreground", bgColor: "bg-muted" },
  on_time: { icon: CheckCircle2, label: "A tiempo", color: "text-blue-600", bgColor: "bg-blue-100" },
  before_deadline: { icon: TrendingUp, label: "Anticipado", color: "text-emerald-600", bgColor: "bg-emerald-100" },
  after_deadline: { icon: AlertTriangle, label: "Retrasado", color: "text-amber-600", bgColor: "bg-amber-100" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    return format(parseISO(datePart), "dd MMM", { locale: es });
  } catch {
    return "—";
  }
}

function groupScores(scores: CategoryScore[], groupBy: string): Map<string, CategoryScore[]> {
  const groups = new Map<string, CategoryScore[]>();

  for (const score of scores) {
    let key: string;
    switch (groupBy) {
      case "contract":
        key = score.contractNumber || "Sin contrato";
        break;
      case "activity":
        key = score.activityName || "Sin actividad";
        break;
      case "responsible":
        key = score.responsibleName || "Sin asignar";
        break;
      default:
        key = "Otros";
    }

    const existing = groups.get(key) || [];
    existing.push(score);
    groups.set(key, existing);
  }

  return groups;
}

function calculateGroupStats(scores: CategoryScore[]) {
  const total = scores.length;
  const completed = scores.filter(s => s.progress >= 100).length;
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const onTime = scores.filter(s => s.status === "on_time").length;
  const beforeDeadline = scores.filter(s => s.status === "before_deadline").length;
  const afterDeadline = scores.filter(s => s.status === "after_deadline").length;

  return { total, completed, totalScore, onTime, beforeDeadline, afterDeadline };
}

interface GroupRowProps {
  groupName: string;
  scores: CategoryScore[];
}

function GroupRow({ groupName, scores }: GroupRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const stats = calculateGroupStats(scores);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium">{groupName}</span>
            <Badge variant="secondary" className="text-xs">
              {stats.completed}/{stats.total}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-sm">{stats.beforeDeadline}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-sm">{stats.onTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-sm">{stats.afterDeadline}</span>
            </div>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
              {stats.totalScore} pts
            </Badge>
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t bg-muted/20">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px]">Categoría</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="w-[100px]">Vencimiento</TableHead>
                <TableHead className="w-[120px]">Progreso</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
                <TableHead className="w-[80px] text-right">Puntos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((score) => {
                const config = categoryConfig[score.type];
                const Icon = config.icon;
                const statusCfg = statusConfig[score.status];
                const StatusIcon = statusCfg.icon;

                return (
                  <TableRow key={score.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded", config.bg)}>
                          <Icon className={cn("h-3.5 w-3.5", config.color)} />
                        </div>
                        <span className="text-xs">{config.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{score.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {score.responsibleName || "Sin asignar"}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(score.dueDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={score.progress} className="h-1.5 w-16" />
                        <span className="text-xs text-muted-foreground">{score.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs gap-1", statusCfg.bgColor, statusCfg.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{score.score}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CategoryMetricsPanel({ scores, groupBy }: CategoryMetricsPanelProps) {
  const groups = groupScores(scores, groupBy);
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
    const scoreA = a[1].reduce((sum, s) => sum + s.score, 0);
    const scoreB = b[1].reduce((sum, s) => sum + s.score, 0);
    return scoreB - scoreA;
  });

  const groupLabels = {
    contract: "Por Contrato",
    activity: "Por Actividad",
    responsible: "Por Responsable",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{groupLabels[groupBy]}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Puntuaciones de categorías agrupadas {groupLabels[groupBy].toLowerCase()}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {sortedGroups.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No hay datos disponibles
          </div>
        ) : (
          <div className="divide-y">
            {sortedGroups.map(([groupName, groupScores]) => (
              <GroupRow key={groupName} groupName={groupName} scores={groupScores} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
