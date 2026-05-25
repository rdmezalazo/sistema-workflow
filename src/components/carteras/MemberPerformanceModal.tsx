import { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Target,
  Award,
  FileCheck,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamMemberScore, CategoryScore } from "@/hooks/useCarteraPerformance";

interface MemberPerformanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberScore | null;
  rank: number;
  allScores: CategoryScore[];
  filterLabel: string;
}

const categoryLabels: Record<string, string> = {
  data: "Data",
  tarea: "Tareas",
  entregable: "Entregables",
  output: "Output",
  supervision: "Supervisión",
};

const categoryColors: Record<string, string> = {
  data: "from-blue-500 to-cyan-500",
  tarea: "from-emerald-500 to-teal-500",
  entregable: "from-violet-500 to-purple-500",
  output: "from-amber-500 to-orange-500",
  supervision: "from-rose-500 to-pink-500",
};

export function MemberPerformanceModal({
  open,
  onOpenChange,
  member,
  rank,
  allScores,
  filterLabel,
}: MemberPerformanceModalProps) {
  // Filter scores for this member
  const memberScores = useMemo(() => {
    if (!member) return [];
    return allScores.filter((s) => s.responsibleId === member.id);
  }, [member, allScores]);

  // Group by category
  const categoryBreakdown = useMemo(() => {
    const groups: Record<string, { completed: number; pending: number; score: number; items: CategoryScore[] }> = {};
    
    for (const score of memberScores) {
      if (!groups[score.type]) {
        groups[score.type] = { completed: 0, pending: 0, score: 0, items: [] };
      }
      groups[score.type].items.push(score);
      groups[score.type].score += score.score;
      if (score.progress >= 100) {
        groups[score.type].completed++;
      } else {
        groups[score.type].pending++;
      }
    }
    
    return groups;
  }, [memberScores]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return memberScores
      .filter((s) => s.progress >= 100 && s.completedDate)
      .sort((a, b) => {
        const dateA = a.completedDate ? new Date(a.completedDate).getTime() : 0;
        const dateB = b.completedDate ? new Date(b.completedDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [memberScores]);

  // Pending items
  const pendingItems = useMemo(() => {
    return memberScores
      .filter((s) => s.progress < 100)
      .sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [memberScores]);

  if (!member) return null;

  const totalItems = memberScores.length;
  const completedItems = memberScores.filter((s) => s.progress >= 100).length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const avgScore = completedItems > 0 ? Math.round(member.totalScore / completedItems * 10) / 10 : 0;

  const getRankBadge = () => {
    if (rank === 1) return { icon: Trophy, color: "text-amber-500 bg-amber-100", label: "1°" };
    if (rank === 2) return { icon: Award, color: "text-slate-500 bg-slate-100", label: "2°" };
    if (rank === 3) return { icon: Award, color: "text-amber-600 bg-amber-100", label: "3°" };
    return { icon: Target, color: "text-muted-foreground bg-muted", label: `${rank}°` };
  };

  const rankBadge = getRankBadge();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="sr-only">Rendimiento de {member.name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh] pr-4">
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-start gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-2xl font-bold">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute -bottom-2 -right-2 rounded-full p-1.5 shadow-md",
                  rankBadge.color
                )}>
                  <rankBadge.icon className="h-4 w-4" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold truncate">{member.name}</h2>
                  <Badge variant="secondary" className="text-lg px-3">
                    {member.totalScore} pts
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-3">
                  Ranking {rankBadge.label} posición • {filterLabel}
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">{member.beforeDeadlineCount}</span>
                    <span className="text-muted-foreground">anticipadas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{member.onTimeCount}</span>
                    <span className="text-muted-foreground">a tiempo</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">{member.afterDeadlineCount}</span>
                    <span className="text-muted-foreground">tardías</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{member.pendingCount}</span>
                    <span className="text-muted-foreground">pendientes</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent className="pt-4">
                  <div className="text-3xl font-bold text-primary">{member.totalScore}</div>
                  <p className="text-sm text-muted-foreground">Puntos totales</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                <CardContent className="pt-4">
                  <div className="text-3xl font-bold text-emerald-600">{completionRate}%</div>
                  <p className="text-sm text-muted-foreground">Tasa de completado</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                <CardContent className="pt-4">
                  <div className="text-3xl font-bold text-blue-600">{avgScore}</div>
                  <p className="text-sm text-muted-foreground">Promedio por entrega</p>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  Desglose por Categoría
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(categoryBreakdown).map(([type, data]) => {
                    const total = data.completed + data.pending;
                    const progress = total > 0 ? (data.completed / total) * 100 : 0;
                    
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-3 h-3 rounded-full bg-gradient-to-r",
                              categoryColors[type] || "from-gray-400 to-gray-500"
                            )} />
                            <span className="font-medium">{categoryLabels[type] || type}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-muted-foreground">
                              {data.completed}/{total} completados
                            </span>
                            <Badge variant="secondary" className="font-bold">
                              {data.score} pts
                            </Badge>
                          </div>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    );
                  })}
                  
                  {Object.keys(categoryBreakdown).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No hay actividades asignadas en este período
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Recent Activity */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Entregas Recientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 text-sm">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5",
                          item.status === "before_deadline" && "bg-emerald-500",
                          item.status === "on_time" && "bg-blue-500",
                          item.status === "after_deadline" && "bg-amber-500"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.contractNumber} • {item.score} pts
                          </p>
                        </div>
                        {item.completedDate && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(item.completedDate), "dd/MM", { locale: es })}
                          </span>
                        )}
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-2">
                        Sin entregas recientes
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    Próximos Vencimientos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 text-sm">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5 bg-muted-foreground"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{item.contractNumber}</span>
                            <Progress value={item.progress} className="h-1 w-12" />
                            <span>{item.progress}%</span>
                          </div>
                        </div>
                        {item.dueDate && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(item.dueDate), "dd/MM", { locale: es })}
                          </span>
                        )}
                      </div>
                    ))}
                    {pendingItems.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-2">
                        Sin pendientes
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
