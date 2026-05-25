import { useState, useEffect, useMemo, useRef } from "react";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { 
  FileCheck, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Building2,
  Receipt,
  Loader2,
  FileText,
  Clock,
  DollarSign,
  Printer,
  Download,
  X,
  Phone,
  Mail,
  MapPin,
  User,
  CalendarDays
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ContractStatus } from "./ContractActions";
import logoImage from "@/assets/logo-ca-full.png";

interface ContractDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
}

interface ServiceProjection {
  id: string;
  descripcion: string;
  color: string;
  fechaInicio: Date | undefined;
  fechaTermino: Date | undefined;
  fechaPago: number;
  cicloPago: string;
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

export type ContractCondition = "Vigente" | "Terminado" | "Anulado" | "Suspendido";

interface ContractDetail {
  id: string;
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  monto_mensual: number | null;
  monto_total: number | null;
  moneda: string;
  status: ContractStatus;
  condicion: ContractCondition;
  notas: string | null;
  numero_cuotas: number | null;
  dia_vencimiento: number | null;
  created_at: string;
  datos_plantilla: any;
  cliente: {
    razon_social: string;
    codigo: string;
    direccion: string | null;
    email: string | null;
    telefono: string | null;
  } | null;
  proforma: {
    numero: string;
    total: number;
    subtotal: number;
    igv: number;
    moneda: string;
    tipo: string;
    campos_personalizados?: any;
    items: { descripcion: string; cantidad: number; precio_unitario: number; subtotal: number }[];
  } | null;
}

const condicionStyles: Record<ContractCondition, { bg: string; text: string; border: string }> = {
  Vigente: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  Terminado: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  Anulado: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
  Suspendido: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
};

const statusStyles: Record<ContractStatus, { bg: string; text: string; border: string }> = {
  borrador: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  en_gestion: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  aprobado: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  anulado: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
  activo: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
  pausado: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
  finalizado: { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300" },
  cancelado: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
};

const statusLabels: Record<ContractStatus, string> = {
  borrador: "Borrador",
  en_gestion: "En Gestión",
  aprobado: "Aprobado",
  anulado: "Anulado",
  activo: "Vigente",
  pausado: "Pausado",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const SERVICE_TYPES: Record<string, string> = {
  contabilidad: "Contabilidad",
  tramites: "Trámites",
  auditoria: "Auditoría",
};

// Company info
const COMPANY_INFO = {
  name: "C&A CONTADORES & AUDITORES",
  slogan: "Soluciones Contables y Empresariales",
  address: "Calle Santo Domingo N.º 103, Of. 303 y 304 – Arequipa",
  phone: "(+51) 982 307 213",
  email: "rmarquez@contadoresyauditoresarequipa.com",
};

export const ContractDetailModal = ({
  open,
  onOpenChange,
  contractId,
}: ContractDetailModalProps) => {
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && contractId) {
      fetchContractDetail();
    }
  }, [open, contractId]);

  const fetchContractDetail = async () => {
    if (!contractId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("contratos")
      .select(`
        *,
        cliente:clientes(razon_social, codigo, direccion, email, telefono),
        proforma:proformas!contratos_proforma_id_fkey(numero, total, subtotal, igv, moneda, tipo, campos_personalizados, items:proforma_items(descripcion, cantidad, precio_unitario, subtotal))
      `)
      .eq("id", contractId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching contract:", error);
    } else if (data) {
      setContract({
        ...data,
        status: data.status as ContractStatus,
        condicion: (data.condicion as ContractCondition) || "Vigente",
        cliente: data.cliente as ContractDetail["cliente"],
        proforma: data.proforma as ContractDetail["proforma"],
      });
      
      if (data.fecha_inicio) {
        setCurrentMonth(new Date(data.fecha_inicio));
      }
    }
    setLoading(false);
  };

  // Parse projections from datos_plantilla or proforma campos_personalizados
  const projections: ServiceProjection[] = useMemo(() => {
    // First try from datos_plantilla.projections
    let projectionsData = contract?.datos_plantilla?.projections;
    
    // Fallback to proforma.campos_personalizados.calendar_projection if available
    if (!projectionsData || projectionsData.length === 0) {
      const proformaCampos = contract?.proforma as any;
      if (proformaCampos?.campos_personalizados?.calendar_projection) {
        projectionsData = proformaCampos.campos_personalizados.calendar_projection;
      } else if (proformaCampos?.campos_personalizados?.projections) {
        projectionsData = proformaCampos.campos_personalizados.projections;
      }
    }
    
    if (!projectionsData || !Array.isArray(projectionsData)) return [];
    
    return projectionsData.map((p: any) => ({
      id: p.id || 'service-0',
      descripcion: p.descripcion || p.servicio || 'Servicio',
      color: p.color || 'bg-blue-500',
      fechaInicio: p.fechaInicio ? new Date(p.fechaInicio) : undefined,
      fechaTermino: p.fechaTermino ? new Date(p.fechaTermino) : undefined,
      fechaPago: p.fechaPago || p.diaPago || 15,
      cicloPago: p.cicloPago || 'mensual',
      nroCuotas: p.nroCuotas || p.cuotas || 1,
      pago: Number(p.pago) || Number(p.monto) || 0,
      total: Number(p.total) || Number(p.pago) || 0,
      dividirEnCuotas: p.dividirEnCuotas !== undefined ? p.dividirEnCuotas : true,
    }));
  }, [contract]);

  // Parse payment schedule from datos_plantilla or proforma campos_personalizados
  const paymentSchedule: PaymentScheduleItem[] = useMemo(() => {
    // First try from datos_plantilla.payment_schedule
    let scheduleData = contract?.datos_plantilla?.payment_schedule;
    
    // Fallback to proforma.campos_personalizados.payment_schedule if available
    if (!scheduleData || scheduleData.length === 0) {
      const proformaCampos = contract?.proforma as any;
      if (proformaCampos?.campos_personalizados?.payment_schedule) {
        scheduleData = proformaCampos.campos_personalizados.payment_schedule;
      }
    }
    
    if (!scheduleData || !Array.isArray(scheduleData)) return [];
    
    return scheduleData.map((s: any) => ({
      cuota: s.cuota || 1,
      fecha: s.fecha ? new Date(s.fecha) : new Date(),
      servicio: s.servicio || 'Servicio',
      servicioId: s.servicioId || 'service-0',
      color: s.color || 'bg-blue-500',
      monto: Number(s.monto) || 0,
    }));
  }, [contract]);

  const currencySymbol = contract?.moneda === "PEN" ? "S/" : "$";
  const totalGeneral = projections.reduce((sum, p) => sum + (p.total || 0), 0);

  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!contract || !printRef.current) return;
    
    setDownloading(true);
    try {
      const element = printRef.current;
      
      // A4 dimensions in mm
      const a4Width = 210;
      const a4Height = 297;
      const marginX = 5; // Horizontal margins
      const marginY = 8; // Vertical margins
      const contentWidth = a4Width - (marginX * 2);
      const contentHeight = a4Height - (marginY * 2);
      
      // Create canvas from HTML element with high quality
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate the scaled image dimensions
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      // If content fits in one page
      if (imgHeight <= contentHeight) {
        pdf.addImage(imgData, 'PNG', marginX, marginY, imgWidth, imgHeight);
      } else {
        // Multi-page: use full image with negative Y offset for each page
        const totalPages = Math.ceil(imgHeight / contentHeight);
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }
          
          // Calculate the Y offset for this page (negative to shift image up)
          const yOffset = marginY - (page * contentHeight);
          
          // Add clipping region to prevent overflow
          pdf.saveGraphicsState();
          pdf.rect(marginX, marginY, contentWidth, contentHeight, 'S');
          pdf.addImage(imgData, 'PNG', marginX, yOffset, imgWidth, imgHeight);
          pdf.restoreGraphicsState();
        }
      }
      
      pdf.save(`Contrato-${contract.numero}.pdf`);
      toast.success("PDF descargado correctamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setDownloading(false);
    }
  };

  // Group payments by month for calendar display
  const paymentsByMonth = useMemo(() => {
    const grouped: { [key: string]: PaymentScheduleItem[] } = {};
    paymentSchedule.forEach((item) => {
      const key = format(item.fecha, "yyyy-MM");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  }, [paymentSchedule]);

  // Get unique months with payments
  const monthsWithPayments = useMemo(() => {
    const months = new Set<string>();
    paymentSchedule.forEach((item) => {
      months.add(format(item.fecha, "yyyy-MM"));
    });
    return Array.from(months).sort();
  }, [paymentSchedule]);

  const renderMiniCalendar = (monthKey: string) => {
    const [year, month] = monthKey.split("-").map(Number);
    const monthDate = new Date(year, month - 1, 1);
    const days = eachDayOfInterval({
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    });
    const payments = paymentsByMonth[monthKey] || [];
    const paymentDates = new Set(payments.map(p => format(p.fecha, "d")));

    return (
      <div className="border border-border rounded-lg overflow-hidden bg-white print:break-inside-avoid">
        <div className="bg-primary/10 px-3 py-2 text-center font-semibold text-sm capitalize border-b border-border">
          {format(monthDate, "MMMM yyyy", { locale: es })}
        </div>
        <div className="p-2">
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted-foreground mb-1">
            <span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: days[0]?.getDay() || 0 }).map((_, i) => (
              <div key={`empty-${i}`} className="h-5" />
            ))}
            {days.map((day) => {
              const dayNum = format(day, "d");
              const hasPayment = paymentDates.has(dayNum);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "h-5 flex items-center justify-center text-[10px] rounded",
                    hasPayment && "bg-primary text-primary-foreground font-bold"
                  )}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>
        </div>
        {payments.length > 0 && (
          <div className="border-t border-border bg-muted/30 px-2 py-1.5">
            {payments.map((p, idx) => (
              <div key={idx} className="flex justify-between text-[10px] py-0.5">
                <span className="truncate max-w-[120px]">{format(p.fecha, "dd")} - {p.servicio}</span>
                <span className="font-medium">{currencySymbol}{p.monto.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden [&>button:last-child]:hidden">
        {/* Header with actions - hidden when printing */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Vista del Contrato</h2>
              <p className="text-sm text-muted-foreground">
                Documento corporativo para impresión
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
              onClick={handleDownloadPDF} 
              className="gap-2"
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Descargar PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : contract ? (
          <div className="flex-1 overflow-y-auto">
            <div 
              ref={printRef}
              className="max-w-[900px] mx-auto bg-white p-6"
            >
              {/* === CORPORATE HEADER === */}
              <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="bg-white rounded-lg p-2 shadow-lg">
                      <img 
                        src={logoImage} 
                        alt="Logo" 
                        className="h-16 w-auto object-contain"
                      />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">{COMPANY_INFO.name}</h1>
                      <p className="text-primary-foreground/80 text-sm mt-1">{COMPANY_INFO.slogan}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm space-y-1">
                    <div className="flex items-center justify-end gap-2">
                      <span>{COMPANY_INFO.address}</span>
                      <MapPin className="h-4 w-4 shrink-0" />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span>{COMPANY_INFO.phone}</span>
                      <Phone className="h-4 w-4 shrink-0" />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span>{COMPANY_INFO.email}</span>
                      <Mail className="h-4 w-4 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* === CONTRACT TITLE === */}
              <div className="border-b-4 border-primary bg-muted/50 px-8 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">CONTRATO DE SERVICIOS</h2>
                    <p className="text-muted-foreground mt-1">
                      {SERVICE_TYPES[contract.tipo_servicio] || contract.tipo_servicio}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">{contract.numero}</div>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <Badge 
                        className={cn(
                          "px-3 py-1 text-sm font-medium",
                          statusStyles[contract.status].bg,
                          statusStyles[contract.status].text,
                          statusStyles[contract.status].border,
                          "border"
                        )}
                      >
                        {statusLabels[contract.status]}
                      </Badge>
                      <Badge 
                        className={cn(
                          "px-3 py-1 text-sm font-medium",
                          condicionStyles[contract.condicion].bg,
                          condicionStyles[contract.condicion].text,
                          condicionStyles[contract.condicion].border,
                          "border"
                        )}
                      >
                        {contract.condicion}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* === MAIN CONTENT === */}
              <div className="p-8 space-y-8">
                {/* Client & Contract Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:break-inside-avoid">
                  {/* Client Info */}
                  {contract.cliente && (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="bg-primary/5 px-4 py-3 border-b border-border">
                        <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          Datos del Cliente
                        </h3>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Razón Social</p>
                            <p className="font-semibold text-base">{contract.cliente.razon_social}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">RUC</p>
                            <p className="font-mono font-semibold">{contract.cliente.codigo}</p>
                          </div>
                        </div>
                        {contract.cliente.direccion && (
                          <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Dirección</p>
                              <p className="text-sm">{contract.cliente.direccion}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-6">
                          {contract.cliente.telefono && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{contract.cliente.telefono}</span>
                            </div>
                          )}
                          {contract.cliente.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{contract.cliente.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contract Details */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="bg-primary/5 px-4 py-3 border-b border-border">
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        Detalles del Contrato
                      </h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Fecha de Inicio</p>
                        <p className="font-semibold">
                          {(() => {
                            const parts = contract.fecha_inicio.split('T')[0].split('-');
                            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                            return format(date, "dd 'de' MMMM, yyyy", { locale: es });
                          })()}
                        </p>
                      </div>
                      {contract.fecha_fin && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Fecha de Fin</p>
                          <p className="font-semibold">
                            {(() => {
                              const parts = contract.fecha_fin.split('T')[0].split('-');
                              const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                              return format(date, "dd 'de' MMMM, yyyy", { locale: es });
                            })()}
                          </p>
                        </div>
                      )}
                      {contract.dia_vencimiento && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Día de Vencimiento</p>
                          <p className="font-semibold">Día {contract.dia_vencimiento} de cada mes</p>
                        </div>
                      )}
                      {contract.numero_cuotas && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Número de Cuotas</p>
                          <p className="font-semibold">{contract.numero_cuotas} cuotas</p>
                        </div>
                      )}
                      {contract.proforma && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground uppercase">Proforma Origen</p>
                          <p className="font-semibold">{contract.proforma.numero}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {contract.descripcion && (
                  <div className="border border-border rounded-xl overflow-hidden print:break-inside-avoid">
                    <div className="bg-primary/5 px-4 py-3 border-b border-border">
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Descripción del Contrato
                      </h3>
                    </div>
                    <div className="p-4">
                      <p className="text-muted-foreground leading-relaxed">{contract.descripcion}</p>
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6 print:break-inside-avoid">
                  <h3 className="font-semibold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Resumen Financiero
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {contract.monto_mensual && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase mb-1">Monto Mensual</p>
                        <p className="text-2xl font-bold text-primary">
                          {currencySymbol} {contract.monto_mensual.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Total del Contrato</p>
                      <p className="text-2xl font-bold text-primary">
                        {currencySymbol} {(contract.monto_total || totalGeneral).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Moneda</p>
                      <p className="text-2xl font-bold">{contract.moneda}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Total Cuotas</p>
                      <p className="text-2xl font-bold">{paymentSchedule.length}</p>
                    </div>
                  </div>
                </div>

                {/* Services Table */}
                {projections.length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden print:break-inside-avoid">
                    <div className="bg-primary/5 px-4 py-3 border-b border-border">
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        Servicios Contratados
                      </h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[40%]">Descripción del Servicio</TableHead>
                          <TableHead className="text-center">Fecha Inicio</TableHead>
                          <TableHead className="text-center">Cuotas</TableHead>
                          <TableHead className="text-center">Ciclo</TableHead>
                          <TableHead className="text-right">Pago/Cuota</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projections.map((service, idx) => (
                          <TableRow key={service.id || idx}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-3 h-3 rounded-full shrink-0", service.color)} />
                                <span className="font-medium">{service.descripcion}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {service.fechaInicio ? format(service.fechaInicio, "dd/MM/yyyy") : "-"}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {service.nroCuotas}
                            </TableCell>
                            <TableCell className="text-center capitalize">
                              {service.cicloPago}
                            </TableCell>
                            <TableCell className="text-right">
                              {currencySymbol} {service.pago.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {currencySymbol} {service.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="border-t border-border bg-primary/5 px-4 py-3 flex justify-end">
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground mr-4">TOTAL GENERAL:</span>
                        <span className="text-xl font-bold text-primary">
                          {currencySymbol} {totalGeneral.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Schedule Table */}
                {paymentSchedule.length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden print:break-before-page">
                    <div className="bg-primary/5 px-4 py-3 border-b border-border">
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        Cronograma de Pagos
                      </h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[60px]">Cuota</TableHead>
                          <TableHead>Fecha de Pago</TableHead>
                          <TableHead>Servicio</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentSchedule.map((item, idx) => (
                          <TableRow key={`${item.servicioId}-${item.cuota}-${idx}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", item.color)} />
                                <span className="font-medium">{item.cuota}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(item.fecha, "dd 'de' MMMM, yyyy", { locale: es })}
                            </TableCell>
                            <TableCell className="max-w-[250px] truncate" title={item.servicio}>
                              {item.servicio}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {currencySymbol} {item.monto.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="border-t border-border bg-primary/5 px-4 py-3 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Total de cuotas: <span className="font-semibold text-foreground">{paymentSchedule.length}</span>
                      </span>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground mr-4">TOTAL A PAGAR:</span>
                        <span className="text-xl font-bold text-primary">
                          {currencySymbol} {paymentSchedule.reduce((sum, p) => sum + p.monto, 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Calendar View */}
                {monthsWithPayments.length > 0 && (
                  <div className="print:break-before-page">
                    <div className="flex items-center gap-2 mb-4">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm uppercase tracking-wide">
                        Calendario de Pagos
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {monthsWithPayments.slice(0, 12).map((monthKey) => (
                        <div key={monthKey}>
                          {renderMiniCalendar(monthKey)}
                        </div>
                      ))}
                    </div>
                    {monthsWithPayments.length > 12 && (
                      <p className="text-sm text-muted-foreground text-center mt-4">
                        +{monthsWithPayments.length - 12} meses adicionales
                      </p>
                    )}
                  </div>
                )}

                {/* Notes */}
                {contract.notas && (
                  <div className="border border-border rounded-xl overflow-hidden print:break-inside-avoid">
                    <div className="bg-muted/50 px-4 py-3 border-b border-border">
                      <h3 className="font-semibold text-sm uppercase tracking-wide">Observaciones</h3>
                    </div>
                    <div className="p-4">
                      <p className="text-muted-foreground whitespace-pre-wrap">{contract.notas}</p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-border pt-6 mt-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground">Documento generado el</p>
                      <p className="font-medium">{format(new Date(), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Contrato creado el</p>
                      <p className="font-medium">{format(new Date(contract.created_at), "dd/MM/yyyy", { locale: es })}</p>
                    </div>
                  </div>
                  <Separator className="my-6" />
                  <div className="text-center text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">{COMPANY_INFO.name}</p>
                    <p>{COMPANY_INFO.address}</p>
                    <p>{COMPANY_INFO.phone} • {COMPANY_INFO.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-muted-foreground">No se encontró el contrato</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
