import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, parseISO, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useSedeContext } from "@/hooks/useSedeContext";

interface MonthlyData {
  month: string;
  ingresos: number;
  meta: number;
}

const chartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "hsl(var(--chart-1))",
  },
  meta: {
    label: "Meta",
    color: "hsl(var(--chart-5))",
  },
};

export function IncomeChart() {
  const { activeSedeId } = useSedeContext();
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [trend, setTrend] = useState(0);

  useEffect(() => {
    fetchIncomeData();
  }, [activeSedeId]);

  const fetchIncomeData = async () => {
    try {
      const now = new Date();
      const monthsData: MonthlyData[] = [];
      const meta = 150000;

      // Get last 6 months of payments
      const { data: pagos } = await supabase
        .from("pagos")
        .select("monto, fecha_pago, status, sede_id, contratos(sede_id)")
        .eq("status", "pagado")
        .not("fecha_pago", "is", null);

      const filteredPagos = (pagos || []).filter((p: any) => !activeSedeId || p.sede_id === activeSedeId || p.contratos?.sede_id === activeSedeId);

      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthPayments = filteredPagos.filter(p => {
          if (!p.fecha_pago) return false;
          const paymentDate = parseISO(p.fecha_pago);
          return isWithinInterval(paymentDate, { start: monthStart, end: monthEnd });
        });

        const totalMonth = monthPayments.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

        monthsData.push({
          month: format(monthDate, "MMM", { locale: es }),
          ingresos: totalMonth,
          meta,
        });
      }

      setData(monthsData);

      // Calculate totals and trend
      const currentMonth = monthsData[monthsData.length - 1]?.ingresos || 0;
      const previousMonth = monthsData[monthsData.length - 2]?.ingresos || 0;
      const total = monthsData.reduce((sum, m) => sum + m.ingresos, 0);
      setTotalIngresos(total);

      if (previousMonth > 0) {
        setTrend(Math.round(((currentMonth - previousMonth) / previousMonth) * 100));
      }
    } catch (error) {
      console.error("Error fetching income data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `S/ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `S/ ${(value / 1000).toFixed(1)}K`;
    return `S/ ${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Ingresos</CardTitle>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{formatCurrency(totalIngresos)}</p>
            {trend !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? "text-emerald-600" : "text-red-600"}`}>
                <TrendingUp className={`h-3 w-3 ${trend < 0 ? "rotate-180" : ""}`} />
                {trend > 0 ? "+" : ""}{trend}% vs mes anterior
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              width={60}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="meta"
              stroke="hsl(var(--chart-5))"
              strokeDasharray="5 5"
              strokeWidth={2}
              fill="none"
            />
            <Area
              type="monotone"
              dataKey="ingresos"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#incomeGradient)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
