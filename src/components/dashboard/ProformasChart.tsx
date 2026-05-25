import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FileText, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useSedeContext } from "@/hooks/useSedeContext";

interface ProformaStats {
  name: string;
  value: number;
  color: string;
}

const chartConfig = {
  borrador: { label: "Borrador", color: "hsl(var(--chart-5))" },
  enviada: { label: "Enviada", color: "hsl(var(--chart-4))" },
  aprobada: { label: "Aprobada", color: "hsl(var(--chart-3))" },
  rechazada: { label: "Rechazada", color: "hsl(var(--chart-1))" },
  facturada: { label: "Facturada", color: "hsl(var(--chart-2))" },
};

export function ProformasChart() {
  const { activeSedeId } = useSedeContext();
  const [data, setData] = useState<ProformaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProformasData();
  }, [activeSedeId]);

  const fetchProformasData = async () => {
    try {
      const { data: proformas } = await supabase
        .from("proformas")
        .select("status, contrato_id, sede_id");

      if (!proformas) {
        setLoading(false);
        return;
      }

      const statusCounts: Record<string, number> = {
        borrador: 0,
        enviada: 0,
        aprobada: 0,
        rechazada: 0,
        facturada: 0,
      };

      const filteredProformas = proformas.filter((p) => !activeSedeId || p.sede_id === activeSedeId);

      filteredProformas.forEach(p => {
        if (statusCounts[p.status] !== undefined) {
          statusCounts[p.status]++;
        }
      });

      const chartData: ProformaStats[] = [
        { name: "Borrador", value: statusCounts.borrador, color: "hsl(var(--chart-5))" },
        { name: "Enviada", value: statusCounts.enviada, color: "hsl(var(--chart-4))" },
        { name: "Aprobada", value: statusCounts.aprobada, color: "hsl(var(--chart-3))" },
        { name: "Rechazada", value: statusCounts.rechazada, color: "hsl(var(--chart-1))" },
        { name: "Facturada", value: statusCounts.facturada, color: "hsl(var(--chart-2))" },
      ].filter(d => d.value > 0);

      setData(chartData);
      setTotal(filteredProformas.length);

      // Calculate conversion rate
      const withContract = filteredProformas.filter(p => p.contrato_id).length;
      setConversionRate(filteredProformas.length > 0 ? Math.round((withContract / filteredProformas.length) * 100) : 0);
    } catch (error) {
      console.error("Error fetching proformas data:", error);
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
    <Card 
      className="border-border/50 hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
      onClick={() => navigate("/proformas")}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Proformas</CardTitle>
              <p className="text-xs text-muted-foreground">Por estado</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">{conversionRate}% conversión</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4">
          <ChartContainer config={chartConfig} className="h-[160px] w-[160px]">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
          <div className="flex-1 space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Ver todas</span>
          <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}
