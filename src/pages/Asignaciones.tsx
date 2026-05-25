import { useState, useEffect, useMemo } from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import {
  FileCheck,
  Search,
  Loader2,
  Building2,
  Calendar,
  DollarSign,
  ArrowRightLeft,
  Eye,
  Filter,
  Briefcase,
  CheckCircle2,
  Clock,
  Target,
  Users,
  RefreshCw,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ContractDetailModal } from "@/components/contratos/ContractDetailModal";
import { EditContractDialog } from "@/components/contratos/EditContractDialog";
import { WorkFlowModal } from "@/components/asignaciones/WorkFlowModal";
import { ExportExcelButton } from "@/components/ui/ExportExcelButton";
import { useSedeContext } from "@/hooks/useSedeContext";

type DateFilterType = "hoy" | "semana" | "mes_actual" | "mes" | "anio" | "todo";

type ContractCondition = "Vigente" | "Terminado" | "Anulado" | "Suspendido";

interface ContratoAsignado {
  id: string;
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  monto_mensual: number | null;
  monto_total: number | null;
  moneda: string;
  status: string;
  condicion: ContractCondition;
  created_at: string;
  sede_id?: string | null;
  cliente: {
    id: string;
    razon_social: string;
    codigo: string;
  };
  cartera: {
    id: string;
    nombre: string;
    especialidad: string | null;
  } | null;
}

const condicionStyles: Record<ContractCondition, string> = {
  Vigente: "bg-green-100 text-green-800",
  Terminado: "bg-blue-100 text-blue-800",
  Anulado: "bg-red-100 text-red-800",
  Suspendido: "bg-amber-100 text-amber-800",
};

interface Cartera {
  id: string;
  nombre: string;
  especialidad: string | null;
  descripcion: string | null;
  miembros: {
    user_id: string;
    rol_en_cartera: string;
    profile: {
      full_name: string | null;
      email: string;
    } | null;
  }[];
  stats: {
    total: number;
    en_gestion: number;
    finalizados: number;
  };
}

interface Stats {
  totalAsignados: number;
  enGestion: number;
  finalizados: number;
  sinAsignar: number;
}

const statusStyles: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-gray-100 text-gray-800" },
  en_gestion: { label: "En Gestión", className: "bg-blue-100 text-blue-800" },
  aprobado: { label: "Aprobado", className: "bg-green-100 text-green-800" },
  activo: { label: "Activo", className: "bg-emerald-100 text-emerald-800" },
  pausado: { label: "Pausado", className: "bg-yellow-100 text-yellow-800" },
  finalizado: { label: "Finalizado", className: "bg-purple-100 text-purple-800" },
  cancelado: { label: "Cancelado", className: "bg-red-100 text-red-800" },
  anulado: { label: "Anulado", className: "bg-red-100 text-red-800" },
};

const especialidadStyles: Record<string, string> = {
  Contabilidad: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Trámites: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Auditoría: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Mixta: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const Asignaciones = () => {
  const { activeSedeId } = useSedeContext();
  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState<ContratoAsignado[]>([]);
  const [carteras, setCarteras] = useState<Cartera[]>([]);
  const [search, setSearch] = useState("");
  const [filterCartera, setFilterCartera] = useState<string>("todas");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("hoy");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<Stats>({
    totalAsignados: 0,
    enGestion: 0,
    finalizados: 0,
    sinAsignar: 0,
  });

  // Dialog states
  const [reasignDialogOpen, setReasignDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<ContratoAsignado | null>(null);
  const [selectedCarteraId, setSelectedCarteraId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [selectedCarteraMiembros, setSelectedCarteraMiembros] = useState<any[]>([]);

  const getDateRange = (filter: DateFilterType): { start: Date; end: Date } | null => {
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
    }
  };

  const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all contracts that are not in borrador status (assigned to work)
    const { data: contratosData, error: contratosError } = await supabase
      .from("contratos")
      .select(`
        id, numero, descripcion, tipo_servicio, fecha_inicio, fecha_fin,
        monto_mensual, monto_total, moneda, status, condicion, created_at, sede_id,
        cliente:clientes(id, razon_social, codigo)
      `)
      .neq("status", "borrador")
      .order("created_at", { ascending: false });

    if (contratosError) {
      console.error("Error fetching contratos:", contratosError);
      toast.error("Error al cargar los contratos");
    }

    // Fetch cartera assignments for all clients
    const { data: carteraClientesData } = await supabase
      .from("cartera_clientes")
      .select(`
        cliente_id,
        cartera:carteras(id, nombre, especialidad)
      `);

    // Fetch carteras with stats
    const { data: carterasData } = await supabase
      .from("carteras")
      .select(`
        id, nombre, especialidad, descripcion,
        miembros:cartera_miembros(
          user_id,
          rol_en_cartera,
          profile:profiles(full_name, email)
        ),
        clientes:cartera_clientes(cliente_id)
      `)
      .eq("activa", true)
      .order("nombre");

    if (carterasData) {
      // Calculate stats for each cartera
      const carterasWithStats = await Promise.all(
        carterasData.map(async (c) => {
          const clienteIds = (c.clientes || []).map((cc: any) => cc.cliente_id);
          let stats = { total: 0, en_gestion: 0, finalizados: 0 };

          if (clienteIds.length > 0) {
            const { data: contratosStats } = await supabase
              .from("contratos")
              .select("id, status")
              .in("cliente_id", clienteIds)
              .neq("status", "borrador");

            if (contratosStats) {
              stats.total = contratosStats.length;
              stats.en_gestion = contratosStats.filter((ct) =>
                ["en_gestion", "aprobado", "activo"].includes(ct.status)
              ).length;
              stats.finalizados = contratosStats.filter(
                (ct) => ct.status === "finalizado"
              ).length;
            }
          }

          return {
            id: c.id,
            nombre: c.nombre,
            especialidad: c.especialidad,
            descripcion: c.descripcion,
            miembros: (c.miembros || []).map((m: any) => ({
              user_id: m.user_id,
              rol_en_cartera: m.rol_en_cartera,
              profile: m.profile
                ? {
                    full_name: m.profile.full_name,
                    email: m.profile.email,
                  }
                : null,
            })),
            stats,
          };
        })
      );
      setCarteras(carterasWithStats);
    }

    // Build cartera map from cliente_id to cartera
    const carteraMap = new Map<string, { id: string; nombre: string; especialidad: string | null }>();
    if (carteraClientesData) {
      carteraClientesData.forEach((cc: any) => {
        if (cc.cartera) {
          carteraMap.set(cc.cliente_id, {
            id: cc.cartera.id,
            nombre: cc.cartera.nombre,
            especialidad: cc.cartera.especialidad,
          });
        }
      });
    }

    // Merge contracts with cartera info
    if (contratosData) {
      const contratosConCartera = contratosData.map((c: any) => ({
        ...c,
        cliente: c.cliente,
        cartera: c.cliente ? carteraMap.get(c.cliente.id) || null : null,
      }));
      setContratos(contratosConCartera);

      // Calculate stats
      const asignados = contratosConCartera.filter((c) => c.cartera !== null);
      const sinAsignar = contratosConCartera.filter((c) => c.cartera === null);
      const enGestion = contratosConCartera.filter((c) =>
        ["en_gestion", "aprobado", "activo"].includes(c.status)
      );
      const finalizados = contratosConCartera.filter((c) => c.status === "finalizado");

      setStats({
        totalAsignados: asignados.length,
        enGestion: enGestion.length,
        finalizados: finalizados.length,
        sinAsignar: sinAsignar.length,
      });
    }

    setLoading(false);
  };

  const filteredContratos = useMemo(() => {
    return contratos.filter((contrato) => {
      if (activeSedeId && (contrato as any).sede_id !== activeSedeId) {
        return false;
      }
      const matchesSearch =
        contrato.numero.toLowerCase().includes(search.toLowerCase()) ||
        contrato.cliente?.razon_social.toLowerCase().includes(search.toLowerCase()) ||
        contrato.descripcion?.toLowerCase().includes(search.toLowerCase());

      const matchesCartera =
        filterCartera === "todas" ||
        (filterCartera === "sin_asignar" && !contrato.cartera) ||
        contrato.cartera?.id === filterCartera;

      let matchesStatus = true;
      if (filterStatus === "en_gestion_group") {
        matchesStatus = ["en_gestion", "aprobado", "activo"].includes(contrato.status);
      } else if (filterStatus === "sin_asignar") {
        matchesStatus = !contrato.cartera;
      } else if (filterStatus !== "todos") {
        matchesStatus = contrato.status === filterStatus;
      }

      // Date filter - based on created_at
      let matchesDate = true;
      if (dateRange && contrato.created_at) {
        const parts = contrato.created_at.split('T')[0].split('-');
        const contratoDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        matchesDate = isWithinInterval(contratoDate, { start: dateRange.start, end: dateRange.end });
      }

      return matchesSearch && matchesCartera && matchesStatus && matchesDate;
    });
  }, [contratos, search, filterCartera, filterStatus, dateRange, activeSedeId]);

  const handleReasignar = async () => {
    if (!selectedContrato || !selectedCarteraId) {
      toast.error("Selecciona una cartera");
      return;
    }

    setSaving(true);

    try {
      const clienteId = selectedContrato.cliente.id;

      // Remove from any existing cartera
      await supabase
        .from("cartera_clientes")
        .delete()
        .eq("cliente_id", clienteId);

      // Assign to new cartera
      const { error } = await supabase.from("cartera_clientes").insert({
        cliente_id: clienteId,
        cartera_id: selectedCarteraId,
      });

      if (error) throw error;

      // Update datos_plantilla with new cartera_id
      const { data: contratoData } = await supabase
        .from("contratos")
        .select("datos_plantilla")
        .eq("id", selectedContrato.id)
        .maybeSingle();

      if (contratoData) {
        const datosPlantilla = (contratoData.datos_plantilla as Record<string, any>) || {};
        await supabase
          .from("contratos")
          .update({
            datos_plantilla: { ...datosPlantilla, cartera_id: selectedCarteraId },
          })
          .eq("id", selectedContrato.id);
      }

      const selectedCartera = carteras.find((c) => c.id === selectedCarteraId);
      toast.success(`Contrato reasignado a "${selectedCartera?.nombre}"`);
      setReasignDialogOpen(false);
      setSelectedContrato(null);
      setSelectedCarteraId("");
      fetchData();
    } catch (error) {
      console.error("Error reasigning:", error);
      toast.error("Error al reasignar el contrato");
    }

    setSaving(false);
  };

  const openReasignDialog = (contrato: ContratoAsignado) => {
    setSelectedContrato(contrato);
    setSelectedCarteraId(contrato.cartera?.id || "");
    setReasignDialogOpen(true);
  };

  const openDetailDialog = (contrato: ContratoAsignado) => {
    setSelectedContrato(contrato);
    setDetailDialogOpen(true);
  };

  const openEditDialog = (contrato: ContratoAsignado) => {
    setSelectedContrato(contrato);
    setEditDialogOpen(true);
  };

  const openWorkflowModal = (contrato: ContratoAsignado) => {
    setSelectedContrato(contrato);
    // Find the cartera members for this contract
    if (contrato.cartera) {
      const cartera = carteras.find(c => c.id === contrato.cartera?.id);
      setSelectedCarteraMiembros(cartera?.miembros || []);
    } else {
      setSelectedCarteraMiembros([]);
    }
    setWorkflowModalOpen(true);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asignaciones de Contratos</h1>
          <p className="text-muted-foreground">
            Gestiona los contratos asignados a las carteras de trabajo
          </p>
        </div>
        <div className="flex gap-2">
          <ExportExcelButton
            allRows={contratos}
            filteredRows={filteredContratos}
            fileName="asignaciones"
            sheetName="Asignaciones"
            columns={[
              { header: "Número", accessor: (c) => c.numero },
              { header: "Cliente", accessor: (c) => c.cliente?.razon_social ?? "" },
              { header: "RUC/DNI", accessor: (c) => c.cliente?.codigo ?? "" },
              { header: "Tipo Servicio", accessor: (c) => c.tipo_servicio },
              { header: "Descripción", accessor: (c) => c.descripcion },
              { header: "Cartera", accessor: (c) => c.cartera?.nombre ?? "Sin asignar" },
              { header: "Fecha Inicio", accessor: (c) => c.fecha_inicio },
              { header: "Fecha Fin", accessor: (c) => c.fecha_fin ?? "" },
              { header: "Moneda", accessor: (c) => c.moneda },
              { header: "Monto Mensual", accessor: (c) => c.monto_mensual ?? "" },
              { header: "Monto Total", accessor: (c) => c.monto_total ?? "" },
              { header: "Estado", accessor: (c) => c.status },
              { header: "Condición", accessor: (c) => c.condicion },
            ]}
          />
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards - clickable filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setFilterStatus("todos")}
          className={`text-left rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 ${filterStatus === "todos" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalAsignados}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === "en_gestion_group" ? "todos" : "en_gestion_group")}
          className={`text-left rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 ${filterStatus === "en_gestion_group" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.enGestion}</p>
              <p className="text-xs text-muted-foreground">En Gestión</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === "finalizado" ? "todos" : "finalizado")}
          className={`text-left rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 ${filterStatus === "finalizado" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.finalizados}</p>
              <p className="text-xs text-muted-foreground">Finalizados</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === "sin_asignar" ? "todos" : "sin_asignar")}
          className={`text-left rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 ${filterStatus === "sin_asignar" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.sinAsignar}</p>
              <p className="text-xs text-muted-foreground">Sin Asignar</p>
            </div>
          </div>
        </button>
      </div>

      {/* Period Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup
                type="single"
                value={dateFilter}
                onValueChange={(value) => value && setDateFilter(value as DateFilterType)}
                className="justify-start"
              >
                <ToggleGroupItem value="hoy" aria-label="Hoy" className="text-xs px-3">
                  Hoy
                </ToggleGroupItem>
                <ToggleGroupItem value="semana" aria-label="Semana Actual" className="text-xs px-3">
                  Semana Actual
                </ToggleGroupItem>
                <ToggleGroupItem value="mes_actual" aria-label="Mes Actual" className="text-xs px-3">
                  Mes Actual
                </ToggleGroupItem>
                <ToggleGroupItem value="mes" aria-label="Mes" className="text-xs px-3">
                  Mes
                </ToggleGroupItem>
                <ToggleGroupItem value="anio" aria-label="Año" className="text-xs px-3">
                  Año
                </ToggleGroupItem>
                <ToggleGroupItem value="todo" aria-label="Todo" className="text-xs px-3">
                  Todo
                </ToggleGroupItem>
              </ToggleGroup>

              {(dateFilter === "mes" || dateFilter === "anio") && (
                <div className="flex items-center gap-2">
                  {dateFilter === "mes" && (
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger className="w-[130px] h-8">
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
                    <SelectTrigger className="w-[90px] h-8">
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

              <Badge variant="secondary" className="ml-auto">
                {filteredContratos.length} resultado(s)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterCartera} onValueChange={setFilterCartera}>
                <SelectTrigger className="w-[180px]">
                  <Briefcase className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Cartera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las carteras</SelectItem>
                  <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                  <Separator className="my-1" />
                  {carteras.map((cartera) => (
                    <SelectItem key={cartera.id} value={cartera.id}>
                      {cartera.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="en_gestion">En Gestión</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Contratos Asignados
          </CardTitle>
          <CardDescription>
            {filteredContratos.length} contrato(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="min-w-[200px]">Descripción</TableHead>
                  <TableHead>Cartera</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Condición</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContratos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron contratos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContratos.map((contrato) => (
                    <TableRow key={contrato.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{contrato.numero}</p>
                          <p className="text-xs text-muted-foreground">
                            {contrato.tipo_servicio}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">
                              {contrato.cliente?.razon_social}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {contrato.cliente?.codigo}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-2 max-w-[250px]">
                          {contrato.descripcion || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {contrato.cartera ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1",
                              especialidadStyles[contrato.cartera.especialidad || "Mixta"]
                            )}
                          >
                            <Briefcase className="h-3 w-3" />
                            {contrato.cartera.nombre}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Sin asignar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusStyles[contrato.status]?.className}
                        >
                          {statusStyles[contrato.status]?.label || contrato.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={condicionStyles[contrato.condicion || "Vigente"]}
                        >
                          {contrato.condicion || "Vigente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contrato.monto_mensual ? (
                          <div>
                            <p className="text-sm font-medium">
                              {contrato.moneda === "PEN" ? "S/" : "$"}{" "}
                              {contrato.monto_mensual.toLocaleString("es-PE", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">mensual</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p>
                            {format(new Date(contrato.fecha_inicio), "dd MMM yyyy", {
                              locale: es,
                            })}
                          </p>
                          {contrato.fecha_fin && (
                            <p className="text-muted-foreground">
                              al{" "}
                              {format(new Date(contrato.fecha_fin), "dd MMM yyyy", {
                                locale: es,
                              })}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openDetailDialog(contrato)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            onClick={() => openWorkflowModal(contrato)}
                            title="WorkFlow"
                            disabled={!contrato.cartera}
                          >
                            <Workflow className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openReasignDialog(contrato)}
                            title="Reasignar cartera"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Reasign Dialog */}
      <Dialog open={reasignDialogOpen} onOpenChange={setReasignDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Reasignar Contrato a Cartera
            </DialogTitle>
            <DialogDescription>
              {selectedContrato && (
                <>
                  Contrato <strong>{selectedContrato.numero}</strong> -{" "}
                  {selectedContrato.cliente?.razon_social}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            {/* Current Assignment */}
            {selectedContrato?.cartera && (
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Asignación actual
                </p>
                <div className="p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedContrato.cartera.nombre}</span>
                    <Badge
                      variant="secondary"
                      className={
                        especialidadStyles[selectedContrato.cartera.especialidad || "Mixta"]
                      }
                    >
                      {selectedContrato.cartera.especialidad || "Mixta"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Available Carteras */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Seleccionar nueva cartera
              </p>
              <div className="grid gap-3 max-h-[400px] overflow-auto">
                {carteras.map((cartera) => {
                  const isSelected = selectedCarteraId === cartera.id;
                  const isCurrent = selectedContrato?.cartera?.id === cartera.id;
                  const progressPercent =
                    cartera.stats.total > 0
                      ? Math.round((cartera.stats.finalizados / cartera.stats.total) * 100)
                      : 0;

                  return (
                    <div
                      key={cartera.id}
                      onClick={() => setSelectedCarteraId(cartera.id)}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : isCurrent
                          ? "border-muted bg-muted/30"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{cartera.nombre}</h4>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                          {isCurrent && (
                            <Badge variant="outline" className="text-xs">
                              Actual
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className={especialidadStyles[cartera.especialidad || "Mixta"]}
                        >
                          {cartera.especialidad || "Mixta"}
                        </Badge>
                      </div>

                      {cartera.descripcion && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                          {cartera.descripcion}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-lg font-bold">{cartera.stats.total}</p>
                          <p className="text-[10px] text-muted-foreground">Contratos</p>
                        </div>
                        <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {cartera.stats.en_gestion}
                          </p>
                          <p className="text-[10px] text-muted-foreground">En Gestión</p>
                        </div>
                        <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded">
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            {cartera.stats.finalizados}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Finalizados</p>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="flex items-center gap-2">
                        <Progress value={progressPercent} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">
                          {progressPercent}%
                        </span>
                      </div>

                      {/* Team */}
                      {cartera.miembros.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Equipo ({cartera.miembros.length}):
                          </span>
                          <div className="flex -space-x-2">
                            {cartera.miembros.slice(0, 4).map((m) => (
                              <Avatar
                                key={m.user_id}
                                className="h-6 w-6 border-2 border-background"
                              >
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(m.profile?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {cartera.miembros.length > 4 && (
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] border-2 border-background">
                                +{cartera.miembros.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReasignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleReasignar}
              disabled={
                saving ||
                !selectedCarteraId ||
                selectedCarteraId === selectedContrato?.cartera?.id
              }
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4" />
              )}
              Reasignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Detail Modal */}
      {selectedContrato && (
        <ContractDetailModal
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          contractId={selectedContrato.id}
        />
      )}

      {/* Edit Contract Dialog */}
      {selectedContrato && (
        <EditContractDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          contractId={selectedContrato.id}
          onSuccess={fetchData}
        />
      )}

      {/* WorkFlow Modal */}
      {selectedContrato && selectedContrato.cartera && (
        <WorkFlowModal
          open={workflowModalOpen}
          onOpenChange={setWorkflowModalOpen}
          contrato={{
            id: selectedContrato.id,
            numero: selectedContrato.numero,
            descripcion: selectedContrato.descripcion,
            tipo_servicio: selectedContrato.tipo_servicio,
            fecha_inicio: selectedContrato.fecha_inicio,
            fecha_fin: selectedContrato.fecha_fin,
            cliente: {
              razon_social: selectedContrato.cliente.razon_social,
              codigo: selectedContrato.cliente.codigo,
            },
            cartera: selectedContrato.cartera,
          }}
          miembros={selectedCarteraMiembros}
        />
      )}
    </div>
  );
};

export default Asignaciones;
