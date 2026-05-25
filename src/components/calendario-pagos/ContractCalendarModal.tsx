import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CheckCircle, Clock, AlertTriangle, FileText, Calendar, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, parseLocalDate } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

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

interface ContractCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractPayments: UnifiedPayment[];
  formatCurrency: (amount: number, currency: string) => string;
}

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; icon: typeof CheckCircle }> = {
  pendiente: { label: "Pendiente", bgColor: "bg-amber-500", textColor: "text-amber-800", icon: Clock },
  pagado: { label: "Pagado", bgColor: "bg-green-500", textColor: "text-green-800", icon: CheckCircle },
  vencido: { label: "Vencido", bgColor: "bg-red-500", textColor: "text-red-800", icon: AlertTriangle },
  parcial: { label: "Parcial", bgColor: "bg-blue-500", textColor: "text-blue-800", icon: Clock },
  proyectado: { label: "Proyectado", bgColor: "bg-purple-500", textColor: "text-purple-800", icon: FileText },
};

// Sort payments by date and assign sequential cuota numbers
function getPaymentWithCuotaNumber(payments: UnifiedPayment[]): (UnifiedPayment & { displayCuota: number })[] {
  return [...payments]
    .sort((a, b) => parseLocalDate(a.fecha_vencimiento).getTime() - parseLocalDate(b.fecha_vencimiento).getTime())
    .map((payment, index) => ({
      ...payment,
      displayCuota: payment.cuota ?? index + 1
    }));
}

export function ContractCalendarModal({
  open,
  onOpenChange,
  contractPayments,
  formatCurrency,
}: ContractCalendarModalProps) {
  const contractInfo = contractPayments[0]?.contrato;
  
  // Payments sorted with cuota numbers
  const sortedPayments = useMemo(() => getPaymentWithCuotaNumber(contractPayments), [contractPayments]);
  
  // Find the month range from all payments
  const paymentDates = sortedPayments.map(p => parseLocalDate(p.fecha_vencimiento));
  const firstPaymentDate = paymentDates.length > 0 
    ? new Date(Math.min(...paymentDates.map(d => d.getTime())))
    : new Date();
  
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(firstPaymentDate));
  const [monthsToShow, setMonthsToShow] = useState(1);

  // Generate array of months to display
  const monthsArray = useMemo(() => {
    return Array.from({ length: monthsToShow }, (_, i) => addMonths(currentMonth, i));
  }, [currentMonth, monthsToShow]);

  const paymentsByDate = useMemo(() => {
    const map: Record<string, (UnifiedPayment & { displayCuota: number })[]> = {};
    sortedPayments.forEach((payment) => {
      const dateKey = payment.fecha_vencimiento.split('T')[0];
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(payment);
    });
    return map;
  }, [sortedPayments]);

  const getDayPayment = (date: Date): (UnifiedPayment & { displayCuota: number }) | null => {
    const dateKey = format(date, "yyyy-MM-dd");
    const payments = paymentsByDate[dateKey];
    return payments && payments.length > 0 ? payments[0] : null;
  };

  // Summary statistics
  const stats = useMemo(() => {
    const total = sortedPayments.length;
    const pagados = sortedPayments.filter(p => p.status === "pagado").length;
    const pendientes = sortedPayments.filter(p => p.status === "pendiente").length;
    const vencidos = sortedPayments.filter(p => p.status === "vencido").length;
    const proyectados = sortedPayments.filter(p => p.status === "proyectado").length;
    
    const montoTotal = sortedPayments.reduce((sum, p) => sum + p.monto, 0);
    const montoPagado = sortedPayments.filter(p => p.status === "pagado").reduce((sum, p) => sum + p.monto, 0);
    const montoPendiente = sortedPayments.filter(p => p.status === "pendiente" || p.status === "vencido").reduce((sum, p) => sum + p.monto, 0);
    
    return { total, pagados, pendientes, vencidos, proyectados, montoTotal, montoPagado, montoPendiente };
  }, [sortedPayments]);

  const currency = contractInfo?.moneda || "PEN";

  const renderCalendarMonth = (monthDate: Date) => {
    const calendarDays = eachDayOfInterval({
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate)
    });

    return (
      <div key={monthDate.toISOString()} className="flex-1 min-w-[280px]">
        <h4 className="text-center font-semibold capitalize mb-2 text-sm">
          {format(monthDate, "MMMM yyyy", { locale: es })}
        </h4>
        <div className="border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {["D", "L", "M", "M", "J", "V", "S"].map((day, idx) => (
              <div
                key={`${day}-${idx}`}
                className="py-1 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before start of month */}
            {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => (
              <div key={`empty-start-${i}`} className="h-16 border-t border-r bg-muted/20" />
            ))}

            {/* Days of month */}
            {calendarDays.map((date) => {
              const payment = getDayPayment(date);
              const isToday = isSameDay(date, new Date());
              const config = payment ? statusConfig[payment.status] : null;
              const StatusIcon = config?.icon || Clock;

              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "h-16 border-t border-r p-0.5 transition-colors relative",
                    isToday && "bg-primary/5",
                    !isSameMonth(date, monthDate) && "bg-muted/30"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium h-5 w-5 flex items-center justify-center rounded-full ml-0.5",
                      isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(date, "d")}
                  </span>

                  {/* Payment indicator */}
                  {payment && config && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "absolute inset-0.5 top-6 rounded cursor-pointer transition-all hover:scale-[1.02]",
                              "flex flex-col items-center justify-center text-center",
                              payment.status === "pagado" && "bg-green-100 dark:bg-green-900/40 border border-green-300",
                              payment.status === "pendiente" && "bg-amber-100 dark:bg-amber-900/40 border border-amber-300",
                              payment.status === "vencido" && "bg-red-100 dark:bg-red-900/40 border border-red-300",
                              payment.status === "parcial" && "bg-blue-100 dark:bg-blue-900/40 border border-blue-300",
                              payment.status === "proyectado" && "bg-purple-100 dark:bg-purple-900/40 border border-purple-300"
                            )}
                          >
                            <StatusIcon className={cn("h-3 w-3", config.textColor)} />
                            <span className={cn("text-[9px] font-semibold leading-tight", config.textColor)}>
                              C{payment.displayCuota}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">{config.label} - Cuota {payment.displayCuota}</p>
                            <p className="text-sm font-medium">
                              {formatCurrency(payment.monto, currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.glosa || `Cuota ${payment.displayCuota}`}
                            </p>
                            {payment.fecha_pago && (
                              <p className="text-xs text-green-600">
                                Pagado: {format(parseLocalDate(payment.fecha_pago), "dd MMM yyyy", { locale: es })}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            })}

            {/* Empty cells for days after end of month */}
            {Array.from({ length: 6 - calendarDays[calendarDays.length - 1].getDay() }).map(
              (_, i) => (
                <div key={`empty-end-${i}`} className="h-16 border-t border-r bg-muted/20" />
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <span>Calendario de Pagos</span>
              <span className="text-muted-foreground font-normal ml-2">
                {contractInfo?.numero}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left side - Calendar and Controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Contract Info Header */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-semibold">{contractInfo?.cliente?.razon_social}</p>
                  <p className="text-xs text-muted-foreground">{contractInfo?.cliente?.codigo}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Servicio</p>
                  <p className="text-sm font-medium">{contractInfo?.descripcion || "-"}</p>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2 text-center">
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{stats.pagados}</p>
                <p className="text-[10px] text-green-600 dark:text-green-500">Pagados</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2 text-center">
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{stats.pendientes}</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500">Pendientes</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-2 text-center">
                <p className="text-xl font-bold text-red-700 dark:text-red-400">{stats.vencidos}</p>
                <p className="text-[10px] text-red-600 dark:text-red-500">Vencidos</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-2 text-center">
                <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{stats.proyectados}</p>
                <p className="text-[10px] text-purple-600 dark:text-purple-500">Proyectados</p>
              </div>
            </div>

            {/* Navigation and Months Control */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, monthsToShow))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, monthsToShow))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                <span className="text-xs text-muted-foreground">Meses:</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setMonthsToShow(Math.max(1, monthsToShow - 1))}
                  disabled={monthsToShow <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium w-4 text-center">{monthsToShow}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setMonthsToShow(Math.min(6, monthsToShow + 1))}
                  disabled={monthsToShow >= 6}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Calendar Grids */}
            <div className={cn(
              "grid gap-3",
              monthsToShow === 1 && "grid-cols-1",
              monthsToShow === 2 && "grid-cols-2",
              monthsToShow >= 3 && "grid-cols-3"
            )}>
              {monthsArray.map(renderCalendarMonth)}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs justify-center">
              {Object.entries(statusConfig).map(([key, value]) => {
                const Icon = value.icon;
                return (
                  <div key={key} className="flex items-center gap-1">
                    <div className={cn("h-2.5 w-2.5 rounded", value.bgColor)} />
                    <Icon className={cn("h-3 w-3", value.textColor)} />
                    <span className="text-muted-foreground">{value.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right side - Payment Timeline */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Cronograma de Pagos</h4>
              <Badge variant="secondary" className="text-xs">
                {sortedPayments.length} cuotas
              </Badge>
            </div>
            <Separator />
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {sortedPayments.map((payment) => {
                const config = statusConfig[payment.status];
                const StatusIcon = config?.icon || Clock;
                const dateParts = payment.fecha_vencimiento.split('T')[0].split('-');
                const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                
                return (
                  <div
                    key={payment.id}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg border",
                      payment.status === "pagado" && "bg-green-50 dark:bg-green-950/20 border-green-200",
                      payment.status === "pendiente" && "bg-amber-50 dark:bg-amber-950/20 border-amber-200",
                      payment.status === "vencido" && "bg-red-50 dark:bg-red-950/20 border-red-200",
                      payment.status === "parcial" && "bg-blue-50 dark:bg-blue-950/20 border-blue-200",
                      payment.status === "proyectado" && "bg-purple-50 dark:bg-purple-950/20 border-purple-200"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0",
                        config.bgColor
                      )}>
                        <StatusIcon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          Cuota {payment.displayCuota}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(date, "dd MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {formatCurrency(payment.monto, currency)}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] px-1.5 py-0", config.textColor, 
                          payment.status === "pagado" && "border-green-300 bg-green-100",
                          payment.status === "pendiente" && "border-amber-300 bg-amber-100",
                          payment.status === "vencido" && "border-red-300 bg-red-100",
                          payment.status === "parcial" && "border-blue-300 bg-blue-100",
                          payment.status === "proyectado" && "border-purple-300 bg-purple-100"
                        )}
                      >
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Summary */}
            <Separator />
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Pagado:</span>
                <span className="font-semibold text-green-700">{formatCurrency(stats.montoPagado, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Por Cobrar:</span>
                <span className="font-semibold text-amber-700">{formatCurrency(stats.montoPendiente, currency)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-sm">
                <span className="font-medium">Total Contrato:</span>
                <span className="font-bold">{formatCurrency(stats.montoTotal, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
