import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSedeContext } from "@/hooks/useSedeContext";
import { Plus, Search, Eye, MoreHorizontal, FileCheck, Calendar, User, LayoutGrid, List, Edit, Trash2, FileText, Loader2, Settings2, ArrowRight, CheckCircle, Ban, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContratoDesigner } from "@/components/contratos/ContratoDesigner";
import { ContractActions, type ContractStatus } from "@/components/contratos/ContractActions";
import { ContractDetailModal } from "@/components/contratos/ContractDetailModal";
import { EditContractDialog } from "@/components/contratos/EditContractDialog";
import { ConfirmContractFromProformaDialog } from "@/components/contratos/ConfirmContractFromProformaDialog";
import { CreateContractDialog } from "@/components/contratos/CreateContractDialog";
import { ExportExcelButton } from "@/components/ui/ExportExcelButton";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";

type DateFilter = "hoy" | "semana" | "mes_actual" | "mes" | "anio" | "todo";

export type ContractCondition = "Vigente" | "Terminado" | "Anulado" | "Suspendido";

interface Contract {
  id: string;
  numero: string;
  cliente: {
    id: string;
    razon_social: string;
    codigo: string;
  } | null;
  tipo_servicio: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  monto_mensual: number | null;
  monto_total: number | null;
  moneda: string;
  status: ContractStatus;
  condicion: ContractCondition;
  notas: string | null;
  proforma_id: string | null;
  created_at?: string;
}

interface ProformaState {
  fromProforma: boolean;
  proformaId: string;
  proformaNumero: string;
  clienteNombre: string;
  tipo: "contabilidad" | "tramites";
  total: number;
  moneda: string;
}

const statusStyles: Record<ContractStatus, string> = {
  borrador: "bg-slate-100 text-slate-800 border-slate-200",
  en_gestion: "bg-blue-100 text-blue-800 border-blue-200",
  aprobado: "bg-green-100 text-green-800 border-green-200",
  anulado: "bg-red-100 text-red-800 border-red-200",
  activo: "bg-green-100 text-green-800 border-green-200",
  pausado: "bg-yellow-100 text-yellow-800 border-yellow-200",
  finalizado: "bg-blue-100 text-blue-800 border-blue-200",
  cancelado: "bg-gray-100 text-gray-800 border-gray-200",
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

const typeStyles: Record<string, string> = {
  contabilidad: "bg-primary/10 text-primary",
  tramites: "bg-secondary/20 text-secondary-foreground",
  mixto: "bg-purple-100 text-purple-800",
};

const condicionStyles: Record<ContractCondition, string> = {
  Vigente: "bg-green-100 text-green-800 border-green-200",
  Terminado: "bg-blue-100 text-blue-800 border-blue-200",
  Anulado: "bg-red-100 text-red-800 border-red-200",
  Suspendido: "bg-amber-100 text-amber-800 border-amber-200",
};

const Contratos = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeSedeId, canViewAllSedes } = useSedeContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [proformaData, setProformaData] = useState<ProformaState | null>(null);
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState<DateFilter>("hoy");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Status filter from stats cards
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "anulado" | "all" | null>(null);
  
  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContractId, setEditContractId] = useState<string | null>(null);
  
  // Form state for new contract
  const [newContract, setNewContract] = useState({
    numero: "",
    descripcion: "",
    tipo_servicio: "contabilidad",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_fin: "",
    monto_mensual: "",
    monto_total: "",
    moneda: "PEN",
    notas: "",
    cliente_id: "",
    proforma_id: "",
  });

  // State for proforma confirmation dialog
  const [confirmFromProformaOpen, setConfirmFromProformaOpen] = useState(false);

  useEffect(() => {
    fetchContracts();
    
    // Check if we came from proforma confirmation
    const state = location.state as ProformaState | null;
    if (state?.fromProforma) {
      setProformaData(state);
      // Open the new confirmation dialog instead of the simple one
      setConfirmFromProformaOpen(true);
      // Clear the state so refreshing doesn't reopen the dialog
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  const fetchContracts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contratos")
      .select(`
        id,
        numero,
        tipo_servicio,
        descripcion,
        fecha_inicio,
        fecha_fin,
        monto_mensual,
        monto_total,
        moneda,
        status,
        condicion,
        notas,
        proforma_id,
        created_at,
        sede_id,
        cliente:clientes(id, razon_social, codigo)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Error al cargar contratos");
    } else {
      const parsed = (data || []).map((c) => ({
        ...c,
        status: c.status as ContractStatus,
        condicion: (c.condicion || "Vigente") as ContractCondition,
        cliente: c.cliente as Contract["cliente"],
      }));
      setContracts(parsed);
    }
    setLoading(false);
  };

  const handleCreateContract = async () => {
    if (!newContract.descripcion || !newContract.fecha_inicio) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    // First, we need to get the client_id from the proforma if coming from proforma flow
    let clienteId = newContract.cliente_id;
    
    if (proformaData?.proformaId && !clienteId) {
      const { data: proformaDetails } = await supabase
        .from("proformas")
        .select("cliente_id")
        .eq("id", proformaData.proformaId)
        .maybeSingle();
      
      if (proformaDetails) {
        clienteId = proformaDetails.cliente_id;
      }
    }

    if (!clienteId) {
      toast.error("Por favor selecciona un cliente");
      return;
    }

    // Generate unique contract number based on max existing number
    const year = new Date().getFullYear();
    const { data: maxContrato } = await supabase
      .from("contratos")
      .select("numero")
      .ilike("numero", `CTR-${year}-%`)
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNum = 1;
    if (maxContrato?.numero) {
      const match = maxContrato.numero.match(/CTR-\d{4}-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const numero = `CTR-${year}-${nextNum.toString().padStart(3, "0")}`;

    // Create contract in BORRADOR status
    const { error } = await supabase.from("contratos").insert({
      numero,
      descripcion: newContract.descripcion,
      tipo_servicio: newContract.tipo_servicio,
      fecha_inicio: newContract.fecha_inicio,
      fecha_fin: newContract.fecha_fin || null,
      monto_mensual: newContract.monto_mensual ? parseFloat(newContract.monto_mensual) : null,
      monto_total: newContract.monto_total ? parseFloat(newContract.monto_total) : null,
      moneda: newContract.moneda,
      notas: newContract.notas || null,
      cliente_id: clienteId,
      status: "borrador",
      proforma_id: proformaData?.proformaId || null,
    });

    if (error) {
      console.error("Error creating contract:", error);
      toast.error("Error al crear el contrato");
    } else {
      // If created from proforma, update proforma status to "aprobada"
      if (proformaData?.proformaId) {
        await supabase
          .from("proformas")
          .update({ status: "aprobada" })
          .eq("id", proformaData.proformaId);
      }
      
      toast.success("Contrato creado en estado Borrador");
      setCreateDialogOpen(false);
      setProformaData(null);
      resetForm();
      fetchContracts();
    }
  };

  const resetForm = () => {
    setNewContract({
      numero: "",
      descripcion: "",
      tipo_servicio: "contabilidad",
      fecha_inicio: new Date().toISOString().split("T")[0],
      fecha_fin: "",
      monto_mensual: "",
      monto_total: "",
      moneda: "PEN",
      notas: "",
      cliente_id: "",
      proforma_id: "",
    });
  };

  const handleViewDetail = (contractId: string) => {
    setSelectedContractId(contractId);
    setDetailModalOpen(true);
  };

  const handleEdit = (contractId: string) => {
    setEditContractId(contractId);
    setEditDialogOpen(true);
  };

  // Get date range based on filter
  const getDateRange = (filter: DateFilter): { start: Date; end: Date } | null => {
    const now = new Date();
    switch (filter) {
      case "hoy":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "semana":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "mes_actual":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "mes":
        const monthDate = new Date(selectedYear, selectedMonth, 1);
        return { start: startOfMonth(monthDate), end: endOfMonth(monthDate) };
      case "anio":
        const yearDate = new Date(selectedYear, 0, 1);
        return { start: startOfYear(yearDate), end: endOfYear(yearDate) };
      case "todo":
        return null;
      default:
        return null;
    }
  };

  const filteredContracts = useMemo(() => {
    const dateRange = getDateRange(dateFilter);
    
    return contracts.filter((contract) => {
      // Active sede filter
      const matchesSede =
        (canViewAllSedes && !activeSedeId) ||
        !activeSedeId ||
        (contract as any).sede_id === activeSedeId ||
        (contract as any).sede_id == null;

      const matchesSearch = 
        contract.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.cliente?.razon_social.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (dateRange && contract.created_at) {
        // Parse created_at date manually to avoid timezone issues
        const parts = contract.created_at.split('T')[0].split('-');
        const contractDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        matchesDate = isWithinInterval(contractDate, { start: dateRange.start, end: dateRange.end });
      }

      let matchesStatus = true;
      if (statusFilter === "all") {
        matchesStatus = contract.status !== "anulado";
      } else if (statusFilter) {
        matchesStatus = contract.status === statusFilter;
      }

      return matchesSede && matchesSearch && matchesDate && matchesStatus;
    });
  }, [contracts, searchTerm, dateFilter, selectedMonth, selectedYear, statusFilter, activeSedeId, canViewAllSedes]);

  const stats = {
    borradores: contracts.filter((c) => c.status === "borrador").length,
    enGestion: contracts.filter((c) => c.status === "en_gestion").length,
    aprobados: contracts.filter((c) => c.status === "aprobado").length,
    anulados: contracts.filter((c) => c.status === "anulado").length,
    total: contracts.filter((c) => c.status !== "anulado").length,
    ingresosMensuales: contracts
      .filter((c) => c.status === "aprobado" || c.status === "activo")
      .reduce((acc, c) => acc + (Number(c.monto_mensual) || 0), 0),
  };

  // Calculate progress based on date range
  const calculateProgress = (fechaInicio: string, fechaFin: string | null): number => {
    if (!fechaFin) return 0;
    const start = new Date(fechaInicio).getTime();
    const end = new Date(fechaFin).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Contratos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de contratos de servicios activos
          </p>
        </div>
      </div>

      <Tabs defaultValue="contratos" className="w-full">
        <TabsList>
          <TabsTrigger value="contratos" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="plantillas" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Diseñador de Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contratos" className="space-y-6 mt-4">
          <div className="flex justify-end gap-2">
            <ExportExcelButton
              allRows={contracts}
              filteredRows={filteredContracts}
              fileName="contratos"
              sheetName="Contratos"
              columns={[
                { header: "Número", accessor: (c) => c.numero },
                { header: "Cliente", accessor: (c) => c.cliente?.razon_social ?? "" },
                { header: "RUC/DNI", accessor: (c) => c.cliente?.codigo ?? "" },
                { header: "Tipo Servicio", accessor: (c) => c.tipo_servicio },
                { header: "Descripción", accessor: (c) => c.descripcion },
                { header: "Fecha Inicio", accessor: (c) => c.fecha_inicio },
                { header: "Fecha Fin", accessor: (c) => c.fecha_fin ?? "" },
                { header: "Moneda", accessor: (c) => c.moneda },
                { header: "Monto Mensual", accessor: (c) => c.monto_mensual ?? "" },
                { header: "Monto Total", accessor: (c) => c.monto_total ?? "" },
                { header: "Estado", accessor: (c) => statusLabels[c.status] ?? c.status },
                { header: "Condición", accessor: (c) => c.condicion },
                { header: "Notas", accessor: (c) => c.notas ?? "" },
              ]}
            />
            <Button className="btn-gradient gap-2" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Nuevo Contrato
            </Button>
          </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "all" ? null : "all")}
          className={`bg-card rounded-xl border p-4 flex items-center gap-4 text-left transition-all hover:shadow-md hover:border-primary/40 ${statusFilter === "all" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="p-3 rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "aprobado" ? null : "aprobado")}
          className={`bg-card rounded-xl border p-4 flex items-center gap-4 text-left transition-all hover:shadow-md hover:border-primary/40 ${statusFilter === "aprobado" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="p-3 rounded-lg bg-green-100">
            <CheckCircle className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.aprobados}</p>
            <p className="text-sm text-muted-foreground">Aprobados</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "en_gestion" ? null : "en_gestion")}
          className={`bg-card rounded-xl border p-4 flex items-center gap-4 text-left transition-all hover:shadow-md hover:border-primary/40 ${statusFilter === "en_gestion" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="p-3 rounded-lg bg-blue-100">
            <ArrowRight className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.enGestion}</p>
            <p className="text-sm text-muted-foreground">En Gestión</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "borrador" ? null : "borrador")}
          className={`bg-card rounded-xl border p-4 flex items-center gap-4 text-left transition-all hover:shadow-md hover:border-primary/40 ${statusFilter === "borrador" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="p-3 rounded-lg bg-slate-100">
            <FileText className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.borradores}</p>
            <p className="text-sm text-muted-foreground">Borradores</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "anulado" ? null : "anulado")}
          className={`bg-card rounded-xl border p-4 flex items-center gap-4 text-left transition-all hover:shadow-md hover:border-primary/40 ${statusFilter === "anulado" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="p-3 rounded-lg bg-red-100">
            <Ban className="h-5 w-5 text-red-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.anulados}</p>
            <p className="text-sm text-muted-foreground">Anulados</p>
          </div>
        </button>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Ingresos Mensuales</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            S/ {stats.ingresosMensuales.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex flex-wrap items-center gap-2 bg-card rounded-lg border border-border p-3">
        <div className="flex items-center gap-2 mr-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            { value: "hoy", label: "Hoy" },
            { value: "semana", label: "Semana Actual" },
            { value: "mes_actual", label: "Mes Actual" },
            { value: "mes", label: "Mes" },
            { value: "anio", label: "Año" },
            { value: "todo", label: "Todo" },
          ].map((option) => (
            <Button
              key={option.value}
              variant={dateFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter(option.value as DateFilter)}
              className="h-8"
            >
              {option.label}
            </Button>
          ))}
        </div>
        
        {/* Month selector */}
        {dateFilter === "mes" && (
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
                <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {/* Year selector */}
        {(dateFilter === "mes" || dateFilter === "anio") && (
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {/* Results count */}
        <Badge variant="secondary" className="ml-auto">
          {filteredContracts.length} contratos
        </Badge>
      </div>

      {/* Search & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contrato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "cards" | "table")}>
          <ToggleGroupItem value="cards" aria-label="Vista tarjetas">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Vista tabla">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No hay contratos</p>
          <p className="text-sm text-muted-foreground">Crea tu primer contrato o confirma una proforma</p>
        </div>
      ) : (
        <>
          {/* Cards View */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredContracts.map((contract) => {
                const progress = calculateProgress(contract.fecha_inicio, contract.fecha_fin);
                return (
                  <div
                    key={contract.id}
                    className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{contract.numero}</p>
                          <p className="text-sm text-muted-foreground">
                            {contract.cliente?.razon_social || "Sin cliente"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          title="Ver detalle"
                          onClick={() => handleViewDetail(contract.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          title="Editar"
                          onClick={() => handleEdit(contract.id)}
                          disabled={contract.status === "aprobado" || contract.status === "anulado"}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <ContractActions
                          contractId={contract.id}
                          contractNumero={contract.numero}
                          currentStatus={contract.status}
                          onStatusChange={fetchContracts}
                          onViewDetail={() => handleViewDetail(contract.id)}
                          onEdit={() => handleEdit(contract.id)}
                        />
                      </div>
                    </div>

                    {contract.descripcion && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {contract.descripcion}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className={typeStyles[contract.tipo_servicio] || typeStyles.contabilidad}>
                        {contract.tipo_servicio === "contabilidad" ? "Contabilidad" : "Trámites"}
                      </Badge>
                      <Badge variant="outline" className={statusStyles[contract.status]}>
                        {statusLabels[contract.status]}
                      </Badge>
                      <Badge variant="outline" className={condicionStyles[contract.condicion]}>
                        {contract.condicion}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-muted-foreground">Cuota Mensual</p>
                        <p className="font-medium text-foreground">
                          {contract.monto_mensual 
                            ? `S/ ${Number(contract.monto_mensual).toLocaleString()}`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-medium text-foreground">
                          {contract.monto_total
                            ? `S/ ${Number(contract.monto_total).toLocaleString()}`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Inicio</p>
                        <p className="font-medium text-foreground">{contract.fecha_inicio}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fin</p>
                        <p className="font-medium text-foreground">{contract.fecha_fin || "Sin definir"}</p>
                      </div>
                    </div>

                    {contract.fecha_fin && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Progreso</span>
                          <span className="text-sm font-medium text-foreground">
                            {progress}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Contrato
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Cliente
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 min-w-[200px]">
                        Descripción
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Tipo
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Cuota Mensual
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Estado
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Condición
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Progreso
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredContracts.map((contract) => {
                      const progress = calculateProgress(contract.fecha_inicio, contract.fecha_fin);
                      return (
                        <tr key={contract.id} className="table-row-hover">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <FileCheck className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium text-foreground">
                                {contract.numero}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-foreground">
                              {contract.cliente?.razon_social || "Sin cliente"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-muted-foreground line-clamp-2 max-w-[250px]">
                              {contract.descripcion || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={typeStyles[contract.tipo_servicio.toLowerCase()] || typeStyles.contabilidad}>
                              {contract.tipo_servicio.toLowerCase() === "contabilidad" ? "Contabilidad" : "Trámites"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-foreground">
                              {contract.monto_mensual
                                ? `S/ ${Number(contract.monto_mensual).toLocaleString()}`
                                : "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={statusStyles[contract.status]}>
                              {statusLabels[contract.status]}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={condicionStyles[contract.condicion]}>
                              {contract.condicion}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {contract.fecha_fin ? (
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Progress value={progress} className="h-2 flex-1" />
                                <span className="text-sm text-muted-foreground w-10 text-right">
                                  {progress}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                title="Ver detalle"
                                onClick={() => handleViewDetail(contract.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                title="Editar"
                                onClick={() => handleEdit(contract.id)}
                                disabled={contract.status === "aprobado" || contract.status === "anulado"}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <ContractActions
                                contractId={contract.id}
                                contractNumero={contract.numero}
                                currentStatus={contract.status}
                                onStatusChange={fetchContracts}
                                onViewDetail={() => handleViewDetail(contract.id)}
                                onEdit={() => handleEdit(contract.id)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Contract Dialog - Full featured */}
      <CreateContractDialog
        open={createDialogOpen && !proformaData}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
        }}
        onSuccess={fetchContracts}
      />

      {/* Confirm Contract from Proforma Dialog - Full featured */}
      <ConfirmContractFromProformaDialog
        open={confirmFromProformaOpen}
        onOpenChange={(open) => {
          setConfirmFromProformaOpen(open);
          if (!open) {
            setProformaData(null);
          }
        }}
        proformaData={proformaData}
        onSuccess={() => {
          setProformaData(null);
          fetchContracts();
        }}
      />

      {/* Contract Detail Modal */}
      <ContractDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        contractId={selectedContractId}
      />

      {/* Edit Contract Dialog */}
      <EditContractDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        contractId={editContractId}
        onSuccess={fetchContracts}
      />
        </TabsContent>

        <TabsContent value="plantillas" className="mt-4">
          <ContratoDesigner />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Contratos;
