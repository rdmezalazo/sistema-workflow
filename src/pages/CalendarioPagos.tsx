import { useState, useEffect, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  CreditCard,
  Search,
  Filter,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  Loader2,
  DollarSign,
  TrendingUp,
  Building2,
  FileText,
  LayoutList,
  CalendarDays,
  Bell,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/utils";
import { PaymentCalendarView } from "@/components/calendario-pagos/PaymentCalendarView";
import { RegisterPaymentDialog } from "@/components/calendario-pagos/RegisterPaymentDialog";
import { ContractCalendarModal } from "@/components/calendario-pagos/ContractCalendarModal";
import { usePaymentNotifications } from "@/hooks/usePaymentNotifications";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ExportExcelButton } from "@/components/ui/ExportExcelButton";
import { useSedeContext } from "@/hooks/useSedeContext";

type DateFilterType = "Hoy" | "Semana Actual" | "Mes Actual" | "Mes" | "Año" | "Todo";

interface Payment {
  id: string;
  contrato_id: string;
  monto: number;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  status: "pendiente" | "pagado" | "vencido" | "parcial";
  metodo_pago: string | null;
  referencia: string | null;
  notas: string | null;
  contrato: {
    numero: string;
    moneda: string;
    cliente: {
      razon_social: string;
      codigo: string;
    };
  };
}

// Unified payment item for display (includes both real payments and projected)
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
  sede_id?: string | null;
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

interface PaymentStats {
  total: number;
  pendientes: number;
  pagados: number;
  vencidos: number;
  proyectados: number;
  montoPendiente: number;
  montoPagado: number;
  montoProyectado: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  pagado: { label: "Pagado", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  vencido: { label: "Vencido", color: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
  parcial: { label: "Parcial", color: "bg-blue-100 text-blue-800 border-blue-200", icon: TrendingUp },
  proyectado: { label: "Proyectado", color: "bg-purple-100 text-purple-800 border-purple-200", icon: FileText },
};

export default function CalendarioPagos() {
  const { activeSedeId } = useSedeContext();
  const [realPayments, setRealPayments] = useState<Payment[]>([]);
  const [unifiedPayments, setUnifiedPayments] = useState<UnifiedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [sourceFilter, setSourceFilter] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("Hoy");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const getDateRange = (filter: DateFilterType): { start: Date; end: Date } | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    switch (filter) {
      case "Hoy":
        return { start: today, end: endOfToday };
      case "Semana Actual":
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
      case "Mes Actual":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "Mes":
        const monthDate = new Date(selectedYear, selectedMonth, 1);
        return { start: startOfMonth(monthDate), end: endOfMonth(monthDate) };
      case "Año":
        const yearDate = new Date(selectedYear, 0, 1);
        return { start: startOfYear(yearDate), end: endOfYear(yearDate) };
      case "Todo":
        return null;
      default:
        return null;
    }
  };
  const [stats, setStats] = useState<PaymentStats>({
    total: 0,
    pendientes: 0,
    pagados: 0,
    vencidos: 0,
    proyectados: 0,
    montoPendiente: 0,
    montoPagado: 0,
    montoProyectado: 0,
  });

  const { getPaymentNotificationStatus } = usePaymentNotifications();

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<UnifiedPayment | null>(null);
  const [editForm, setEditForm] = useState({
    status: "",
    fecha_pago: "",
    metodo_pago: "",
    referencia: "",
    notas: "",
  });
  const [saving, setSaving] = useState(false);

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailPayment, setDetailPayment] = useState<UnifiedPayment | null>(null);

  // Register payment dialog state
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [paymentToRegister, setPaymentToRegister] = useState<UnifiedPayment | null>(null);

  // Contract calendar modal state
  const [contractCalendarOpen, setContractCalendarOpen] = useState(false);
  const [selectedContractPayments, setSelectedContractPayments] = useState<UnifiedPayment[]>([]);

  const handleViewContractCalendar = (payment: UnifiedPayment) => {
    // Get all payments for this contract
    const contractPayments = unifiedPayments.filter(
      p => p.contrato_id === payment.contrato_id
    );
    setSelectedContractPayments(contractPayments);
    setContractCalendarOpen(true);
  };

  const handleRegisterPayment = (payment: UnifiedPayment) => {
    if (payment.isProjected) {
      toast.info("Los pagos proyectados no se pueden registrar. Primero apruebe el contrato.");
      return;
    }
    setPaymentToRegister(payment);
    setRegisterDialogOpen(true);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);

    // Fetch real payments from pagos table (paginated to bypass 1000-row default limit)
    const pageSize = 1000;
    let pagosData: any[] = [];
    let pagosError: any = null;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("pagos")
        .select(`
          *,
          contrato:contratos(
            numero,
            moneda,
            status,
            descripcion,
            sede_id,
            cliente:clientes(razon_social, codigo)
          )
        `)
        .order("fecha_vencimiento", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) { pagosError = error; break; }
      pagosData = pagosData.concat(data || []);
      if (!data || data.length < pageSize) break;
    }

    // Fetch all contracts with their payment schedules
    const { data: contratosData, error: contratosError } = await supabase
      .from("contratos")
      .select(`
        id,
        numero,
        moneda,
        status,
        descripcion,
        datos_plantilla,
        sede_id,
        cliente:clientes(razon_social, codigo)
      `)
      .not("datos_plantilla", "is", null);

    if (pagosError || contratosError) {
      console.error("Error fetching data:", pagosError || contratosError);
      toast.error("Error al cargar los pagos");
      setLoading(false);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group payments by contract_id first, then sort by fecha_vencimiento to assign cuota numbers
    const paymentsByContract: Record<string, any[]> = {};
    (pagosData || []).forEach((payment: any) => {
      if (!paymentsByContract[payment.contrato_id]) {
        paymentsByContract[payment.contrato_id] = [];
      }
      paymentsByContract[payment.contrato_id].push(payment);
    });

    // Sort each contract's payments by fecha_vencimiento
    Object.keys(paymentsByContract).forEach((contratoId) => {
      paymentsByContract[contratoId].sort((a, b) => 
        parseLocalDate(a.fecha_vencimiento).getTime() - parseLocalDate(b.fecha_vencimiento).getTime()
      );
    });

    // Process real payments with correct cuota numbers based on chronological order
    const realPaymentsProcessed: UnifiedPayment[] = (pagosData || [])
      .filter((payment: any) => payment.contrato?.status !== "anulado")
      .map((payment) => {
      const dueDate = parseLocalDate(payment.fecha_vencimiento);
      dueDate.setHours(0, 0, 0, 0);
      
      let status = payment.status as UnifiedPayment["status"];
      if (status === "pendiente" && dueDate < today) {
        status = "vencido";
      }

      // Find cuota number based on position in sorted list for this contract
      const contractPayments = paymentsByContract[payment.contrato_id] || [];
      const cuotaNumber = contractPayments.findIndex((p: any) => p.id === payment.id) + 1;
      
      const descripcionContrato = payment.contrato?.descripcion || "";
      const glosaGenerada = `${descripcionContrato}${descripcionContrato ? " - " : ""}Cuota ${cuotaNumber}`;

      return {
        id: payment.id,
        contrato_id: payment.contrato_id,
        monto: payment.monto,
        fecha_vencimiento: payment.fecha_vencimiento,
        fecha_pago: payment.fecha_pago,
        status,
        metodo_pago: payment.metodo_pago,
        referencia: payment.referencia,
        notas: payment.notas,
        servicio: descripcionContrato || null,
        cuota: cuotaNumber,
        glosa: glosaGenerada,
        isProjected: false,
        sede_id: payment.sede_id || payment.contrato?.sede_id || null,
        contrato: {
          numero: payment.contrato?.numero || "",
          moneda: payment.contrato?.moneda || "PEN",
          status: payment.contrato?.status || "",
          descripcion: descripcionContrato,
          cliente: {
            razon_social: payment.contrato?.cliente?.razon_social || "",
            codigo: payment.contrato?.cliente?.codigo || "",
          },
        },
      };
    });

    // Get IDs of contracts that already have real payments
    const contractsWithRealPayments = new Set(realPaymentsProcessed.map(p => p.contrato_id));

    // Process projected payments from contracts that don't have real payments yet
    const projectedPayments: UnifiedPayment[] = [];
    
    (contratosData || []).forEach((contrato: any) => {
      // Skip annulled contracts
      if (contrato.status === "anulado") return;
      // Skip contracts that already have real payments
      if (contractsWithRealPayments.has(contrato.id)) return;
      
      // Skip if no payment schedule
      const paymentSchedule = contrato.datos_plantilla?.payment_schedule;
      if (!paymentSchedule || !Array.isArray(paymentSchedule)) return;

      paymentSchedule.forEach((scheduleItem: any, index: number) => {
        // Normalize fecha to YYYY-MM-DD without timezone shift
        let fechaVencimiento: string | null = null;
        if (scheduleItem.fecha) {
          const raw = String(scheduleItem.fecha);
          // If already in YYYY-MM-DD or ISO format, just take the date part
          const datePart = raw.split("T")[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            fechaVencimiento = datePart;
          } else {
            const d = parseLocalDate(raw);
            if (!isNaN(d.getTime())) {
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              const dd = String(d.getDate()).padStart(2, "0");
              fechaVencimiento = `${yyyy}-${mm}-${dd}`;
            }
          }
        }
        if (!fechaVencimiento) return;

        const cuotaNumber = scheduleItem.cuota || index + 1;
        const descripcionContrato = contrato.descripcion || "";
        const glosaGenerada = `${descripcionContrato}${descripcionContrato ? " - " : ""}Cuota ${cuotaNumber}`;

        projectedPayments.push({
          id: `proj-${contrato.id}-${index}`,
          contrato_id: contrato.id,
          monto: scheduleItem.monto || 0,
          fecha_vencimiento: fechaVencimiento,
          fecha_pago: null,
          status: "proyectado",
          metodo_pago: null,
          referencia: null,
          notas: null,
          servicio: descripcionContrato || null,
          cuota: cuotaNumber,
          glosa: glosaGenerada,
          isProjected: true,
          sede_id: contrato.sede_id || null,
          contrato: {
            numero: contrato.numero || "",
            moneda: contrato.moneda || "PEN",
            status: contrato.status || "",
            descripcion: descripcionContrato,
            cliente: {
              razon_social: contrato.cliente?.razon_social || "",
              codigo: contrato.cliente?.codigo || "",
            },
          },
        });
      });
    });

    // Combine and sort all payments
    const allPayments = [...realPaymentsProcessed, ...projectedPayments].sort((a, b) => 
      parseLocalDate(a.fecha_vencimiento).getTime() - parseLocalDate(b.fecha_vencimiento).getTime()
    );

    setRealPayments(pagosData as Payment[]);
    setUnifiedPayments(allPayments);

    // Calculate stats
    const statsData: PaymentStats = {
      total: allPayments.length,
      pendientes: allPayments.filter((p) => p.status === "pendiente").length,
      pagados: allPayments.filter((p) => p.status === "pagado").length,
      vencidos: allPayments.filter((p) => p.status === "vencido").length,
      proyectados: allPayments.filter((p) => p.status === "proyectado").length,
      montoPendiente: allPayments
        .filter((p) => p.status === "pendiente" || p.status === "vencido")
        .reduce((sum, p) => sum + (p.monto || 0), 0),
      montoPagado: allPayments
        .filter((p) => p.status === "pagado")
        .reduce((sum, p) => sum + (p.monto || 0), 0),
      montoProyectado: allPayments
        .filter((p) => p.status === "proyectado")
        .reduce((sum, p) => sum + (p.monto || 0), 0),
    };
    setStats(statsData);

    setLoading(false);
  };

  const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter, selectedMonth, selectedYear]);

  const filteredPayments = useMemo(() => {
    return unifiedPayments.filter((payment) => {
      // Sede filter
      if (activeSedeId && payment.sede_id !== activeSedeId) {
        return false;
      }
      const matchesSearch =
        payment.contrato?.numero?.toLowerCase().includes(search.toLowerCase()) ||
        payment.contrato?.cliente?.razon_social?.toLowerCase().includes(search.toLowerCase()) ||
        payment.contrato?.cliente?.codigo?.toLowerCase().includes(search.toLowerCase()) ||
        payment.servicio?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "todos" || payment.status === statusFilter;
      
      const matchesSource = 
        sourceFilter === "todos" || 
        (sourceFilter === "reales" && !payment.isProjected) ||
        (sourceFilter === "proyectados" && payment.isProjected);

      // Date filter: for paid payments use fecha_pago, otherwise use fecha_vencimiento
      let matchesDate = true;
      if (dateRange) {
        // For paid payments, filter by fecha_pago; for others, use fecha_vencimiento
        const dateToFilter = (payment.status === "pagado" && payment.fecha_pago) 
          ? payment.fecha_pago 
          : payment.fecha_vencimiento;
        
        if (dateToFilter) {
          // Parse date manually to avoid timezone issues
          const parts = dateToFilter.split('T')[0].split('-');
          const paymentDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          matchesDate = isWithinInterval(paymentDate, { start: dateRange.start, end: dateRange.end });
        }
      }

      return matchesSearch && matchesStatus && matchesSource && matchesDate;
    });
  }, [unifiedPayments, search, statusFilter, sourceFilter, dateRange, activeSedeId]);

  const handleEditPayment = (payment: UnifiedPayment) => {
    if (payment.isProjected) {
      toast.info("Los pagos proyectados no se pueden editar. Primero apruebe el contrato.");
      return;
    }
    setSelectedPayment(payment);
    setEditForm({
      status: payment.status,
      fecha_pago: payment.fecha_pago || "",
      metodo_pago: payment.metodo_pago || "",
      referencia: payment.referencia || "",
      notas: payment.notas || "",
    });
    setEditDialogOpen(true);
  };

  const handleViewDetail = (payment: UnifiedPayment) => {
    setDetailPayment(payment);
    setDetailDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPayment) return;

    setSaving(true);

    const updateData: Record<string, unknown> = {
      status: editForm.status,
      metodo_pago: editForm.metodo_pago || null,
      referencia: editForm.referencia || null,
      notas: editForm.notas || null,
    };

    if (editForm.status === "pagado" && editForm.fecha_pago) {
      updateData.fecha_pago = editForm.fecha_pago;
    } else if (editForm.status !== "pagado") {
      updateData.fecha_pago = null;
    }

    const { error } = await supabase
      .from("pagos")
      .update(updateData)
      .eq("id", selectedPayment.id);

    if (error) {
      console.error("Error updating payment:", error);
      toast.error("Error al actualizar el pago");
    } else {
      toast.success("Pago actualizado correctamente");
      setEditDialogOpen(false);
      fetchPayments();
    }

    setSaving(false);
  };

  const formatCurrency = (amount: number, currency: string = "PEN") => {
    return `${currency === "PEN" ? "S/" : "$"} ${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendario de Pagos</h1>
          <p className="text-muted-foreground">
            Gestiona y da seguimiento a los pagos de los contratos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <ExportExcelButton
            allRows={unifiedPayments}
            filteredRows={filteredPayments}
            fileName="calendario_pagos"
            sheetName="Pagos"
            columns={[
              { header: "Contrato", accessor: (p) => p.contrato?.numero ?? "" },
              { header: "Cliente", accessor: (p) => p.contrato?.cliente?.razon_social ?? "" },
              { header: "RUC/DNI", accessor: (p) => p.contrato?.cliente?.codigo ?? "" },
              { header: "Servicio", accessor: (p) => p.servicio ?? "" },
              { header: "Cuota", accessor: (p) => p.cuota ?? "" },
              { header: "Fecha Vencimiento", accessor: (p) => p.fecha_vencimiento },
              { header: "Fecha Pago", accessor: (p) => p.fecha_pago ?? "" },
              { header: "Moneda", accessor: (p) => p.contrato?.moneda ?? "" },
              { header: "Monto", accessor: (p) => Number(p.monto) },
              { header: "Estado", accessor: (p) => p.status },
              { header: "Método Pago", accessor: (p) => p.metodo_pago ?? "" },
              { header: "Referencia", accessor: (p) => p.referencia ?? "" },
              { header: "Glosa", accessor: (p) => p.glosa ?? "" },
              { header: "Notas", accessor: (p) => p.notas ?? "" },
              { header: "Tipo Registro", accessor: (p) => (p.isProjected ? "Proyectado" : "Real") },
            ]}
          />
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "calendar")}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="table" className="gap-2">
                <LayoutList className="h-4 w-4" />
                Tabla
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendario
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter("todos")}
          className={`text-left rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 ${statusFilter === "todos" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pagos</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "pagado" ? "todos" : "pagado")}
          className={`text-left rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 ${statusFilter === "pagado" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pagados</p>
              <p className="text-2xl font-bold text-green-600">{stats.pagados}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "pendiente" ? "todos" : "pendiente")}
          className={`text-left rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 ${statusFilter === "pendiente" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pendientes}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "vencido" ? "todos" : "vencido")}
          className={`text-left rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 ${statusFilter === "vencido" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Vencidos</p>
              <p className="text-2xl font-bold text-red-600">{stats.vencidos}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </button>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monto Pendiente</p>
                <p className="text-2xl font-bold">S/ {stats.montoPendiente.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" value={dateFilter} onValueChange={(v) => v && setDateFilter(v as DateFilterType)}>
          <ToggleGroupItem value="Hoy" aria-label="Hoy" className="text-xs">
            Hoy
          </ToggleGroupItem>
          <ToggleGroupItem value="Semana Actual" aria-label="Semana Actual" className="text-xs">
            Semana Actual
          </ToggleGroupItem>
          <ToggleGroupItem value="Mes Actual" aria-label="Mes Actual" className="text-xs">
            Mes Actual
          </ToggleGroupItem>
          <ToggleGroupItem value="Mes" aria-label="Mes" className="text-xs">
            Mes
          </ToggleGroupItem>
          <ToggleGroupItem value="Año" aria-label="Año" className="text-xs">
            Año
          </ToggleGroupItem>
          <ToggleGroupItem value="Todo" aria-label="Todo" className="text-xs">
            Todo
          </ToggleGroupItem>
        </ToggleGroup>

        {(dateFilter === "Mes" || dateFilter === "Año") && (
          <div className="flex items-center gap-2">
            {dateFilter === "Mes" && (
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {format(new Date(2024, i, 1), "MMMM", { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[90px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        <Badge variant="secondary" className="ml-2">
          {filteredPayments.length} resultado{filteredPayments.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por contrato, cliente, RUC o servicio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="proyectado">Proyectado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px]">
                <FileText className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Fuente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las fuentes</SelectItem>
                <SelectItem value="reales">Pagos Reales</SelectItem>
                <SelectItem value="proyectados">Proyecciones</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content based on view mode */}
      {viewMode === "calendar" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Vista Calendario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentCalendarView
              payments={filteredPayments}
              onPaymentClick={handleViewDetail}
              formatCurrency={formatCurrency}
            />
          </CardContent>
        </Card>
      ) : (
        /* Payments Table */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario de Pagos Consolidado
              <Badge variant="secondary" className="ml-2">
                {filteredPayments.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay pagos registrados</p>
                <p className="text-sm">Los pagos se generan automáticamente al aprobar un contrato</p>
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Servicio / Cuota</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Pago</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => {
                      const StatusIcon = statusConfig[payment.status]?.icon || Clock;
                      const notifStatus = getPaymentNotificationStatus(
                        payment.fecha_vencimiento,
                        payment.status
                      );
                      
                      return (
                        <TableRow 
                          key={payment.id} 
                          className={payment.isProjected ? "bg-muted/30" : ""}
                          style={
                            notifStatus.shouldNotify
                              ? { borderLeft: `4px solid ${notifStatus.color}` }
                              : undefined
                          }
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {notifStatus.shouldNotify && (
                                <Bell
                                  className="h-4 w-4 flex-shrink-0"
                                  style={{ color: notifStatus.color }}
                                />
                              )}
                              {payment.isProjected && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200">
                                  Proy.
                                </Badge>
                              )}
                              {payment.contrato?.numero}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {payment.contrato?.cliente?.razon_social}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {payment.contrato?.cliente?.codigo}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm truncate max-w-[200px]" title={payment.glosa || payment.servicio || "-"}>
                                {payment.glosa || payment.servicio || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const parts = payment.fecha_vencimiento.split('T')[0].split('-');
                              const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                              return format(date, "dd MMM yyyy", { locale: es });
                            })()}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.monto, payment.contrato?.moneda)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`gap-1 ${statusConfig[payment.status]?.color}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig[payment.status]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.fecha_pago
                              ? (() => {
                                  const parts = payment.fecha_pago.split('T')[0].split('-');
                                  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                  return format(date, "dd MMM yyyy", { locale: es });
                                })()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleViewDetail(payment)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver Detalle</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleViewContractCalendar(payment)}
                                    >
                                      <CalendarDays className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver Calendario del Contrato</TooltipContent>
                                </Tooltip>

                                {!payment.isProjected && (

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant={payment.status === "pagado" ? "secondary" : "default"}
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => handleRegisterPayment(payment)}
                                        >
                                          {payment.status === "pagado" ? (
                                            <Edit className="h-4 w-4" />
                                          ) : (
                                            <Receipt className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {payment.status === "pagado" ? "Editar Pago" : "Registrar Pago"}
                                      </TooltipContent>
                                    </Tooltip>
                                )}
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Edit Payment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Pago</DialogTitle>
            <DialogDescription>
              Actualiza el estado y detalles del pago
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Estado del Pago</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.status === "pagado" && (
              <div className="space-y-2">
                <Label>Fecha de Pago</Label>
                <Input
                  type="date"
                  value={editForm.fecha_pago}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fecha_pago: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select
                value={editForm.metodo_pago}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, metodo_pago: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="yape">Yape</SelectItem>
                  <SelectItem value="plin">Plin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Referencia</Label>
              <Input
                value={editForm.referencia}
                onChange={(e) => setEditForm((prev) => ({ ...prev, referencia: e.target.value }))}
                placeholder="Número de operación, voucher, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={editForm.notas}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notas: e.target.value }))}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Pago</DialogTitle>
          </DialogHeader>

          {detailPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contrato</p>
                  <p className="font-medium">{detailPayment.contrato?.numero}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge
                    variant="outline"
                    className={statusConfig[detailPayment.status]?.color}
                  >
                    {statusConfig[detailPayment.status]?.label}
                  </Badge>
                </div>
              </div>

              {detailPayment.isProjected && (
                <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                  <p className="text-sm text-purple-700">
                    Este es un pago proyectado. Se convertirá en pago real cuando el contrato sea aprobado.
                  </p>
                </div>
              )}

              {(() => {
                const notifStatus = getPaymentNotificationStatus(
                  detailPayment.fecha_vencimiento,
                  detailPayment.status
                );
                if (notifStatus.shouldNotify) {
                  return (
                    <div 
                      className="border rounded-md p-3 flex items-center gap-2"
                      style={{ 
                        backgroundColor: `${notifStatus.color}15`,
                        borderColor: notifStatus.color 
                      }}
                    >
                      <Bell className="h-4 w-4" style={{ color: notifStatus.color }} />
                      <p className="text-sm" style={{ color: notifStatus.color }}>
                        {notifStatus.type === "before_due" 
                          ? "Este pago está próximo a vencer" 
                          : "Este pago está vencido"}
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Cliente</span>
                </div>
                <p className="font-medium">{detailPayment.contrato?.cliente?.razon_social}</p>
                <p className="text-sm text-muted-foreground">
                  RUC: {detailPayment.contrato?.cliente?.codigo}
                </p>
              </div>

              <Separator />

              {detailPayment.servicio && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Servicio</p>
                    <p className="font-medium">{detailPayment.servicio}</p>
                  </div>
                  {detailPayment.cuota && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cuota</p>
                      <p className="font-medium">Cuota {detailPayment.cuota}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(detailPayment.monto, detailPayment.contrato?.moneda)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vencimiento</p>
                  <p className="font-medium">
                    {format(new Date(detailPayment.fecha_vencimiento), "dd MMMM yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              {detailPayment.fecha_pago && (
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Pago</p>
                  <p className="font-medium text-green-600">
                    {format(new Date(detailPayment.fecha_pago), "dd MMMM yyyy", { locale: es })}
                  </p>
                </div>
              )}

              {detailPayment.metodo_pago && (
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pago</p>
                  <p className="font-medium capitalize">{detailPayment.metodo_pago}</p>
                </div>
              )}

              {detailPayment.referencia && (
                <div>
                  <p className="text-sm text-muted-foreground">Referencia</p>
                  <p className="font-medium">{detailPayment.referencia}</p>
                </div>
              )}

              {detailPayment.notas && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm">{detailPayment.notas}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Cerrar
            </Button>
            {detailPayment && !detailPayment.isProjected && (
              <Button onClick={() => {
                setDetailDialogOpen(false);
                if (detailPayment) handleEditPayment(detailPayment);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register Payment Dialog */}
      <RegisterPaymentDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        payment={paymentToRegister}
        onSuccess={fetchPayments}
        allPayments={unifiedPayments}
      />

      {/* Contract Calendar Modal */}
      <ContractCalendarModal
        open={contractCalendarOpen}
        onOpenChange={setContractCalendarOpen}
        contractPayments={selectedContractPayments}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
