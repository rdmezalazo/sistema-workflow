import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePaymentNotifications } from "@/hooks/usePaymentNotifications";

interface UnifiedPayment {
  id: string;
  contrato_id: string;
  monto: number;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  status: "pendiente" | "pagado" | "vencido" | "parcial" | "proyectado";
  metodo_pago: string | null;
  referencia: string | null;
  notas: string | null;
  servicio: string | null;
  cuota: number | null;
  glosa: string | null;
  isProjected: boolean;
  contrato: {
    numero: string;
    moneda: string;
    status: string;
    descripcion: string;
    cliente: {
      razon_social: string;
      codigo: string;
    };
  };
}

interface PaymentCalendarViewProps {
  payments: UnifiedPayment[];
  onPaymentClick: (payment: UnifiedPayment) => void;
  formatCurrency: (amount: number, currency: string) => string;
}

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  pendiente: { label: "Pendiente", bgColor: "bg-amber-100", textColor: "text-amber-800" },
  pagado: { label: "Pagado", bgColor: "bg-green-100", textColor: "text-green-800" },
  vencido: { label: "Vencido", bgColor: "bg-red-100", textColor: "text-red-800" },
  parcial: { label: "Parcial", bgColor: "bg-blue-100", textColor: "text-blue-800" },
  proyectado: { label: "Proyectado", bgColor: "bg-purple-100", textColor: "text-purple-800" },
};

export function PaymentCalendarView({ payments, onPaymentClick, formatCurrency }: PaymentCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { getPaymentNotificationStatus } = usePaymentNotifications();

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const paymentsByDate = useMemo(() => {
    const map: Record<string, UnifiedPayment[]> = {};
    payments.forEach((payment) => {
      const dateKey = payment.fecha_vencimiento;
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(payment);
    });
    return map;
  }, [payments]);

  const getDayPayments = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return paymentsByDate[dateKey] || [];
  };

  const getTotalForDay = (dayPayments: UnifiedPayment[]) => {
    return dayPayments.reduce((sum, p) => sum + (p.monto || 0), 0);
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h3>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
            <div
              key={day}
              className="py-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before start of month */}
          {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => (
            <div key={`empty-start-${i}`} className="h-28 border-t border-r bg-muted/20" />
          ))}

          {/* Days of month */}
          {calendarDays.map((date) => {
            const dayPayments = getDayPayments(date);
            const isToday = isSameDay(date, new Date());
            const total = getTotalForDay(dayPayments);

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "h-28 border-t border-r p-1 overflow-hidden transition-colors",
                  isToday && "bg-primary/5",
                  !isSameMonth(date, currentMonth) && "bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full",
                      isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(date, "d")}
                  </span>
                  {dayPayments.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1 h-5">
                      {dayPayments.length}
                    </Badge>
                  )}
                </div>

                {/* Payment items */}
                <TooltipProvider>
                  <div className="space-y-0.5 overflow-y-auto max-h-[70px]">
                    {dayPayments.slice(0, 3).map((payment) => {
                      const notifStatus = getPaymentNotificationStatus(
                        payment.fecha_vencimiento,
                        payment.status
                      );
                      const config = statusConfig[payment.status];

                      return (
                        <Tooltip key={payment.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onPaymentClick(payment)}
                              className={cn(
                                "w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1",
                                config.bgColor,
                                config.textColor,
                                "hover:opacity-80 transition-opacity"
                              )}
                              style={
                                notifStatus.shouldNotify
                                  ? {
                                      borderLeft: `3px solid ${notifStatus.color}`,
                                    }
                                  : undefined
                              }
                            >
                              {notifStatus.shouldNotify && (
                                <Bell
                                  className="h-2.5 w-2.5 flex-shrink-0"
                                  style={{ color: notifStatus.color }}
                                />
                              )}
                              <span className="truncate">
                                {payment.contrato?.cliente?.razon_social?.split(" ")[0] || payment.contrato?.numero}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium">
                                {payment.contrato?.cliente?.razon_social}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Contrato: {payment.contrato?.numero}
                              </p>
                              <p className="text-sm font-semibold">
                                {formatCurrency(payment.monto, payment.contrato?.moneda || "PEN")}
                              </p>
                              <Badge className={cn("text-[10px]", config.bgColor, config.textColor)}>
                                {config.label}
                                {payment.isProjected && " (Proy.)"}
                              </Badge>
                              {notifStatus.shouldNotify && (
                                <p className="text-xs flex items-center gap-1" style={{ color: notifStatus.color }}>
                                  <Bell className="h-3 w-3" />
                                  {notifStatus.type === "before_due" ? "Por vencer" : "Vencido"}
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {dayPayments.length > 3 && (
                      <p className="text-[10px] text-muted-foreground px-1">
                        +{dayPayments.length - 3} más
                      </p>
                    )}
                  </div>
                </TooltipProvider>

                {/* Day total */}
                {total > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1 px-1 font-medium">
                    Total: S/ {total.toFixed(0)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty cells for days after end of month */}
          {Array.from({ length: 6 - calendarDays[calendarDays.length - 1].getDay() }).map(
            (_, i) => (
              <div key={`empty-end-${i}`} className="h-28 border-t border-r bg-muted/20" />
            )
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        {Object.entries(statusConfig).map(([key, value]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn("h-3 w-3 rounded", value.bgColor)} />
            <span className="text-muted-foreground">{value.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
