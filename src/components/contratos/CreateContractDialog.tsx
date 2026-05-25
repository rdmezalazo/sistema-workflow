import { useState, useEffect, useMemo } from "react";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { 
  FilePlus, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  List, 
  Grid3X3, 
  CalendarDays, 
  CalendarRange,
  Building2,
  CreditCard,
  Loader2,
  Save,
  Plus,
  Trash2,
  Search,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { ServiceSearchInput } from "./ServiceSearchInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatLocalYMD, getInstallmentDate } from "@/lib/paymentSchedule";
import { toast } from "sonner";

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ServiceProjection {
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
  dividirEnCuotas: boolean;
}

interface PaymentScheduleItem {
  cuota: number;
  fecha: Date;
  servicio: string;
  servicioId: string;
  color: string;
  monto: number;
}

interface Cliente {
  id: string;
  razon_social: string;
  codigo: string;
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
];

const SERVICE_TYPES = [
  { value: "contabilidad", label: "Contabilidad" },
  { value: "tramites", label: "Trámites" },
  { value: "auditoria", label: "Auditoría" },
];

type CalendarViewType = "month" | "quarter" | "year" | "summary";

export const CreateContractDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateContractDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarViewType>("month");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  
  // Client selection
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  
  // Contract data
  const [contractData, setContractData] = useState({
    descripcion: "",
    tipo_servicio: "contabilidad",
    moneda: "PEN",
    condicion: "Vigente" as "Vigente" | "Terminado" | "Anulado" | "Suspendido",
    notas: "",
  });
  
  // Projections state
  const [projections, setProjections] = useState<ServiceProjection[]>([]);

  useEffect(() => {
    if (open) {
      fetchClientes();
      resetForm();
    }
  }, [open]);

  const fetchClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, razon_social, codigo")
      .eq("activo", true)
      .order("razon_social");
    
    if (!error && data) {
      setClientes(data);
    }
  };

  const resetForm = () => {
    setContractData({
      descripcion: "",
      tipo_servicio: "contabilidad",
      moneda: "PEN",
      condicion: "Vigente",
      notas: "",
    });
    setSelectedCliente(null);
    setProjections([{
      id: "service-0",
      descripcion: "Servicio",
      color: SERVICE_COLORS[0],
      fechaInicio: new Date(),
      fechaTermino: undefined,
      dias: 0,
      meses: 0,
      anos: 0,
      fechaPago: 15,
      cicloPago: "mensual",
      nroCuotas: 12,
      pago: 0,
      total: 0,
      dividirEnCuotas: true,
    }]);
  };

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
        if (newProjections[index].dividirEnCuotas) {
          newProjections[index].total = newProjections[index].pago;
        } else {
          newProjections[index].total = newProjections[index].pago * newProjections[index].nroCuotas;
        }
      }

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

  const addService = () => {
    const newIndex = projections.length;
    setProjections(prev => [...prev, {
      id: `service-${newIndex}`,
      descripcion: "",
      color: SERVICE_COLORS[newIndex % SERVICE_COLORS.length],
      fechaInicio: new Date(),
      fechaTermino: undefined,
      dias: 0,
      meses: 0,
      anos: 0,
      fechaPago: 15,
      cicloPago: "mensual",
      nroCuotas: 12,
      pago: 0,
      total: 0,
      dividirEnCuotas: true,
    }]);
  };

  const removeService = (index: number) => {
    if (projections.length > 1) {
      setProjections(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Generate payment schedule
  const paymentSchedule = useMemo(() => {
    const schedule: PaymentScheduleItem[] = [];

    projections.forEach((proj) => {
      if (!proj.fechaInicio) return;
      
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
        for (let i = 0; i < proj.nroCuotas; i++) {
          const paymentDate = getInstallmentDate({
            startDate: proj.fechaInicio,
            paymentDay: proj.fechaPago,
            cycle: "mensual",
            installmentIndex: i,
          });
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
        for (let i = 0; i < proj.nroCuotas; i++) {
          const paymentDate = getInstallmentDate({
            startDate: proj.fechaInicio,
            paymentDay: proj.fechaPago,
            cycle: "anual",
            installmentIndex: i,
          });
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

  const totalGeneral = projections.reduce((sum, p) => sum + p.total, 0);
  const totalCuotas = paymentSchedule.length;
  const currencySymbol = contractData.moneda === "PEN" ? "S/" : "$";

  const handleSave = async () => {
    if (!selectedCliente) {
      toast.error("Por favor selecciona un cliente");
      return;
    }
    
    if (!contractData.descripcion) {
      toast.error("Por favor ingresa una descripción");
      return;
    }

    const firstProjection = projections[0];
    if (!firstProjection?.fechaInicio) {
      toast.error("Por favor establece la fecha de inicio");
      return;
    }

    setSaving(true);

    try {
      // Get next contract number from sequence
      const { data: secuencia } = await supabase
        .from("contrato_secuencias")
        .select("*")
        .eq("tipo", "general")
        .maybeSingle();

      let numero = "";
      if (secuencia) {
        const nextNumber = secuencia.ultimo_numero + 1;
        const formatted = String(nextNumber).padStart(secuencia.digitos_correlativo, "0");
        numero = `${secuencia.prefijo}-${secuencia.anio_vigente}-${formatted}`;
        
        // Update sequence
        await supabase
          .from("contrato_secuencias")
          .update({ ultimo_numero: nextNumber })
          .eq("id", secuencia.id);
      } else {
        // Fallback
        const year = new Date().getFullYear();
        const { data: maxContrato } = await supabase
          .from("contratos")
          .select("numero")
          .ilike("numero", `CT-${year}-%`)
          .order("numero", { ascending: false })
          .limit(1)
          .maybeSingle();

        let nextNum = 1;
        if (maxContrato?.numero) {
          const match = maxContrato.numero.match(/CT-\d{4}-(\d+)/);
          if (match) {
            nextNum = parseInt(match[1], 10) + 1;
          }
        }
        numero = `CT-${year}-${nextNum.toString().padStart(5, "0")}`;
      }

      // Prepare projections for JSON storage
      const projectionsForStorage = projections.map(p => ({
        ...p,
        fechaInicio: formatLocalYMD(p.fechaInicio),
        fechaTermino: formatLocalYMD(p.fechaTermino),
      }));

      // Prepare payment schedule for storage
      const scheduleForStorage = paymentSchedule.map(s => ({
        ...s,
        fecha: formatLocalYMD(s.fecha),
      }));

      const fechaInicio = formatLocalYMD(firstProjection.fechaInicio)!;
      const fechaFin = formatLocalYMD(firstProjection.fechaTermino);
      const numeroCuotas = firstProjection.nroCuotas;
      const diaVencimiento = firstProjection.fechaPago;

      const { error } = await supabase
        .from("contratos")
        .insert({
          numero,
          cliente_id: selectedCliente.id,
          descripcion: contractData.descripcion,
          tipo_servicio: contractData.tipo_servicio,
          moneda: contractData.moneda,
          condicion: contractData.condicion,
          notas: contractData.notas || null,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          monto_total: totalGeneral,
          monto_mensual: firstProjection.cicloPago === "mensual" 
            ? (firstProjection.dividirEnCuotas ? firstProjection.pago / firstProjection.nroCuotas : firstProjection.pago)
            : null,
          numero_cuotas: numeroCuotas,
          dia_vencimiento: diaVencimiento,
          status: "borrador",
          datos_plantilla: {
            projections: projectionsForStorage,
            payment_schedule: scheduleForStorage,
          },
        });

      if (error) {
        console.error("Error creating contract:", error);
        toast.error("Error al crear el contrato");
      } else {
        toast.success("Contrato creado exitosamente");
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear el contrato");
    } finally {
      setSaving(false);
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.razon_social.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.codigo.includes(clienteSearch)
  );

  const renderMonthCalendar = (month: Date, compact: boolean = false) => {
    const days = eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    });

    return (
      <div className={cn("border border-border rounded-lg overflow-hidden bg-card", compact ? "text-[10px]" : "")}>
        <div className="bg-primary/5 p-2 text-center font-semibold capitalize border-b border-border">
          {format(month, "MMMM yyyy", { locale: es })}
        </div>
        <div className="p-1">
          <div className={cn("grid grid-cols-7 gap-0.5 text-center font-medium text-muted-foreground mb-1", compact ? "text-[9px]" : "text-xs")}>
            <div>D</div><div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: days[0]?.getDay() || 0 }).map((_, i) => (
              <div key={`empty-${i}`} className={cn(compact ? "h-6" : "min-h-[50px]")} />
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const payments = paymentsByDate[key];
              const isToday = key === format(new Date(), "yyyy-MM-dd");

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border border-border/50 rounded p-0.5",
                    compact ? "h-6" : "min-h-[50px]",
                    isToday && "bg-primary/10 border-primary",
                    !isSameMonth(day, month) && "opacity-50"
                  )}
                >
                  <div className={cn("font-medium", isToday && "text-primary", compact ? "text-[9px]" : "text-xs")}>
                    {format(day, "d")}
                  </div>
                  {payments && !compact && (
                    <div className="space-y-0.5 mt-0.5">
                      {payments.slice(0, 2).map((p, idx) => (
                        <div
                          key={`${p.servicioId}-${idx}`}
                          className={cn("text-white px-0.5 rounded text-[8px] truncate", p.color)}
                          title={`${p.servicio} - Cuota ${p.cuota}: ${currencySymbol} ${p.monto.toFixed(2)}`}
                        >
                          C{p.cuota}: {currencySymbol}{p.monto.toFixed(0)}
                        </div>
                      ))}
                      {payments.length > 2 && (
                        <div className="text-[8px] text-muted-foreground">+{payments.length - 2} más</div>
                      )}
                    </div>
                  )}
                  {payments && compact && (
                    <div className="flex gap-0.5 flex-wrap">
                      {payments.map((p, idx) => (
                        <div
                          key={`${p.servicioId}-${idx}`}
                          className={cn("w-1.5 h-1.5 rounded-full", p.color)}
                          title={`${p.servicio} - Cuota ${p.cuota}: ${currencySymbol} ${p.monto.toFixed(2)}`}
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
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-[250px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-[60px]">Cuota</TableHead>
              <TableHead className="w-[110px]">Fecha Pago</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead className="w-[100px] text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentSchedule.map((item, idx) => (
              <TableRow key={`${item.servicioId}-${item.cuota}-${idx}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", item.color)} />
                    {item.cuota}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{format(item.fecha, "dd/MM/yyyy")}</TableCell>
                <TableCell className="max-w-[180px] truncate text-sm" title={item.servicio}>
                  {item.servicio}
                </TableCell>
                <TableCell className="text-right font-medium">{currencySymbol} {item.monto.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-border bg-muted/30 p-3 flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Total de cuotas: {paymentSchedule.length}</span>
        <span className="font-bold text-primary">
          Total: {currencySymbol} {paymentSchedule.reduce((sum, p) => sum + p.monto, 0).toFixed(2)}
        </span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FilePlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Nuevo Contrato
              </DialogTitle>
              <DialogDescription className="mt-1">
                Crea un nuevo contrato con proyección de servicios y pagos
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 py-4">
          {/* Left Panel - Contract Info (Collapsible) */}
          <div className={cn(
            "flex flex-col gap-4 overflow-auto transition-all duration-300",
            leftPanelCollapsed ? "lg:w-0 lg:overflow-hidden lg:opacity-0" : "lg:w-1/3"
          )}>
            {!leftPanelCollapsed && (
              <>
                {/* Client Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Cliente *</Label>
                  <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedCliente ? (
                          <span className="truncate">{selectedCliente.razon_social}</span>
                        ) : (
                          <span className="text-muted-foreground">Seleccionar cliente...</span>
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar cliente..." 
                          value={clienteSearch}
                          onValueChange={setClienteSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-auto">
                            {filteredClientes.map((cliente) => (
                              <CommandItem
                                key={cliente.id}
                                value={cliente.razon_social}
                                onSelect={() => {
                                  setSelectedCliente(cliente);
                                  setClientePopoverOpen(false);
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{cliente.razon_social}</span>
                                  <span className="text-xs text-muted-foreground">{cliente.codigo}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Client Info Display */}
                {selectedCliente && (
                  <div className="bg-muted/30 rounded-xl p-4 border border-border">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Cliente Seleccionado
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Empresa:</span>
                        <span className="font-medium">{selectedCliente.razon_social}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RUC:</span>
                        <span className="font-mono">{selectedCliente.codigo}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contract Details Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tipo de Servicio *</Label>
                      <Select 
                        value={contractData.tipo_servicio} 
                        onValueChange={(value) => setContractData(prev => ({ ...prev, tipo_servicio: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Moneda</Label>
                      <Select 
                        value={contractData.moneda} 
                        onValueChange={(value) => setContractData(prev => ({ ...prev, moneda: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PEN">Soles (S/)</SelectItem>
                          <SelectItem value="USD">Dólares ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Condición del Contrato *</Label>
                    <Select 
                      value={contractData.condicion} 
                      onValueChange={(value: "Vigente" | "Terminado" | "Anulado" | "Suspendido") => setContractData(prev => ({ ...prev, condicion: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vigente">Vigente</SelectItem>
                        <SelectItem value="Terminado">Terminado</SelectItem>
                        <SelectItem value="Anulado">Anulado</SelectItem>
                        <SelectItem value="Suspendido">Suspendido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Descripción del Contrato *</Label>
                    <Textarea
                      value={contractData.descripcion}
                      onChange={(e) => setContractData(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Descripción del contrato..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Notas Adicionales</Label>
                    <Textarea
                      value={contractData.notas}
                      onChange={(e) => setContractData(prev => ({ ...prev, notas: e.target.value }))}
                      placeholder="Notas adicionales..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 mt-auto">
                  <h3 className="font-semibold text-sm text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Resumen del Contrato
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Cuotas:</span>
                      <span className="font-bold">{totalCuotas}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-primary/20 pt-2 mt-2">
                      <span>Monto Total:</span>
                      <span className="text-primary">{currencySymbol} {totalGeneral.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Panel - Projection & Calendar */}
          <div className={cn(
            "flex flex-col gap-4 overflow-hidden transition-all duration-300",
            leftPanelCollapsed ? "lg:w-full" : "lg:w-2/3"
          )}>
            {/* Toggle Button for Left Panel */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                className="gap-2"
              >
                {leftPanelCollapsed ? (
                  <>
                    <PanelLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Mostrar detalles</span>
                  </>
                ) : (
                  <>
                    <PanelLeftClose className="h-4 w-4" />
                    <span className="hidden sm:inline">Ocultar detalles</span>
                  </>
                )}
              </Button>
              {leftPanelCollapsed && selectedCliente && (
                <span className="text-sm text-muted-foreground truncate">
                  <span className="font-medium text-foreground">{selectedCliente.razon_social}</span>
                  <span className="mx-2">•</span>
                  <span>{currencySymbol} {totalGeneral.toFixed(2)}</span>
                </span>
              )}
            </div>
            {/* Services Projection Table */}
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  Proyección de Servicios
                </h3>
                <Button variant="outline" size="sm" onClick={addService} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Agregar Servicio
                </Button>
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[200px]">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Servicio</th>
                      <th className="text-left p-2 font-medium w-[120px]">Fecha Inicio</th>
                      <th className="text-center p-2 font-medium w-[70px]">Día Pago</th>
                      <th className="text-left p-2 font-medium w-[100px]">Ciclo</th>
                      <th className="text-center p-2 font-medium w-[70px]">N° Cuotas</th>
                      <th className="text-center p-2 font-medium w-[70px]" title="Si está activado, divide el total entre las cuotas">Dividir</th>
                      <th className="text-right p-2 font-medium w-[100px]">Monto Serv.</th>
                      <th className="text-right p-2 font-medium w-[100px]">Total</th>
                      <th className="text-center p-2 font-medium w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {projections.map((proj, index) => (
                      <tr key={proj.id} className="hover:bg-muted/30">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <ServiceSearchInput
                              value={proj.descripcion}
                              onChange={(descripcion, precio) => {
                                handleProjectionChange(index, "descripcion", descripcion);
                                if (precio !== undefined && proj.pago === 0) {
                                  handleProjectionChange(index, "pago", precio);
                                }
                              }}
                              placeholder="Buscar o escribir servicio..."
                              className="flex-1"
                              colorIndicator={<div className={cn("w-3 h-3 rounded-full flex-shrink-0", proj.color)} />}
                            />
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
                              <SelectItem value="unico">Único</SelectItem>
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
                        <td className="p-2 text-right font-semibold text-primary">
                          {currencySymbol} {proj.total.toFixed(2)}
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeService(index)}
                            disabled={projections.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 border-t-2 border-border">
                    <tr>
                      <td colSpan={7} className="p-2 text-right font-semibold">Total General:</td>
                      <td className="p-2 text-right font-bold text-lg text-primary">{currencySymbol} {totalGeneral.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Calendar View */}
            <div className="border border-border rounded-xl flex-1 overflow-hidden flex flex-col bg-card">
              <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  {calendarView !== "summary" && calendarView !== "year" && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, calendarView === "quarter" ? -3 : -1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-semibold capitalize min-w-[140px] text-center text-sm">
                        {format(currentMonth, "MMMM yyyy", { locale: es })}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, calendarView === "quarter" ? 3 : 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                
                <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as CalendarViewType)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="month" className="gap-1 text-xs h-7 px-2">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Mes
                    </TabsTrigger>
                    <TabsTrigger value="quarter" className="gap-1 text-xs h-7 px-2">
                      <Grid3X3 className="h-3.5 w-3.5" />
                      3 Meses
                    </TabsTrigger>
                    <TabsTrigger value="year" className="gap-1 text-xs h-7 px-2">
                      <CalendarRange className="h-3.5 w-3.5" />
                      Anual
                    </TabsTrigger>
                    <TabsTrigger value="summary" className="gap-1 text-xs h-7 px-2">
                      <List className="h-3.5 w-3.5" />
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
                <div className="border-t border-border p-3 bg-muted/20">
                  <div className="flex flex-wrap gap-3">
                    {projections.map((proj) => (
                      <div key={proj.id} className="flex items-center gap-1.5 text-xs">
                        <div className={cn("w-3 h-3 rounded-full", proj.color)} />
                        <span className="truncate max-w-[120px]">{proj.descripcion || "Sin nombre"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            Crear Contrato
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
