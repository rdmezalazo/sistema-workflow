import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { BlurredValue } from "@/components/ui/BlurredValue";

interface Payment {
  id: string;
  cliente: string;
  monto: number;
  fechaVencimiento: string;
  diasRestantes: number;
  status: "pending" | "overdue" | "upcoming";
}

interface UpcomingPaymentsProps {
  payments: Payment[];
  loading?: boolean;
}

const statusConfig = {
  pending: {
    badge: "status-progress",
    label: "Pendiente",
    dot: "bg-blue-500",
  },
  overdue: {
    badge: "status-overdue",
    label: "Vencido",
    dot: "bg-red-500",
  },
  upcoming: {
    badge: "status-pending",
    label: "Próximo",
    dot: "bg-amber-500",
  },
};

export function UpcomingPayments({ payments, loading }: UpcomingPaymentsProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden animate-slide-up shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/10 ring-1 ring-secondary/20">
            <CalendarDays className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Pagos Próximos
            </h3>
            <p className="text-sm text-muted-foreground">Próximos 7 días</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground">No hay pagos pendientes</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group cursor-pointer"
              onClick={() => navigate("/calendario-pagos")}
            >
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    statusConfig[payment.status].dot
                  )} />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm flex items-center gap-2">
                    {payment.cliente}
                    {payment.status === "overdue" && (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vence: {payment.fechaVencimiento}
                    {payment.diasRestantes < 0 && (
                      <span className="text-destructive ml-1">
                        ({Math.abs(payment.diasRestantes)} días vencido)
                      </span>
                    )}
                    {payment.diasRestantes >= 0 && payment.diasRestantes <= 3 && (
                      <span className="text-amber-600 ml-1">
                        (en {payment.diasRestantes} días)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <BlurredValue>
                    <p className="font-bold text-foreground">
                      S/ {payment.monto.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                  </BlurredValue>
                  <span className={cn("status-badge text-xs mt-1", statusConfig[payment.status].badge)}>
                    {statusConfig[payment.status].label}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-muted/20 border-t border-border/50">
        <button 
          className="text-sm text-primary font-semibold hover:text-primary/80 transition-colors flex items-center gap-2 group"
          onClick={() => navigate("/calendario-pagos")}
        >
          Ver calendario completo
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
