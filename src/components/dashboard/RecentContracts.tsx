import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface RecentContract {
  id: string;
  numero: string;
  cliente: string;
  tipo: string;
  asesor: string;
  fechaInicio: string;
  status: "Vigente" | "Por vencer" | "Vencido";
  progreso: number;
}

interface RecentContractsProps {
  contracts: RecentContract[];
  loading?: boolean;
}

const statusStyles = {
  Vigente: "status-completed",
  "Por vencer": "status-pending",
  Vencido: "status-overdue",
};

const typeStyles: Record<string, string> = {
  Contabilidad: "bg-primary/10 text-primary border-primary/20",
  Trámites: "bg-secondary/15 text-secondary-foreground border-secondary/20",
  Mixto: "bg-violet-100 text-violet-700 border-violet-200",
};

const progressColors = {
  low: "from-red-500 to-orange-500",
  medium: "from-amber-500 to-yellow-500",
  high: "from-emerald-500 to-green-500",
};

const getProgressColor = (progress: number) => {
  if (progress < 40) return progressColors.low;
  if (progress < 70) return progressColors.medium;
  return progressColors.high;
};

export function RecentContracts({ contracts, loading }: RecentContractsProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden animate-slide-up shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 border-b border-border/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Contratos Recientes
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Últimos 5 contratos activos
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 rounded-xl"
          onClick={() => navigate("/contratos")}
        >
          Ver todos
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground">No hay contratos registrados</p>
          <Button 
            variant="link" 
            className="mt-2"
            onClick={() => navigate("/contratos")}
          >
            Crear primer contrato
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-modern">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Contrato
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Cliente
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Tipo
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Asesor
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Estado
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Progreso
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {contracts.map((contract, index) => (
                <tr 
                  key={contract.id} 
                  className="table-row-hover group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="px-6 py-4">
                    <span className="font-semibold text-foreground font-mono text-sm">
                      {contract.numero}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-foreground font-medium">
                      {contract.cliente}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        typeStyles[contract.tipo] || "bg-muted text-muted-foreground"
                      )}
                    >
                      {contract.tipo}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {contract.asesor}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("status-badge", statusStyles[contract.status])}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r transition-all duration-700",
                            getProgressColor(contract.progreso)
                          )}
                          style={{ width: `${contract.progreso}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground min-w-[32px]">
                        {contract.progreso}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg"
                        onClick={() => navigate(`/contratos?view=${contract.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
