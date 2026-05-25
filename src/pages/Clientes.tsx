import { useState, useEffect } from "react";
import { useSedeContext } from "@/hooks/useSedeContext";
import {
  Plus,
  Search,
  Filter,
  Building2,
  User,
  Phone,
  Mail,
  LayoutGrid,
  List,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CreateClientDialog } from "@/components/clientes/CreateClientDialog";
import { ImportCSVDialog } from "@/components/clientes/ImportCSVDialog";
import { EditClientDialog } from "@/components/clientes/EditClientDialog";
import { DeleteClientDialog } from "@/components/clientes/DeleteClientDialog";
import { SuspendClientDialog } from "@/components/clientes/SuspendClientDialog";
import { ClientActions } from "@/components/clientes/ClientActions";
import { ExportExcelButton } from "@/components/ui/ExportExcelButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Client {
  id: string;
  tipo_cliente: string;
  codigo: string;
  razon_social: string;
  nombre_persona_natural: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  contacto_nombre2: string | null;
  contacto_telefono2: string | null;
  sector: string | null;
  notas: string | null;
  regimen_tributario: string | null;
  regimen_laboral: string | null;
  actividad_economica: string | null;
  usuario_sunat: string | null;
  clave_sunat: string | null;
  nro_trabajadores: number | null;
  activo: boolean;
  persona_natural_con_empresa: boolean | null;
}

const Clientes = () => {
  const { activeSedeId, canViewAllSedes } = useSedeContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cardFilter, setCardFilter] = useState<"all" | "activos" | "inactivos" | "empresas" | "persona_natural" | "pn_con_empresa">("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast.error("Error al cargar clientes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (client: Client) => {
    if (client.activo) {
      // Si está activo, abrir diálogo de suspensión
      setSelectedClient(client);
      setSuspendDialogOpen(true);
    } else {
      // Si está inactivo, activar directamente
      try {
        const { error } = await supabase
          .from("clientes")
          .update({ 
            activo: true,
            motivo_suspension_id: null,
            fecha_suspension: null
          })
          .eq("id", client.id);

        if (error) throw error;

        toast.success("Cliente activado exitosamente");
        fetchClients();
      } catch (error: any) {
        toast.error("Error al activar cliente: " + error.message);
      }
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setEditDialogOpen(true);
  };

  const handleDelete = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const isPersonaNatural = (tipoCliente: string) => {
    const normalized = tipoCliente.toLowerCase().replace(/\s+/g, '_');
    return normalized === "persona_natural";
  };

  const isEmpresa = (tipoCliente: string) => {
    const normalized = tipoCliente.toLowerCase();
    return normalized === "empresa";
  };

  const getClientName = (client: Client) => {
    if (isPersonaNatural(client.tipo_cliente)) {
      return client.nombre_persona_natural || client.razon_social;
    }
    return client.razon_social;
  };

  const filteredClients = clients.filter((client) => {
    // Active sede filter (skipped when admin/gerente has "all sedes" selected)
    const matchesSede =
      (canViewAllSedes && !activeSedeId) ||
      !activeSedeId ||
      (client as any).sede_id === activeSedeId ||
      (client as any).sede_id == null;
    const clientName = getClientName(client) || "";
    const matchesSearch =
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.codigo.includes(searchTerm) ||
      (client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "Activo" && client.activo) ||
      (statusFilter === "Inactivo" && !client.activo);
    
    // Card filter logic
    let matchesCardFilter = true;
    switch (cardFilter) {
      case "activos":
        matchesCardFilter = client.activo;
        break;
      case "inactivos":
        matchesCardFilter = !client.activo;
        break;
      case "empresas":
        matchesCardFilter = isEmpresa(client.tipo_cliente);
        break;
      case "persona_natural":
        matchesCardFilter = isPersonaNatural(client.tipo_cliente);
        break;
      case "pn_con_empresa":
        matchesCardFilter = isPersonaNatural(client.tipo_cliente) && client.persona_natural_con_empresa === true;
        break;
    }
    
    return matchesSede && matchesSearch && matchesStatus && matchesCardFilter;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona todos los clientes y prospectos del estudio
          </p>
        </div>
        <div className="flex gap-2">
          <ExportExcelButton
            allRows={clients}
            filteredRows={filteredClients}
            fileName="clientes"
            sheetName="Clientes"
            columns={[
              { header: "Código", accessor: (c) => c.codigo },
              { header: "Tipo", accessor: (c) => c.tipo_cliente },
              { header: "Nombre / Razón Social", accessor: (c) => getClientName(c) ?? "" },
              { header: "Email", accessor: (c) => c.email },
              { header: "Teléfono", accessor: (c) => c.telefono },
              { header: "Dirección", accessor: (c) => c.direccion },
              { header: "Sector", accessor: (c) => c.sector },
              { header: "Régimen Tributario", accessor: (c) => c.regimen_tributario },
              { header: "Régimen Laboral", accessor: (c) => c.regimen_laboral },
              { header: "Actividad Económica", accessor: (c) => c.actividad_economica },
              { header: "N° Trabajadores", accessor: (c) => c.nro_trabajadores },
              { header: "Contacto", accessor: (c) => c.contacto_nombre },
              { header: "Tel. Contacto", accessor: (c) => c.contacto_telefono },
              { header: "Email Contacto", accessor: (c) => c.contacto_email },
              { header: "Estado", accessor: (c) => (c.activo ? "Activo" : "Inactivo") },
            ]}
          />
          <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button className="btn-gradient gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      <CreateClientDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchClients}
      />

      <ImportCSVDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={fetchClients}
      />

      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={selectedClient}
        onSuccess={fetchClients}
      />

      <DeleteClientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        clientId={selectedClient?.id || null}
        clientName={selectedClient ? getClientName(selectedClient) : ""}
        onSuccess={fetchClients}
      />

      <SuspendClientDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        clientId={selectedClient?.id || null}
        clientName={selectedClient ? getClientName(selectedClient) || "" : ""}
        onSuccess={fetchClients}
      />

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, RUC/DNI o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "cards" | "table")}>
              <ToggleGroupItem value="cards" aria-label="Vista tarjetas">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Vista tabla">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          onClick={() => setCardFilter(cardFilter === "all" ? "all" : "all")}
          className={`bg-card rounded-xl border p-4 flex items-center gap-4 text-left transition-colors ${
            cardFilter === "all"
              ? "border-slate-400 bg-slate-50"
              : "border-border hover:border-slate-300"
          }`}
        >
          <div className={`p-3 rounded-lg ${cardFilter === "all" ? "bg-slate-200" : "bg-slate-100"}`}>
            <Building2 className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {clients.length}
            </p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </button>
        <button
          onClick={() => setCardFilter(cardFilter === "activos" ? "all" : "activos")}
          className={`bg-card rounded-xl border p-4 flex items-center gap-4 text-left transition-colors ${
            cardFilter === "activos"
              ? "border-green-400 bg-green-50"
              : "border-border hover:border-green-300"
          }`}
        >
          <div className={`p-3 rounded-lg ${cardFilter === "activos" ? "bg-green-200" : "bg-green-100"}`}>
            <Building2 className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {clients.filter((c) => c.activo).length}
            </p>
            <p className="text-sm text-muted-foreground">Activos</p>
          </div>
        </button>
        <button
          onClick={() => setCardFilter(cardFilter === "empresas" ? "all" : "empresas")}
          className={`bg-card rounded-xl border p-4 flex items-center gap-4 text-left transition-colors ${
            cardFilter === "empresas"
              ? "border-blue-400 bg-blue-50"
              : "border-border hover:border-blue-300"
          }`}
        >
          <div className={`p-3 rounded-lg ${cardFilter === "empresas" ? "bg-blue-200" : "bg-blue-100"}`}>
            <Building2 className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {clients.filter((c) => isEmpresa(c.tipo_cliente)).length}
            </p>
            <p className="text-sm text-muted-foreground">Empresas</p>
          </div>
        </button>
        <button
          onClick={() => setCardFilter(cardFilter === "persona_natural" ? "all" : "persona_natural")}
          className={`bg-card rounded-xl border p-4 flex items-center gap-4 text-left transition-colors ${
            cardFilter === "persona_natural"
              ? "border-purple-400 bg-purple-50"
              : "border-border hover:border-purple-300"
          }`}
        >
          <div className={`p-3 rounded-lg ${cardFilter === "persona_natural" ? "bg-purple-200" : "bg-purple-100"}`}>
            <User className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {clients.filter((c) => isPersonaNatural(c.tipo_cliente)).length}
            </p>
            <p className="text-sm text-muted-foreground">Personas Naturales</p>
          </div>
        </button>
        <button
          onClick={() => setCardFilter(cardFilter === "pn_con_empresa" ? "all" : "pn_con_empresa")}
          className={`bg-card rounded-xl border p-4 flex items-center gap-4 text-left transition-colors ${
            cardFilter === "pn_con_empresa"
              ? "border-orange-400 bg-orange-50"
              : "border-border hover:border-orange-300"
          }`}
        >
          <div className={`p-3 rounded-lg ${cardFilter === "pn_con_empresa" ? "bg-orange-200" : "bg-orange-100"}`}>
            <Building2 className="h-5 w-5 text-orange-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {clients.filter((c) => isPersonaNatural(c.tipo_cliente) && c.persona_natural_con_empresa === true).length}
            </p>
            <p className="text-sm text-muted-foreground">Persona Natural con Empresa</p>
          </div>
        </button>
        <button
          onClick={() => setCardFilter(cardFilter === "inactivos" ? "all" : "inactivos")}
          className={`bg-card rounded-xl border p-4 flex items-center gap-4 text-left transition-colors ${
            cardFilter === "inactivos"
              ? "border-gray-400 bg-gray-50"
              : "border-border hover:border-gray-300"
          }`}
        >
          <div className={`p-3 rounded-lg ${cardFilter === "inactivos" ? "bg-gray-200" : "bg-gray-100"}`}>
            <Building2 className="h-5 w-5 text-gray-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {clients.filter((c) => !c.activo).length}
            </p>
            <p className="text-sm text-muted-foreground">Inactivos</p>
          </div>
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Cards View */}
      {!loading && viewMode === "cards" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isEmpresa(client.tipo_cliente)
                        ? "bg-primary/10"
                        : "bg-purple-100"
                    }`}
                  >
                    {isEmpresa(client.tipo_cliente) ? (
                      <Building2 className="h-5 w-5 text-primary" />
                    ) : (
                      <User className="h-5 w-5 text-purple-700" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{getClientName(client)}</p>
                    <p className="text-sm text-muted-foreground">
                      {isEmpresa(client.tipo_cliente) ? "Empresa" : "Persona Natural"}
                    </p>
                  </div>
                </div>
                <ClientActions
                  clientName={getClientName(client)}
                  isActive={client.activo}
                  onToggleStatus={() => handleToggleStatus(client)}
                  onEdit={() => handleEdit(client)}
                  onDelete={() => handleDelete(client)}
                />
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className={client.activo ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}>
                  {client.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-muted-foreground">{isEmpresa(client.tipo_cliente) ? "RUC" : "DNI"}</p>
                  <p className="font-mono text-foreground">{client.codigo}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {client.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {client.email}
                  </div>
                )}
                {client.telefono && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {client.telefono}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {!loading && viewMode === "table" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Cliente
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    RUC/DNI
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Contacto
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Estado
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isEmpresa(client.tipo_cliente)
                              ? "bg-primary/10"
                              : "bg-purple-100"
                          }`}
                        >
                          {isEmpresa(client.tipo_cliente) ? (
                            <Building2 className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4 text-purple-700" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {getClientName(client)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isEmpresa(client.tipo_cliente) ? "Empresa" : "Persona Natural"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-foreground">
                        {client.codigo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {client.email}
                          </div>
                        )}
                        {client.telefono && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {client.telefono}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={client.activo ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}
                      >
                        {client.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ClientActions
                        clientName={getClientName(client)}
                        isActive={client.activo}
                        onToggleStatus={() => handleToggleStatus(client)}
                        onEdit={() => handleEdit(client)}
                        onDelete={() => handleDelete(client)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredClients.length} de {clients.length} clientes
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Anterior
              </Button>
              <Button variant="outline" size="sm">
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;