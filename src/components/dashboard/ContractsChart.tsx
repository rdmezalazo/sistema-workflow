import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { FileCheck, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, parseISO, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useSedeContext } from "@/hooks/useSedeContext";

interface MonthlyData {
  month: string;
  nuevos: number;
  finalizados: number;
}

const chartConfig = {
  nuevos: {
    label: "Nuevos",
    color: "hsl(var(--chart-1))",
  },
  finalizados: {
    label: "Finalizados",
    color: "hsl(var(--chart-3))",
  },
};

export function ContractsChart() {
  const { activeSedeId } = useSedeContext();
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalContratos, setTotalContratos] = useState(0);

  useEffect(() => {
    fetchContractsData();
  }, [activeSedeId]);

  const fetchContractsData = async () => {
    try {
      const now = new Date();
      const monthsData: MonthlyData[] = [];

      // Get all contracts
      const { data: contratos } = await supabase
        .from("contratos")
        .select("created_at, status, condicion, updated_at, sede_id");

      const filteredContratos = (contratos || []).filter((c) => !activeSedeId || c.sede_id === activeSedeId);

      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const newContracts = filteredContratos.filter(c => {
          const createdAt = parseISO(c.created_at);
          return isWithinInterval(createdAt, { start: monthStart, end: monthEnd }) && 
                 c.status !== 'borrador';
        }).length;

        const finishedContracts = filteredContratos.filter(c => {
          const updatedAt = parseISO(c.updated_at);
          return isWithinInterval(updatedAt, { start: monthStart, end: monthEnd }) && 
                 c.condicion === 'Terminado';
        }).length;

        monthsData.push({
          month: format(monthDate, "MMM", { locale: es }),
          nuevos: newContracts,
          finalizados: finishedContracts,
        });
      }

      setData(monthsData);
      setTotalContratos(filteredContratos.filter(c => c.status !== 'borrador').length);
    } catch (error) {
      console.error("Error fetching contracts data:", error);
    } finally {
      setLoading(false);
    }
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
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10">
              <FileCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Contratos</CardTitle>
              <p className="text-xs text-muted-foreground">Nuevos vs Finalizados</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{totalContratos}</p>
            <p className="text-xs text-muted-foreground">Total activos</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              width={30}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="nuevos" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="finalizados" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[hsl(var(--chart-1))]" />
            <span className="text-xs text-muted-foreground">Nuevos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[hsl(var(--chart-3))]" />
            <span className="text-xs text-muted-foreground">Finalizados</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
