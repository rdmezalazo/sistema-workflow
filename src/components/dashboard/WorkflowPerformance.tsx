import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Loader2, Briefcase, Users, User, TrendingUp } from "lucide-react";
import { useSedeContext } from "@/hooks/useSedeContext";

interface WorkflowStats {
  id: string;
  nombre: string;
  contratos: number;
  progreso: number;
  actividadesTotal: number;
  actividadesCompletadas: number;
}

interface CarteraStats extends WorkflowStats {
  miembros: MemberStats[];
}

interface MemberStats extends WorkflowStats {
  iniciales: string;
  puesto: string;
  cartera?: string;
}

const avatarColors = [
  "from-primary to-primary/80",
  "from-secondary to-secondary/80",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
];

const getProgressColor = (progress: number) => {
  if (progress >= 80) return "bg-primary";
  if (progress >= 60) return "bg-secondary";
  if (progress >= 40) return "bg-accent";
  return "bg-destructive";
};

export function WorkflowPerformance() {
  const { activeSedeId } = useSedeContext();
  const [carteraStats, setCarteraStats] = useState<CarteraStats[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("carteras");

  useEffect(() => {
    fetchWorkflowStats();
  }, [activeSedeId]);

  const fetchWorkflowStats = async () => {
    try {
      setLoading(true);

      // Fetch all required data in parallel
      const [
        carterasResult,
        miembrosResult,
        profilesResult,
        contratosResult,
        workflowsResult,
      ] = await Promise.all([
        supabase.from("carteras").select("*").eq("activa", true),
        supabase.from("cartera_miembros").select("*, carteras(nombre)"),
        supabase.from("profiles").select("id, full_name, puesto"),
        supabase.from("contratos").select("id, responsable_id, condicion, sede_id").neq("status", "borrador"),
        supabase.from("workflows").select("id, contrato_id, items, sede_id"),
      ]);

      const matchesActiveSede = (item: any) => !activeSedeId || item?.sede_id === activeSedeId;
      const carteras = (carterasResult.data || []).filter(matchesActiveSede);
      const miembros = miembrosResult.data || [];
      const profiles = profilesResult.data || [];
      const contratos = (contratosResult.data || []).filter(matchesActiveSede);
      const workflows = (workflowsResult.data || []).filter(matchesActiveSede);

      // Calculate progress for a workflow based on its items
      const calculateWorkflowProgress = (items: any[]): { total: number; completed: number; progress: number } => {
        if (!Array.isArray(items) || items.length === 0) {
          return { total: 0, completed: 0, progress: 0 };
        }

        let totalActivities = 0;
        let completedProgress = 0;

        const countActivities = (nodeItems: any[]) => {
          nodeItems.forEach((item) => {
            if (item.type === "actividad") {
              totalActivities++;
              completedProgress += item.data?.progreso || 0;
            }
            if (item.children) {
              countActivities(item.children);
            }
          });
        };

        countActivities(items);

        return {
          total: totalActivities,
          completed: Math.round(completedProgress / (totalActivities || 1)),
          progress: totalActivities > 0 ? Math.round(completedProgress / totalActivities) : 0,
        };
      };

      // Get workflow stats by responsable_id
      const getStatsForResponsable = (responsableId: string) => {
        const userContratos = contratos.filter((c) => c.responsable_id === responsableId);
        let totalActividades = 0;
        let totalProgress = 0;

        userContratos.forEach((contrato) => {
          const workflow = workflows.find((w) => w.contrato_id === contrato.id);
          if (workflow) {
            const stats = calculateWorkflowProgress(workflow.items as any[]);
            totalActividades += stats.total;
            totalProgress += stats.progress;
          }
        });

        const avgProgress = userContratos.length > 0 ? Math.round(totalProgress / userContratos.length) : 0;

        return {
          contratos: userContratos.length,
          actividadesTotal: totalActividades,
          actividadesCompletadas: Math.round((totalActividades * avgProgress) / 100),
          progreso: avgProgress,
        };
      };

      // Build cartera stats with members
      const carteraData: CarteraStats[] = carteras.map((cartera, idx) => {
        const carteraMiembros = miembros.filter((m) => m.cartera_id === cartera.id);
        
        const miembrosStats: MemberStats[] = carteraMiembros.map((miembro, mIdx) => {
          const profile = profiles.find((p) => p.id === miembro.user_id);
          const stats = getStatsForResponsable(miembro.user_id);
          const initials = profile?.full_name
            ? profile.full_name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
            : "??";

          return {
            id: miembro.id,
            nombre: profile?.full_name || "Sin nombre",
            iniciales: initials,
            puesto: profile?.puesto || miembro.rol_en_cartera,
            ...stats,
          };
        });

        // Aggregate stats for cartera
        const totalContratos = miembrosStats.reduce((sum, m) => sum + m.contratos, 0);
        const totalActividades = miembrosStats.reduce((sum, m) => sum + m.actividadesTotal, 0);
        const totalCompletadas = miembrosStats.reduce((sum, m) => sum + m.actividadesCompletadas, 0);
        const avgProgress = miembrosStats.length > 0 
          ? Math.round(miembrosStats.reduce((sum, m) => sum + m.progreso, 0) / miembrosStats.length)
          : 0;

        return {
          id: cartera.id,
          nombre: cartera.nombre,
          contratos: totalContratos,
          progreso: avgProgress,
          actividadesTotal: totalActividades,
          actividadesCompletadas: totalCompletadas,
          miembros: miembrosStats,
        };
      });

      // Build member stats for "Equipo" tab
      const allMemberStats: MemberStats[] = [];
      const processedUserIds = new Set<string>();

      miembros.forEach((miembro) => {
        if (processedUserIds.has(miembro.user_id)) return;
        processedUserIds.add(miembro.user_id);

        const profile = profiles.find((p) => p.id === miembro.user_id);
        const stats = getStatsForResponsable(miembro.user_id);
        const initials = profile?.full_name
          ? profile.full_name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
          : "??";

        allMemberStats.push({
          id: miembro.user_id,
          nombre: profile?.full_name || "Sin nombre",
          iniciales: initials,
          puesto: profile?.puesto || miembro.rol_en_cartera,
          cartera: miembro.carteras?.nombre,
          ...stats,
        });
      });

      // Sort by progress descending
      allMemberStats.sort((a, b) => b.progreso - a.progreso);

      setCarteraStats(carteraData.filter((c) => c.contratos > 0 || c.miembros.length > 0));
      setMemberStats(allMemberStats);
    } catch (error) {
      console.error("Error fetching workflow stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden animate-slide-up shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Progreso de WorkFlows
              </h3>
              <p className="text-sm text-muted-foreground">
                Rendimiento por cartera y equipo
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="carteras" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Carteras
            </TabsTrigger>
            <TabsTrigger value="equipo" className="gap-2">
              <Users className="h-4 w-4" />
              Equipo
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="carteras" className="m-0">
          {carteraStats.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay carteras con datos de workflow
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {carteraStats.map((cartera, idx) => (
                <div key={cartera.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg bg-gradient-to-br text-white",
                        avatarColors[idx % avatarColors.length]
                      )}>
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{cartera.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {cartera.contratos} contratos · {cartera.miembros.length} miembros
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(
                      "font-bold",
                      cartera.progreso >= 80 ? "border-emerald-500 text-emerald-600" :
                      cartera.progreso >= 60 ? "border-amber-500 text-amber-600" :
                      "border-red-500 text-red-600"
                    )}>
                      {cartera.progreso}%
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progreso general</span>
                      <span className="font-medium">{cartera.actividadesCompletadas}/{cartera.actividadesTotal} actividades</span>
                    </div>
                    <Progress 
                      value={cartera.progreso} 
                      className="h-2"
                    />
                  </div>

                  {cartera.miembros.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex flex-wrap gap-2">
                        {cartera.miembros.slice(0, 4).map((miembro, mIdx) => (
                          <div key={miembro.id} className="flex items-center gap-2 bg-muted/50 rounded-full px-2 py-1">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className={cn(
                                "text-[10px] font-bold text-white bg-gradient-to-br",
                                avatarColors[(idx + mIdx) % avatarColors.length]
                              )}>
                                {miembro.iniciales}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{miembro.progreso}%</span>
                          </div>
                        ))}
                        {cartera.miembros.length > 4 && (
                          <div className="flex items-center justify-center h-6 px-2 bg-muted rounded-full text-xs text-muted-foreground">
                            +{cartera.miembros.length - 4} más
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="equipo" className="m-0">
          {memberStats.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay miembros con workflows asignados
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {memberStats.slice(0, 6).map((member, idx) => (
                <div
                  key={member.id}
                  className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <Avatar className="h-10 w-10 ring-2 ring-background shadow-lg">
                    <AvatarFallback className={cn(
                      "bg-gradient-to-br text-white text-sm font-bold",
                      avatarColors[idx % avatarColors.length]
                    )}>
                      {member.iniciales}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="font-semibold text-foreground text-sm truncate">
                          {member.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.puesto} {member.cartera && `· ${member.cartera}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">
                          {member.progreso}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.contratos} contratos
                        </p>
                      </div>
                    </div>
                    
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700 ease-out",
                          getProgressColor(member.progreso)
                        )}
                        style={{ width: `${member.progreso}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
