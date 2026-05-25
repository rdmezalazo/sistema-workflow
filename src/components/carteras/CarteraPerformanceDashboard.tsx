import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BarChart3 } from "lucide-react";
import { TeamRankingCard } from "./TeamRankingCard";
import { CategoryMetricsPanel } from "./CategoryMetricsPanel";
import { CategorySummaryCards } from "./CategorySummaryCards";
import { PerformanceFilters } from "./PerformanceFilters";
import { MemberPerformanceModal } from "./MemberPerformanceModal";
import { useCarteraPerformance, TimeFilterConfig, TeamMemberScore } from "@/hooks/useCarteraPerformance";

interface CarteraPerformanceDashboardProps {
  carteraId: string;
  carteraNombre: string;
}

export function CarteraPerformanceDashboard({
  carteraId,
  carteraNombre,
}: CarteraPerformanceDashboardProps) {
  const [filterConfig, setFilterConfig] = useState<TimeFilterConfig>({ type: "month" });
  const [contractFilter, setContractFilter] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<"contract" | "activity" | "responsible">("contract");
  
  // Member modal state
  const [selectedMember, setSelectedMember] = useState<TeamMemberScore | null>(null);
  const [selectedMemberRank, setSelectedMemberRank] = useState(0);
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  const { teamRanking, categoryScores, contracts, loading } = useCarteraPerformance(
    carteraId,
    filterConfig,
    contractFilter
  );

  // Calculate overall stats
  const totalScore = teamRanking.reduce((sum, m) => sum + m.totalScore, 0);
  const totalCompleted = categoryScores.filter(s => s.progress >= 100).length;
  const totalPending = categoryScores.filter(s => s.progress < 100).length;

  // Get filter label for modal
  const getFilterLabel = (): string => {
    switch (filterConfig.type) {
      case "today":
        return "Hoy";
      case "week":
        return "Esta semana";
      case "month":
        if (filterConfig.selectedMonth) {
          return format(filterConfig.selectedMonth, "MMMM yyyy", { locale: es });
        }
        return "Este mes";
      case "range":
        if (filterConfig.dateRange?.from) {
          const from = format(filterConfig.dateRange.from, "dd/MM/yyyy", { locale: es });
          const to = filterConfig.dateRange.to 
            ? format(filterConfig.dateRange.to, "dd/MM/yyyy", { locale: es })
            : from;
          return `${from} - ${to}`;
        }
        return "Rango personalizado";
      case "all":
        return "Todo el tiempo";
      default:
        return "";
    }
  };

  const handleMemberClick = (member: TeamMemberScore, rank: number) => {
    setSelectedMember(member);
    setSelectedMemberRank(rank);
    setMemberModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{carteraNombre}</h2>
            <p className="text-sm text-muted-foreground">Rendimiento del equipo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {totalScore} pts totales
          </Badge>
          <Badge variant="secondary">
            {totalCompleted} completados
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            {totalPending} pendientes
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <PerformanceFilters
        filterConfig={filterConfig}
        onFilterChange={setFilterConfig}
        contractFilter={contractFilter}
        onContractFilterChange={setContractFilter}
        contracts={contracts}
      />

      {/* Category Summary Cards */}
      <CategorySummaryCards scores={categoryScores} />

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Team Ranking */}
        <div className="xl:col-span-1">
          <TeamRankingCard 
            members={teamRanking} 
            loading={loading}
            maxDisplay={5}
            onMemberClick={handleMemberClick}
          />
        </div>

        {/* Category Metrics */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Detalle por Categorías</CardTitle>
                <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="contract" className="text-xs px-3">Contrato</TabsTrigger>
                    <TabsTrigger value="activity" className="text-xs px-3">Actividad</TabsTrigger>
                    <TabsTrigger value="responsible" className="text-xs px-3">Responsable</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <CategoryMetricsPanel scores={categoryScores} groupBy={groupBy} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Member Performance Modal */}
      <MemberPerformanceModal
        open={memberModalOpen}
        onOpenChange={setMemberModalOpen}
        member={selectedMember}
        rank={selectedMemberRank}
        allScores={categoryScores}
        filterLabel={getFilterLabel()}
      />
    </div>
  );
}
