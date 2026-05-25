import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, Send, FileText, Building2, Calendar, DollarSign, Loader2, Printer, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { generateProformaPDF } from "@/lib/generateProformaPDF";
import { getPDFStylesForType } from "@/hooks/usePDFStyles";
import { toast } from "sonner";
import { useState, useMemo } from "react";

interface ProformaItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface PaymentScheduleItem {
  cuota: number;
  fecha: string | Date;
  servicio: string;
  monto: number;
}

interface Proforma {
  id: string;
  numero: string;
  cliente: {
    razon_social: string;
    codigo: string;
    direccion: string | null;
    email: string | null;
    telefono: string | null;
  } | null;
  tipo: string;
  subtotal: number;
  igv: number;
  total: number;
  status: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  notas: string | null;
  moneda: string;
  campos_personalizados?: Record<string, any> | null;
  incluir_proyeccion_pdf?: boolean;
}

interface ProformaDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proforma: Proforma | null;
  items: ProformaItem[];
  loading: boolean;
  onDownloadPDF: () => void;
  onSendEmail: () => void;
  downloadingPDF: boolean;
  paymentSchedule?: PaymentScheduleItem[];
}

const typeStyles: Record<string, string> = {
  "Contabilidad": "bg-primary/10 text-primary",
  "Trámites": "bg-secondary/20 text-secondary-foreground",
  "Auditoría y Control Interno": "bg-purple-100 text-purple-700",
  contabilidad: "bg-primary/10 text-primary",
  tramites: "bg-secondary/20 text-secondary-foreground",
};

const typeLabels: Record<string, string> = {
  "Contabilidad": "Contabilidad",
  "Trámites": "Trámites",
  "Auditoría y Control Interno": "Auditoría",
  contabilidad: "Contabilidad",
  tramites: "Trámites",
};

export function ProformaDetailModal({
  open,
  onOpenChange,
  proforma,
  items,
  loading,
  onDownloadPDF,
  onSendEmail,
  downloadingPDF,
  paymentSchedule = [],
}: ProformaDetailModalProps) {
  const [printingPDF, setPrintingPDF] = useState(false);
  
  const { data: estados = [] } = useQuery({
    queryKey: ["proforma-estados-modal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proforma_estados")
        .select("*")
        .order("orden");
      if (error) throw error;
      return data;
    },
  });

  // Get payment schedule from campos_personalizados - MUST be before any early returns
  const scheduleFromData = useMemo(() => {
    if (paymentSchedule && paymentSchedule.length > 0) {
      return paymentSchedule;
    }
    if (proforma?.campos_personalizados?.payment_schedule) {
      return proforma.campos_personalizados.payment_schedule as PaymentScheduleItem[];
    }
    return [];
  }, [paymentSchedule, proforma?.campos_personalizados]);

  const getStatusInfo = (statusName: string) => {
    const estado = estados.find((e) => e.nombre === statusName);
    return {
      label: estado?.nombre_display || statusName,
      color: estado?.color || "#6B7280",
    };
  };

  const formatDate = (dateStr: string) => {
    try {
      // Parse date string as local date to avoid timezone issues
      // Date strings like "2026-01-31" should not shift due to UTC conversion
      const parts = dateStr.split('T')[0].split('-');
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return format(date, "dd 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = proforma?.moneda === "USD" ? "USD" : "PEN";
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const handlePrint = async () => {
    if (!proforma || !proforma.cliente) return;
    
    setPrintingPDF(true);
    try {
      const pdfStyles = await getPDFStylesForType(proforma.tipo);
      
      let calendarProjectionData: { numero: number; fecha_pago: string; servicio: string; monto: number }[] | undefined;
      
      if (proforma.incluir_proyeccion_pdf && scheduleFromData.length > 0) {
        calendarProjectionData = scheduleFromData.map((s) => ({
          numero: s.cuota,
          fecha_pago: typeof s.fecha === 'string' ? s.fecha : s.fecha.toISOString(),
          servicio: s.servicio,
          monto: s.monto,
        }));
      }
      
      const pdfBlob = await generateProformaPDF({
        numero: proforma.numero,
        tipo: proforma.tipo,
        fecha_emision: proforma.fecha_emision,
        fecha_vencimiento: proforma.fecha_vencimiento,
        cliente: {
          razon_social: proforma.cliente.razon_social,
          codigo: proforma.cliente.codigo,
          direccion: proforma.cliente.direccion,
          email: proforma.cliente.email,
          telefono: proforma.cliente.telefono,
        },
        items: items.map(item => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        })),
        subtotal: proforma.subtotal,
        igv: proforma.igv,
        total: proforma.total,
        notas: proforma.notas,
        moneda: proforma.moneda,
        calendarProjection: calendarProjectionData,
      }, pdfStyles);

      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 500);
        };
      } else {
        // Fallback: download if popup blocked
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Proforma_${proforma.numero}.pdf`;
        link.click();
        toast.info("Popup bloqueado - PDF descargado");
      }
      
      toast.success("Preparando impresión");
    } catch (error) {
      console.error("Error printing PDF:", error);
      toast.error("Error al generar el PDF para imprimir");
    } finally {
      setPrintingPDF(false);
    }
  };

  // Early return AFTER all hooks
  if (!proforma) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              Proforma {proforma.numero}
            </DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Info */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className={typeStyles[proforma.tipo]}>
                  {typeLabels[proforma.tipo]}
                </Badge>
                <Badge 
                  variant="outline" 
                  style={{ 
                    backgroundColor: `${getStatusInfo(proforma.status).color}15`,
                    color: getStatusInfo(proforma.status).color,
                    borderColor: `${getStatusInfo(proforma.status).color}50`
                  }}
                >
                  {getStatusInfo(proforma.status).label}
                </Badge>
              </div>

              {/* Client and Dates */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Client Info */}
                <div className="bg-muted/50 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    CLIENTE
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{proforma.cliente?.razon_social || "Sin cliente"}</p>
                    <p className="text-sm text-muted-foreground">{proforma.cliente?.codigo}</p>
                  </div>
                  {proforma.cliente?.direccion && (
                    <p className="text-sm">{proforma.cliente.direccion}</p>
                  )}
                  <div className="flex flex-col gap-1 text-sm">
                    {proforma.cliente?.email && (
                      <span className="text-muted-foreground">{proforma.cliente.email}</span>
                    )}
                    {proforma.cliente?.telefono && (
                      <span className="text-muted-foreground">{proforma.cliente.telefono}</span>
                    )}
                  </div>
                </div>

                {/* Dates Info */}
                <div className="bg-muted/50 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    FECHAS
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Emisión</p>
                      <p className="font-medium">{formatDate(proforma.fecha_emision)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Válida hasta</p>
                      <p className="font-medium">{formatDate(proforma.fecha_vencimiento)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Items Table */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Detalle de Servicios</h3>
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase">
                          Descripción
                        </TableHead>
                        <TableHead className="text-center text-xs font-medium text-muted-foreground uppercase w-20">
                          Cant.
                        </TableHead>
                        <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase w-32">
                          P. Unit.
                        </TableHead>
                        <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase w-32">
                          Subtotal
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={item.id || index} className="hover:bg-muted/30 transition-colors">
                          <TableCell>{item.descripcion}</TableCell>
                          <TableCell className="text-center">{item.cantidad}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(item.precio_unitario))}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(item.subtotal))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Payment Schedule */}
              {scheduleFromData.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-[#CA9348]" />
                      Proyección de Pagos
                    </h3>
                    <div className="border rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase w-16">
                              Cuota
                            </TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase">
                              Fecha de Pago
                            </TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase">
                              Servicio
                            </TableHead>
                            <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase w-32">
                              Monto
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scheduleFromData.map((item, index) => (
                            <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="font-medium">{item.cuota}</TableCell>
                              <TableCell>
                                {typeof item.fecha === 'string' 
                                  ? formatDate(item.fecha) 
                                  : formatDate(item.fecha.toISOString())}
                              </TableCell>
                              <TableCell>{item.servicio}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.monto)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#CA9348]/10 rounded-lg px-4 py-2 text-sm font-medium">
                        Total Proyección: {formatCurrency(scheduleFromData.reduce((sum, item) => sum + item.monto, 0))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              {proforma.notas && (
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Notas</p>
                  <p className="text-sm whitespace-pre-wrap">{proforma.notas}</p>
                </div>
              )}
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              {/* Totals */}
              <div className="bg-muted/50 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  RESUMEN
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(Number(proforma.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGV (18%)</span>
                    <span>{formatCurrency(Number(proforma.igv))}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(Number(proforma.total))}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full gap-2" 
                  onClick={onDownloadPDF} 
                  disabled={downloadingPDF}
                >
                  {downloadingPDF ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Descargar PDF
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full gap-2" 
                  onClick={handlePrint}
                  disabled={printingPDF}
                >
                  {printingPDF ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  Imprimir
                </Button>
                <Button className="w-full gap-2 btn-gradient" onClick={onSendEmail}>
                  <Send className="h-4 w-4" />
                  Enviar al Cliente
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
