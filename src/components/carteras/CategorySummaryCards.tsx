import { Card, CardContent } from "@/components/ui/card";
import { Database, ListTodo, Package, FileOutput, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryScore } from "@/hooks/useCarteraPerformance";

interface CategorySummaryCardsProps {
  scores: CategoryScore[];
}

const categoryConfig = {
  data: { 
    icon: Database, 
    label: "Data", 
    color: "text-blue-500", 
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  tarea: { 
    icon: ListTodo, 
    label: "Tareas", 
    color: "text-purple-500", 
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  },
  entregable: { 
    icon: Package, 
    label: "Entregables", 
    color: "text-emerald-500", 
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200"
  },
  output: { 
    icon: FileOutput, 
    label: "Outputs", 
    color: "text-amber-500", 
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200"
  },
  supervision: { 
    icon: ClipboardCheck, 
    label: "Supervisión", 
    color: "text-rose-500", 
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200"
  },
};

type CategoryType = keyof typeof categoryConfig;

export function CategorySummaryCards({ scores }: CategorySummaryCardsProps) {
  // Group by category type
  const categoryStats = Object.keys(categoryConfig).map((type) => {
    const categoryScores = scores.filter(s => s.type === type);
    const total = categoryScores.length;
    const completed = categoryScores.filter(s => s.progress >= 100).length;
    const totalScore = categoryScores.reduce((sum, s) => sum + s.score, 0);
    const beforeDeadline = categoryScores.filter(s => s.status === "before_deadline").length;
    const onTime = categoryScores.filter(s => s.status === "on_time").length;
    const afterDeadline = categoryScores.filter(s => s.status === "after_deadline").length;

    return {
      type: type as CategoryType,
      total,
      completed,
      totalScore,
      beforeDeadline,
      onTime,
      afterDeadline,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {categoryStats.map((stat) => {
        const config = categoryConfig[stat.type];
        const Icon = config.icon;

        return (
          <Card key={stat.type} className={cn("overflow-hidden border", config.borderColor)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-lg", config.bgColor)}>
                  <Icon className={cn("h-5 w-5", config.color)} />
                </div>
                <span className={cn("text-2xl font-bold", config.color)}>
                  {stat.totalScore}
                </span>
              </div>
              
              <p className="font-medium text-sm mb-1">{config.label}</p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{stat.completed}/{stat.total} completados</span>
                <span>{stat.completionRate}%</span>
              </div>

              {/* Mini progress bar */}
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all", 
                    stat.type === "data" && "bg-blue-500",
                    stat.type === "tarea" && "bg-purple-500",
                    stat.type === "entregable" && "bg-emerald-500",
                    stat.type === "output" && "bg-amber-500",
                    stat.type === "supervision" && "bg-rose-500"
                  )}
                  style={{ width: `${stat.completionRate}%` }}
                />
              </div>

              {/* Score breakdown */}
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-emerald-600">↑{stat.beforeDeadline}</span>
                <span className="text-blue-600">●{stat.onTime}</span>
                <span className="text-amber-600">↓{stat.afterDeadline}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
