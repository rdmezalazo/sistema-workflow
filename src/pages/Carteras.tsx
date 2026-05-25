import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Users,
  Plus,
  Edit,
  MoreHorizontal,
  UserPlus,
  Trash2,
  Search,
  Loader2,
  Building2,
  UserMinus,
  Eye,
  Settings,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { useRolePermisos } from "@/hooks/useRolePermisos";
import { CarteraPerformanceDashboard } from "@/components/carteras/CarteraPerformanceDashboard";
import { ExportExcelButton } from "@/components/ui/ExportExcelButton";
import { useSedeContext } from "@/hooks/useSedeContext";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Cartera {
  id: string;
  nombre: string;
  descripcion: string | null;
  especialidad: string;
  activa: boolean;
  responsable_id: string | null;
  created_at: string;
  sede_id?: string | null;
  miembros: CarteraMiembro[];
  clientes: { id: string; cliente: { id: string; razon_social: string; codigo: string } }[];
}

interface CarteraMiembro {
  id: string;
  user_id: string;
  rol_en_cartera: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone?: string | null;
  role?: AppRole;
  puesto?: string | null;
  asignar_supervision?: boolean;
}

interface CarteraStats {
  total: number;
  activas: number;
  totalMiembros: number;
  totalClientes: number;
}

const especialidadStyles: Record<string, string> = {
  Contabilidad: "bg-primary/10 text-primary border-primary/20",
  Trámites: "bg-amber-100 text-amber-800 border-amber-200",
  Mixta: "bg-purple-100 text-purple-800 border-purple-200",
};

const rolStyles: Record<string, string> = {
  asistente: "bg-green-100 text-green-800",
  auxiliar: "bg-blue-100 text-blue-800",
  practicante: "bg-orange-100 text-orange-800",
};

const Carteras = () => {
  const { roles: availableRoles } = useRolePermisos();
  const { activeSedeId } = useSedeContext();
  const [loading, setLoading] = useState(true);
  const [carteras, setCarteras] = useState<Cartera[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("carteras");
  const [carteraFilter, setCarteraFilter] = useState<"all" | "activas" | "inactivas">("all");
  const [stats, setStats] = useState<CarteraStats>({
    total: 0,
    activas: 0,
    totalMiembros: 0,
    totalClientes: 0,
  });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false);
  const [editPersonalDialogOpen, setEditPersonalDialogOpen] = useState(false);

  const [selectedCartera, setSelectedCartera] = useState<Cartera | null>(null);
  const [selectedMember, setSelectedMember] = useState<CarteraMiembro | null>(null);
  const [selectedPersonal, setSelectedPersonal] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    especialidad: "Mixta",
  });

  const [memberForm, setMemberForm] = useState({
    user_id: "",
    rol_en_cartera: "asistente",
  });

  const [personalForm, setPersonalForm] = useState({
    full_name: "",
    phone: "",
    role: "asesor" as AppRole,
  });

  useEffect(() => {
    fetchCarteras();
    fetchProfiles();
  }, []);

  const fetchCarteras = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("carteras")
      .select(`
        *,
        miembros:cartera_miembros(
          id,
          user_id,
          rol_en_cartera,
          profile:profiles(id, full_name, email)
        ),
        clientes:cartera_clientes(
          id,
          cliente:clientes(id, razon_social, codigo)
        )
      `)
      .order("nombre");

    if (error) {
      console.error("Error fetching carteras:", error);
      toast.error("Error al cargar las carteras");
    } else if (data) {
      const carterasData = data as unknown as Cartera[];
      setCarteras(carterasData);

      // Calculate stats
      const statsData: CarteraStats = {
        total: carterasData.length,
        activas: carterasData.filter((c) => c.activa).length,
        totalMiembros: carterasData.reduce((acc, c) => acc + (c.miembros?.length || 0), 0),
        totalClientes: carterasData.reduce((acc, c) => acc + (c.clientes?.length || 0), 0),
      };
      setStats(statsData);
    }

    setLoading(false);
  };

  const fetchProfiles = async () => {
    // Fetch profiles with puesto and asignar_supervision
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, puesto, asignar_supervision")
      .order("full_name");

    // Fetch roles
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (profilesData) {
      const profilesWithRoles = profilesData.map(p => ({
        ...p,
        role: rolesData?.find(r => r.user_id === p.id)?.role || "asesor" as AppRole,
      }));
      setProfiles(profilesWithRoles);
    }
  };

  const filteredCarteras = carteras.filter((cartera) => {
    if (activeSedeId && cartera.sede_id !== activeSedeId) return false;
    if (carteraFilter === "activas" && !cartera.activa) return false;
    if (carteraFilter === "inactivas" && cartera.activa) return false;
    return (
      cartera.nombre.toLowerCase().includes(search.toLowerCase()) ||
      cartera.descripcion?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const filteredPersonal = profiles.filter((p) =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleLabel = (role: AppRole) => {
    const roleInfo = availableRoles.find(r => r.role === role);
    return roleInfo?.nombre_display || role;
  };

  const handleCreateCartera = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("carteras").insert({
      nombre: formData.nombre,
      descripcion: formData.descripcion || null,
      especialidad: formData.especialidad,
    });

    if (error) {
      console.error("Error creating cartera:", error);
      toast.error("Error al crear la cartera");
    } else {
      toast.success("Cartera creada correctamente");
      setCreateDialogOpen(false);
      resetForm();
      fetchCarteras();
    }

    setSaving(false);
  };

  const handleEditCartera = async () => {
    if (!selectedCartera || !formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("carteras")
      .update({
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        especialidad: formData.especialidad,
      })
      .eq("id", selectedCartera.id);

    if (error) {
      console.error("Error updating cartera:", error);
      toast.error("Error al actualizar la cartera");
    } else {
      toast.success("Cartera actualizada correctamente");
      setEditDialogOpen(false);
      resetForm();
      fetchCarteras();
    }

    setSaving(false);
  };

  const handleDeleteCartera = async () => {
    if (!selectedCartera) return;

    setSaving(true);

    const { error } = await supabase
      .from("carteras")
      .delete()
      .eq("id", selectedCartera.id);

    if (error) {
      console.error("Error deleting cartera:", error);
      toast.error("Error al eliminar la cartera");
    } else {
      toast.success("Cartera eliminada correctamente");
      setDeleteDialogOpen(false);
      fetchCarteras();
    }

    setSaving(false);
  };

  const handleAddMember = async () => {
    if (!selectedCartera || !memberForm.user_id) {
      toast.error("Selecciona un usuario");
      return;
    }

    setSaving(true);

    // Get the selected profile to check asignar_supervision and puesto
    const selectedProfile = profiles.find(p => p.id === memberForm.user_id);
    
    // Determine the role based on asignar_supervision and puesto
    let rolEnCartera = memberForm.rol_en_cartera;
    if (selectedProfile?.asignar_supervision) {
      // Check if puesto is "Gerente" for "Supervisión Gerencial"
      if (selectedProfile.puesto?.toLowerCase() === "gerente") {
        rolEnCartera = "Supervisión Gerencial";
      } else {
        rolEnCartera = "Supervisión";
      }
    }

    const { error } = await supabase.from("cartera_miembros").insert({
      cartera_id: selectedCartera.id,
      user_id: memberForm.user_id,
      rol_en_cartera: rolEnCartera,
    });

    if (error) {
      console.error("Error adding member:", error);
      if (error.code === "23505") {
        toast.error("Este usuario ya es miembro de la cartera");
      } else {
        toast.error("Error al agregar miembro");
      }
    } else {
      toast.success("Miembro agregado correctamente");
      setAddMemberDialogOpen(false);
      setMemberForm({ user_id: "", rol_en_cartera: "asistente" });
      fetchCarteras();
    }

    setSaving(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase
      .from("cartera_miembros")
      .delete()
      .eq("id", memberId);

    if (error) {
      console.error("Error removing member:", error);
      toast.error("Error al remover miembro");
    } else {
      toast.success("Miembro removido");
      fetchCarteras();
    }
  };

  const handleEditMemberRole = async () => {
    if (!selectedMember) return;

    setSaving(true);

    const { error } = await supabase
      .from("cartera_miembros")
      .update({ rol_en_cartera: memberForm.rol_en_cartera })
      .eq("id", selectedMember.id);

    if (error) {
      console.error("Error updating member role:", error);
      toast.error("Error al actualizar rol");
    } else {
      toast.success("Rol actualizado");
      setEditMemberDialogOpen(false);
      fetchCarteras();
    }

    setSaving(false);
  };

  const handleEditPersonal = async () => {
    if (!selectedPersonal) return;

    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: personalForm.full_name,
          phone: personalForm.phone,
        })
        .eq("id", selectedPersonal.id);

      if (profileError) throw profileError;

      // Update role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: personalForm.role })
        .eq("user_id", selectedPersonal.id);

      if (roleError) throw roleError;

      toast.success("Personal actualizado");
      setEditPersonalDialogOpen(false);
      fetchProfiles();
    } catch (error) {
      console.error("Error updating personal:", error);
      toast.error("Error al actualizar personal");
    }

    setSaving(false);
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      especialidad: "Mixta",
    });
    setSelectedCartera(null);
  };

  const openEditDialog = (cartera: Cartera) => {
    setSelectedCartera(cartera);
    setFormData({
      nombre: cartera.nombre,
      descripcion: cartera.descripcion || "",
      especialidad: cartera.especialidad || "Mixta",
    });
    setEditDialogOpen(true);
  };

  const openAddMemberDialog = (cartera: Cartera) => {
    setSelectedCartera(cartera);
    setMemberForm({ user_id: "", rol_en_cartera: "asistente" });
    setAddMemberDialogOpen(true);
  };

  const openDetailDialog = (cartera: Cartera) => {
    setSelectedCartera(cartera);
    setDetailDialogOpen(true);
  };

  const openEditMemberDialog = (cartera: Cartera, member: CarteraMiembro) => {
    setSelectedCartera(cartera);
    setSelectedMember(member);
    setMemberForm({ user_id: member.user_id, rol_en_cartera: member.rol_en_cartera });
    setEditMemberDialogOpen(true);
  };

  const openEditPersonalDialog = (personal: Profile) => {
    setSelectedPersonal(personal);
    setPersonalForm({
      full_name: personal.full_name || "",
      phone: personal.phone || "",
      role: personal.role || "asesor",
    });
    setEditPersonalDialogOpen(true);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  // Get available profiles (not already in the cartera)
  const availableProfiles = profiles.filter(
    (p) => !selectedCartera?.miembros?.some((m) => m.user_id === p.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Carteras y Personal</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de las carteras operativas y asignación de personal
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setCarteraFilter("all")}
          className={`text-left rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 ${carteraFilter === "all" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Carteras</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setCarteraFilter(carteraFilter === "activas" ? "all" : "activas")}
          className={`text-left rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 ${carteraFilter === "activas" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Carteras Activas</p>
              <p className="text-2xl font-bold text-green-600">{stats.activas}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setCarteraFilter(carteraFilter === "inactivas" ? "all" : "inactivas")}
          className={`text-left rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 ${carteraFilter === "inactivas" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Carteras Inactivas</p>
              <p className="text-2xl font-bold text-gray-500">{stats.total - stats.activas}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-gray-500" />
            </div>
          </div>
        </button>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Miembros</p>
                <p className="text-2xl font-bold">{stats.totalMiembros}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="carteras" className="gap-2">
              <Building2 className="h-4 w-4" />
              Carteras
            </TabsTrigger>
            <TabsTrigger value="rendimiento" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Rendimiento
            </TabsTrigger>
            <TabsTrigger value="personal" className="gap-2">
              <Users className="h-4 w-4" />
              Personal
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            {activeTab === "rendimiento" ? (
              <Select
                value={selectedCartera?.id || ""}
                onValueChange={(value) => {
                  const cartera = carteras.find(c => c.id === value);
                  setSelectedCartera(cartera || null);
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Seleccionar cartera..." />
                </SelectTrigger>
                <SelectContent>
                  {carteras.filter(c => c.activa).map((cartera) => (
                    <SelectItem key={cartera.id} value={cartera.id}>
                      {cartera.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={activeTab === "carteras" ? "Buscar carteras..." : "Buscar personal..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {activeTab === "carteras" && (
                  <>
                    <ExportExcelButton
                      allRows={carteras}
                      filteredRows={filteredCarteras}
                      fileName="carteras"
                      sheetName="Carteras"
                      columns={[
                        { header: "Nombre", accessor: (c) => c.nombre },
                        { header: "Especialidad", accessor: (c) => c.especialidad },
                        { header: "Descripción", accessor: (c) => c.descripcion ?? "" },
                        { header: "Estado", accessor: (c) => (c.activa ? "Activa" : "Inactiva") },
                        { header: "N° Miembros", accessor: (c) => c.miembros?.length ?? 0 },
                        { header: "N° Clientes", accessor: (c) => c.clientes?.length ?? 0 },
                        { header: "Fecha Creación", accessor: (c) => c.created_at },
                      ]}
                    />
                    <Button className="btn-gradient gap-2" onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Nueva Cartera
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tab: Carteras */}
        <TabsContent value="carteras" className="mt-6">
          {filteredCarteras.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No hay carteras registradas</p>
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera cartera
                </Button>
              </CardContent>
            </Card>
          ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCarteras.map((cartera) => (
            <Card key={cartera.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="p-5 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary text-primary-foreground">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{cartera.nombre}</h3>
                      <Badge
                        variant="outline"
                        className={especialidadStyles[cartera.especialidad] || especialidadStyles.Mixta}
                      >
                        {cartera.especialidad || "Mixta"}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDetailDialog(cartera)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(cartera)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar cartera
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openAddMemberDialog(cartera)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Agregar miembro
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedCartera(cartera);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 divide-x border-b">
                <div className="p-3 text-center">
                  <p className="text-lg font-bold">{cartera.miembros?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Miembros</p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-lg font-bold">{cartera.clientes?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Clientes</p>
                </div>
              </div>

              {/* Members */}
              <div className="p-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Equipo</p>
                {cartera.miembros?.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sin miembros asignados</p>
                ) : (
                  <div className="space-y-3">
                    {cartera.miembros?.slice(0, 3).map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(member.profile?.full_name, member.profile?.email || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {member.profile?.full_name || member.profile?.email}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-xs ${rolStyles[member.rol_en_cartera] || rolStyles.miembro}`}
                            >
                              {member.rol_en_cartera}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(cartera.miembros?.length || 0) > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{(cartera.miembros?.length || 0) - 3} más
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Description Footer */}
              {cartera.descripcion && (
                <div className="p-4 border-t bg-muted/20">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {cartera.descripcion}
                  </p>
                </div>
              )}
            </Card>
          ))}
          </div>
        )}
        </TabsContent>

        {/* Tab: Personal */}
        <TabsContent value="personal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Lista del Personal</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPersonal.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No hay personal registrado</p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Rol Sistema</TableHead>
                        <TableHead>Carteras Asignadas</TableHead>
                        <TableHead className="w-[80px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPersonal.map((person) => {
                        const carterasAsignadas = carteras.filter((c) =>
                          c.miembros?.some((m) => m.user_id === person.id)
                        );
                        return (
                          <TableRow key={person.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {getInitials(person.full_name, person.email)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{person.full_name || "Sin nombre"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{person.email}</TableCell>
                            <TableCell className="text-muted-foreground">{person.phone || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={rolStyles[person.role || "miembro"] || "bg-gray-100 text-gray-800"}>
                                {getRoleLabel(person.role || "asesor")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {carterasAsignadas.length > 0 ? (
                                  carterasAsignadas.map((c) => {
                                    const miembro = c.miembros?.find((m) => m.user_id === person.id);
                                    return (
                                      <Badge key={c.id} variant="secondary" className="text-xs">
                                        {c.nombre} ({miembro?.rol_en_cartera})
                                      </Badge>
                                    );
                                  })
                                ) : (
                                  <span className="text-muted-foreground text-sm italic">Sin asignar</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditPersonalDialog(person)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
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
        </TabsContent>

        {/* Tab: Rendimiento */}
        <TabsContent value="rendimiento" className="mt-6">
          {selectedCartera ? (
            <CarteraPerformanceDashboard
              carteraId={selectedCartera.id}
              carteraNombre={selectedCartera.nombre}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Selecciona una cartera para ver el rendimiento del equipo</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Cartera</DialogTitle>
            <DialogDescription>Crea una nueva cartera operativa</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre de la cartera"
              />
            </div>

            <div className="space-y-2">
              <Label>Especialidad</Label>
              <Select
                value={formData.especialidad}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, especialidad: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contabilidad">Contabilidad</SelectItem>
                  <SelectItem value="Trámites">Trámites</SelectItem>
                  <SelectItem value="Mixta">Mixta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción de la cartera..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCartera} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear Cartera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cartera</DialogTitle>
            <DialogDescription>Modifica los datos de la cartera</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre de la cartera"
              />
            </div>

            <div className="space-y-2">
              <Label>Especialidad</Label>
              <Select
                value={formData.especialidad}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, especialidad: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contabilidad">Contabilidad</SelectItem>
                  <SelectItem value="Trámites">Trámites</SelectItem>
                  <SelectItem value="Mixta">Mixta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción de la cartera..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditCartera} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Miembro</DialogTitle>
            <DialogDescription>
              Agrega un nuevo miembro a la cartera {selectedCartera?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Select
                value={memberForm.user_id}
                onValueChange={(value) => setMemberForm((prev) => ({ ...prev, user_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                      {profile.asignar_supervision && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Supervisión)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(() => {
              const selectedProfile = profiles.find(p => p.id === memberForm.user_id);
              const isSupervision = selectedProfile?.asignar_supervision;
              const supervisionRole = selectedProfile?.puesto?.toLowerCase() === "gerente" 
                ? "Supervisión Gerencial" 
                : "Supervisión";
              
              return (
                <div className="space-y-2">
                  <Label>Rol en la Cartera</Label>
                  {isSupervision ? (
                    <div className="flex items-center gap-2">
                      <Input 
                        value={supervisionRole} 
                        disabled 
                        className="bg-muted"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        (Asignado automáticamente)
                      </span>
                    </div>
                  ) : (
                    <Select
                      value={memberForm.rol_en_cartera}
                      onValueChange={(value) => setMemberForm((prev) => ({ ...prev, rol_en_cartera: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asistente">Asistente</SelectItem>
                        <SelectItem value="auxiliar">Auxiliar</SelectItem>
                        <SelectItem value="practicante">Practicante</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMember} disabled={saving || !memberForm.user_id}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedCartera?.nombre}
            </DialogTitle>
            <DialogDescription>
              {selectedCartera?.descripcion || "Sin descripción"}
            </DialogDescription>
          </DialogHeader>

          {selectedCartera && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={especialidadStyles[selectedCartera.especialidad] || especialidadStyles.Mixta}
                >
                  {selectedCartera.especialidad || "Mixta"}
                </Badge>
                {selectedCartera.activa ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    Activa
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-100 text-gray-800">
                    Inactiva
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Members Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Miembros del Equipo</h4>
                  <Button size="sm" variant="outline" onClick={() => {
                    setDetailDialogOpen(false);
                    openAddMemberDialog(selectedCartera);
                  }}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </div>

                {selectedCartera.miembros?.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sin miembros asignados</p>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead className="w-[80px]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCartera.miembros?.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {getInitials(member.profile?.full_name, member.profile?.email || "")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {member.profile?.full_name || "Sin nombre"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {member.profile?.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`${rolStyles[member.rol_en_cartera] || rolStyles.miembro} cursor-pointer hover:opacity-80`}
                                onClick={() => openEditMemberDialog(selectedCartera, member)}
                              >
                                {member.rol_en_cartera}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditMemberDialog(selectedCartera, member)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Clients Section */}
              <div>
                <h4 className="font-medium mb-3">Clientes Asignados</h4>
                {selectedCartera.clientes?.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sin clientes asignados</p>
                ) : (
                  <div className="border rounded-md max-h-48 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>RUC</TableHead>
                          <TableHead>Razón Social</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCartera.clientes?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">
                              {item.cliente?.codigo}
                            </TableCell>
                            <TableCell>{item.cliente?.razon_social}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta cartera?</AlertDialogTitle>
            <AlertDialogDescription>
              La cartera <strong>{selectedCartera?.nombre}</strong> será eliminada permanentemente
              junto con todas sus asignaciones de miembros y clientes. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCartera}
              className="bg-destructive hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Member Role Dialog */}
      <Dialog open={editMemberDialogOpen} onOpenChange={setEditMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Rol en Cartera</DialogTitle>
            <DialogDescription>
              Modifica el rol de {selectedMember?.profile?.full_name || selectedMember?.profile?.email} en {selectedCartera?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rol en la Cartera</Label>
              <Select
                value={memberForm.rol_en_cartera}
                onValueChange={(value) => setMemberForm((prev) => ({ ...prev, rol_en_cartera: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asistente">Asistente</SelectItem>
                  <SelectItem value="auxiliar">Auxiliar</SelectItem>
                  <SelectItem value="practicante">Practicante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMemberDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditMemberRole} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Personal Dialog */}
      <Dialog open={editPersonalDialogOpen} onOpenChange={setEditPersonalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Personal</DialogTitle>
            <DialogDescription>
              Modifica los datos de {selectedPersonal?.full_name || selectedPersonal?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input
                value={personalForm.full_name}
                onChange={(e) => setPersonalForm((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={personalForm.phone}
                onChange={(e) => setPersonalForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Número de teléfono"
              />
            </div>

            <div className="space-y-2">
              <Label>Rol del Sistema</Label>
              <Select
                value={personalForm.role}
                onValueChange={(value) => setPersonalForm((prev) => ({ ...prev, role: value as AppRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.filter(r => r.activo).map((r) => (
                    <SelectItem key={r.role} value={r.role}>
                      {r.nombre_display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPersonalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditPersonal} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Carteras;
