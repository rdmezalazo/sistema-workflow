import { useState, useEffect, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  FileText,
  Calculator,
  CreditCard,
  Building2,
  Loader2,
  Receipt,
  Percent,
  DollarSign,
  Calendar,
  Hash,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileCheck,
  Printer,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
    descripcion?: string;
    cliente: {
      razon_social: string;
      codigo: string;
      direccion?: string;
    };
  };
}

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: UnifiedPayment | null;
  onSuccess: () => void;
  allPayments?: UnifiedPayment[];
}

interface PaymentForm {
  status: string;
  fecha_pago: string;
  tipo_comprobante: string;
  serie_comprobante: string;
  numero_comprobante: string;
  fecha_emision: string;
  subtotal: number;
  tipo_igv: string;
  igv: number;
  monto: number;
  detraccion_porcentaje: number;
  detraccion_monto: number;
  retencion_porcentaje: number;
  retencion_monto: number;
  monto_neto: number;
  metodo_pago: string;
  banco: string;
  cuenta_bancaria: string;
  referencia: string;
  notas: string;
  observaciones_contables: string;
  glosa: string;
}

const tiposComprobante = [
  { value: "factura", label: "Factura" },
  { value: "boleta", label: "Boleta de Venta" },
  { value: "recibo_honorarios", label: "Recibo por Honorarios" },
  { value: "recibo_interno", label: "Recibo Interno" },
  { value: "nota_credito", label: "Nota de Crédito" },
  { value: "nota_debito", label: "Nota de Débito" },
];

const tiposIGV = [
  { value: "gravado", label: "Gravado (18%)" },
  { value: "exonerado", label: "Exonerado" },
  { value: "inafecto", label: "Inafecto" },
];

const metodosPago = [
  { value: "transferencia", label: "Transferencia Bancaria" },
  { value: "deposito", label: "Depósito Bancario" },
  { value: "efectivo", label: "Efectivo" },
  { value: "cheque", label: "Cheque" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
];

const bancos = [
  { value: "bcp", label: "BCP" },
  { value: "bbva", label: "BBVA" },
  { value: "interbank", label: "Interbank" },
  { value: "scotiabank", label: "Scotiabank" },
  { value: "banbif", label: "BanBif" },
  { value: "pichincha", label: "Banco Pichincha" },
  { value: "nacion", label: "Banco de la Nación" },
  { value: "otro", label: "Otro" },
];

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
  allPayments = [],
}: RegisterPaymentDialogProps) {
  const [saving, setSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isRegistered, setIsRegistered] = useState(false);
  const [wasAlreadyPaid, setWasAlreadyPaid] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<PaymentForm>({
    status: "pagado",
    fecha_pago: format(new Date(), "yyyy-MM-dd"),
    tipo_comprobante: "factura",
    serie_comprobante: "",
    numero_comprobante: "",
    fecha_emision: format(new Date(), "yyyy-MM-dd"),
    subtotal: 0,
    tipo_igv: "gravado",
    igv: 0,
    monto: 0,
    detraccion_porcentaje: 0,
    detraccion_monto: 0,
    retencion_porcentaje: 0,
    retencion_monto: 0,
    monto_neto: 0,
    metodo_pago: "transferencia",
    banco: "",
    cuenta_bancaria: "",
    referencia: "",
    notas: "",
    observaciones_contables: "",
    glosa: "",
  });

  useEffect(() => {
    const loadPaymentData = async () => {
      if (!payment || !open) return;

      // Use the glosa from payment (already calculated with descripcion + cuota)
      const defaultGlosa = payment.glosa || `${payment.contrato.descripcion || payment.servicio || "Servicio"} - Cuota ${payment.cuota || 1}`;
      const isAlreadyPaid = payment.status === "pagado";
      setWasAlreadyPaid(isAlreadyPaid);

      if (isAlreadyPaid) {
        // Load existing payment data from database
        const { data: existingPayment, error } = await supabase
          .from("pagos")
          .select("*")
          .eq("id", payment.id)
          .single();

        if (!error && existingPayment) {
          // Use observaciones_contables as glosa if stored there, fallback to defaultGlosa
          const storedGlosa = existingPayment.observaciones_contables || defaultGlosa;

          setForm({
            status: existingPayment.status || "pagado",
            fecha_pago: existingPayment.fecha_pago || format(new Date(), "yyyy-MM-dd"),
            tipo_comprobante: existingPayment.tipo_comprobante || "factura",
            serie_comprobante: existingPayment.serie_comprobante || "",
            numero_comprobante: existingPayment.numero_comprobante || "",
            fecha_emision: existingPayment.fecha_emision || format(new Date(), "yyyy-MM-dd"),
            subtotal: existingPayment.subtotal || parseFloat((payment.monto / 1.18).toFixed(2)),
            tipo_igv: existingPayment.tipo_igv || "gravado",
            igv: existingPayment.igv || parseFloat((payment.monto - payment.monto / 1.18).toFixed(2)),
            monto: existingPayment.monto || payment.monto,
            detraccion_porcentaje: existingPayment.detraccion_porcentaje || 0,
            detraccion_monto: existingPayment.detraccion_monto || 0,
            retencion_porcentaje: existingPayment.retencion_porcentaje || 0,
            retencion_monto: existingPayment.retencion_monto || 0,
            monto_neto: existingPayment.monto_neto || payment.monto,
            metodo_pago: existingPayment.metodo_pago || "transferencia",
            banco: existingPayment.banco || "",
            cuenta_bancaria: existingPayment.cuenta_bancaria || "",
            referencia: existingPayment.referencia || "",
            notas: existingPayment.notas || "",
            observaciones_contables: "",
            glosa: storedGlosa,
          });
          setIsRegistered(true); // Show the corporate view for already paid payments
        }
      } else {
        // New payment registration
        const subtotal = payment.monto / 1.18;
        const igv = payment.monto - subtotal;

        setForm({
          status: "pagado",
          fecha_pago: format(new Date(), "yyyy-MM-dd"),
          tipo_comprobante: "factura",
          serie_comprobante: "",
          numero_comprobante: "",
          fecha_emision: format(new Date(), "yyyy-MM-dd"),
          subtotal: parseFloat(subtotal.toFixed(2)),
          tipo_igv: "gravado",
          igv: parseFloat(igv.toFixed(2)),
          monto: payment.monto,
          detraccion_porcentaje: 0,
          detraccion_monto: 0,
          retencion_porcentaje: 0,
          retencion_monto: 0,
          monto_neto: payment.monto,
          metodo_pago: payment.metodo_pago || "transferencia",
          banco: "",
          cuenta_bancaria: "",
          referencia: payment.referencia || "",
          notas: payment.notas || "",
          observaciones_contables: "",
          glosa: defaultGlosa,
        });
        setIsRegistered(false);
      }
      setCalendarMonth(parseLocalDate(payment.fecha_vencimiento));
    };

    loadPaymentData();
  }, [payment, open]);

  const isReciboInterno = form.tipo_comprobante === "recibo_interno";

  const calculateIGV = (subtotal: number, tipoIgv: string) => {
    if (tipoIgv === "gravado") {
      return parseFloat((subtotal * 0.18).toFixed(2));
    }
    return 0;
  };

  const handleSubtotalChange = (value: string) => {
    const subtotal = parseFloat(value) || 0;
    const igv = isReciboInterno ? 0 : calculateIGV(subtotal, form.tipo_igv);
    const monto = subtotal + igv;

    setForm((prev) => ({
      ...prev,
      subtotal,
      igv,
      monto,
      monto_neto: monto - prev.detraccion_monto - prev.retencion_monto,
    }));
  };

  const handleTipoIGVChange = (tipoIgv: string) => {
    const igv = calculateIGV(form.subtotal, tipoIgv);
    const monto = form.subtotal + igv;

    setForm((prev) => ({
      ...prev,
      tipo_igv: tipoIgv,
      igv,
      monto,
      monto_neto: monto - prev.detraccion_monto - prev.retencion_monto,
    }));
  };

  const handleDetraccionPorcentajeChange = (value: string) => {
    const porcentaje = parseFloat(value) || 0;
    const detraccionMonto = parseFloat(((form.monto * porcentaje) / 100).toFixed(2));

    setForm((prev) => ({
      ...prev,
      detraccion_porcentaje: porcentaje,
      detraccion_monto: detraccionMonto,
      monto_neto: form.monto - detraccionMonto - prev.retencion_monto,
    }));
  };

  const handleRetencionPorcentajeChange = (value: string) => {
    const porcentaje = parseFloat(value) || 0;
    const retencionMonto = parseFloat(((form.monto * porcentaje) / 100).toFixed(2));

    setForm((prev) => ({
      ...prev,
      retencion_porcentaje: porcentaje,
      retencion_monto: retencionMonto,
      monto_neto: form.monto - prev.detraccion_monto - retencionMonto,
    }));
  };

  const handleTipoComprobanteChange = (value: string) => {
    setForm((prev) => {
      if (value === "recibo_interno") {
        return {
          ...prev,
          tipo_comprobante: value,
          tipo_igv: "inafecto",
          igv: 0,
          monto: prev.subtotal,
          monto_neto: prev.subtotal,
          detraccion_porcentaje: 0,
          detraccion_monto: 0,
          retencion_porcentaje: 0,
          retencion_monto: 0,
        };
      }
      const igv = calculateIGV(prev.subtotal, "gravado");
      return {
        ...prev,
        tipo_comprobante: value,
        tipo_igv: "gravado",
        igv,
        monto: prev.subtotal + igv,
        monto_neto: prev.subtotal + igv,
      };
    });
  };

  const handleSave = async () => {
    if (!payment) return;

    if (!isReciboInterno && (!form.serie_comprobante.trim() || !form.numero_comprobante.trim())) {
      toast.error("Ingrese la serie y número del comprobante");
      return;
    }

    if (isReciboInterno && !form.numero_comprobante.trim()) {
      toast.error("Ingrese el número del recibo");
      return;
    }

    setSaving(true);

    const updateData: {
      status: "pagado" | "parcial" | "pendiente" | "vencido";
      fecha_pago: string;
      tipo_comprobante: string;
      serie_comprobante: string;
      numero_comprobante: string;
      fecha_emision: string;
      subtotal: number;
      tipo_igv: string;
      igv: number;
      monto: number;
      detraccion_porcentaje: number;
      detraccion_monto: number;
      retencion_porcentaje: number;
      retencion_monto: number;
      monto_neto: number;
      metodo_pago: string;
      banco: string | null;
      cuenta_bancaria: string | null;
      referencia: string | null;
      notas: string | null;
      observaciones_contables: string | null;
    } = {
      status: form.status as "pagado" | "parcial" | "pendiente" | "vencido",
      fecha_pago: form.fecha_pago,
      tipo_comprobante: form.tipo_comprobante,
      serie_comprobante: form.serie_comprobante.toUpperCase(),
      numero_comprobante: form.numero_comprobante,
      fecha_emision: form.fecha_emision,
      subtotal: form.subtotal,
      tipo_igv: form.tipo_igv,
      igv: form.igv,
      monto: form.monto,
      detraccion_porcentaje: form.detraccion_porcentaje,
      detraccion_monto: form.detraccion_monto,
      retencion_porcentaje: form.retencion_porcentaje,
      retencion_monto: form.retencion_monto,
      monto_neto: form.monto_neto,
      metodo_pago: form.metodo_pago,
      banco: form.banco || null,
      cuenta_bancaria: form.cuenta_bancaria || null,
      referencia: form.referencia || null,
      notas: form.notas || null,
      observaciones_contables: form.glosa || null, // Store glosa in observaciones_contables
    };

    const { error } = await supabase.from("pagos").update(updateData).eq("id", payment.id);

    if (error) {
      console.error("Error updating payment:", error);
      toast.error("Error al registrar el pago");
    } else {
      toast.success("Pago registrado correctamente");
      onSuccess();
      onOpenChange(false);
    }

    setSaving(false);
  };

  const formatCurrency = (amount: number, currency: string = "PEN") => {
    return `${currency === "PEN" ? "S/" : "$"} ${amount.toFixed(2)}`;
  };

  const getPaymentsForMonth = () => {
    if (!payment) return [];
    return allPayments.filter(
      (p) =>
        p.contrato_id === payment.contrato_id &&
        isSameMonth(parseLocalDate(p.fecha_vencimiento), calendarMonth)
    );
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const paymentsForMonth = getPaymentsForMonth();

    const startDay = monthStart.getDay();
    const emptyDays = Array(startDay).fill(null);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium capitalize">
            {format(calendarMonth, "MMMM yyyy", { locale: es })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const dayPayments = paymentsForMonth.filter((p) =>
              isSameDay(parseLocalDate(p.fecha_vencimiento), day)
            );
            const isCurrentPayment = payment && isSameDay(parseLocalDate(payment.fecha_vencimiento), day);

            return (
              <div
                key={day.toISOString()}
                className={`aspect-square flex flex-col items-center justify-center rounded-md text-xs relative ${
                  isCurrentPayment
                    ? "bg-primary text-primary-foreground font-bold"
                    : dayPayments.length > 0
                    ? "bg-amber-100 text-amber-800"
                    : "hover:bg-muted"
                }`}
              >
                <span>{format(day, "d")}</span>
                {dayPayments.length > 0 && !isCurrentPayment && (
                  <span className="absolute bottom-0.5 text-[8px]">
                    {formatCurrency(dayPayments.reduce((sum, p) => sum + p.monto, 0), payment?.contrato.moneda)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 space-y-1">
          {paymentsForMonth.map((p) => (
            <div
              key={p.id}
              className={`flex justify-between items-center text-xs p-2 rounded ${
                p.id === payment?.id ? "bg-primary/10 border border-primary" : "bg-muted/50"
              }`}
            >
              <span>{format(parseLocalDate(p.fecha_vencimiento), "dd MMM", { locale: es })}</span>
              <span>{p.servicio || "Cuota"} #{p.cuota}</span>
              <Badge variant={p.status === "pagado" ? "default" : "outline"} className="text-xs">
                {formatCurrency(p.monto, p.contrato.moneda)}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const exportSummaryPDF = async () => {
    if (!summaryRef.current) return;

    const canvas = await html2canvas(summaryRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    pdf.save(`resumen-pago-${payment?.contrato.numero}-${form.numero_comprobante}.pdf`);
    toast.success("Resumen exportado correctamente");
  };

  const exportReceiptPDF = async () => {
    if (!receiptRef.current) return;

    const canvas = await html2canvas(receiptRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    pdf.save(`recibo-interno-${form.numero_comprobante}.pdf`);
    toast.success("Recibo emitido correctamente");
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {isRegistered 
              ? "Detalle del Pago Registrado" 
              : wasAlreadyPaid 
                ? "Editar Pago"
                : "Registrar Pago"}
          </DialogTitle>
          <DialogDescription>
            {isRegistered
              ? "Vista corporativa del pago registrado"
              : wasAlreadyPaid
                ? "Modifique los datos del pago registrado"
                : "Complete los datos del comprobante y pago para generar el registro de ventas"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {isRegistered ? (
            // Vista Corporativa Completa del Pago Registrado
            <div className="space-y-4">
              <div ref={summaryRef} className="bg-white p-8 rounded-lg border-2 border-primary/20 shadow-sm">
                {/* Header Corporativo */}
                <div className="flex items-center justify-between border-b-2 border-primary/20 pb-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-primary">COMPROBANTE DE PAGO</h2>
                      <p className="text-muted-foreground">Registro Contable Verificado</p>
                    </div>
                  </div>
                  <div className="text-right bg-primary/5 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha de Registro</p>
                    <p className="text-lg font-bold text-primary">
                      {format(new Date(), "dd/MM/yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(), "HH:mm", { locale: es })} hrs
                    </p>
                  </div>
                </div>

                {/* Grid de Información */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                  {/* Datos del Cliente */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-primary/30 pb-2">
                      Datos del Cliente
                    </h3>
                    <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Razón Social</p>
                        <p className="font-semibold">{payment.contrato.cliente.razon_social}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">RUC</p>
                        <p className="font-medium">{payment.contrato.cliente.codigo}</p>
                      </div>
                      {payment.contrato.cliente.direccion && (
                        <div>
                          <p className="text-xs text-muted-foreground">Dirección</p>
                          <p className="text-sm">{payment.contrato.cliente.direccion}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Datos del Comprobante */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-primary/30 pb-2">
                      Datos del Comprobante
                    </h3>
                    <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Tipo:</span>
                        <Badge variant="secondary">
                          {tiposComprobante.find((t) => t.value === form.tipo_comprobante)?.label}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Número:</span>
                        <span className="font-bold">
                          {form.serie_comprobante ? `${form.serie_comprobante}-` : ""}{form.numero_comprobante}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Fecha Emisión:</span>
                        <span className="font-medium">
                          {format(parseLocalDate(form.fecha_emision), "dd/MM/yyyy")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Tipo IGV:</span>
                        <span className="font-medium">
                          {tiposIGV.find((t) => t.value === form.tipo_igv)?.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Datos del Pago */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-primary/30 pb-2">
                      Datos del Pago
                    </h3>
                    <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Estado:</span>
                        <Badge className="bg-green-600">{form.status.toUpperCase()}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Fecha Pago:</span>
                        <span className="font-medium">
                          {format(parseLocalDate(form.fecha_pago), "dd/MM/yyyy")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Método:</span>
                        <span className="font-medium">
                          {metodosPago.find((m) => m.value === form.metodo_pago)?.label}
                        </span>
                      </div>
                      {form.banco && (
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Banco:</span>
                          <span className="font-medium">
                            {bancos.find((b) => b.value === form.banco)?.label}
                          </span>
                        </div>
                      )}
                      {form.cuenta_bancaria && (
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Cuenta:</span>
                          <span className="font-medium text-xs">{form.cuenta_bancaria}</span>
                        </div>
                      )}
                      {form.referencia && (
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Referencia:</span>
                          <span className="font-medium text-xs">{form.referencia}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Referencia del Contrato y Glosa */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-primary/30 pb-2">
                      Referencia del Contrato
                    </h3>
                    <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Contrato N°:</span>
                        <span className="font-bold">{payment.contrato.numero}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Fecha Vencimiento:</span>
                        <span className="font-medium">
                          {format(parseLocalDate(payment.fecha_vencimiento), "dd/MM/yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-primary/30 pb-2">
                      Glosa / Descripción
                    </h3>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm">{form.glosa || "Sin descripción"}</p>
                    </div>
                  </div>
                </div>

                {/* Detalle de Montos */}
                <div className="border-t-2 border-primary/20 pt-6">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">
                    Detalle de Montos
                  </h3>
                  <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-6 rounded-xl">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-medium text-lg">{formatCurrency(form.subtotal, payment.contrato.moneda)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">IGV ({form.tipo_igv}):</span>
                          <span className="font-medium text-lg">{formatCurrency(form.igv, payment.contrato.moneda)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Total Comprobante:</span>
                          <span className="font-bold text-xl">{formatCurrency(form.monto, payment.contrato.moneda)}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {form.detraccion_monto > 0 && (
                          <div className="flex justify-between items-center text-orange-600">
                            <span>Detracción ({form.detraccion_porcentaje}%):</span>
                            <span className="font-medium">-{formatCurrency(form.detraccion_monto, payment.contrato.moneda)}</span>
                          </div>
                        )}
                        {form.retencion_monto > 0 && (
                          <div className="flex justify-between items-center text-orange-600">
                            <span>Retención ({form.retencion_porcentaje}%):</span>
                            <span className="font-medium">-{formatCurrency(form.retencion_monto, payment.contrato.moneda)}</span>
                          </div>
                        )}
                        {(form.detraccion_monto > 0 || form.retencion_monto > 0) && <Separator />}
                        <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg">
                          <span className="font-bold text-primary">MONTO NETO RECIBIDO:</span>
                          <span className="font-bold text-2xl text-primary">{formatCurrency(form.monto_neto, payment.contrato.moneda)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notas y Observaciones */}
                {(form.notas || form.observaciones_contables) && (
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    {form.notas && (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Notas</p>
                        <p className="text-sm">{form.notas}</p>
                      </div>
                    )}
                    {form.observaciones_contables && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs font-semibold text-amber-800 uppercase mb-2">Observaciones Contables</p>
                        <p className="text-sm text-amber-700">{form.observaciones_contables}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Corporativo */}
                <div className="mt-6 pt-4 border-t border-dashed border-muted-foreground/30 text-center">
                  <p className="text-xs text-muted-foreground">
                    Documento generado por el Sistema de Gestión Contable • Contadores & Auditores Arequipa
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <Button onClick={exportSummaryPDF} variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          ) : (
            // Formulario de Registro
            <div className="grid grid-cols-3 gap-6">
              {/* Columna Principal - Formulario */}
              <div className="col-span-2 space-y-4">
                {/* Información del contexto */}
                <Card className="bg-gradient-to-r from-muted/30 to-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Contrato</p>
                        <p className="font-medium">{payment.contrato.numero}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cliente</p>
                        <p className="font-medium truncate">{payment.contrato.cliente.razon_social}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">RUC</p>
                        <p className="font-medium">{payment.contrato.cliente.codigo}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vencimiento</p>
                        <p className="font-medium">
                          {format(parseLocalDate(payment.fecha_vencimiento), "dd MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Glosa */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Glosa (Detalle del Servicio y Cuota)
                  </Label>
                  <Textarea
                    value={form.glosa}
                    onChange={(e) => setForm((prev) => ({ ...prev, glosa: e.target.value }))}
                    placeholder="Descripción detallada del servicio y cuota..."
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <Tabs defaultValue="comprobante" className="w-full">
                  <TabsList className={`grid w-full ${isReciboInterno ? "grid-cols-2" : "grid-cols-3"}`}>
                    <TabsTrigger value="comprobante" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Comprobante
                    </TabsTrigger>
                    {!isReciboInterno && (
                      <TabsTrigger value="montos" className="gap-2">
                        <Calculator className="h-4 w-4" />
                        Montos
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="pago" className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      Pago
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab Comprobante */}
                  <TabsContent value="comprobante" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de Comprobante</Label>
                        <Select value={form.tipo_comprobante} onValueChange={handleTipoComprobanteChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposComprobante.map((tipo) => (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                {tipo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Fecha de Emisión</Label>
                        <Input
                          type="date"
                          value={form.fecha_emision}
                          onChange={(e) => setForm((prev) => ({ ...prev, fecha_emision: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {!isReciboInterno && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Serie
                          </Label>
                          <Input
                            value={form.serie_comprobante}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, serie_comprobante: e.target.value.toUpperCase() }))
                            }
                            placeholder="Ej: F001"
                            className="uppercase"
                          />
                        </div>
                      )}

                      <div className={`space-y-2 ${isReciboInterno ? "col-span-2" : ""}`}>
                        <Label className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          {isReciboInterno ? "Número de Recibo" : "Número"}
                        </Label>
                        <Input
                          value={form.numero_comprobante}
                          onChange={(e) => setForm((prev) => ({ ...prev, numero_comprobante: e.target.value }))}
                          placeholder={isReciboInterno ? "Ej: 0001" : "Ej: 00000123"}
                        />
                      </div>
                    </div>

                    {isReciboInterno && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Monto del Recibo</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={form.subtotal}
                            onChange={(e) => {
                              const monto = parseFloat(e.target.value) || 0;
                              setForm((prev) => ({
                                ...prev,
                                subtotal: monto,
                                monto: monto,
                                monto_neto: monto,
                              }));
                            }}
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="flex-1 p-3 bg-primary/10 rounded-md">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-xl font-bold text-primary">
                              {formatCurrency(form.monto, payment.contrato.moneda)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isReciboInterno && (
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <p className="text-sm text-amber-700">
                          Asegúrese de ingresar correctamente la serie y número del comprobante para el
                          registro de ventas.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab Montos - Solo si no es Recibo Interno */}
                  {!isReciboInterno && (
                    <TabsContent value="montos" className="space-y-4 mt-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Montos Base
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Subtotal (Base Imponible)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={form.subtotal}
                                onChange={(e) => handleSubtotalChange(e.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Tipo IGV</Label>
                              <Select value={form.tipo_igv} onValueChange={handleTipoIGVChange}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {tiposIGV.map((tipo) => (
                                    <SelectItem key={tipo.value} value={tipo.value}>
                                      {tipo.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>IGV</Label>
                              <Input type="number" step="0.01" value={form.igv} readOnly className="bg-muted" />
                            </div>
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-md">
                            <span className="font-medium">Total Comprobante</span>
                            <span className="text-xl font-bold text-primary">
                              {formatCurrency(form.monto, payment.contrato.moneda)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Detracciones y Retenciones
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <Label className="text-muted-foreground">Detracción</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Porcentaje %</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={form.detraccion_porcentaje}
                                    onChange={(e) => handleDetraccionPorcentajeChange(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Monto</Label>
                                  <Input
                                    type="number"
                                    value={form.detraccion_monto}
                                    readOnly
                                    className="bg-muted"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <Label className="text-muted-foreground">Retención</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Porcentaje %</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={form.retencion_porcentaje}
                                    onChange={(e) => handleRetencionPorcentajeChange(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Monto</Label>
                                  <Input
                                    type="number"
                                    value={form.retencion_monto}
                                    readOnly
                                    className="bg-muted"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                            <span className="font-medium text-green-700">Monto Neto a Recibir</span>
                            <span className="text-xl font-bold text-green-700">
                              {formatCurrency(form.monto_neto, payment.contrato.moneda)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {/* Tab Pago */}
                  <TabsContent value="pago" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Estado del Pago</Label>
                        <Select
                          value={form.status}
                          onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pagado">Pagado</SelectItem>
                            <SelectItem value="parcial">Parcial</SelectItem>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Fecha de Pago
                        </Label>
                        <Input
                          type="date"
                          value={form.fecha_pago}
                          onChange={(e) => setForm((prev) => ({ ...prev, fecha_pago: e.target.value }))}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Método de Pago</Label>
                        <Select
                          value={form.metodo_pago}
                          onValueChange={(value) => setForm((prev) => ({ ...prev, metodo_pago: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {metodosPago.map((metodo) => (
                              <SelectItem key={metodo.value} value={metodo.value}>
                                {metodo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Banco
                        </Label>
                        <Select
                          value={form.banco}
                          onValueChange={(value) => setForm((prev) => ({ ...prev, banco: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar banco" />
                          </SelectTrigger>
                          <SelectContent>
                            {bancos.map((banco) => (
                              <SelectItem key={banco.value} value={banco.value}>
                                {banco.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cuenta Bancaria</Label>
                        <Input
                          value={form.cuenta_bancaria}
                          onChange={(e) => setForm((prev) => ({ ...prev, cuenta_bancaria: e.target.value }))}
                          placeholder="Número de cuenta"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Referencia / Nro. Operación</Label>
                        <Input
                          value={form.referencia}
                          onChange={(e) => setForm((prev) => ({ ...prev, referencia: e.target.value }))}
                          placeholder="Número de operación, voucher, etc."
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Notas</Label>
                      <Textarea
                        value={form.notas}
                        onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
                        placeholder="Notas adicionales del pago..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Observaciones Contables</Label>
                      <Textarea
                        value={form.observaciones_contables}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, observaciones_contables: e.target.value }))
                        }
                        placeholder="Observaciones para el área contable..."
                        rows={2}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Columna Lateral - Calendario */}
              <div className="space-y-4">
                <Collapsible open={showCalendar} onOpenChange={setShowCalendar}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full gap-2">
                      {showCalendar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <Calendar className="h-4 w-4" />
                      Calendario de Pagos
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Pagos del Contrato</CardTitle>
                      </CardHeader>
                      <CardContent>{renderCalendar()}</CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>

                {/* Recibo Interno Preview */}
                {isReciboInterno && (
                  <Card className="border-2 border-dashed border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-primary" />
                        Vista Previa Recibo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        ref={receiptRef}
                        className="bg-white p-4 rounded border text-xs space-y-3"
                      >
                        <div className="text-center border-b pb-2">
                          <h3 className="font-bold text-primary text-sm">RECIBO INTERNO</h3>
                          <p className="text-muted-foreground">N° {form.numero_comprobante || "---"}</p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fecha:</span>
                            <span>{format(new Date(form.fecha_emision), "dd/MM/yyyy")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cliente:</span>
                            <span className="font-medium truncate max-w-[120px]">
                              {payment.contrato.cliente.razon_social}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">RUC:</span>
                            <span>{payment.contrato.cliente.codigo}</span>
                          </div>
                        </div>

                        <div className="border-t pt-2">
                          <p className="text-muted-foreground mb-1">Concepto:</p>
                          <p className="font-medium">{form.glosa || "---"}</p>
                        </div>

                        <div className="border-t pt-2 flex justify-between items-center">
                          <span className="font-bold">TOTAL:</span>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(form.monto, payment.contrato.moneda)}
                          </span>
                        </div>

                        <div className="border-t pt-2 text-center text-muted-foreground">
                          <p>Contadores & Auditores Arequipa</p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 gap-2"
                        onClick={exportReceiptPDF}
                        disabled={!form.numero_comprobante}
                      >
                        <Printer className="h-4 w-4" />
                        Emitir Recibo PDF
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Resumen Rápido */}
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Resumen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(form.subtotal, payment.contrato.moneda)}</span>
                    </div>
                    {!isReciboInterno && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IGV:</span>
                        <span>{formatCurrency(form.igv, payment.contrato.moneda)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(form.monto, payment.contrato.moneda)}</span>
                    </div>
                    {!isReciboInterno && (form.detraccion_monto > 0 || form.retencion_monto > 0) && (
                      <>
                        <Separator />
                        <div className="flex justify-between text-green-600 font-bold">
                          <span>Neto:</span>
                          <span>{formatCurrency(form.monto_neto, payment.contrato.moneda)}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 pt-4 border-t">
          {isRegistered ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-2" />
                Cerrar
              </Button>
              <Button onClick={() => setIsRegistered(false)} className="gap-2">
                <FileText className="h-4 w-4" />
                Editar Pago
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : wasAlreadyPaid ? (
                  <>
                    <FileText className="h-4 w-4" />
                    Guardar Cambios
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4" />
                    Registrar Pago
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
