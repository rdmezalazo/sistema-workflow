import { useState } from "react";
import { Plus, FileDown, FileUp, FolderOpen, Download, Loader2, Search, Workflow, Building2, Trash2, Edit2, ExternalLink, Check, LayoutTemplate, FileSpreadsheet, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WorkFlowModal } from "@/components/asignaciones/WorkFlowModal";
import * as XLSX from "xlsx";

interface WorkflowItem {
  id: string;
  tipo: "actividad" | "input" | "tarea" | "output" | "supervision";
  titulo: string;
  descripcion?: string;
  asignado_a?: string;
  asignado_nombre?: string;
  rol?: string;
  completado: boolean;
  orden: number;
  conexiones?: string[];
  subColumna?: number;
  parentId?: string;
  enlaceSharepoint?: string;
  fecha_inicio?: string;
  fecha_termino?: string;
  progreso?: number;
}

interface SavedWorkflow {
  id: string;
  codigo: string;
  contrato_id: string | null;
  fecha_creacion: string;
  items: WorkflowItem[];
  tipo: "asignado" | "plantilla";
  nombre_plantilla: string | null;
  contrato?: {
    numero: string;
    descripcion: string;
    tipo_servicio: string;
    cliente?: { razon_social: string; codigo: string };
  };
}

interface ContratoOption {
  id: string;
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  cliente: { razon_social: string; codigo: string };
  cartera: { id: string; nombre: string; especialidad: string | null } | null;
}

interface MiembroCartera {
  user_id: string;
  rol_en_cartera: string;
  profile: { full_name: string | null; email: string } | null;
}

interface WorkflowToolbarProps {
  onRefresh: () => void;
}

type NewMode = null | "select" | "fromTemplate" | "newImport" | "newDesign" | "newPlantilla";

// Dummy contract used to render the WorkFlowModal in plantilla mode
const PLANTILLA_DUMMY_CONTRATO: ContratoOption = {
  id: "plantilla",
  numero: "PLANTILLA",
  descripcion: "Diseño de Plantilla de WorkFlow",
  tipo_servicio: "Plantilla",
  fecha_inicio: new Date().toISOString().slice(0, 10),
  fecha_fin: null,
  cliente: { razon_social: "Plantilla base", codigo: "" },
  cartera: { id: "plantilla", nombre: "Plantilla", especialidad: null },
};

export function WorkflowToolbar({ onRefresh }: WorkflowToolbarProps) {
  // ===== Generic data =====
  const [contratos, setContratos] = useState<ContratoOption[]>([]);
  const [loadingContratos, setLoadingContratos] = useState(false);
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // ===== "Nuevo" flow =====
  const [newMode, setNewMode] = useState<NewMode>(null);
  // Selected contract for "Nuevo WorkFlow > Diseñar"
  const [newSelectedContratoId, setNewSelectedContratoId] = useState<string>("");
  // Selected template for "Desde una plantilla"
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateTargetContratoId, setTemplateTargetContratoId] = useState<string>("");
  // For "Nueva Plantilla" creation
  const [nuevaPlantillaNombre, setNuevaPlantillaNombre] = useState("");

  // ===== Modal launch states =====
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [modalContrato, setModalContrato] = useState<ContratoOption | null>(null);
  const [modalMiembros, setModalMiembros] = useState<MiembroCartera[]>([]);
  const [modalTipo, setModalTipo] = useState<"asignado" | "plantilla">("asignado");
  const [modalNombrePlantilla, setModalNombrePlantilla] = useState<string | undefined>(undefined);
  const [modalInitialItems, setModalInitialItems] = useState<WorkflowItem[] | undefined>(undefined);
  const [modalWorkflowIdOverride, setModalWorkflowIdOverride] = useState<string | undefined>(undefined);

  // ===== "Abrir" flow =====
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [openTab, setOpenTab] = useState<"asignado" | "plantilla">("asignado");
  const [searchSaved, setSearchSaved] = useState("");
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // ===== Import flow =====
  const [importing, setImporting] = useState(false);
  const [importedItems, setImportedItems] = useState<WorkflowItem[]>([]);
  const [showImportApplyDialog, setShowImportApplyDialog] = useState(false);
  const [importTargetContratoId, setImportTargetContratoId] = useState("");
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // ============= LOADERS =============
  const loadContratos = async () => {
    if (contratos.length > 0) return;
    setLoadingContratos(true);
    try {
      const { data: contratosData, error } = await supabase
        .from("contratos")
        .select("id, numero, descripcion, tipo_servicio, fecha_inicio, fecha_fin, cliente_id")
        .in("condicion", ["Vigente"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      const clienteIds = [...new Set((contratosData || []).map(c => c.cliente_id))];
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, razon_social, codigo")
        .in("id", clienteIds);

      const { data: carteraClientes } = await supabase
        .from("cartera_clientes")
        .select("cliente_id, cartera_id");
      const { data: carteras } = await supabase
        .from("carteras")
        .select("id, nombre, especialidad");

      const clienteMap = new Map((clientesData || []).map(c => [c.id, c]));
      const carteraClienteMap = new Map((carteraClientes || []).map(cc => [cc.cliente_id, cc.cartera_id]));
      const carteraMap = new Map((carteras || []).map(c => [c.id, c]));

      const mapped: ContratoOption[] = (contratosData || []).map(c => {
        const cliente = clienteMap.get(c.cliente_id);
        const carteraId = carteraClienteMap.get(c.cliente_id);
        const cartera = carteraId ? carteraMap.get(carteraId) : null;
        return {
          id: c.id,
          numero: c.numero,
          descripcion: c.descripcion,
          tipo_servicio: c.tipo_servicio,
          fecha_inicio: c.fecha_inicio,
          fecha_fin: c.fecha_fin,
          cliente: {
            razon_social: cliente?.razon_social || "Sin cliente",
            codigo: cliente?.codigo || "",
          },
          cartera: cartera ? { id: cartera.id, nombre: cartera.nombre, especialidad: cartera.especialidad } : null,
        };
      });
      setContratos(mapped);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar contratos");
    }
    setLoadingContratos(false);
  };

  const loadMiembrosByCartera = async (carteraId: string): Promise<MiembroCartera[]> => {
    const { data } = await supabase
      .from("cartera_miembros")
      .select("user_id, rol_en_cartera")
      .eq("cartera_id", carteraId);
    const userIds = (data || []).map(m => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    return (data || []).map(m => ({
      user_id: m.user_id,
      rol_en_cartera: m.rol_en_cartera,
      profile: profileMap.get(m.user_id) || null,
    }));
  };

  const loadSavedWorkflows = async () => {
    setLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from("workflows")
        .select("id, codigo, contrato_id, fecha_creacion, items, tipo, nombre_plantilla")
        .order("fecha_creacion", { ascending: false });
      if (error) throw error;

      const contratoIds = [...new Set((data || []).map(w => w.contrato_id).filter(Boolean) as string[])];
      const { data: contratosData } = contratoIds.length > 0 ? await supabase
        .from("contratos")
        .select("id, numero, descripcion, tipo_servicio, cliente_id")
        .in("id", contratoIds) : { data: [] as any[] };
      const clienteIds = [...new Set((contratosData || []).map(c => c.cliente_id))];
      const { data: clientesData } = clienteIds.length > 0 ? await supabase
        .from("clientes")
        .select("id, razon_social, codigo")
        .in("id", clienteIds) : { data: [] as any[] };

      const clienteMap = new Map((clientesData || []).map(c => [c.id, c]));

      const mapped: SavedWorkflow[] = (data || []).map((w: any) => {
        const contrato = contratosData?.find((c: any) => c.id === w.contrato_id);
        const cliente = contrato ? clienteMap.get(contrato.cliente_id) : null;
        return {
          id: w.id,
          codigo: w.codigo,
          contrato_id: w.contrato_id,
          fecha_creacion: w.fecha_creacion,
          items: (w.items as WorkflowItem[]) || [],
          tipo: (w.tipo as "asignado" | "plantilla") || "asignado",
          nombre_plantilla: w.nombre_plantilla || null,
          contrato: contrato ? {
            numero: contrato.numero,
            descripcion: contrato.descripcion,
            tipo_servicio: contrato.tipo_servicio,
            cliente: cliente ? { razon_social: cliente.razon_social, codigo: cliente.codigo } : undefined,
          } : undefined,
        };
      });
      setSavedWorkflows(mapped);
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar workflows");
    }
    setLoadingSaved(false);
  };

  // ============= NUEVO FLOW =============
  const handleNewClick = () => {
    setNewMode("select");
  };

  const goToFromTemplate = async () => {
    setNewMode("fromTemplate");
    await Promise.all([loadContratos(), loadSavedWorkflows()]);
  };

  const goToNewWorkflow = () => {
    setNewMode("newDesign");
  };

  const goToNewPlantilla = () => {
    setNuevaPlantillaNombre("");
    setNewMode("newPlantilla");
  };

  // ===== Desde una plantilla =====
  const handleApplyTemplateToContrato = async () => {
    if (!selectedTemplateId || !templateTargetContratoId) return;
    const tpl = savedWorkflows.find(w => w.id === selectedTemplateId);
    const targetContrato = contratos.find(c => c.id === templateTargetContratoId);
    if (!tpl || !targetContrato || !targetContrato.cartera) {
      toast.error("Selecciona una plantilla y un contrato con cartera");
      return;
    }

    // Clone items with new IDs (strip assignments and progress)
    const idMap = new Map<string, string>();
    const clonedItems: WorkflowItem[] = tpl.items.map(item => {
      const newId = crypto.randomUUID();
      idMap.set(item.id, newId);
      return {
        ...item,
        id: newId,
        asignado_a: undefined,
        asignado_nombre: undefined,
        completado: false,
        progreso: 0,
      };
    });
    clonedItems.forEach(item => {
      if (item.conexiones) item.conexiones = item.conexiones.map(c => idMap.get(c) || c);
      if (item.parentId) item.parentId = idMap.get(item.parentId) || item.parentId;
    });

    const miembros = await loadMiembrosByCartera(targetContrato.cartera.id);

    setModalContrato(targetContrato);
    setModalMiembros(miembros);
    setModalTipo("asignado");
    setModalNombrePlantilla(undefined);
    setModalInitialItems(clonedItems);
    setModalWorkflowIdOverride(undefined);
    setNewMode(null);
    setWorkflowModalOpen(true);
  };

  // ===== Nuevo WorkFlow > Diseñar =====
  const handleOpenDesignModal = async () => {
    if (!newSelectedContratoId) {
      toast.error("Selecciona un contrato");
      return;
    }
    const contrato = contratos.find(c => c.id === newSelectedContratoId);
    if (!contrato?.cartera) {
      toast.error("El contrato no tiene cartera");
      return;
    }
    const miembros = await loadMiembrosByCartera(contrato.cartera.id);
    setModalContrato(contrato);
    setModalMiembros(miembros);
    setModalTipo("asignado");
    setModalNombrePlantilla(undefined);
    setModalInitialItems(undefined);
    setModalWorkflowIdOverride(undefined);
    setNewMode(null);
    setWorkflowModalOpen(true);
  };

  // ===== Nueva Plantilla =====
  const handleOpenNewPlantillaModal = () => {
    if (!nuevaPlantillaNombre.trim()) {
      toast.error("Ingresa el nombre de la plantilla");
      return;
    }
    setModalContrato(PLANTILLA_DUMMY_CONTRATO);
    setModalMiembros([]);
    setModalTipo("plantilla");
    setModalNombrePlantilla(nuevaPlantillaNombre.trim());
    setModalInitialItems(undefined);
    setModalWorkflowIdOverride(undefined);
    setNewMode(null);
    setWorkflowModalOpen(true);
  };

  // ============= ABRIR FLOW =============
  const handleOpenSaved = async () => {
    setShowOpenDialog(true);
    await loadSavedWorkflows();
  };

  const handleOpenWorkflow = async (workflow: SavedWorkflow) => {
    try {
      if (workflow.tipo === "plantilla") {
        // Open plantilla in editor
        setModalContrato(PLANTILLA_DUMMY_CONTRATO);
        setModalMiembros([]);
        setModalTipo("plantilla");
        setModalNombrePlantilla(workflow.nombre_plantilla || workflow.codigo);
        setModalInitialItems(undefined);
        setModalWorkflowIdOverride(workflow.id);
        setShowOpenDialog(false);
        setWorkflowModalOpen(true);
        return;
      }

      // Asignado: load contrato + cartera + miembros
      if (!workflow.contrato_id) {
        toast.error("Workflow sin contrato asociado");
        return;
      }
      const { data: contratoData, error: cError } = await supabase
        .from("contratos")
        .select("id, numero, descripcion, tipo_servicio, fecha_inicio, fecha_fin, cliente_id")
        .eq("id", workflow.contrato_id)
        .single();
      if (cError) throw cError;

      const { data: clienteData } = await supabase
        .from("clientes")
        .select("id, razon_social, codigo")
        .eq("id", contratoData.cliente_id)
        .single();

      const { data: carteraCliente } = await supabase
        .from("cartera_clientes")
        .select("cartera_id")
        .eq("cliente_id", contratoData.cliente_id)
        .maybeSingle();

      let cartera: { id: string; nombre: string; especialidad: string | null } | null = null;
      if (carteraCliente) {
        const { data: carteraData } = await supabase
          .from("carteras")
          .select("id, nombre, especialidad")
          .eq("id", carteraCliente.cartera_id)
          .single();
        cartera = carteraData;
      }
      if (!cartera) {
        toast.error("El contrato no tiene cartera asignada");
        return;
      }

      const miembros = await loadMiembrosByCartera(cartera.id);

      setModalContrato({
        id: contratoData.id,
        numero: contratoData.numero,
        descripcion: contratoData.descripcion,
        tipo_servicio: contratoData.tipo_servicio,
        fecha_inicio: contratoData.fecha_inicio,
        fecha_fin: contratoData.fecha_fin,
        cliente: {
          razon_social: clienteData?.razon_social || "Sin cliente",
          codigo: clienteData?.codigo || "",
        },
        cartera,
      });
      setModalMiembros(miembros);
      setModalTipo("asignado");
      setModalNombrePlantilla(undefined);
      setModalInitialItems(undefined);
      setModalWorkflowIdOverride(workflow.id);
      setShowOpenDialog(false);
      setWorkflowModalOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Error al abrir el workflow");
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!deletingWorkflowId) return;
    try {
      const { error } = await supabase.from("workflows").delete().eq("id", deletingWorkflowId);
      if (error) throw error;
      toast.success("Workflow eliminado");
      setSavedWorkflows(prev => prev.filter(w => w.id !== deletingWorkflowId));
      setDeletingWorkflowId(null);
      onRefresh();
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar");
    }
  };

  const handleRename = async () => {
    if (!editingWorkflowId || !editingValue.trim()) return;
    const wf = savedWorkflows.find(w => w.id === editingWorkflowId);
    if (!wf) return;
    try {
      const updates: any = wf.tipo === "plantilla"
        ? { nombre_plantilla: editingValue.trim() }
        : { codigo: editingValue.trim() };
      const { error } = await supabase.from("workflows").update(updates).eq("id", editingWorkflowId);
      if (error) throw error;
      toast.success("Actualizado");
      setSavedWorkflows(prev => prev.map(w => w.id === editingWorkflowId ? { ...w, ...updates } : w));
      setEditingWorkflowId(null);
      setEditingValue("");
    } catch (e) {
      console.error(e);
      toast.error("Error al actualizar");
    }
  };

  // ============= EXCEL TEMPLATE =============
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const actData = [
      ["Actividad", "Descripción", "Fecha Inicio (YYYY-MM-DD)", "Fecha Término (YYYY-MM-DD)"],
      ["Creación de Carpeta", "Organización inicial del expediente", "", ""],
    ];
    const wsAct = XLSX.utils.aoa_to_sheet(actData);
    wsAct["!cols"] = [{ wch: 30 }, { wch: 45 }, { wch: 22 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsAct, "Actividades");

    const inpData = [
      ["Actividad (nombre exacto)", "Input", "Descripción", "Enlace SharePoint"],
      ["Creación de Carpeta", "Documentos de constitución", "Recopilar documentos legales", ""],
    ];
    const wsInp = XLSX.utils.aoa_to_sheet(inpData);
    wsInp["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 45 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsInp, "Inputs");

    const procData = [
      ["Actividad (nombre exacto)", "Input (nombre exacto)", "SubColumna (1, 2 o 3)", "Tarea", "Descripción", "Rol"],
      ["Creación de Carpeta", "Documentos de constitución", "1", "Verificar documentos", "Revisar completitud", "Asistente"],
    ];
    const wsProc = XLSX.utils.aoa_to_sheet(procData);
    wsProc["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 30 }, { wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsProc, "Procesos");

    const outData = [
      ["Actividad (nombre exacto)", "Output", "Descripción", "Enlace SharePoint"],
      ["Creación de Carpeta", "Carpeta digital organizada", "", ""],
    ];
    const wsOut = XLSX.utils.aoa_to_sheet(outData);
    wsOut["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 45 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsOut, "Outputs");

    const supData = [
      ["Actividad (nombre exacto)", "Supervisión", "Descripción"],
      ["Creación de Carpeta", "Verificar carpeta completa", ""],
    ];
    const wsSup = XLSX.utils.aoa_to_sheet(supData);
    wsSup["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsSup, "Supervisión");

    XLSX.writeFile(wb, "Plantilla_Workflow.xlsx");
    toast.success("Plantilla descargada");
  };

  const parseExcelToItems = async (file: File): Promise<WorkflowItem[]> => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const items: WorkflowItem[] = [];
    const activityMap = new Map<string, string>();
    const inputMap = new Map<string, string>();

    const wsAct = wb.Sheets["Actividades"];
    if (!wsAct) throw new Error("Falta hoja 'Actividades'");
    const actRows: any[] = XLSX.utils.sheet_to_json(wsAct);
    actRows.forEach((row, i) => {
      const name = row["Actividad"]?.toString().trim();
      if (!name) return;
      const id = crypto.randomUUID();
      activityMap.set(name, id);
      items.push({
        id, tipo: "actividad", titulo: name,
        descripcion: row["Descripción"]?.toString() || undefined,
        completado: false, orden: i,
        fecha_inicio: row["Fecha Inicio (YYYY-MM-DD)"]?.toString() || undefined,
        fecha_termino: row["Fecha Término (YYYY-MM-DD)"]?.toString() || undefined,
      });
    });

    const wsInp = wb.Sheets["Inputs"];
    if (wsInp) {
      const rows: any[] = XLSX.utils.sheet_to_json(wsInp);
      rows.forEach((row, i) => {
        const actName = row["Actividad (nombre exacto)"]?.toString().trim();
        const inputName = row["Input"]?.toString().trim();
        if (!actName || !inputName) return;
        const parentId = activityMap.get(actName);
        if (!parentId) return;
        const id = crypto.randomUUID();
        inputMap.set(`${actName}|${inputName}`, id);
        items.push({
          id, tipo: "input", titulo: inputName,
          descripcion: row["Descripción"]?.toString() || undefined,
          enlaceSharepoint: row["Enlace SharePoint"]?.toString() || undefined,
          completado: false, orden: i, parentId,
        });
      });
    }

    const wsProc = wb.Sheets["Procesos"];
    if (wsProc) {
      const rows: any[] = XLSX.utils.sheet_to_json(wsProc);
      rows.forEach((row, i) => {
        const actName = row["Actividad (nombre exacto)"]?.toString().trim();
        const inputName = row["Input (nombre exacto)"]?.toString().trim();
        const subCol = parseInt(row["SubColumna (1, 2 o 3)"]?.toString() || "1") - 1;
        const taskName = row["Tarea"]?.toString().trim();
        if (!actName || !inputName || !taskName) return;
        const parentId = inputMap.get(`${actName}|${inputName}`);
        if (!parentId) return;
        items.push({
          id: crypto.randomUUID(), tipo: "tarea", titulo: taskName,
          descripcion: row["Descripción"]?.toString() || undefined,
          rol: row["Rol"]?.toString() || undefined,
          completado: false, orden: i,
          subColumna: Math.min(Math.max(subCol, 0), 2), parentId,
        });
      });
    }

    const wsOut = wb.Sheets["Outputs"];
    if (wsOut) {
      const rows: any[] = XLSX.utils.sheet_to_json(wsOut);
      rows.forEach((row, i) => {
        const actName = row["Actividad (nombre exacto)"]?.toString().trim();
        const outputName = row["Output"]?.toString().trim();
        if (!actName || !outputName) return;
        const parentId = activityMap.get(actName);
        if (!parentId) return;
        items.push({
          id: crypto.randomUUID(), tipo: "output", titulo: outputName,
          descripcion: row["Descripción"]?.toString() || undefined,
          enlaceSharepoint: row["Enlace SharePoint"]?.toString() || undefined,
          completado: false, orden: i, parentId,
        });
      });
    }

    const wsSup = wb.Sheets["Supervisión"];
    if (wsSup) {
      const rows: any[] = XLSX.utils.sheet_to_json(wsSup);
      rows.forEach((row, i) => {
        const actName = row["Actividad (nombre exacto)"]?.toString().trim();
        const supName = row["Supervisión"]?.toString().trim();
        if (!actName || !supName) return;
        const parentId = activityMap.get(actName);
        if (!parentId) return;
        items.push({
          id: crypto.randomUUID(), tipo: "supervision", titulo: supName,
          descripcion: row["Descripción"]?.toString() || undefined,
          completado: false, orden: i, parentId,
        });
      });
    }

    return items;
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const items = await parseExcelToItems(file);
      if (items.length === 0) {
        toast.error("No se encontraron datos en el archivo");
        setImporting(false);
        return;
      }
      await loadContratos();
      setImportedItems(items);
      setShowImportApplyDialog(true);
      toast.success(`Se importaron ${items.length} elementos`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al importar");
    }
    setImporting(false);
    e.target.value = "";
  };

  const handleApplyImport = async () => {
    if (!importTargetContratoId || importedItems.length === 0) return;
    setApplyingTemplate(true);
    try {
      const targetContrato = contratos.find(c => c.id === importTargetContratoId);
      if (!targetContrato?.cartera) {
        toast.error("El contrato no tiene cartera");
        setApplyingTemplate(false);
        return;
      }
      const miembros = await loadMiembrosByCartera(targetContrato.cartera.id);
      setModalContrato(targetContrato);
      setModalMiembros(miembros);
      setModalTipo("asignado");
      setModalNombrePlantilla(undefined);
      setModalInitialItems(importedItems);
      setModalWorkflowIdOverride(undefined);
      setShowImportApplyDialog(false);
      setNewMode(null);
      setWorkflowModalOpen(true);
      setImportedItems([]);
      setImportTargetContratoId("");
    } catch (e) {
      console.error(e);
      toast.error("Error al aplicar importación");
    }
    setApplyingTemplate(false);
  };

  // Import as new plantilla
  const handleImportAsPlantilla = async (file: File, plantillaName: string) => {
    try {
      const items = await parseExcelToItems(file);
      if (items.length === 0) {
        toast.error("No se encontraron datos");
        return;
      }
      setModalContrato(PLANTILLA_DUMMY_CONTRATO);
      setModalMiembros([]);
      setModalTipo("plantilla");
      setModalNombrePlantilla(plantillaName);
      setModalInitialItems(items);
      setModalWorkflowIdOverride(undefined);
      setNewMode(null);
      setWorkflowModalOpen(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al importar");
    }
  };

  // Filtered lists
  const plantillas = savedWorkflows.filter(w => w.tipo === "plantilla");
  const asignados = savedWorkflows.filter(w => w.tipo === "asignado");

  const filterFn = (w: SavedWorkflow) => {
    if (!searchSaved) return true;
    const q = searchSaved.toLowerCase();
    return (
      w.codigo.toLowerCase().includes(q) ||
      (w.nombre_plantilla || "").toLowerCase().includes(q) ||
      (w.contrato?.numero || "").toLowerCase().includes(q) ||
      (w.contrato?.cliente?.razon_social || "").toLowerCase().includes(q)
    );
  };

  const getStats = (items: WorkflowItem[]) => ({
    acts: items.filter(i => i.tipo === "actividad").length,
    inputs: items.filter(i => i.tipo === "input").length,
    tareas: items.filter(i => i.tipo === "tarea").length,
    outputs: items.filter(i => i.tipo === "output").length,
    sups: items.filter(i => i.tipo === "supervision").length,
    total: items.length,
  });

  const renderWorkflowCard = (w: SavedWorkflow) => {
    const stats = getStats(w.items);
    const displayName = w.tipo === "plantilla"
      ? (w.nombre_plantilla || w.codigo)
      : (w.contrato?.cliente?.razon_social || "Sin cliente");

    return (
      <div key={w.id} className="rounded-lg border p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {editingWorkflowId === w.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="h-6 text-xs w-full max-w-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename();
                      if (e.key === "Escape") setEditingWorkflowId(null);
                    }}
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleRename}>
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <Badge variant="outline" className="font-mono text-xs shrink-0">{w.codigo}</Badge>
                  <span className="text-sm font-medium truncate">{displayName}</span>
                  {w.tipo === "plantilla" && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      <LayoutTemplate className="h-2.5 w-2.5 mr-1" />
                      Plantilla
                    </Badge>
                  )}
                </>
              )}
            </div>
            {w.tipo === "asignado" && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {w.contrato?.numero} - {w.contrato?.descripcion}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stats.acts} act</Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stats.inputs} inp</Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stats.tareas} proc</Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stats.outputs} out</Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stats.sups} sup</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="default" className="h-7 w-7 p-0" onClick={() => handleOpenWorkflow(w)}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => {
                  setEditingWorkflowId(w.id);
                  setEditingValue(w.tipo === "plantilla" ? (w.nombre_plantilla || w.codigo) : w.codigo);
                }}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar nombre</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => setDeletingWorkflowId(w.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Creado: {new Date(w.fecha_creacion).toLocaleDateString("es-PE")}
        </p>
      </div>
    );
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button size="sm" className="gap-1.5 h-8" onClick={handleNewClick}>
          <Plus className="h-3.5 w-3.5" />
          Nuevo
        </Button>

        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={downloadTemplate}>
          <Download className="h-3.5 w-3.5" />
          Plantilla Excel
        </Button>

        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleOpenSaved}>
          <FolderOpen className="h-3.5 w-3.5" />
          Abrir
        </Button>

        <input
          id="workflow-import-input"
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImportExcel}
        />
      </div>

      {/* ============= NUEVO: SELECT MODE ============= */}
      <Dialog open={newMode === "select"} onOpenChange={(o) => { if (!o) setNewMode(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nuevo Workflow
            </DialogTitle>
            <DialogDescription>
              ¿Cómo deseas crear el workflow?
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <button
              onClick={goToFromTemplate}
              className="rounded-lg border-2 p-4 text-left hover:border-primary hover:bg-muted/50 transition-all group"
            >
              <LayoutTemplate className="h-8 w-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-sm">Desde una plantilla</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Usa una plantilla guardada como base
              </p>
            </button>

            <button
              onClick={goToNewWorkflow}
              className="rounded-lg border-2 p-4 text-left hover:border-primary hover:bg-muted/50 transition-all group"
            >
              <Workflow className="h-8 w-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-sm">Nuevo WorkFlow</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Crea un workflow desde cero o importa Excel
              </p>
            </button>
          </div>

          <div className="border-t pt-3">
            <button
              onClick={goToNewPlantilla}
              className="w-full rounded-lg border-2 border-dashed p-3 text-left hover:border-primary hover:bg-muted/50 transition-all group flex items-center gap-3"
            >
              <PenSquare className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold text-sm">Crear nueva plantilla</h3>
                <p className="text-xs text-muted-foreground">
                  Diseña una plantilla reutilizable
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============= NUEVO: DESDE PLANTILLA ============= */}
      <Dialog open={newMode === "fromTemplate"} onOpenChange={(o) => { if (!o) setNewMode(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-primary" />
              Crear desde una plantilla
            </DialogTitle>
            <DialogDescription>
              Selecciona la plantilla y el contrato destino
            </DialogDescription>
          </DialogHeader>

          {loadingSaved || loadingContratos ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">1. Plantilla</Label>
                {plantillas.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    No hay plantillas guardadas. Crea una desde "Nuevo &gt; Crear nueva plantilla".
                  </div>
                ) : (
                  <ScrollArea className="max-h-[280px] border rounded-lg">
                    <div className="space-y-1 p-2">
                      {plantillas.map(p => {
                        const stats = getStats(p.items);
                        const selected = selectedTemplateId === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setSelectedTemplateId(p.id)}
                            className={cn(
                              "w-full text-left rounded-md border p-2.5 transition-colors",
                              selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge variant="outline" className="font-mono text-[10px]">{p.codigo}</Badge>
                                <span className="text-sm font-medium truncate">{p.nombre_plantilla || "Sin nombre"}</span>
                              </div>
                              {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </div>
                            <div className="flex gap-1 mt-1.5">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stats.acts}A</Badge>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stats.inputs}I</Badge>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stats.tareas}P</Badge>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stats.outputs}O</Badge>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stats.sups}S</Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs">2. Contrato destino</Label>
                <Select value={templateTargetContratoId} onValueChange={setTemplateTargetContratoId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar contrato..." /></SelectTrigger>
                  <SelectContent>
                    {contratos.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{c.numero}</span>
                          <span>-</span>
                          <span className="truncate">{c.cliente.razon_social}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMode(null)}>Cancelar</Button>
            <Button onClick={handleApplyTemplateToContrato} disabled={!selectedTemplateId || !templateTargetContratoId}>
              Crear Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============= NUEVO WORKFLOW (DESIGN OR IMPORT) ============= */}
      <Dialog open={newMode === "newDesign"} onOpenChange={(o) => { if (!o) setNewMode(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              Nuevo WorkFlow
            </DialogTitle>
            <DialogDescription>
              ¿Importar desde Excel o diseñarlo desde cero?
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => document.getElementById("workflow-import-input")?.click()}
              disabled={importing}
              className="rounded-lg border-2 p-4 text-left hover:border-primary hover:bg-muted/50 transition-all group disabled:opacity-50"
            >
              <FileSpreadsheet className="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-sm">{importing ? "Importando..." : "Importar Excel"}</h3>
              <p className="text-xs text-muted-foreground mt-1">Sube una plantilla Excel</p>
            </button>

            <div className="rounded-lg border-2 p-4">
              <Workflow className="h-7 w-7 text-primary mb-2" />
              <h3 className="font-semibold text-sm mb-2">Diseñar</h3>
              <p className="text-xs text-muted-foreground mb-3">Selecciona el contrato</p>
              <Select value={newSelectedContratoId} onValueChange={async (v) => {
                setNewSelectedContratoId(v);
                if (contratos.length === 0) await loadContratos();
              }} onOpenChange={(o) => { if (o) loadContratos(); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Contrato..." /></SelectTrigger>
                <SelectContent>
                  {contratos.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-mono text-xs">{c.numero}</span> - {c.cliente.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMode(null)}>Cancelar</Button>
            <Button onClick={handleOpenDesignModal} disabled={!newSelectedContratoId}>
              Diseñar WorkFlow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============= NUEVA PLANTILLA ============= */}
      <Dialog open={newMode === "newPlantilla"} onOpenChange={(o) => { if (!o) setNewMode(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenSquare className="h-5 w-5 text-primary" />
              Nueva Plantilla
            </DialogTitle>
            <DialogDescription>
              Establece el nombre de la plantilla
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="plantilla-name" className="text-xs">Nombre de la plantilla *</Label>
              <Input
                id="plantilla-name"
                placeholder="Ej. Workflow Contabilidad Mensual"
                value={nuevaPlantillaNombre}
                onChange={(e) => setNuevaPlantillaNombre(e.target.value)}
                autoFocus
              />
            </div>

            <div className="rounded-md border p-3 bg-muted/30 text-xs space-y-1">
              <p className="font-medium">Tienes 2 opciones:</p>
              <p>• <strong>Diseñar:</strong> abrir el editor visual</p>
              <p>• <strong>Importar Excel:</strong> sube una plantilla pre-armada</p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setNewMode(null)}>Cancelar</Button>
            <Button
              variant="outline"
              disabled={!nuevaPlantillaNombre.trim()}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".xlsx,.xls";
                input.onchange = async (ev: any) => {
                  const file = ev.target.files?.[0];
                  if (file) await handleImportAsPlantilla(file, nuevaPlantillaNombre.trim());
                };
                input.click();
              }}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Importar Excel
            </Button>
            <Button onClick={handleOpenNewPlantillaModal} disabled={!nuevaPlantillaNombre.trim()}>
              <Workflow className="h-4 w-4 mr-1.5" />
              Diseñar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============= ABRIR ============= */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Workflows Guardados
            </DialogTitle>
            <DialogDescription>
              Abre, edita o elimina workflows asignados y plantillas
            </DialogDescription>
          </DialogHeader>

          <Tabs value={openTab} onValueChange={(v) => setOpenTab(v as "asignado" | "plantilla")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="asignado" className="gap-1.5">
                <Workflow className="h-3.5 w-3.5" />
                Asignados <Badge variant="secondary" className="ml-1 text-[10px]">{asignados.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="plantilla" className="gap-1.5">
                <LayoutTemplate className="h-3.5 w-3.5" />
                Plantillas <Badge variant="secondary" className="ml-1 text-[10px]">{plantillas.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <div className="relative my-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchSaved}
                onChange={(e) => setSearchSaved(e.target.value)}
                className="pl-9"
              />
            </div>

            <TabsContent value="asignado" className="mt-0">
              <ScrollArea className="max-h-[400px]">
                {loadingSaved ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : asignados.filter(filterFn).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No hay workflows asignados</div>
                ) : (
                  <div className="space-y-2">{asignados.filter(filterFn).map(renderWorkflowCard)}</div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="plantilla" className="mt-0">
              <ScrollArea className="max-h-[400px]">
                {loadingSaved ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : plantillas.filter(filterFn).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No hay plantillas guardadas</div>
                ) : (
                  <div className="space-y-2">{plantillas.filter(filterFn).map(renderWorkflowCard)}</div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ============= IMPORT APPLY (asignado) ============= */}
      <Dialog open={showImportApplyDialog} onOpenChange={setShowImportApplyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar Workflow Importado</DialogTitle>
            <DialogDescription>
              Selecciona el contrato destino para abrir el workflow en el editor
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border p-3 bg-muted/30">
            {(() => {
              const stats = getStats(importedItems);
              return (
                <p className="text-xs text-muted-foreground">
                  {stats.total} elementos: {stats.acts}A, {stats.inputs}I, {stats.tareas}P, {stats.outputs}O, {stats.sups}S
                </p>
              );
            })()}
          </div>

          {loadingContratos ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <Select value={importTargetContratoId} onValueChange={setImportTargetContratoId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar contrato..." /></SelectTrigger>
              <SelectContent>
                {contratos.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-mono text-xs">{c.numero}</span> - {c.cliente.razon_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportApplyDialog(false)}>Cancelar</Button>
            <Button onClick={handleApplyImport} disabled={!importTargetContratoId || applyingTemplate}>
              {applyingTemplate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Abrir en editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============= WORKFLOW MODAL ============= */}
      {modalContrato && modalContrato.cartera && (
        <WorkFlowModal
          open={workflowModalOpen}
          onOpenChange={(open) => {
            setWorkflowModalOpen(open);
            if (!open) {
              setModalContrato(null);
              setModalMiembros([]);
              setModalInitialItems(undefined);
              setModalWorkflowIdOverride(undefined);
              setModalNombrePlantilla(undefined);
              onRefresh();
            }
          }}
          contrato={{
            id: modalContrato.id,
            numero: modalContrato.numero,
            descripcion: modalContrato.descripcion,
            tipo_servicio: modalContrato.tipo_servicio,
            fecha_inicio: modalContrato.fecha_inicio,
            fecha_fin: modalContrato.fecha_fin,
            cliente: modalContrato.cliente,
            cartera: modalContrato.cartera,
          }}
          miembros={modalMiembros}
          tipoWorkflow={modalTipo}
          nombrePlantilla={modalNombrePlantilla}
          initialItems={modalInitialItems}
          workflowIdOverride={modalWorkflowIdOverride}
        />
      )}

      {/* ============= DELETE CONFIRMATION ============= */}
      <AlertDialog open={!!deletingWorkflowId} onOpenChange={(o) => { if (!o) setDeletingWorkflowId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWorkflow} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
