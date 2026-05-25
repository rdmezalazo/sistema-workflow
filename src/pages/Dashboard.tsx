import {
  Users,
  FileCheck,
  FileText,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentContracts } from "@/components/dashboard/RecentContracts";
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments";
import { TeamPerformance } from "@/components/dashboard/TeamPerformance";
import { WorkflowPerformance } from "@/components/dashboard/WorkflowPerformance";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { IncomeChart } from "@/components/dashboard/IncomeChart";
import { ContractsChart } from "@/components/dashboard/ContractsChart";
import { ProformasChart } from "@/components/dashboard/ProformasChart";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Button } from "@/components/ui/button";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { useSedeContext } from "@/hooks/useSedeContext";
import { BlurredValue, BlurredSection } from "@/components/ui/BlurredValue";
import { exportRowsToExcel } from "@/lib/exportToExcel";
import { Download } from "lucide-react";

const Dashboard = () => {
  const { stats, recentContracts, upcomingPayments, teamMembers, loading, userName, refetch } = useDashboardStats();
  const { formatCurrency } = useSystemConfig();
  const { availableSedes, activeSedeId } = useSedeContext();
  const sedeNombre = activeSedeId
    ? availableSedes.find((s) => s.id === activeSedeId)?.nombre
    : availableSedes.length === 1
      ? availableSedes[0].nombre
      : null;

  const formatIngresos = (amount: number) => {
    if (amount >= 1000000) {
      return `S/ ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `S/ ${(amount / 1000).toFixed(1)}K`;
    }
    return `S/ ${amount.toFixed(0)}`;
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Bienvenido de nuevo{userName ? `, ${userName}` : ""}
          </p>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Dashboard{sedeNombre ? ` — ${sedeNombre}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Resumen ejecutivo de tu gestión contable
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const kpiRows = [
                { Indicador: "Clientes Activos", Valor: stats.clientesActivos },
                { Indicador: "Contratos Vigentes", Valor: stats.contratosVigentes },
                { Indicador: "Contratos por Vencer", Valor: stats.contratosPorVencer },
                { Indicador: "Proformas Enviadas", Valor: stats.proformasEnviadas },
                { Indicador: "Ingresos del Mes (S/)", Valor: stats.ingresosMes },
                { Indicador: "Meta Ingresos (S/)", Valor: stats.metaIngresos },
                { Indicador: "Tasa de Conversión (%)", Valor: stats.tasaConversion },
              ];
              exportRowsToExcel(
                kpiRows,
                [
                  { header: "Indicador", accessor: (r) => r.Indicador },
                  { header: "Valor", accessor: (r) => r.Valor },
                ],
                "dashboard_kpis",
                "KPIs"
              );
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-emerald-700">Sistema activo</span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Clickable Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-5">
        <StatCard
          title="Clientes Activos"
          value={stats.clientesActivos}
          subtitle="este mes"
          icon={Users}
          trend={stats.clientesTrend !== 0 ? { value: Math.abs(stats.clientesTrend), isPositive: stats.clientesTrend > 0 } : undefined}
          variant="primary"
          delay={0}
          href="/clientes"
        />
        <StatCard
          title="Contratos Vigentes"
          value={stats.contratosVigentes}
          subtitle={`${stats.contratosPorVencer} por vencer`}
          icon={FileCheck}
          trend={stats.contratosTrend !== 0 ? { value: stats.contratosTrend, isPositive: true } : undefined}
          delay={50}
          href="/contratos"
        />
        <StatCard
          title="Proformas"
          value={stats.proformasEnviadas}
          subtitle="enviadas"
          icon={FileText}
          trend={stats.proformasTrend !== 0 ? { value: stats.proformasTrend, isPositive: true } : undefined}
          delay={100}
          href="/proformas"
        />
        <StatCard
          title="Ingresos"
          value={formatIngresos(stats.ingresosMes)}
          subtitle={`Meta: ${formatIngresos(stats.metaIngresos)}`}
          icon={(props: any) => (
            <span
              {...props}
              className={`flex items-center justify-center font-bold ${props.className ?? ""}`}
              style={{ fontSize: "0.95em", lineHeight: 1 }}
            >
              S/
            </span>
          )}
          variant="secondary"
          delay={150}
          href="/calendario-pagos"
          isFinancial
        />
        <StatCard
          title="Conversión"
          value={`${stats.tasaConversion}%`}
          subtitle="proforma → contrato"
          icon={TrendingUp}
          trend={stats.conversionTrend !== 0 ? { value: stats.conversionTrend, isPositive: true } : undefined}
          delay={200}
          href="/proformas"
        />
        <StatCard
          title="Pagos Vencidos"
          value={stats.pagosVencidos}
          subtitle={formatIngresos(stats.montoPagosVencidos)}
          icon={AlertTriangle}
          variant="warning"
          delay={250}
          href="/calendario-pagos"
          isFinancial
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BlurredSection className="lg:col-span-2">
          <IncomeChart />
        </BlurredSection>
        <ProformasChart />
      </div>

      {/* Contracts Chart and Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ContractsChart />
        </div>
        <QuickActions />
      </div>

      {/* Recent Contracts */}
      <RecentContracts contracts={recentContracts} loading={loading} />

      {/* Workflow & Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkflowPerformance />
        <UpcomingPayments payments={upcomingPayments} loading={loading} />
      </div>

      {/* Team Performance */}
      <TeamPerformance members={teamMembers} loading={loading} />
    </div>
  );
};

export default Dashboard;
