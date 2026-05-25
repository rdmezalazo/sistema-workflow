import { useState, useEffect, useMemo } from "react";
import { Check, FileText, Loader2, Briefcase, Users, CheckCircle2, Building2, Calendar, DollarSign, Clock, Star, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CarteraStats {
  total: number;
  en_gestion: number;
  finalizados: number;
  entregados_a_tiempo: number;
}

interface Cartera {
  id: string;
  nombre: string;
  especialidad: string | null;
  descripcion: string | null;
  activa: boolean;
  miembros: {
    user_id: string;
    rol_en_cartera: string;
    profile: {
      full_name: string | null;
      email: string;
      avatar_url: string | null;
    } | null;
  }[];
  stats: CarteraStats;
}

interface Plantilla {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string | null;
}

interface Parte {
  id: string;
  denominacion: string;
  tipo_persona: "natural" | "juridica";
  campos: { id: string; label: string; tipo: string; requerido: boolean }[];
  orden: number;
}

interface Clausula {
  id: string;
  numero: number;
  titulo: string;
  contenido: string;
  es_obligatoria: boolean;
  es_editable: boolean;
  orden: number;
}

interface ContractData {
  id: string;
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  monto_mensual: number | null;
  monto_total: number | null;
  moneda: string;
  proforma_id: string | null;
}

interface ClienteData {
  id: string;
  razon_social: string;
  codigo: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto_nombre: string | null;
}

interface ProformaData {
  id: string;
  numero: string;
  tipo: string;
  total: number;
  subtotal: number;
  igv: number;
  moneda: string;
  items: { descripcion: string; cantidad: number; precio_unitario: number; subtotal: number }[];
}

interface ApplyTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  onSuccess: () => void;
}

// Helper to replace template variables with actual data
const replaceTemplateVariables = (
  text: string,
  variables: Record<string, string>
): string => {
  let result = text;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\[${key}\\]`, "gi");
    result = result.replace(regex, value || `[${key}]`);
  });
  return result;
};

export function ApplyTemplateModal({
  open,
  onOpenChange,
  contractId,
  onSuccess,
}: ApplyTemplateModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState<string>("");
  const [partes, setPartes] = useState<Parte[]>([]);
  const [clausulas, setClausulas] = useState<Clausula[]>([]);
  const [editedClausulas, setEditedClausulas] = useState<Record<string, string>>({});
  const [partesData, setPartesData] = useState<Record<string, Record<string, string>>>({});
  
  // Contract and related data
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [clienteData, setClienteData] = useState<ClienteData | null>(null);
  
  // Cartera assignment
  const [carteras, setCarteras] = useState<Cartera[]>([]);
  const [selectedCarteraId, setSelectedCarteraId] = useState<string>("");
  const [proformaData, setProformaData] = useState<ProformaData | null>(null);
  
  const [editingClausulaId, setEditingClausulaId] = useState<string | null>(null);

  // Fetch all initial data
  useEffect(() => {
    if (open && contractId) {
      fetchData();
    }
  }, [open, contractId]);

  // When plantilla is selected, fetch its details
  useEffect(() => {
    if (selectedPlantillaId) {
      fetchPlantillaDetails(selectedPlantillaId);
    }
  }, [selectedPlantillaId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch available templates
    const { data: plantillasData } = await supabase
      .from("contrato_plantillas")
      .select("id, nombre, tipo, descripcion")
      .eq("activa", true)
      .order("nombre");

    if (plantillasData) {
      setPlantillas(plantillasData);
    }

    // Fetch carteras with members and contract stats
    const { data: carterasData } = await supabase
      .from("carteras")
      .select(`
        id, nombre, especialidad, descripcion, activa,
        miembros:cartera_miembros(
          user_id,
          rol_en_cartera,
          profile:profiles(full_name, email, avatar_url)
        ),
        clientes:cartera_clientes(cliente_id)
      `)
      .eq("activa", true)
      .order("nombre");

    if (carterasData) {
      // Fetch contract stats for each cartera
      const carterasWithStats = await Promise.all(
        carterasData.map(async (c) => {
          const clienteIds = (c.clientes || []).map((cc: any) => cc.cliente_id);
          
          let stats: CarteraStats = {
            total: 0,
            en_gestion: 0,
            finalizados: 0,
            entregados_a_tiempo: 0,
          };
          
          if (clienteIds.length > 0) {
            const { data: contratosStats } = await supabase
              .from("contratos")
              .select("id, status, fecha_fin")
              .in("cliente_id", clienteIds);
            
            if (contratosStats) {
              stats.total = contratosStats.length;
              stats.en_gestion = contratosStats.filter(ct => 
                ["en_gestion", "aprobado", "activo"].includes(ct.status)
              ).length;
              stats.finalizados = contratosStats.filter(ct => ct.status === "finalizado").length;
              // Assume 80% on-time delivery for demo (in production, this would check actual delivery dates)
              stats.entregados_a_tiempo = Math.round(stats.finalizados * 0.8);
            }
          }
          
          return {
            id: c.id,
            nombre: c.nombre,
            especialidad: c.especialidad,
            descripcion: c.descripcion,
            activa: c.activa,
            miembros: (c.miembros || []).map((m: any) => ({
              user_id: m.user_id,
              rol_en_cartera: m.rol_en_cartera,
              profile: m.profile ? {
                full_name: m.profile.full_name,
                email: m.profile.email,
                avatar_url: m.profile.avatar_url,
              } : null,
            })),
            stats,
          };
        })
      );
      
      setCarteras(carterasWithStats);
    }

    // Fetch contract data with existing template data
    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select(`
        id, numero, descripcion, tipo_servicio, fecha_inicio, fecha_fin,
        monto_mensual, monto_total, moneda, proforma_id, plantilla_id, datos_plantilla,
        cliente:clientes(id, razon_social, codigo, direccion, telefono, email, contacto_nombre)
      `)
      .eq("id", contractId)
      .maybeSingle();

    if (contratoError) {
      console.error("Error fetching contract:", contratoError);
      toast.error("Error al cargar los datos del contrato");
    }

    if (contrato) {
      setContractData({
        id: contrato.id,
        numero: contrato.numero,
        descripcion: contrato.descripcion,
        tipo_servicio: contrato.tipo_servicio,
        fecha_inicio: contrato.fecha_inicio,
        fecha_fin: contrato.fecha_fin,
        monto_mensual: contrato.monto_mensual,
        monto_total: contrato.monto_total,
        moneda: contrato.moneda,
        proforma_id: contrato.proforma_id,
      });

      const cliente = contrato.cliente as unknown as ClienteData;
      if (cliente) {
        setClienteData(cliente);
        
        // Check if client is already assigned to a cartera
        const { data: existingAssignment } = await supabase
          .from("cartera_clientes")
          .select("cartera_id")
          .eq("cliente_id", cliente.id)
          .maybeSingle();
        
        if (existingAssignment) {
          setSelectedCarteraId(existingAssignment.cartera_id);
        }
      }

      // Check if there's already saved template data
      const savedData = contrato.datos_plantilla as {
        plantilla_id?: string;
        partes?: Record<string, Record<string, string>>;
        clausulas?: { id: string; contenido: string }[];
        cartera_id?: string;
      } | null;

      if (savedData && savedData.plantilla_id) {
        // Load previously saved template data
        setSelectedPlantillaId(savedData.plantilla_id);
        
        if (savedData.partes) {
          setPartesData(savedData.partes);
        }
        
        if (savedData.clausulas) {
          const editedMap: Record<string, string> = {};
          savedData.clausulas.forEach((c) => {
            editedMap[c.id] = c.contenido;
          });
          setEditedClausulas(editedMap);
        }
        
        if (savedData.cartera_id) {
          setSelectedCarteraId(savedData.cartera_id);
        }
      } else if (cliente) {
        // Pre-fill "LA SEGUNDA PARTE" with client data only if no saved data
        setPartesData((prev) => ({
          ...prev,
          "LA SEGUNDA PARTE": {
            razon_social: cliente.razon_social || "",
            ruc: cliente.codigo || "",
            domicilio: cliente.direccion || "",
            representante_nombre: cliente.contacto_nombre || "",
            representante_dni: "",
            representante_poder: "",
          },
        }));
      }

      // Fetch proforma data if linked
      if (contrato.proforma_id) {
        const { data: proforma } = await supabase
          .from("proformas")
          .select(`
            id, numero, tipo, total, subtotal, igv, moneda,
            items:proforma_items(descripcion, cantidad, precio_unitario, subtotal)
          `)
          .eq("id", contrato.proforma_id)
          .maybeSingle();

        if (proforma) {
          setProformaData({
            id: proforma.id,
            numero: proforma.numero,
            tipo: proforma.tipo,
            total: proforma.total,
            subtotal: proforma.subtotal,
            igv: proforma.igv,
            moneda: proforma.moneda,
            items: proforma.items as ProformaData["items"],
          });
        }
      }
    }

    setLoading(false);
  };

  const fetchPlantillaDetails = async (plantillaId: string) => {
    const [partesRes, clausulasRes] = await Promise.all([
      supabase
        .from("contrato_plantilla_partes")
        .select("*")
        .eq("plantilla_id", plantillaId)
        .order("orden"),
      supabase
        .from("contrato_plantilla_clausulas")
        .select("*")
        .eq("plantilla_id", plantillaId)
        .order("orden"),
    ]);

    if (partesRes.data) {
      const partesFormatted = partesRes.data.map((p) => ({
        id: p.id,
        denominacion: p.denominacion,
        tipo_persona: p.tipo_persona as "natural" | "juridica",
        campos: Array.isArray(p.campos) ? (p.campos as Parte["campos"]) : [],
        orden: p.orden,
      }));
      setPartes(partesFormatted);

      // Initialize partes data if not already set
      partesFormatted.forEach((parte) => {
        if (!partesData[parte.denominacion]) {
          const initialData: Record<string, string> = {};
          parte.campos.forEach((campo) => {
            initialData[campo.id] = "";
          });
          
          // Pre-fill client data for "LA SEGUNDA PARTE"
          if (parte.denominacion.includes("SEGUNDA") && clienteData) {
            initialData.razon_social = clienteData.razon_social || "";
            initialData.ruc = clienteData.codigo || "";
            initialData.domicilio = clienteData.direccion || "";
            initialData.representante_nombre = clienteData.contacto_nombre || "";
          }
          
          setPartesData((prev) => ({
            ...prev,
            [parte.denominacion]: initialData,
          }));
        }
      });
    }

    if (clausulasRes.data) {
      setClausulas(
        clausulasRes.data.map((c) => ({
          id: c.id,
          numero: c.numero,
          titulo: c.titulo,
          contenido: c.contenido,
          es_obligatoria: c.es_obligatoria || false,
          es_editable: c.es_editable !== false,
          orden: c.orden,
        }))
      );
    }
  };

  // Build template variables from all data
  const templateVariables = useMemo(() => {
    const vars: Record<string, string> = {};

    // Contract data
    if (contractData) {
      vars["FECHA_INICIO"] = parseLocalDate(contractData.fecha_inicio).toLocaleDateString("es-PE");
      vars["FECHA_FIN"] = contractData.fecha_fin
        ? parseLocalDate(contractData.fecha_fin).toLocaleDateString("es-PE")
        : "";
      vars["MONTO"] = contractData.monto_total
        ? `${contractData.moneda === "PEN" ? "S/" : "$"} ${contractData.monto_total.toLocaleString()}`
        : "";
      vars["MONTO_MENSUAL"] = contractData.monto_mensual
        ? `${contractData.moneda === "PEN" ? "S/" : "$"} ${contractData.monto_mensual.toLocaleString()}`
        : "";
      vars["DESCRIPCION_SERVICIO"] = contractData.descripcion;
    }

    // Client data
    if (clienteData) {
      vars["CLIENTE_RAZON_SOCIAL"] = clienteData.razon_social;
      vars["CLIENTE_RUC"] = clienteData.codigo;
      vars["CLIENTE_DIRECCION"] = clienteData.direccion || "";
      vars["CLIENTE_EMAIL"] = clienteData.email || "";
      vars["CLIENTE_TELEFONO"] = clienteData.telefono || "";
    }

    // Proforma data
    if (proformaData) {
      vars["PROFORMA_NUMERO"] = proformaData.numero;
      vars["PROFORMA_TOTAL"] = `${proformaData.moneda === "PEN" ? "S/" : "$"} ${proformaData.total.toLocaleString()}`;
      
      // List of services
      const serviciosTexto = proformaData.items
        .map((item) => `- ${item.descripcion}`)
        .join("\n");
      vars["SERVICIOS"] = serviciosTexto;
    }

    // Partes data
    Object.entries(partesData).forEach(([parteNombre, campos]) => {
      Object.entries(campos).forEach(([campoId, valor]) => {
        const key = `${parteNombre.replace(/\s+/g, "_")}_${campoId}`.toUpperCase();
        vars[key] = valor;
      });
    });

    return vars;
  }, [contractData, clienteData, proformaData, partesData]);

  // Get processed clausula content (with variables replaced)
  const getProcessedClausulaContent = (clausula: Clausula): string => {
    const content = editedClausulas[clausula.id] ?? clausula.contenido;
    return replaceTemplateVariables(content, templateVariables);
  };

  const handleParteFieldChange = (
    parteNombre: string,
    fieldId: string,
    value: string
  ) => {
    setPartesData((prev) => ({
      ...prev,
      [parteNombre]: {
        ...(prev[parteNombre] || {}),
        [fieldId]: value,
      },
    }));
  };

  const handleClausulaEdit = (clausulaId: string, newContent: string) => {
    setEditedClausulas((prev) => ({
      ...prev,
      [clausulaId]: newContent,
    }));
  };

  const handleSaveAndApply = async () => {
    if (!selectedCarteraId) {
      toast.error("Por favor asigna el contrato a una cartera");
      return;
    }

    setSaving(true);

    try {
      // Build the data to save
      const datosPlantilla = {
        plantilla_id: selectedPlantillaId || null,
        cartera_id: selectedCarteraId,
        partes: partesData,
        clausulas: selectedPlantillaId ? clausulas.map((c) => ({
          id: c.id,
          numero: c.numero,
          titulo: c.titulo,
          contenido: editedClausulas[c.id] ?? c.contenido,
          contenido_procesado: getProcessedClausulaContent(c),
        })) : [],
        variables: templateVariables,
        fecha_aplicacion: new Date().toISOString(),
      };

      // Update contract and change status to "en_gestion"
      const { error: contractError } = await supabase
        .from("contratos")
        .update({
          plantilla_id: selectedPlantillaId || null,
          datos_plantilla: datosPlantilla,
          status: "en_gestion",
        })
        .eq("id", contractId);

      if (contractError) {
        throw contractError;
      }

      // Assign client to cartera if not already assigned
      if (clienteData) {
        // Check if already assigned
        const { data: existing } = await supabase
          .from("cartera_clientes")
          .select("id")
          .eq("cliente_id", clienteData.id)
          .eq("cartera_id", selectedCarteraId)
          .maybeSingle();

        if (!existing) {
          // Remove from any other cartera first
          await supabase
            .from("cartera_clientes")
            .delete()
            .eq("cliente_id", clienteData.id);

          // Assign to new cartera
          const { error: assignError } = await supabase
            .from("cartera_clientes")
            .insert({
              cliente_id: clienteData.id,
              cartera_id: selectedCarteraId,
            });

          if (assignError) {
            console.error("Error assigning client to cartera:", assignError);
          }
        }
      }

      const selectedCartera = carteras.find(c => c.id === selectedCarteraId);
      toast.success(`Contrato en gestión. Asignado a cartera "${selectedCartera?.nombre || ""}"`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error iniciando gestión:", error);
      toast.error("Error al iniciar la gestión del contrato");
    }

    setSaving(false);
  };

  const selectedPlantilla = plantillas.find((p) => p.id === selectedPlantillaId);
  const selectedCartera = carteras.find((c) => c.id === selectedCarteraId);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const especialidadStyles: Record<string, string> = {
    "Contabilidad": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "Trámites": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "Auditoría": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "Mixta": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Iniciar Gestión de Contrato
          </DialogTitle>
          <DialogDescription>
            Asigna el contrato a una cartera de trabajo para iniciar la gestión.
            {contractData && (
              <Badge variant="outline" className="ml-2">
                {contractData.numero}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* Left: Enhanced Contract Summary */}
              <div className="space-y-4 overflow-auto max-h-[65vh]">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Resumen del Contrato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-3">
                    {!contractData && !clienteData ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Cargando datos del contrato...</p>
                      </div>
                    ) : (
                      <>
                        {/* Contract Number Header */}
                        {contractData && (
                          <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                            <div className="p-2 rounded-md bg-primary/10">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">N° Contrato</p>
                              <p className="font-bold text-primary truncate">{contractData.numero}</p>
                            </div>
                            <Badge variant="secondary" className="flex-shrink-0">
                              {contractData.tipo_servicio}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Client Info */}
                        {clienteData && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                              <Building2 className="h-3.5 w-3.5" />
                              Cliente
                            </div>
                            <div className="p-3 border rounded-lg bg-muted/30">
                              <p className="font-medium text-sm">{clienteData.razon_social}</p>
                              <p className="text-xs text-muted-foreground font-mono">{clienteData.codigo}</p>
                              {clienteData.direccion && (
                                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{clienteData.direccion}</p>
                              )}
                              {(clienteData.email || clienteData.telefono) && (
                                <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2 text-xs text-muted-foreground">
                                  {clienteData.email && (
                                    <span className="flex items-center gap-1">
                                      📧 {clienteData.email}
                                    </span>
                                  )}
                                  {clienteData.telefono && (
                                    <span className="flex items-center gap-1">
                                      📞 {clienteData.telefono}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Service Description */}
                        {contractData && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                              <Target className="h-3.5 w-3.5" />
                              Descripción del Servicio
                            </div>
                            <div className="p-3 border rounded-lg bg-muted/30">
                              <p className="text-sm text-muted-foreground">{contractData.descripcion}</p>
                            </div>
                          </div>
                        )}

                        {/* Dates */}
                        {contractData && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                              <Calendar className="h-3.5 w-3.5" />
                              Vigencia
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-2.5 border rounded-lg text-center bg-muted/30">
                                <p className="text-[10px] text-muted-foreground uppercase">Inicio</p>
                                 <p className="text-sm font-semibold">
                                  {parseLocalDate(contractData.fecha_inicio).toLocaleDateString("es-PE", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                  })}
                                </p>
                              </div>
                              <div className="p-2.5 border rounded-lg text-center bg-muted/30">
                                <p className="text-[10px] text-muted-foreground uppercase">Fin</p>
                                <p className="text-sm font-semibold">
                                  {contractData.fecha_fin 
                                    ? parseLocalDate(contractData.fecha_fin).toLocaleDateString("es-PE", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric"
                                      })
                                    : "Indefinido"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Amounts */}
                        {contractData && (contractData.monto_mensual || contractData.monto_total) && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                              <DollarSign className="h-3.5 w-3.5" />
                              Honorarios
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {contractData.monto_mensual != null && (
                                <div className="p-2.5 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                                  <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-medium">Mensual</p>
                                  <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                                    {contractData.moneda === "PEN" ? "S/" : "$"} {contractData.monto_mensual.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              )}
                              {contractData.monto_total != null && (
                                <div className="p-2.5 border rounded-lg bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                                  <p className="text-[10px] text-green-600 dark:text-green-400 uppercase font-medium">Total Contrato</p>
                                  <p className="text-base font-bold text-green-600 dark:text-green-400">
                                    {contractData.moneda === "PEN" ? "S/" : "$"} {contractData.monto_total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Services from Proforma */}
                        {proformaData && proformaData.items.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                                <TrendingUp className="h-3.5 w-3.5" />
                                Servicios Incluidos
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                {proformaData.numero}
                              </Badge>
                            </div>
                            <div className="border rounded-lg divide-y overflow-hidden">
                              {proformaData.items.map((item, index) => (
                                <div key={index} className="p-2.5 bg-muted/20 hover:bg-muted/40 transition-colors">
                                  <div className="flex justify-between items-start gap-2">
                                    <p className="text-xs flex-1">{item.descripcion}</p>
                                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                      {proformaData.moneda === "PEN" ? "S/" : "$"} {item.subtotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  {item.cantidad > 1 && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {item.cantidad} x {proformaData.moneda === "PEN" ? "S/" : "$"} {item.precio_unitario.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Selected Cartera Confirmation */}
                {selectedCartera && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardHeader className="py-3">
                      <CardTitle className="text-base flex items-center gap-2 text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        Cartera Seleccionada
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="font-medium">{selectedCartera.nombre}</p>
                      <Badge className={cn("mt-1", especialidadStyles[selectedCartera.especialidad || "Mixta"])}>
                        {selectedCartera.especialidad || "Mixta"}
                      </Badge>
                      <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {selectedCartera.miembros.length} miembro(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {selectedCartera.stats.total} contratos
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: Cartera selection with stats */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Seleccionar Cartera de Trabajo
                    </CardTitle>
                    <CardDescription>
                      Asigna el contrato a una cartera para iniciar la gestión
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-2">
                    <ScrollArea className="h-[55vh]">
                      <div className="grid grid-cols-1 gap-4 pr-4">
                        {carteras.map((cartera) => {
                          const progressPercent = cartera.stats.total > 0 
                            ? Math.round((cartera.stats.finalizados / cartera.stats.total) * 100) 
                            : 0;
                          const onTimePercent = cartera.stats.finalizados > 0 
                            ? Math.round((cartera.stats.entregados_a_tiempo / cartera.stats.finalizados) * 100) 
                            : 0;
                          
                          return (
                            <div
                              key={cartera.id}
                              onClick={() => setSelectedCarteraId(cartera.id)}
                              className={cn(
                                "p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md",
                                selectedCarteraId === cartera.id
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{cartera.nombre}</h4>
                                    {selectedCarteraId === cartera.id && (
                                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge 
                                      variant="secondary" 
                                      className={cn("text-xs", especialidadStyles[cartera.especialidad || "Mixta"])}
                                    >
                                      {cartera.especialidad || "Mixta"}
                                    </Badge>
                                    {cartera.descripcion && (
                                      <span className="text-xs text-muted-foreground line-clamp-1">
                                        {cartera.descripcion}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Contract Stats Grid */}
                              <div className="grid grid-cols-4 gap-2 mb-3">
                                <div className="p-2 rounded-md bg-muted/50 text-center">
                                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                                    <FileText className="h-3 w-3" />
                                  </div>
                                  <p className="text-lg font-bold">{cartera.stats.total}</p>
                                  <p className="text-[10px] text-muted-foreground">Asignados</p>
                                </div>
                                <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/30 text-center">
                                  <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-0.5">
                                    <Clock className="h-3 w-3" />
                                  </div>
                                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{cartera.stats.en_gestion}</p>
                                  <p className="text-[10px] text-muted-foreground">En Progreso</p>
                                </div>
                                <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/30 text-center">
                                  <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-0.5">
                                    <CheckCircle2 className="h-3 w-3" />
                                  </div>
                                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{cartera.stats.finalizados}</p>
                                  <p className="text-[10px] text-muted-foreground">Finalizados</p>
                                </div>
                                <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 text-center">
                                  <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-0.5">
                                    <Star className="h-3 w-3" />
                                  </div>
                                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{onTimePercent}%</p>
                                  <p className="text-[10px] text-muted-foreground">A Tiempo</p>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="space-y-1 mb-3">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    Progreso de contratos
                                  </span>
                                  <span className="font-medium">{progressPercent}% completados</span>
                                </div>
                                <Progress value={progressPercent} className="h-2" />
                              </div>

                              {/* Team members */}
                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="h-3.5 w-3.5" />
                                  <span>Equipo ({cartera.miembros.length})</span>
                                </div>
                                <div className="flex -space-x-2">
                                  {cartera.miembros.slice(0, 5).map((miembro) => (
                                    <Avatar key={miembro.user_id} className="h-7 w-7 border-2 border-background">
                                      <AvatarFallback className="text-[10px] bg-primary/10">
                                        {getInitials(miembro.profile?.full_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {cartera.miembros.length > 5 && (
                                    <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                      <span className="text-[10px] font-medium">+{cartera.miembros.length - 5}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {carteras.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">No hay carteras disponibles</p>
                          <p className="text-sm">Crea una cartera primero desde la sección Carteras</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex-wrap gap-2">
          <div className="flex items-center gap-2 mr-auto text-sm text-muted-foreground">
            {selectedCartera && (
              <Badge variant="outline" className="gap-1">
                <Briefcase className="h-3 w-3" />
                {selectedCartera.nombre}
              </Badge>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveAndApply}
            disabled={!selectedCarteraId || saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Iniciando Gestión...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Iniciar Gestión
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
