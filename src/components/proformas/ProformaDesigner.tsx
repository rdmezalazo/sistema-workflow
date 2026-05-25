import { useState, useEffect } from "react";
import { Plus, Trash2, Save, ChevronRight, FileText, Briefcase, Check, Settings2, PlusCircle, Search, X, Palette } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PDFStyleEditor } from "./PDFStyleEditor";

interface Campo {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "date";
  options?: string[];
  required: boolean;
}

interface ServicioPlantilla {
  id: string;
  label: string;
  precio: number;
  categoria: string;
}

interface Plantilla {
  id: string;
  nombre: string;
  tipo: "Contabilidad" | "Trámites" | "Auditoría y Control Interno";
  descripcion: string | null;
  campos: Campo[];
  servicios: ServicioPlantilla[];
  activa: boolean;
}

type GrupoServicio = "Contabilidad" | "Trámites" | "Auditoría y Control Interno";

interface ProformaDesignerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fieldTypes = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "select", label: "Selección" },
  { value: "textarea", label: "Área de texto" },
  { value: "date", label: "Fecha" },
];

interface ServicioFromDB {
  id: string;
  tipo_servicio: string | null;
  grupo_servicio: string | null;
  servicio: string;
  regimen_tributario: string | null;
  entidad: string | null;
  tramite: string | null;
  precio_servicio: number;
  activo: boolean;
}

interface ServiceCategory {
  category: string;
  services: { id: string; label: string; precio: number }[];
}

export function ProformaDesigner({ open, onOpenChange }: ProformaDesignerProps) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedPlantilla, setSelectedPlantilla] = useState<Plantilla | null>(null);
  const [activeType, setActiveType] = useState<GrupoServicio>("Contabilidad");
  const [loading, setLoading] = useState(false);
  const [showCustomFieldForm, setShowCustomFieldForm] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<Campo["type"]>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [serviciosDB, setServiciosDB] = useState<ServiceCategory[]>([]);
  const [showNewPlantillaForm, setShowNewPlantillaForm] = useState(false);
  const [newPlantillaNombre, setNewPlantillaNombre] = useState("");
  const [newPlantillaTipo, setNewPlantillaTipo] = useState<GrupoServicio>("Contabilidad");
  const [newPlantillaDescripcion, setNewPlantillaDescripcion] = useState("");
  const [activeTab, setActiveTab] = useState<"campos" | "servicios">("campos");
  const [servicioSearch, setServicioSearch] = useState("");
  const [showPDFEditor, setShowPDFEditor] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPlantillas();
      fetchServicios();
    }
  }, [open]);

  const fetchServicios = async () => {
    const { data, error } = await supabase
      .from("servicios")
      .select("*")
      .eq("activo", true)
      .order("grupo_servicio", { ascending: true })
      .order("servicio", { ascending: true });

    if (error) {
      console.error("Error fetching servicios:", error);
      return;
    }

    // Group services by tipo_servicio within the active grupo_servicio
    const grouped: Record<string, { id: string; label: string; precio: number }[]> = {};

    (data || []).forEach((s: ServicioFromDB) => {
      // Only include services that match the current activeType (grupo_servicio)
      if (s.grupo_servicio !== activeType) return;
      
      let label = s.servicio;
      if (s.regimen_tributario) {
        label += ` - ${s.regimen_tributario}`;
      }
      if (s.entidad) {
        label += ` (${s.entidad})`;
      }

      const tipoServicio = s.tipo_servicio || "Sin tipo";
      const serviceItem = { id: s.id, label, precio: s.precio_servicio || 0 };

      if (!grouped[tipoServicio]) {
        grouped[tipoServicio] = [];
      }
      grouped[tipoServicio].push(serviceItem);
    });

    const serviciosArray: ServiceCategory[] = Object.entries(grouped).map(([category, services]) => ({
      category,
      services,
    }));

    setServiciosDB(serviciosArray);
  };

  useEffect(() => {
    if (open) {
      fetchServicios();
    }
  }, [activeType, open]);

  const fetchPlantillas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("proforma_plantillas")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Error al cargar plantillas");
      console.error(error);
    } else {
      const parsed = (data || []).map((p) => ({
        ...p,
        tipo: p.tipo as GrupoServicio,
        campos: (Array.isArray(p.campos) ? p.campos : []) as unknown as Campo[],
        servicios: (Array.isArray(p.servicios) ? p.servicios : []) as unknown as ServicioPlantilla[],
      }));
      setPlantillas(parsed);
      const firstOfType = parsed.find((pl) => pl.tipo === activeType);
      if (firstOfType) setSelectedPlantilla(firstOfType);
    }
    setLoading(false);
  };

  const handleSelectPlantilla = (plantilla: Plantilla) => {
    setSelectedPlantilla(plantilla);
    setActiveType(plantilla.tipo);
  };

  // === CAMPOS (Custom Fields) ===
  const handleAddCustomField = () => {
    if (!selectedPlantilla || !newFieldLabel.trim()) {
      toast.error("Ingrese un nombre para el campo");
      return;
    }

    const newField: Campo = {
      id: crypto.randomUUID(),
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      ...(newFieldType === "select" && {
        options: newFieldOptions.split(",").map((o) => o.trim()).filter(Boolean),
      }),
    };

    setSelectedPlantilla({
      ...selectedPlantilla,
      campos: [...selectedPlantilla.campos, newField],
    });

    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setNewFieldOptions("");
    setShowCustomFieldForm(false);
    toast.success("Campo agregado");
  };

  const handleRemoveField = (fieldId: string) => {
    if (!selectedPlantilla) return;
    setSelectedPlantilla({
      ...selectedPlantilla,
      campos: selectedPlantilla.campos.filter((c) => c.id !== fieldId),
    });
  };

  // === SERVICIOS ===
  const isServiceSelected = (serviceId: string) => {
    return selectedPlantilla?.servicios.some((s) => s.id === serviceId) || false;
  };

  const handleToggleService = (service: { id: string; label: string; precio: number }, category: string) => {
    if (!selectedPlantilla) return;

    if (isServiceSelected(service.id)) {
      setSelectedPlantilla({
        ...selectedPlantilla,
        servicios: selectedPlantilla.servicios.filter((s) => s.id !== service.id),
      });
    } else {
      const newService: ServicioPlantilla = {
        id: service.id,
        label: service.label,
        precio: service.precio,
        categoria: category,
      };
      setSelectedPlantilla({
        ...selectedPlantilla,
        servicios: [...selectedPlantilla.servicios, newService],
      });
    }
  };

  const handleRemoveService = (serviceId: string) => {
    if (!selectedPlantilla) return;
    setSelectedPlantilla({
      ...selectedPlantilla,
      servicios: selectedPlantilla.servicios.filter((s) => s.id !== serviceId),
    });
  };

  const handleSavePlantilla = async () => {
    if (!selectedPlantilla) return;

    setLoading(true);
    const { error } = await supabase
      .from("proforma_plantillas")
      .update({
        nombre: selectedPlantilla.nombre,
        descripcion: selectedPlantilla.descripcion,
        campos: JSON.parse(JSON.stringify(selectedPlantilla.campos)),
        servicios: JSON.parse(JSON.stringify(selectedPlantilla.servicios)),
        activa: selectedPlantilla.activa,
      })
      .eq("id", selectedPlantilla.id);

    if (error) {
      toast.error("Error al guardar plantilla");
      console.error(error);
    } else {
      toast.success("Plantilla guardada correctamente");
      fetchPlantillas();
    }
    setLoading(false);
  };

  // Campos por defecto para nuevas plantillas
  const defaultCampos: Campo[] = [
    {
      id: crypto.randomUUID(),
      label: "Régimen Tributario",
      type: "select",
      options: ["RER", "RMT", "RG"],
      required: true,
    },
    {
      id: crypto.randomUUID(),
      label: "Tipo de Declaración",
      type: "select",
      options: ["Mensual", "Anual"],
      required: true,
    },
    {
      id: crypto.randomUUID(),
      label: "Período",
      type: "text",
      required: true,
    },
  ];

  const handleCreatePlantilla = async () => {
    if (!newPlantillaNombre.trim()) {
      toast.error("Ingrese un nombre para la plantilla");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("proforma_plantillas")
      .insert({
        nombre: newPlantillaNombre.trim(),
        tipo: newPlantillaTipo as "contabilidad" | "tramites", // Cast for TypeScript, DB accepts all 3 groups
        descripcion: newPlantillaDescripcion.trim() || null,
        campos: JSON.parse(JSON.stringify(defaultCampos)),
        servicios: [],
        activa: true,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Error al crear plantilla");
      console.error(error);
    } else {
      toast.success("Plantilla creada correctamente");
      setNewPlantillaNombre("");
      setNewPlantillaDescripcion("");
      setShowNewPlantillaForm(false);
      await fetchPlantillas();
      if (data) {
        const newPlantilla: Plantilla = {
          ...data,
          tipo: data.tipo as GrupoServicio,
          campos: defaultCampos,
          servicios: [] as ServicioPlantilla[],
        };
        setSelectedPlantilla(newPlantilla);
        setActiveType(newPlantilla.tipo);
      }
    }
    setLoading(false);
  };

  const handleDeletePlantilla = async () => {
    if (!selectedPlantilla) return;
    
    if (!confirm(`¿Está seguro de eliminar la plantilla "${selectedPlantilla.nombre}"?`)) {
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("proforma_plantillas")
      .delete()
      .eq("id", selectedPlantilla.id);

    if (error) {
      toast.error("Error al eliminar plantilla");
      console.error(error);
    } else {
      toast.success("Plantilla eliminada");
      setSelectedPlantilla(null);
      fetchPlantillas();
    }
    setLoading(false);
  };

  const filteredServicios = serviciosDB.map((cat) => ({
    ...cat,
    services: cat.services.filter((s) => 
      s.label.toLowerCase().includes(servicioSearch.toLowerCase())
    ),
  })).filter((cat) => cat.services.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Diseñador de Proformas
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Configura los campos y servicios para cada tipo de proforma
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar - Lista de plantillas */}
          <div className="w-64 border-r bg-muted/30 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                Plantillas
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowNewPlantillaForm(true)}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>

            {showNewPlantillaForm && (
              <div className="mb-4 p-3 border rounded-lg bg-background space-y-3">
                <h4 className="font-medium text-sm">Nueva Plantilla</h4>
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    value={newPlantillaNombre}
                    onChange={(e) => setNewPlantillaNombre(e.target.value)}
                    placeholder="Nombre de la plantilla"
                    className="mt-1 h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Grupo</Label>
                  <Select
                    value={newPlantillaTipo}
                    onValueChange={(v) => setNewPlantillaTipo(v as GrupoServicio)}
                  >
                    <SelectTrigger className="mt-1 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Contabilidad">Contabilidad</SelectItem>
                      <SelectItem value="Trámites">Trámites</SelectItem>
                      <SelectItem value="Auditoría y Control Interno">Auditoría y Control Interno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Descripción (opcional)</Label>
                  <Textarea
                    value={newPlantillaDescripcion}
                    onChange={(e) => setNewPlantillaDescripcion(e.target.value)}
                    placeholder="Descripción..."
                    className="mt-1 resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowNewPlantillaForm(false);
                      setNewPlantillaNombre("");
                      setNewPlantillaDescripcion("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleCreatePlantilla}
                    disabled={loading}
                  >
                    Crear
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {plantillas.map((plantilla) => (
                  <button
                    key={plantilla.id}
                    onClick={() => handleSelectPlantilla(plantilla)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedPlantilla?.id === plantilla.id
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-transparent bg-background hover:bg-background/80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {plantilla.tipo === "Contabilidad" ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : plantilla.tipo === "Trámites" ? (
                        <Briefcase className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-purple-500" />
                      )}
                      <span className="font-medium text-sm truncate">{plantilla.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          plantilla.tipo === "Contabilidad" 
                            ? "bg-blue-100 text-blue-700" 
                            : plantilla.tipo === "Trámites"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {plantilla.tipo}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {plantilla.campos.length} campos, {plantilla.servicios.length} servicios
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main content */}
          {selectedPlantilla ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header de plantilla */}
              <div className="px-6 py-4 border-b bg-background">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nombre de la plantilla</Label>
                      <Input
                        value={selectedPlantilla.nombre}
                        onChange={(e) =>
                          setSelectedPlantilla({
                            ...selectedPlantilla,
                            nombre: e.target.value,
                          })
                        }
                        className="mt-1 max-w-md font-medium"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Descripción</Label>
                      <Textarea
                        value={selectedPlantilla.descripcion || ""}
                        onChange={(e) =>
                          setSelectedPlantilla({
                            ...selectedPlantilla,
                            descripcion: e.target.value,
                          })
                        }
                        className="mt-1 max-w-md resize-none"
                        rows={2}
                        placeholder="Descripción de la plantilla..."
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDeletePlantilla}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Tabs for Campos and Servicios */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "campos" | "servicios")} className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-6 pt-4 border-b flex items-center justify-between">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                      <TabsTrigger value="campos" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Campos ({selectedPlantilla.campos.length})
                      </TabsTrigger>
                      <TabsTrigger value="servicios" className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        Servicios ({selectedPlantilla.servicios.length})
                      </TabsTrigger>
                    </TabsList>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2" 
                      onClick={() => setShowPDFEditor(true)}
                    >
                      <Palette className="h-4 w-4" />
                      Editor de Estilos PDF
                    </Button>
                  </div>

                  {/* Campos Tab */}
                  <TabsContent value="campos" className="flex-1 overflow-hidden m-0 p-0">
                    <div className="h-full flex flex-col">
                      <div className="px-6 py-3 border-b bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                          Define campos personalizados que se mostrarán al crear una proforma con esta plantilla
                        </p>
                      </div>
                      <ScrollArea className="flex-1 px-6 py-4">
                        <div className="space-y-4">
                          {/* Lista de campos */}
                          {selectedPlantilla.campos.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                              <table className="w-full">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Campo</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Requerido</th>
                                    <th className="px-4 py-2 w-10"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {selectedPlantilla.campos.map((campo) => (
                                    <tr key={campo.id} className="hover:bg-muted/30">
                                      <td className="px-4 py-3 text-sm font-medium">{campo.label}</td>
                                      <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {fieldTypes.find((t) => t.value === campo.type)?.label || campo.type}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        {campo.required && <Check className="h-4 w-4 text-primary mx-auto" />}
                                      </td>
                                      <td className="px-2 py-3">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                          onClick={() => handleRemoveField(campo.id)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {selectedPlantilla.campos.length === 0 && !showCustomFieldForm && (
                            <div className="text-center py-8 border rounded-lg bg-muted/20">
                              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                              <p className="text-sm text-muted-foreground">No hay campos definidos</p>
                              <p className="text-xs text-muted-foreground mt-1">Agregue campos personalizados</p>
                            </div>
                          )}

                          {/* Formulario para agregar campo */}
                          {!showCustomFieldForm ? (
                            <Button
                              variant="outline"
                              className="w-full gap-2"
                              onClick={() => setShowCustomFieldForm(true)}
                            >
                              <Plus className="h-4 w-4" />
                              Agregar campo personalizado
                            </Button>
                          ) : (
                            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                              <h5 className="font-medium text-sm">Nuevo campo personalizado</h5>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Nombre</Label>
                                  <Input
                                    value={newFieldLabel}
                                    onChange={(e) => setNewFieldLabel(e.target.value)}
                                    placeholder="Ej: Número de trabajadores"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Tipo</Label>
                                  <Select
                                    value={newFieldType}
                                    onValueChange={(v) => setNewFieldType(v as Campo["type"])}
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {fieldTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {newFieldType === "select" && (
                                <div>
                                  <Label className="text-xs">Opciones (separadas por coma)</Label>
                                  <Input
                                    value={newFieldOptions}
                                    onChange={(e) => setNewFieldOptions(e.target.value)}
                                    placeholder="Opción 1, Opción 2, Opción 3"
                                    className="mt-1"
                                  />
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={newFieldRequired}
                                  onCheckedChange={setNewFieldRequired}
                                />
                                <Label className="text-xs">Campo requerido</Label>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowCustomFieldForm(false)}
                                  className="flex-1"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={handleAddCustomField}
                                  className="flex-1"
                                >
                                  Agregar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>

                  {/* Servicios Tab */}
                  <TabsContent value="servicios" className="flex-1 overflow-hidden m-0 p-0">
                    <div className="h-full flex">
                      {/* Servicios disponibles */}
                      <div className="flex-1 border-r overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b bg-muted/30 space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Servicios Disponibles
                          </h4>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar servicio..."
                              value={servicioSearch}
                              onChange={(e) => setServicioSearch(e.target.value)}
                              className="pl-9 h-8"
                            />
                          </div>
                        </div>
                        <ScrollArea className="flex-1">
                          <Accordion type="multiple" defaultValue={filteredServicios.map((_, i) => `cat-${i}`)} className="px-4 py-2">
                            {filteredServicios.map((category, catIndex) => (
                              <AccordionItem key={catIndex} value={`cat-${catIndex}`} className="border-b-0">
                                <AccordionTrigger className="py-3 hover:no-underline">
                                  <span className="font-medium text-sm">{category.category}</span>
                                </AccordionTrigger>
                                <AccordionContent className="pb-4">
                                  <div className="space-y-2">
                                    {category.services.map((service) => {
                                      const isSelected = isServiceSelected(service.id);
                                      return (
                                        <label
                                          key={service.id}
                                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                            isSelected
                                              ? "border-primary bg-primary/5"
                                              : "border-border hover:bg-muted/50"
                                          }`}
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => handleToggleService(service, category.category)}
                                          />
                                          <span className="text-sm flex-1">{service.label}</span>
                                          <span className="text-xs text-muted-foreground">
                                            S/ {service.precio.toLocaleString()}
                                          </span>
                                          {isSelected && (
                                            <Check className="h-4 w-4 text-primary" />
                                          )}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                          {filteredServicios.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">
                              <p className="text-sm">No se encontraron servicios</p>
                            </div>
                          )}
                        </ScrollArea>
                      </div>

                      {/* Servicios seleccionados */}
                      <div className="w-80 overflow-hidden flex flex-col bg-muted/20">
                        <div className="px-4 py-3 border-b bg-muted/30">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            Servicios Incluidos ({selectedPlantilla.servicios.length})
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Disponibles para buscar al crear proforma
                          </p>
                        </div>
                        <ScrollArea className="flex-1">
                          <div className="p-4 space-y-2">
                            {selectedPlantilla.servicios.length === 0 ? (
                              <div className="text-center py-8">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                  <Briefcase className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  No hay servicios seleccionados
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Selecciona servicios de la lista
                                </p>
                              </div>
                            ) : (
                              selectedPlantilla.servicios.map((servicio) => (
                                <div
                                  key={servicio.id}
                                  className="flex items-start gap-2 p-3 bg-background rounded-lg border group"
                                >
                                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-tight">{servicio.label}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {servicio.categoria} • S/ {servicio.precio.toLocaleString()}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    onClick={() => handleRemoveService(servicio.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </TabsContent>

                </Tabs>
              </div>

              {/* PDF Style Editor Modal */}
              <PDFStyleEditor 
                plantillaId={selectedPlantilla.id}
                plantillaNombre={selectedPlantilla.nombre}
                plantillaTipo={selectedPlantilla.tipo}
                open={showPDFEditor}
                onOpenChange={setShowPDFEditor}
              />

              {/* Footer */}
              <div className="px-6 py-4 border-t bg-background flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePlantilla} disabled={loading} className="gap-2">
                  <Save className="h-4 w-4" />
                  Guardar plantilla
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona una plantilla para editarla</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
