import { Button } from "@/components/ui/button";
import {
  UserPlus,
  FileText,
  FileCheck,
  CalendarDays,
  ArrowRight,
  Zap,
  Briefcase,
  LayoutDashboard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
  bgColor: string;
}

const actions: QuickAction[] = [
  {
    title: "Nuevo Cliente",
    description: "Registrar prospecto o empresa",
    icon: UserPlus,
    path: "/clientes",
    color: "text-primary",
    bgColor: "bg-primary/10 group-hover:bg-primary group-hover:text-white",
  },
  {
    title: "Nueva Proforma",
    description: "Crear cotización de servicios",
    icon: FileText,
    path: "/proformas",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 group-hover:bg-blue-500 group-hover:text-white",
  },
  {
    title: "Nuevo Contrato",
    description: "Registrar contrato de servicio",
    icon: FileCheck,
    path: "/contratos",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-white",
  },
  {
    title: "Calendario Pagos",
    description: "Ver pagos pendientes",
    icon: CalendarDays,
    path: "/calendario-pagos",
    color: "text-secondary",
    bgColor: "bg-secondary/10 group-hover:bg-secondary group-hover:text-white",
  },
  {
    title: "Asignaciones",
    description: "Gestionar asignaciones",
    icon: Briefcase,
    path: "/asignaciones",
    color: "text-violet-600",
    bgColor: "bg-violet-500/10 group-hover:bg-violet-500 group-hover:text-white",
  },
  {
    title: "Carteras",
    description: "Administrar carteras",
    icon: LayoutDashboard,
    path: "/carteras",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-white",
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-6 animate-slide-up shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Acciones Rápidas
          </h3>
          <p className="text-xs text-muted-foreground">Accede rápidamente a las funciones principales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              onClick={() => navigate(action.path)}
              className={cn(
                "group flex items-center gap-3 p-4 rounded-xl border border-border/50",
                "bg-gradient-to-r from-transparent to-transparent",
                "hover:from-muted/50 hover:to-muted/30 hover:border-border",
                "transition-all duration-300 text-left hover:scale-[1.02] active:scale-[0.98]"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                "p-2.5 rounded-xl transition-all duration-300",
                action.bgColor,
                action.color
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{action.title}</p>
                <p className="text-xs text-muted-foreground truncate">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
