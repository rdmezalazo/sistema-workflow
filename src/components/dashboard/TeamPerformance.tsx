import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface TeamMember {
  id: string;
  nombre: string;
  rol: string;
  iniciales: string;
  cartera: string;
  contratos: number;
  completados: number;
  progreso: number;
}

interface TeamPerformanceProps {
  members: TeamMember[];
  loading?: boolean;
}

const getProgressGradient = (progress: number) => {
  if (progress >= 80) return "from-emerald-500 to-green-500";
  if (progress >= 60) return "from-amber-500 to-yellow-500";
  return "from-red-500 to-orange-500";
};

const avatarColors = [
  "from-primary to-primary/80",
  "from-secondary to-secondary/80",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
];

export function TeamPerformance({ members, loading }: TeamPerformanceProps) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden animate-slide-up shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 border-b border-border/50">
        <h3 className="text-lg font-semibold text-foreground">
          Rendimiento del Equipo
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Avance de asesores este mes
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground">No hay datos del equipo disponibles</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {members.map((member, index) => (
            <div
              key={member.id}
              className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors group cursor-pointer"
            >
              <Avatar className="h-12 w-12 ring-2 ring-background shadow-lg">
                <AvatarFallback className={cn(
                  "bg-gradient-to-br text-white text-sm font-bold",
                  avatarColors[index % avatarColors.length]
                )}>
                  {member.iniciales}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm truncate">
                      {member.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.rol} {member.cartera && `- ${member.cartera}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">
                      {member.progreso}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.completados}/{member.contratos}
                    </p>
                  </div>
                </div>
                
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
                      getProgressGradient(member.progreso)
                    )}
                    style={{ width: `${member.progreso}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
