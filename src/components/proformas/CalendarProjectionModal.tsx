import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, List, Grid3X3, CalendarDays, CalendarRange } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ProformaItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface ServiceProjection {
  id: string;
  descripcion: string;
  color: string;
  fechaInicio: Date | undefined;
  fechaTermino: Date | undefined;
  dias: number;
  meses: number;
  anos: number;
  fechaPago: number;
  cicloPago: "unico" | "mensual" | "anual";
  nroCuotas: number;
  pago: number;
  total: number;
  dividirEnCuotas: boolean; // Toggle: si true divide total/cuotas, si false usa total por cuota
}

export interface PaymentScheduleItem {
  cuota: number;
  fecha: Date;
  servicio: string;
  servicioId: string;
  color: string;
  monto: number;
}

interface CalendarProjectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ProformaItem[];
  onSave: (projection: ServiceProjection[], schedule: PaymentScheduleItem[]) => void;
  initialProjection?: ServiceProjection[];
}


const SERVICE_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-indigo-500",
  "bg-teal-500",
];

type CalendarViewType = "month" | "quarter" | "year" | "summary";

export function CalendarProjectionModal({
  open,
  onOpenChange,
  items,
  onSave,
  initialProjection,
}: CalendarProjectionModalProps) {
  const [projections, setProjections] = useState<ServiceProjection[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarViewType>("month");

  useEffect(() => {
    if (open && items.length > 0) {
      const today = new Date();
      if (initialProjection && initialProjection.length > 0) {
        setProjections(initialProjection.map(p => ({
          ...p,
          fechaInicio: p.fechaInicio ? new Date(p.fechaInicio) : today,
          fechaTermino: p.fechaTermino ? new Date(p.fechaTermino) : undefined,
          dividirEnCuotas: p.dividirEnCuotas !== undefined ? p.dividirEnCuotas : true,
        })));
      } else {
        const validItems = items.filter(item => item.descripcion.trim() !== "");
        const newProjections = validItems.map((item, index) => ({
          id: `service-${index}`,
          descripcion: item.descripcion,
          color: SERVICE_COLORS[index % SERVICE_COLORS.length],
          fechaInicio: today,
          fechaTermino: undefined,
          dias: 0,
          meses: 0,
          anos: 0,
          fechaPago: today.getDate(),
          cicloPago: "mensual" as const,
          nroCuotas: 1,
          pago: item.subtotal,
          total: item.subtotal,
          dividirEnCuotas: true,
        }));
        setProjections(newProjections);
      }
    }
  }, [open, items, initialProjection]);

  const calculateDaysMonthsYears = (fechaInicio: Date | undefined, fechaTermino: Date | undefined) => {
    if (!fechaInicio || !fechaTermino) return { dias: 0, meses: 0, anos: 0 };
    const dias = differenceInDays(fechaTermino, fechaInicio);
    const meses = dias / 30;
    const anos = dias / 365;
    return { dias, meses: Math.round(meses * 100) / 100, anos: Math.round(anos * 100) / 100 };
  };

  const handleProjectionChange = (
    index: number,
    field: keyof ServiceProjection,
    value: any
  ) => {
    setProjections((prev) => {
      const newProjections = [...prev];
      newProjections[index] = { ...newProjections[index], [field]: value };

      if (field === "fechaInicio" || field === "fechaTermino") {
        const { dias, meses, anos } = calculateDaysMonthsYears(
          newProjections[index].fechaInicio,
          newProjections[index].fechaTermino
        );
        newProjections[index].dias = dias;
        newProjections[index].meses = meses;
        newProjections[index].anos = anos;

        if (newProjections[index].cicloPago === "mensual") {
          newProjections[index].nroCuotas = Math.max(1, Math.ceil(meses));
        } else if (newProjections[index].cicloPago === "anual") {
          newProjections[index].nroCuotas = Math.max(1, Math.ceil(anos));
        } else {
          newProjections[index].nroCuotas = 1;
        }

        // Recalcular total basado en dividirEnCuotas
        if (newProjections[index].dividirEnCuotas) {
          newProjections[index].total = newProjections[index].pago;
        } else {
          newProjections[index].total = newProjections[index].pago * newProjections[index].nroCuotas;
        }
      }

      if (field === "cicloPago") {
        const { meses, anos } = newProjections[index];
        if (value === "mensual") {
          newProjections[index].nroCuotas = Math.max(1, Math.ceil(meses));
        } else if (value === "anual") {
          newProjections[index].nroCuotas = Math.max(1, Math.ceil(anos));
        } else {
          newProjections[index].nroCuotas = 1;
        }
        // Recalcular total basado en dividirEnCuotas
        if (newProjections[index].dividirEnCuotas) {
          newProjections[index].total = newProjections[index].pago;
        } else {
          newProjections[index].total = newProjections[index].pago * newProjections[index].nroCuotas;
        }
      }

      // Cuando cambia nroCuotas y el ciclo es mensual, calcular fecha término
      if (field === "nroCuotas") {
        const cuotas = Number(value);
        if (newProjections[index].cicloPago === "mensual" && newProjections[index].fechaInicio) {
          const nuevaFechaTermino = addMonths(newProjections[index].fechaInicio!, cuotas);
          newProjections[index].fechaTermino = nuevaFechaTermino;
          const { dias, meses, anos } = calculateDaysMonthsYears(
            newProjections[index].fechaInicio,
            nuevaFechaTermino
          );
          newProjections[index].dias = dias;
          newProjections[index].meses = meses;
          newProjections[index].anos = anos;
        } else if (newProjections[index].cicloPago === "anual" && newProjections[index].fechaInicio) {
          const nuevaFechaTermino = addMonths(newProjections[index].fechaInicio!, cuotas * 12);
          newProjections[index].fechaTermino = nuevaFechaTermino;
          const { dias, meses, anos } = calculateDaysMonthsYears(
            newProjections[index].fechaInicio,
            nuevaFechaTermino
          );
          newProjections[index].dias = dias;
          newProjections[index].meses = meses;
          newProjections[index].anos = anos;
        }
        
        if (newProjections[index].dividirEnCuotas) {
          newProjections[index].total = newProjections[index].pago;
        } else {
          newProjections[index].total = newProjections[index].pago * cuotas;
        }
      }
      
      if (field === "pago") {
        if (newProjections[index].dividirEnCuotas) {
          newProjections[index].total = newProjections[index].pago;
        } else {
          newProjections[index].total = newProjections[index].pago * newProjections[index].nroCuotas;
        }
      }

      if (field === "dividirEnCuotas") {
        if (value) {
          newProjections[index].total = newProjections[index].pago;
        } else {
          newProjections[index].total = newProjections[index].pago * newProjections[index].nroCuotas;
        }
      }

      return newProjections;
    });
  };

  // Calcular monto por cuota según el toggle
  const getMontoPerCuota = (proj: ServiceProjection) => {
    if (proj.dividirEnCuotas) {
      return proj.pago / proj.nroCuotas; // Divide el total entre cuotas
    }
    return proj.pago; // Usa el pago completo por cada cuota
  };

  // Generate payment schedule with cuota numbers
  const paymentSchedule = useMemo(() => {
    const schedule: PaymentScheduleItem[] = [];

    projections.forEach((proj) => {
      if (!proj.fechaInicio || !proj.fechaTermino) return;

      // Calcular el monto por cuota según el toggle
      const montoPorCuota = proj.dividirEnCuotas 
        ? proj.pago / proj.nroCuotas 
        : proj.pago;

      if (proj.cicloPago === "unico") {
        schedule.push({
          cuota: 1,
          fecha: proj.fechaInicio,
          servicio: proj.descripcion,
          servicioId: proj.id,
          color: proj.color,
          monto: proj.pago,
        });
      } else if (proj.cicloPago === "mensual") {
        let currentDate = new Date(proj.fechaInicio);
        currentDate.setDate(proj.fechaPago);
        // Generar exactamente el número de cuotas indicado, sin depender de fechaTermino
        for (let i = 0; i < proj.nroCuotas; i++) {
          const paymentDate = addMonths(currentDate, i);
          schedule.push({
            cuota: i + 1,
            fecha: paymentDate,
            servicio: proj.descripcion,
            servicioId: proj.id,
            color: proj.color,
            monto: montoPorCuota,
          });
        }
      } else if (proj.cicloPago === "anual") {
        let currentDate = new Date(proj.fechaInicio);
        currentDate.setDate(proj.fechaPago);
        // Generar exactamente el número de cuotas indicado, sin depender de fechaTermino
        for (let i = 0; i < proj.nroCuotas; i++) {
          const paymentDate = addMonths(currentDate, i * 12);
          schedule.push({
            cuota: i + 1,
            fecha: paymentDate,
            servicio: proj.descripcion,
            servicioId: proj.id,
            color: proj.color,
            monto: montoPorCuota,
          });
        }
      }
    });

    return schedule.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  }, [projections]);

  // Group payments by date for calendar
  const paymentsByDate = useMemo(() => {
    const grouped: { [key: string]: PaymentScheduleItem[] } = {};
    paymentSchedule.forEach((item) => {
      const key = format(item.fecha, "yyyy-MM-dd");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  }, [paymentSchedule]);

  const getMonthsToDisplay = () => {
    switch (calendarView) {
      case "quarter":
        return [currentMonth, addMonths(currentMonth, 1), addMonths(currentMonth, 2)];
      case "year":
        return Array.from({ length: 12 }, (_, i) => addMonths(startOfMonth(new Date(currentMonth.getFullYear(), 0, 1)), i));
      default:
        return [currentMonth];
    }
  };

  const handleSave = () => {
    onSave(projections, paymentSchedule);
    onOpenChange(false);
  };

  const totalGeneral = projections.reduce((sum, p) => sum + p.total, 0);

  const renderMonthCalendar = (month: Date, compact: boolean = false) => {
    const days = eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    });

    return (
      <div className={cn("border rounded-lg overflow-hidden", compact ? "text-[10px]" : "")}>
        <div className="bg-muted/30 p-2 text-center font-semibold capitalize border-b">
          {format(month, "MMMM yyyy", { locale: es })}
        </div>
        <div className="p-1">
          <div className={cn("grid grid-cols-7 gap-0.5 text-center font-medium text-muted-foreground mb-1", compact ? "text-[9px]" : "text-xs")}>
            <div>D</div>
            <div>L</div>
            <div>M</div>
            <div>M</div>
            <div>J</div>
            <div>V</div>
            <div>S</div>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: days[0]?.getDay() || 0 }).map((_, i) => (
              <div key={`empty-${i}`} className={cn(compact ? "h-6" : "min-h-[60px]")} />
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const payments = paymentsByDate[key];
              const isToday = key === format(new Date(), "yyyy-MM-dd");

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border rounded p-0.5",
                    compact ? "h-6" : "min-h-[60px]",
                    isToday && "bg-primary/10 border-primary",
                    !isSameMonth(day, month) && "opacity-50"
                  )}
                >
                  <div className={cn("font-medium", isToday && "text-primary", compact ? "text-[9px]" : "text-xs")}>
                    {format(day, "d")}
                  </div>
                  {payments && !compact && (
                    <div className="space-y-0.5 mt-0.5">
                      {payments.map((p, idx) => (
                        <div
                          key={`${p.servicioId}-${idx}`}
                          className={cn("text-white px-0.5 rounded text-[9px] truncate", p.color)}
                          title={`${p.servicio} - Cuota ${p.cuota}: S/ ${p.monto.toFixed(2)}`}
                        >
                          C{p.cuota}: S/{p.monto.toFixed(0)}
                        </div>
                      ))}
                    </div>
                  )}
                  {payments && compact && (
                    <div className="flex gap-0.5 flex-wrap">
                      {payments.map((p, idx) => (
                        <div
                          key={`${p.servicioId}-${idx}`}
                          className={cn("w-1.5 h-1.5 rounded-full", p.color)}
                          title={`${p.servicio} - Cuota ${p.cuota}: S/ ${p.monto.toFixed(2)}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryTable = () => (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-[300px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-[60px]">Cuota</TableHead>
              <TableHead className="w-[120px]">Fecha Pago</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead className="w-[100px] text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentSchedule.map((item, idx) => (
              <TableRow key={`${item.servicioId}-${item.cuota}-${idx}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
                    {item.cuota}
                  </div>
                </TableCell>
                <TableCell>{format(item.fecha, "dd/MM/yyyy")}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={item.servicio}>
                  {item.servicio}
                </TableCell>
                <TableCell className="text-right font-medium">S/ {item.monto.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t bg-muted/30 p-3 flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          Total de cuotas: {paymentSchedule.length}
        </span>
        <span className="font-bold">
          Total: S/ {paymentSchedule.reduce((sum, p) => sum + p.monto, 0).toFixed(2)}
        </span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Proyección de Calendario
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Services Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[30vh]">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Servicio</th>
                    <th className="text-left p-2 font-medium w-[130px]">Fecha Inicio</th>
                    <th className="text-left p-2 font-medium w-[130px]">Fecha Término</th>
                    <th className="text-center p-2 font-medium w-[60px]">Días</th>
                    <th className="text-center p-2 font-medium w-[60px]">Meses</th>
                    <th className="text-center p-2 font-medium w-[60px]">Años</th>
                    <th className="text-center p-2 font-medium w-[80px]">Día Pago</th>
                    <th className="text-left p-2 font-medium w-[120px]">Ciclo</th>
                    <th className="text-center p-2 font-medium w-[80px]">N° Cuotas</th>
                    <th className="text-center p-2 font-medium w-[80px]" title="Si está activado, divide el total entre las cuotas. Si no, cada cuota paga el monto completo.">Dividir</th>
                    <th className="text-right p-2 font-medium w-[100px]">Monto Serv.</th>
                    <th className="text-right p-2 font-medium w-[100px]">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projections.map((proj, index) => (
                    <tr key={proj.id} className="hover:bg-muted/30">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", proj.color)} />
                          <span className="truncate max-w-[200px]" title={proj.descripcion}>
                            {proj.descripcion}
                          </span>
                        </div>
                      </td>
                      <td className="p-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "w-full justify-start text-left font-normal h-8 text-xs",
                                !proj.fechaInicio && "text-muted-foreground"
                              )}
                            >
                              {proj.fechaInicio ? format(proj.fechaInicio, "dd/MM/yyyy") : "Seleccionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={proj.fechaInicio}
                              onSelect={(date) => handleProjectionChange(index, "fechaInicio", date)}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td className="p-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "w-full justify-start text-left font-normal h-8 text-xs",
                                !proj.fechaTermino && "text-muted-foreground"
                              )}
                            >
                              {proj.fechaTermino ? format(proj.fechaTermino, "dd/MM/yyyy") : "Seleccionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={proj.fechaTermino}
                              onSelect={(date) => handleProjectionChange(index, "fechaTermino", date)}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td className="p-2 text-center text-muted-foreground">{proj.dias}</td>
                      <td className="p-2 text-center text-muted-foreground">{proj.meses}</td>
                      <td className="p-2 text-center text-muted-foreground">{proj.anos}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={1}
                          max={28}
                          value={proj.fechaPago}
                          onChange={(e) => handleProjectionChange(index, "fechaPago", parseInt(e.target.value) || 1)}
                          className="h-8 text-xs text-center w-full"
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={proj.cicloPago}
                          onValueChange={(v) => handleProjectionChange(index, "cicloPago", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unico">Único Pago</SelectItem>
                            <SelectItem value="mensual">Mensual</SelectItem>
                            <SelectItem value="anual">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={1}
                          value={proj.nroCuotas}
                          onChange={(e) => handleProjectionChange(index, "nroCuotas", parseInt(e.target.value) || 1)}
                          className="h-8 text-xs text-center w-full"
                          disabled={proj.cicloPago === "unico"}
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={proj.dividirEnCuotas}
                            onCheckedChange={(checked) => handleProjectionChange(index, "dividirEnCuotas", checked)}
                            disabled={proj.cicloPago === "unico"}
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={proj.pago}
                          onChange={(e) => handleProjectionChange(index, "pago", parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right w-full"
                        />
                      </td>
                      <td className="p-2 text-right font-medium">
                        S/ {proj.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/50 border-t-2">
                  <tr>
                    <td colSpan={11} className="p-2 text-right font-semibold">Total General:</td>
                    <td className="p-2 text-right font-bold text-lg">S/ {totalGeneral.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Calendar View with Tabs */}
          <div className="border rounded-lg flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                {calendarView !== "summary" && calendarView !== "year" && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, calendarView === "quarter" ? -3 : -1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold capitalize min-w-[150px] text-center">
                      {format(currentMonth, "MMMM yyyy", { locale: es })}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, calendarView === "quarter" ? 3 : 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              
              <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as CalendarViewType)}>
                <TabsList>
                  <TabsTrigger value="month" className="gap-1">
                    <CalendarDays className="h-4 w-4" />
                    Mes
                  </TabsTrigger>
                  <TabsTrigger value="quarter" className="gap-1">
                    <Grid3X3 className="h-4 w-4" />
                    3 Meses
                  </TabsTrigger>
                  <TabsTrigger value="year" className="gap-1">
                    <CalendarRange className="h-4 w-4" />
                    Anual
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="gap-1">
                    <List className="h-4 w-4" />
                    Resumen
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-auto p-3">
              {calendarView === "summary" ? (
                renderSummaryTable()
              ) : calendarView === "year" ? (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {getMonthsToDisplay().map((month, idx) => (
                    <div key={idx}>{renderMonthCalendar(month, true)}</div>
                  ))}
                </div>
              ) : calendarView === "quarter" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {getMonthsToDisplay().map((month, idx) => (
                    <div key={idx}>{renderMonthCalendar(month, false)}</div>
                  ))}
                </div>
              ) : (
                renderMonthCalendar(currentMonth, false)
              )}
            </div>

            {/* Legend */}
            {calendarView !== "summary" && (
              <div className="border-t p-3 bg-muted/20">
                <div className="flex flex-wrap gap-3">
                  {projections.map((proj) => (
                    <div key={proj.id} className="flex items-center gap-1.5 text-xs">
                      <div className={cn("w-3 h-3 rounded-full", proj.color)} />
                      <span className="truncate max-w-[150px]">{proj.descripcion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar Proyección
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
