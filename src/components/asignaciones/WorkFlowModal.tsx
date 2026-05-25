import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Users,
  CheckCircle2,
  Circle,
  Building2,
  FileCheck,
  Save,
  Edit2,
  Activity,
  Database,
  Settings,
  Package,
  ShieldCheck,
  Link2,
  Unlink,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Hash,
  Filter,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface WorkFlowItem {
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
  subColumna?: number; // For proceso items: 0, 1, or 2
  parentId?: string; // For inputs: links to actividad; for tareas: links to input
  enlaceSharepoint?: string; // SharePoint document link for inputs
  fecha_inicio?: string; // Activity start date
  fecha_termino?: string; // Activity end date
  progreso?: number; // Progress percentage
}

interface MiembroCartera {
  user_id: string;
  rol_en_cartera: string;
  profile: {
    full_name: string | null;
    email: string;
  } | null;
}

interface ContratoWorkflow {
  id: string;
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  cliente: {
    razon_social: string;
    codigo: string;
  };
  cartera: {
    id: string;
    nombre: string;
    especialidad: string | null;
  } | null;
}

interface SupervisorProfile {
  id: string;
  full_name: string | null;
  email: string;
  puesto: string | null;
  asignar_supervision: boolean;
}

interface WorkFlowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: ContratoWorkflow;
  miembros: MiembroCartera[];
  /** 'asignado' (default) o 'plantilla' */
  tipoWorkflow?: "asignado" | "plantilla";
  /** Nombre de la plantilla (sólo cuando tipoWorkflow='plantilla') */
  nombrePlantilla?: string;
  /** Items pre-cargados (ej. al usar una plantilla como base) */
  initialItems?: WorkFlowItem[];
  /** Si está editando un workflow existente por ID (omite búsqueda por contrato_id) */
  workflowIdOverride?: string;
}

const columnConfig = [
  { id: "actividades", label: "Actividades", shortLabel: "A", color: "bg-sky-500", tipo: "actividad", icon: Activity },
  { id: "inputs", label: "Inputs", shortLabel: "I", color: "bg-emerald-500", tipo: "input", icon: Database },
  { id: "procesos", label: "Procesos", shortLabel: "P", color: "bg-amber-500", tipo: "tarea", hasRoles: true, icon: Settings },
  { id: "outputs", label: "Outputs", shortLabel: "O", color: "bg-purple-500", tipo: "output", icon: Package },
  { id: "supervision", label: "Supervisión", shortLabel: "S", color: "bg-red-500", tipo: "supervision", icon: ShieldCheck },
];

const roleColors: Record<string, string> = {
  asesor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  auxiliar: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  practicante: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  contador: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  supervisor: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  gerente: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  asistente: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  administrador: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
};

// Ya no usamos exclusión por puesto, ahora usamos el campo asignar_supervision

interface WorkflowData {
  id: string;
  codigo: string;
  fecha_creacion: string;
}

export function WorkFlowModal({ open, onOpenChange, contrato, miembros, tipoWorkflow = "asignado", nombrePlantilla, initialItems, workflowIdOverride }: WorkFlowModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<WorkFlowItem[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItemColumn, setNewItemColumn] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [supervisores, setSupervisores] = useState<SupervisorProfile[]>([]);
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, { full_name: string | null; email: string }>>({});
  const [subColumnRoles, setSubColumnRoles] = useState<string[]>([]);
  const [, forceUpdate] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Force re-render on resize to update connection lines
  useEffect(() => {
    const handleResize = () => forceUpdate(n => n + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate workflow dates and progress
  const fechaInicio = new Date(contrato.fecha_inicio);
  const fechaFin = contrato.fecha_fin ? new Date(contrato.fecha_fin) : null;
  const hoy = new Date();
  const diasTranscurridos = differenceInDays(hoy, fechaInicio);
  const diasVencidos = fechaFin && hoy > fechaFin ? differenceInDays(hoy, fechaFin) : 0;
  
  const completados = items.filter(i => i.completado).length;
  const total = items.length;
  const progressPercent = total > 0 ? Math.round((completados / total) * 100) : 0;

  // Get unique roles from team members for process column sub-columns
  // Limit to actual member count: if 2 members, 2 sub-columns; if 3+, 3 sub-columns
  const memberRoles = [...new Set(miembros.map(m => m.rol_en_cartera))];
  const subColumnCount = Math.min(Math.max(memberRoles.length, 2), 3); // Min 2, max 3
  const uniqueRoles = memberRoles.slice(0, subColumnCount);
  // Pad only if we have fewer roles than the determined column count
  while (uniqueRoles.length < subColumnCount) {
    uniqueRoles.push(`Rol ${uniqueRoles.length + 1}`);
  }

  // All available roles for the role selector (cartera members + supervision roles)
  const allAvailableRoles = useMemo(() => {
    const roles = new Set<string>();
    miembros.forEach(m => roles.add(m.rol_en_cartera));
    supervisores.forEach(s => {
      if (s.puesto?.toLowerCase() === 'gerente') {
        roles.add('Supervisión Gerencial');
      } else {
        roles.add('Supervisión');
      }
    });
    return [...roles];
  }, [miembros, supervisores]);

  // Initialize subColumnRoles from uniqueRoles
  useEffect(() => {
    if (subColumnRoles.length === 0 && uniqueRoles.length > 0) {
      setSubColumnRoles([...uniqueRoles]);
    }
  }, [uniqueRoles]);

  // Get members filtered by a selected role (handles supervision roles)
  const getFilteredMembers = useCallback((rol: string): MiembroCartera[] => {
    if (rol === 'Supervisión Gerencial') {
      return supervisores
        .filter(s => s.puesto?.toLowerCase() === 'gerente')
        .map(s => ({ user_id: s.id, rol_en_cartera: rol, profile: { full_name: s.full_name, email: s.email } }));
    }
    if (rol === 'Supervisión') {
      return supervisores
        .filter(s => s.puesto?.toLowerCase() !== 'gerente')
        .map(s => ({ user_id: s.id, rol_en_cartera: rol, profile: { full_name: s.full_name, email: s.email } }));
    }
    return miembros.filter(m => m.rol_en_cartera.toLowerCase() === rol.toLowerCase());
  }, [miembros, supervisores]);

  useEffect(() => {
    if (open) {
      loadWorkflow();
      loadSupervisores();
      loadProfiles();
    }
  }, [open, contrato.id]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (error) throw error;

      const map: Record<string, { full_name: string | null; email: string }> = {};
      (data || []).forEach(p => {
        map[p.id] = { full_name: p.full_name, email: p.email };
      });
      setProfilesMap(map);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const loadSupervisores = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, puesto, asignar_supervision")
        .eq("asignar_supervision", true);

      if (error) throw error;

      setSupervisores(data || []);
    } catch (error) {
      console.error("Error loading supervisores:", error);
    }
  };

  const loadWorkflow = async () => {
    setLoading(true);
    try {
      // 1. If we have an override workflow ID (opening an existing workflow / template), load by ID
      if (workflowIdOverride) {
        const { data, error } = await supabase
          .from("workflows")
          .select("id, codigo, fecha_creacion, items")
          .eq("id", workflowIdOverride)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setWorkflowData({
            id: data.id,
            codigo: data.codigo,
            fecha_creacion: data.fecha_creacion,
          });
          setItems((data.items as unknown as WorkFlowItem[]) || []);
        }
        setLoading(false);
        return;
      }

      // 2. If items were provided (new workflow from template), use those
      if (initialItems && initialItems.length > 0) {
        setItems(initialItems);
        setWorkflowData(null);
        setLoading(false);
        return;
      }

      // 3. For plantilla type without override -> start empty
      if (tipoWorkflow === "plantilla") {
        setItems([]);
        setWorkflowData(null);
        setLoading(false);
        return;
      }

      // 4. Default: check if asignado workflow exists for this contrato
      const { data: existingWorkflow, error: wfError } = await supabase
        .from("workflows")
        .select("id, codigo, fecha_creacion, items")
        .eq("contrato_id", contrato.id)
        .eq("tipo", "asignado")
        .maybeSingle();

      if (wfError && wfError.code !== 'PGRST116') throw wfError;

      if (existingWorkflow) {
        setWorkflowData({
          id: existingWorkflow.id,
          codigo: existingWorkflow.codigo,
          fecha_creacion: existingWorkflow.fecha_creacion,
        });
        setItems((existingWorkflow.items as unknown as WorkFlowItem[]) || []);
      } else {
        // Fallback: legacy datos_plantilla
        const { data, error } = await supabase
          .from("contratos")
          .select("datos_plantilla")
          .eq("id", contrato.id)
          .maybeSingle();
        if (error) throw error;
        const datosPlantilla = data?.datos_plantilla as Record<string, any> || {};
        setItems(datosPlantilla.workflow_items || []);
        setWorkflowData(null);
      }
    } catch (error) {
      console.error("Error loading workflow:", error);
      toast.error("Error al cargar el workflow");
    }
    setLoading(false);
  };

  const saveWorkflow = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const workflowItemsJson = items.map(item => ({
        id: item.id,
        tipo: item.tipo,
        titulo: item.titulo,
        descripcion: item.descripcion || null,
        asignado_a: item.asignado_a || null,
        asignado_nombre: item.asignado_nombre || null,
        rol: item.rol || null,
        completado: item.completado,
        orden: item.orden,
        conexiones: item.conexiones || null,
        subColumna: item.subColumna ?? null,
        parentId: item.parentId || null,
        enlaceSharepoint: item.enlaceSharepoint || null,
        fecha_inicio: item.fecha_inicio || null,
        fecha_termino: item.fecha_termino || null,
        progreso: item.progreso ?? null,
      }));

      if (workflowData?.id) {
        // Update existing workflow
        const updatePayload: any = {
          items: workflowItemsJson as any,
          updated_at: new Date().toISOString(),
        };
        if (tipoWorkflow === "plantilla" && nombrePlantilla) {
          updatePayload.nombre_plantilla = nombrePlantilla;
        }
        const { error } = await supabase
          .from("workflows")
          .update(updatePayload)
          .eq("id", workflowData.id);

        if (error) throw error;
      } else {
        // Create new workflow with code
        const { data: codeData, error: codeError } = await supabase
          .rpc("get_next_workflow_code");

        if (codeError) throw codeError;

        const newCodigo = codeData as string;

        const insertPayload: any = {
          codigo: newCodigo,
          items: workflowItemsJson as any,
          created_by: userData?.user?.id,
          tipo: tipoWorkflow,
        };
        if (tipoWorkflow === "plantilla") {
          insertPayload.nombre_plantilla = nombrePlantilla || `Plantilla ${newCodigo}`;
          insertPayload.contrato_id = null;
        } else {
          insertPayload.contrato_id = contrato.id;
        }

        const { data: newWorkflow, error: insertError } = await supabase
          .from("workflows")
          .insert(insertPayload)
          .select("id, codigo, fecha_creacion")
          .single();

        if (insertError) throw insertError;

        setWorkflowData({
          id: newWorkflow.id,
          codigo: newWorkflow.codigo,
          fecha_creacion: newWorkflow.fecha_creacion,
        });
      }

      // Sync legacy datos_plantilla only for asignado workflows
      if (tipoWorkflow === "asignado") {
        const { data: contratoData } = await supabase
          .from("contratos")
          .select("datos_plantilla")
          .eq("id", contrato.id)
          .maybeSingle();

        const datosPlantilla = (contratoData?.datos_plantilla as Record<string, any>) || {};

        await supabase
          .from("contratos")
          .update({
            datos_plantilla: {
              ...datosPlantilla,
              workflow_items: workflowItemsJson,
              workflow_updated_at: new Date().toISOString(),
            } as any
          })
          .eq("id", contrato.id);
      }

      toast.success("WorkFlow guardado correctamente");
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast.error("Error al guardar el workflow");
    }
    setSaving(false);
  };

  // Export workflow to Excel (compatible with import format)
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const activities = items.filter(i => i.tipo === "actividad");
    const inputs = items.filter(i => i.tipo === "input");
    const tareas = items.filter(i => i.tipo === "tarea");
    const outputs = items.filter(i => i.tipo === "output");
    const supervisions = items.filter(i => i.tipo === "supervision");

    // Build name maps
    const idToName = new Map(items.map(i => [i.id, i.titulo]));

    // Actividades sheet
    const actData = [["Actividad", "Descripción", "Fecha Inicio (YYYY-MM-DD)", "Fecha Término (YYYY-MM-DD)"]];
    activities.forEach(a => actData.push([a.titulo, a.descripcion || "", a.fecha_inicio || "", a.fecha_termino || ""]));
    const wsAct = XLSX.utils.aoa_to_sheet(actData);
    wsAct["!cols"] = [{ wch: 30 }, { wch: 45 }, { wch: 22 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsAct, "Actividades");

    // Inputs sheet
    const inpData: string[][] = [["Actividad (nombre exacto)", "Input", "Descripción", "Enlace SharePoint"]];
    inputs.forEach(inp => {
      const actName = inp.parentId ? (idToName.get(inp.parentId) || "") : "";
      inpData.push([actName, inp.titulo, inp.descripcion || "", inp.enlaceSharepoint || ""]);
    });
    const wsInp = XLSX.utils.aoa_to_sheet(inpData);
    wsInp["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 45 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsInp, "Inputs");

    // Procesos sheet
    const procData: string[][] = [["Actividad (nombre exacto)", "Input (nombre exacto)", "SubColumna (1, 2 o 3)", "Tarea", "Descripción", "Rol"]];
    tareas.forEach(t => {
      const inputItem = t.parentId ? items.find(i => i.id === t.parentId) : null;
      const inputName = inputItem?.titulo || "";
      const actItem = inputItem?.parentId ? items.find(i => i.id === inputItem.parentId) : null;
      const actName = actItem?.titulo || "";
      procData.push([actName, inputName, String((t.subColumna ?? 0) + 1), t.titulo, t.descripcion || "", t.rol || ""]);
    });
    const wsProc = XLSX.utils.aoa_to_sheet(procData);
    wsProc["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 30 }, { wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsProc, "Procesos");

    // Outputs sheet
    const outData: string[][] = [["Actividad (nombre exacto)", "Output", "Descripción", "Enlace SharePoint"]];
    outputs.forEach(o => {
      const actName = o.parentId ? (idToName.get(o.parentId) || "") : "";
      outData.push([actName, o.titulo, o.descripcion || "", o.enlaceSharepoint || ""]);
    });
    const wsOut = XLSX.utils.aoa_to_sheet(outData);
    wsOut["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 45 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsOut, "Outputs");

    // Supervisión sheet
    const supData: string[][] = [["Actividad (nombre exacto)", "Supervisión", "Descripción"]];
    supervisions.forEach(s => {
      const actName = s.parentId ? (idToName.get(s.parentId) || "") : "";
      supData.push([actName, s.titulo, s.descripcion || ""]);
    });
    const wsSup = XLSX.utils.aoa_to_sheet(supData);
    wsSup["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsSup, "Supervisión");

    const fileName = `Workflow_${workflowData?.codigo || contrato.numero}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Workflow exportado correctamente");
  };

  const addItem = (tipo: string, rol?: string, subColumna?: number, parentId?: string) => {
    if (!newItemTitle.trim()) {
      toast.error("Ingresa un título");
      return;
    }

    const newItem: WorkFlowItem = {
      id: crypto.randomUUID(),
      tipo: tipo as any,
      titulo: newItemTitle,
      completado: false,
      orden: items.filter(i => i.tipo === tipo && i.rol === rol && i.parentId === parentId).length,
      rol,
      subColumna,
      parentId,
    };

    setItems([...items, newItem]);
    setNewItemTitle("");
    setNewItemColumn(null);
  };

  const updateItem = (id: string, updates: Partial<WorkFlowItem>) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const deleteItem = (id: string) => {
    // Also remove any connections to this item
    setItems(items.filter(item => item.id !== id).map(item => ({
      ...item,
      conexiones: item.conexiones?.filter(c => c !== id) || [],
    })));
  };

  const toggleComplete = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completado: !item.completado } : item
    ));
  };

  const startConnection = (fromId: string) => {
    setConnectingFrom(fromId);
  };

  const completeConnection = (toId: string) => {
    if (connectingFrom && connectingFrom !== toId) {
      setItems(items.map(item => {
        if (item.id === connectingFrom) {
          const currentConnections = item.conexiones || [];
          if (!currentConnections.includes(toId)) {
            return { ...item, conexiones: [...currentConnections, toId] };
          }
        }
        return item;
      }));
      toast.success("Conexión creada");
    }
    setConnectingFrom(null);
  };

  const removeConnection = (fromId: string, toId: string) => {
    setItems(items.map(item => {
      if (item.id === fromId) {
        return { 
          ...item, 
          conexiones: (item.conexiones || []).filter(c => c !== toId) 
        };
      }
      return item;
    }));
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getMiembrosByRol = (rol: string) => {
    return miembros.filter(m => m.rol_en_cartera.toLowerCase() === rol.toLowerCase());
  };

  const getItemsByTipo = (tipo: string, parentId?: string) => {
    return items.filter(item => item.tipo === tipo && item.parentId === parentId).sort((a, b) => a.orden - b.orden);
  };

  const getItemsBySubColumna = (subColumna: number, parentId?: string) => {
    return items.filter(item => item.tipo === "tarea" && item.subColumna === subColumna && item.parentId === parentId)
      .sort((a, b) => a.orden - b.orden);
  };

  // Get inputs for an activity
  const getInputsForActivity = (activityId: string) => {
    return items.filter(item => item.tipo === "input" && item.parentId === activityId)
      .sort((a, b) => a.orden - b.orden);
  };

  // Get all activities
  const getActividades = () => {
    return items.filter(item => item.tipo === "actividad").sort((a, b) => a.orden - b.orden);
  };

  const setItemRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(id, el);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  // Get column index for an item based on its type
  const getColumnIndex = (item: WorkFlowItem): number => {
    switch (item.tipo) {
      case "actividad": return 0;
      case "input": return 1;
      case "tarea": return 2;
      case "output": return 3;
      case "supervision": return 4;
      default: return -1;
    }
  };

  // Check if two items are in the exact same visual column (considering sub-columns)
  const isSameVisualColumn = (from: WorkFlowItem, to: WorkFlowItem): boolean => {
    const fromColIndex = getColumnIndex(from);
    const toColIndex = getColumnIndex(to);
    
    // Different main columns
    if (fromColIndex !== toColIndex) return false;
    
    // For 'tarea' type (Procesos), check sub-columns
    if (from.tipo === "tarea" && to.tipo === "tarea") {
      return from.subColumna === to.subColumna;
    }
    
    // Same main column, same type
    return true;
  };

  // Calculate connection lines with improved routing
  const renderConnections = () => {
    const connections: JSX.Element[] = [];
    
    items.forEach(item => {
      if (item.conexiones && item.conexiones.length > 0) {
        const fromEl = itemRefs.current.get(item.id);
        
        item.conexiones.forEach((toId, connIndex) => {
          const toEl = itemRefs.current.get(toId);
          const toItem = items.find(i => i.id === toId);
          
          if (fromEl && toEl && containerRef.current && toItem) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();
            
            const fromColIndex = getColumnIndex(item);
            const toColIndex = getColumnIndex(toItem);
            const sameVisualCol = isSameVisualColumn(item, toItem);
            
            let path = "";
            let startX = 0, startY = 0, endX = 0, endY = 0;
            const offset = 20 + (connIndex * 8); // Offset for multiple connections
            
            if (sameVisualCol) {
              // Exact same visual column (same sub-column): route through LEFT side (left-to-left)
              startX = fromRect.left - containerRect.left;
              startY = fromRect.top + fromRect.height / 2 - containerRect.top;
              endX = toRect.left - containerRect.left;
              endY = toRect.top + toRect.height / 2 - containerRect.top;
              
              const leftOffset = -offset;
              
              path = `M ${startX} ${startY} 
                      L ${startX + leftOffset} ${startY}
                      L ${endX + leftOffset} ${endY}
                      L ${endX} ${endY}`;
            } else if (toColIndex < fromColIndex) {
              // Going backwards (to a previous main column): route around the boxes
              startX = fromRect.left - containerRect.left;
              startY = fromRect.top + fromRect.height / 2 - containerRect.top;
              endX = toRect.right - containerRect.left;
              endY = toRect.top + toRect.height / 2 - containerRect.top;
              
              const verticalOffset = startY < endY ? -40 - offset : 40 + offset;
              
              path = `M ${startX} ${startY}
                      L ${startX - offset} ${startY}
                      L ${startX - offset} ${startY + verticalOffset}
                      L ${endX + offset} ${startY + verticalOffset}
                      L ${endX + offset} ${endY}
                      L ${endX} ${endY}`;
            } else {
              // Different columns or different sub-columns (forward flow): RIGHT of source → LEFT of destination
              startX = fromRect.right - containerRect.left;
              startY = fromRect.top + fromRect.height / 2 - containerRect.top;
              endX = toRect.left - containerRect.left;
              endY = toRect.top + toRect.height / 2 - containerRect.top;
              
              const midX = (startX + endX) / 2;
              
              // Use orthogonal routing to avoid crossing boxes
              path = `M ${startX} ${startY}
                      L ${midX} ${startY}
                      L ${midX} ${endY}
                      L ${endX} ${endY}`;
            }
            
            connections.push(
              <g key={`${item.id}-${toId}`}>
                <path
                  d={path}
                  fill="none"
                  stroke="hsl(var(--destructive))"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.2))" }}
                />
                {/* Connection dots at endpoints */}
                <circle
                  cx={startX}
                  cy={startY}
                  r="5"
                  fill="hsl(var(--destructive))"
                />
                <circle
                  cx={endX}
                  cy={endY}
                  r="5"
                  fill="hsl(var(--destructive))"
                />
              </g>
            );
          }
        });
      }
    });
    
    return connections;
  };

  // Get connection labels for an item
  const getConnectionLabels = (itemId: string): { outgoing: string[]; incoming: string[] } => {
    const outgoing: string[] = [];
    const incoming: string[] = [];
    
    const currentItem = items.find(i => i.id === itemId);
    if (currentItem?.conexiones) {
      currentItem.conexiones.forEach(toId => {
        const toItem = items.find(i => i.id === toId);
        if (toItem) {
          outgoing.push(toItem.titulo.substring(0, 15) + (toItem.titulo.length > 15 ? "..." : ""));
        }
      });
    }
    
    items.forEach(i => {
      if (i.conexiones?.includes(itemId)) {
        incoming.push(i.titulo.substring(0, 15) + (i.titulo.length > 15 ? "..." : ""));
      }
    });
    
    return { outgoing, incoming };
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">{contrato.cliente.razon_social}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">{contrato.numero}</span>
            </div>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {format(fechaInicio, "dd MMM yyyy", { locale: es })}
              {fechaFin && ` - ${format(fechaFin, "dd MMM yyyy", { locale: es })}`}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            {workflowData && (
              <Badge variant="secondary" className="gap-1.5 text-sm font-mono">
                <Hash className="h-3.5 w-3.5" />
                {workflowData.codigo}
              </Badge>
            )}
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Fecha WorkFlow</p>
              <p className="font-medium">
                {workflowData ? (
                  format(new Date(workflowData.fecha_creacion), "dd MMM yyyy, HH:mm", { locale: es })
                ) : (
                  <span className="text-muted-foreground italic">Sin guardar</span>
                )}
              </p>
            </div>
            {connectingFrom && (
              <Badge variant="secondary" className="gap-2 animate-pulse">
                <Link2 className="h-4 w-4" />
                Selecciona el destino
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 px-1"
                  onClick={() => setConnectingFrom(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
              <FileDown className="h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={saveWorkflow} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Column Headers - Grid with Procesos taking dynamic space based on member count */}
      <div className="grid border-b" style={{ gridTemplateColumns: `1fr 1fr ${subColumnCount}fr 1fr 1fr` }}>
        {columnConfig.map(col => {
          const Icon = col.icon;
          return (
            <div 
              key={col.id} 
              className={cn(
                "p-3 text-center text-white font-bold flex flex-col items-center gap-1", 
                col.color
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-2xl">{col.shortLabel}</span>
              <p className="text-sm font-normal">{col.label}</p>
            </div>
          );
        })}
      </div>

      {/* Sub-headers for Procesos column - dynamic sub-columns based on member count */}
      <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: `1fr 1fr ${subColumnCount}fr 1fr 1fr` }}>
        <div /> {/* Empty space for A column */}
        <div /> {/* Empty space for I column */}
        <div className="border-x">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${subColumnCount}, 1fr)` }}>
            {(subColumnRoles.length > 0 ? subColumnRoles : uniqueRoles).map((selectedRol, index) => (
              <div key={index} className="p-2 text-center border-r last:border-r-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs capitalize", roleColors[selectedRol.toLowerCase()] || "bg-gray-100")}
                      >
                        {selectedRol}
                      </Badge>
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-2" align="center">
                    <p className="text-xs font-medium text-muted-foreground px-2 pb-1.5 border-b mb-1">Filtrar por rol</p>
                    <div className="space-y-0.5">
                      {allAvailableRoles.map(rol => (
                        <button
                          key={rol}
                          className={cn(
                            "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors flex items-center gap-2",
                            selectedRol === rol && "bg-primary/10 font-medium"
                          )}
                          onClick={() => {
                            const newRoles = [...(subColumnRoles.length > 0 ? subColumnRoles : uniqueRoles)];
                            newRoles[index] = rol;
                            setSubColumnRoles(newRoles);
                          }}
                        >
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs capitalize", roleColors[rol.toLowerCase()] || "bg-gray-100")}
                          >
                            {rol}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </div>
        </div>
        <div /> {/* Empty space for O column */}
        <div /> {/* Empty space for S column */}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative" ref={containerRef}>
        {/* SVG for connection lines (no arrows) */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ overflow: 'visible' }}
        >
          {renderConnections()}
        </svg>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="min-h-full">
              {/* Row-based layout: Each activity creates a row group */}
              {getActividades().map((actividad, actIndex) => {
                const inputsForActivity = getInputsForActivity(actividad.id);
                
                return (
                  <div key={actividad.id} className="relative">
                    {/* Activity Row */}
                    <div className="grid" style={{ gridTemplateColumns: `1fr 1fr ${subColumnCount}fr 1fr 1fr` }}>
                      {/* Actividad Cell */}
                      <div className="border-r p-2 bg-sky-50/50 dark:bg-sky-950/20 min-h-[70px]">
                        <WorkFlowItemCard
                          item={actividad}
                          onToggle={() => toggleComplete(actividad.id)}
                          onDelete={() => deleteItem(actividad.id)}
                          onEdit={() => setEditingItem(actividad.id)}
                          isEditing={editingItem === actividad.id}
                          onSaveEdit={(title) => {
                            updateItem(actividad.id, { titulo: title });
                            setEditingItem(null);
                          }}
                          onCancelEdit={() => setEditingItem(null)}
                          variant="oval"
                          selectedAsignado={actividad.asignado_a}
                          selectedAsignadoNombre={actividad.asignado_nombre || (actividad.asignado_a ? profilesMap[actividad.asignado_a]?.full_name : undefined)}
                          progreso={actividad.progreso}
                          onStartConnection={() => startConnection(actividad.id)}
                          onCompleteConnection={() => completeConnection(actividad.id)}
                          isConnecting={!!connectingFrom}
                          isConnectingFrom={connectingFrom === actividad.id}
                          onRemoveConnections={() => updateItem(actividad.id, { conexiones: [] })}
                          hasConnections={(actividad.conexiones?.length || 0) > 0}
                          setRef={(el) => setItemRef(actividad.id, el)}
                          connectionLabels={getConnectionLabels(actividad.id)}
                          profilesMap={profilesMap}
                        />
                      </div>
                      {/* Empty Input Cell for Activity Row */}
                      <div className="border-r bg-emerald-50/50 dark:bg-emerald-950/20 min-h-[70px]" />
                      {/* Empty Proceso Cells */}
                      <div className="border-r bg-amber-50/50 dark:bg-amber-950/20 min-h-[70px]">
                        <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${subColumnCount}, 1fr)` }}>
                          {uniqueRoles.map((_, idx) => (
                            <div key={idx} className="border-r last:border-r-0" />
                          ))}
                        </div>
                      </div>
                      {/* Empty Output Cell */}
                      <div className="border-r bg-purple-50/50 dark:bg-purple-950/20 min-h-[70px]" />
                      {/* Empty Supervision Cell */}
                      <div className="bg-red-50/50 dark:bg-red-950/20 min-h-[70px]" />
                    </div>

                    {/* Input Rows for this Activity */}
                    {inputsForActivity.map((input, inputIndex) => {
                      return (
                        <div key={input.id} className="grid" style={{ gridTemplateColumns: `1fr 1fr ${subColumnCount}fr 1fr 1fr` }}>
                          {/* Empty Actividad Cell */}
                          <div className="border-r bg-sky-50/50 dark:bg-sky-950/20 min-h-[70px]" />
                          {/* Input Cell */}
                          <div className="border-r p-2 bg-emerald-50/50 dark:bg-emerald-950/20 min-h-[70px]">
                            <WorkFlowItemCard
                              item={input}
                              onToggle={() => toggleComplete(input.id)}
                              onDelete={() => deleteItem(input.id)}
                              onEdit={() => setEditingItem(input.id)}
                              isEditing={editingItem === input.id}
                              onSaveEdit={(title, enlaceSharepoint) => {
                                updateItem(input.id, { titulo: title, enlaceSharepoint: enlaceSharepoint || undefined });
                                setEditingItem(null);
                              }}
                              onCancelEdit={() => setEditingItem(null)}
                              variant="diamond"
                              showSharepointLink={true}
                              selectedAsignado={input.asignado_a}
                              selectedAsignadoNombre={input.asignado_nombre || (input.asignado_a ? profilesMap[input.asignado_a]?.full_name : undefined)}
                              progreso={input.progreso}
                              onStartConnection={() => startConnection(input.id)}
                              onCompleteConnection={() => completeConnection(input.id)}
                              isConnecting={!!connectingFrom}
                              isConnectingFrom={connectingFrom === input.id}
                              onRemoveConnections={() => updateItem(input.id, { conexiones: [] })}
                              hasConnections={(input.conexiones?.length || 0) > 0}
                              setRef={(el) => setItemRef(input.id, el)}
                              connectionLabels={getConnectionLabels(input.id)}
                              profilesMap={profilesMap}
                            />
                          </div>
                          {/* Proceso Cells for this Input */}
                          <div className="border-r bg-amber-50/50 dark:bg-amber-950/20 min-h-[70px]">
                            <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${subColumnCount}, 1fr)` }}>
                              {(subColumnRoles.length > 0 ? subColumnRoles : uniqueRoles).map((rol, subColIndex) => {
                                const selectedRol = subColumnRoles[subColIndex] || uniqueRoles[subColIndex] || rol;
                                const rolMiembros = getFilteredMembers(selectedRol);
                                const tareasForInput = getItemsBySubColumna(subColIndex, input.id);
                                
                                return (
                                  <div key={`${rol}-${subColIndex}`} className="border-r last:border-r-0 p-1">
                                    <div className="space-y-1">
                                      {tareasForInput.map(tarea => (
                                        <WorkFlowItemCard
                                          key={tarea.id}
                                          item={tarea}
                                          onToggle={() => toggleComplete(tarea.id)}
                                          onDelete={() => deleteItem(tarea.id)}
                                          onEdit={() => setEditingItem(tarea.id)}
                                          isEditing={editingItem === tarea.id}
                                          onSaveEdit={(title) => {
                                            updateItem(tarea.id, { titulo: title });
                                            setEditingItem(null);
                                          }}
                                          onCancelEdit={() => setEditingItem(null)}
                                          variant="default"
                                          miembros={rolMiembros}
                                          selectedAsignado={tarea.asignado_a}
                                          selectedAsignadoNombre={tarea.asignado_nombre || (tarea.asignado_a ? profilesMap[tarea.asignado_a]?.full_name : undefined)}
                                          progreso={tarea.progreso}
                                          onAsignar={(userId) => {
                                            const profile = profilesMap[userId];
                                            updateItem(tarea.id, { 
                                              asignado_a: userId,
                                              asignado_nombre: profile?.full_name || null
                                            });
                                          }}
                                          onStartConnection={() => startConnection(tarea.id)}
                                          onCompleteConnection={() => completeConnection(tarea.id)}
                                          isConnecting={!!connectingFrom}
                                          isConnectingFrom={connectingFrom === tarea.id}
                                          onRemoveConnections={() => updateItem(tarea.id, { conexiones: [] })}
                                          hasConnections={(tarea.conexiones?.length || 0) > 0}
                                          setRef={(el) => setItemRef(tarea.id, el)}
                                          connectionLabels={getConnectionLabels(tarea.id)}
                                          profilesMap={profilesMap}
                                        />
                                      ))}
                                      {newItemColumn === `tarea-${subColIndex}-${input.id}` ? (
                                        <div className="flex gap-1">
                                          <Input
                                            value={newItemTitle}
                                            onChange={(e) => setNewItemTitle(e.target.value)}
                                            placeholder="Nueva tarea..."
                                            className="h-6 text-[10px]"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") addItem("tarea", selectedRol, subColIndex, input.id);
                                              if (e.key === "Escape") setNewItemColumn(null);
                                            }}
                                          />
                                          <Button size="sm" className="h-6 px-1" onClick={() => addItem("tarea", selectedRol, subColIndex, input.id)}>
                                            <Plus className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="w-full justify-center gap-1 text-muted-foreground text-[10px] h-5"
                                          onClick={() => setNewItemColumn(`tarea-${subColIndex}-${input.id}`)}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {/* Output Cell for this row */}
                          <div className="border-r p-2 bg-purple-50/50 dark:bg-purple-950/20 min-h-[70px]">
                            {getItemsByTipo("output", input.id).map(output => (
                              <WorkFlowItemCard
                                key={output.id}
                                item={output}
                                onToggle={() => toggleComplete(output.id)}
                                onDelete={() => deleteItem(output.id)}
                                onEdit={() => setEditingItem(output.id)}
                                isEditing={editingItem === output.id}
                                onSaveEdit={(title, enlaceSharepoint) => {
                                  updateItem(output.id, { titulo: title, enlaceSharepoint: enlaceSharepoint || undefined });
                                  setEditingItem(null);
                                }}
                                onCancelEdit={() => setEditingItem(null)}
                                variant="rounded"
                                showSharepointLink={true}
                                selectedAsignado={output.asignado_a}
                                selectedAsignadoNombre={output.asignado_nombre || (output.asignado_a ? profilesMap[output.asignado_a]?.full_name : undefined)}
                                progreso={output.progreso}
                                onStartConnection={() => startConnection(output.id)}
                                onCompleteConnection={() => completeConnection(output.id)}
                                isConnecting={!!connectingFrom}
                                isConnectingFrom={connectingFrom === output.id}
                                onRemoveConnections={() => updateItem(output.id, { conexiones: [] })}
                                hasConnections={(output.conexiones?.length || 0) > 0}
                                setRef={(el) => setItemRef(output.id, el)}
                                connectionLabels={getConnectionLabels(output.id)}
                                profilesMap={profilesMap}
                              />
                            ))}
                            {newItemColumn === `output-${input.id}` ? (
                              <div className="flex gap-1 mt-1">
                                <Input
                                  value={newItemTitle}
                                  onChange={(e) => setNewItemTitle(e.target.value)}
                                  placeholder="Entregable..."
                                  className="h-6 text-[10px]"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") addItem("output", undefined, undefined, input.id);
                                    if (e.key === "Escape") setNewItemColumn(null);
                                  }}
                                />
                                <Button size="sm" className="h-6 px-1" onClick={() => addItem("output", undefined, undefined, input.id)}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-center gap-1 text-muted-foreground text-[10px] h-5 mt-1"
                                onClick={() => setNewItemColumn(`output-${input.id}`)}
                              >
                                <Plus className="h-3 w-3" />
                                Agregar
                              </Button>
                            )}
                          </div>
                          {/* Supervision Cell for this row */}
                          <div className="p-2 bg-red-50/50 dark:bg-red-950/20 min-h-[70px]">
                            {getItemsByTipo("supervision", input.id).map(supervision => (
                              <WorkFlowItemCard
                                key={supervision.id}
                                item={supervision}
                                onToggle={() => toggleComplete(supervision.id)}
                                onDelete={() => deleteItem(supervision.id)}
                                onEdit={() => setEditingItem(supervision.id)}
                                isEditing={editingItem === supervision.id}
                                onSaveEdit={(title) => {
                                  updateItem(supervision.id, { titulo: title });
                                  setEditingItem(null);
                                }}
                                onCancelEdit={() => setEditingItem(null)}
                                variant="oval"
                                supervisores={supervisores}
                                selectedAsignado={supervision.asignado_a}
                                selectedAsignadoNombre={supervision.asignado_nombre || (supervision.asignado_a ? profilesMap[supervision.asignado_a]?.full_name : undefined)}
                                progreso={supervision.progreso}
                                onAsignar={(userId) => {
                                  const profile = profilesMap[userId];
                                  updateItem(supervision.id, { 
                                    asignado_a: userId,
                                    asignado_nombre: profile?.full_name || null
                                  });
                                }}
                                onStartConnection={() => startConnection(supervision.id)}
                                onCompleteConnection={() => completeConnection(supervision.id)}
                                isConnecting={!!connectingFrom}
                                isConnectingFrom={connectingFrom === supervision.id}
                                onRemoveConnections={() => updateItem(supervision.id, { conexiones: [] })}
                                hasConnections={(supervision.conexiones?.length || 0) > 0}
                                setRef={(el) => setItemRef(supervision.id, el)}
                                connectionLabels={getConnectionLabels(supervision.id)}
                                profilesMap={profilesMap}
                              />
                            ))}
                            {newItemColumn === `supervision-${input.id}` ? (
                              <div className="flex gap-1 mt-1">
                                <Input
                                  value={newItemTitle}
                                  onChange={(e) => setNewItemTitle(e.target.value)}
                                  placeholder="Supervisión..."
                                  className="h-6 text-[10px]"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") addItem("supervision", undefined, undefined, input.id);
                                    if (e.key === "Escape") setNewItemColumn(null);
                                  }}
                                />
                                <Button size="sm" className="h-6 px-1" onClick={() => addItem("supervision", undefined, undefined, input.id)}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-center gap-1 text-muted-foreground text-[10px] h-5 mt-1"
                                onClick={() => setNewItemColumn(`supervision-${input.id}`)}
                              >
                                <Plus className="h-3 w-3" />
                                Agregar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Input Button Row */}
                    <div className="grid" style={{ gridTemplateColumns: `1fr 1fr ${subColumnCount}fr 1fr 1fr` }}>
                      <div className="border-r bg-sky-50/50 dark:bg-sky-950/20 min-h-[40px]" />
                      <div className="border-r p-2 bg-emerald-50/50 dark:bg-emerald-950/20 min-h-[40px]">
                        {newItemColumn === `input-${actividad.id}` ? (
                          <div className="flex gap-1">
                            <Input
                              value={newItemTitle}
                              onChange={(e) => setNewItemTitle(e.target.value)}
                              placeholder="Nuevo input..."
                              className="h-6 text-[10px]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") addItem("input", undefined, undefined, actividad.id);
                                if (e.key === "Escape") setNewItemColumn(null);
                              }}
                            />
                            <Button size="sm" className="h-6 px-1" onClick={() => addItem("input", undefined, undefined, actividad.id)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-1 text-muted-foreground text-xs h-6"
                            onClick={() => setNewItemColumn(`input-${actividad.id}`)}
                          >
                            <Plus className="h-3 w-3" />
                            Agregar
                          </Button>
                        )}
                      </div>
                      <div className="border-r bg-amber-50/50 dark:bg-amber-950/20 min-h-[40px]">
                        <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${subColumnCount}, 1fr)` }}>
                          {uniqueRoles.map((_, idx) => (
                            <div key={idx} className="border-r last:border-r-0" />
                          ))}
                        </div>
                      </div>
                      <div className="border-r bg-purple-50/50 dark:bg-purple-950/20 min-h-[40px]" />
                      <div className="bg-red-50/50 dark:bg-red-950/20 min-h-[40px]" />
                    </div>
                  </div>
                );
              })}

              {/* Add Activity Button Row */}
              <div className="grid border-t" style={{ gridTemplateColumns: `1fr 1fr ${subColumnCount}fr 1fr 1fr` }}>
                <div className="border-r p-2 bg-sky-50/50 dark:bg-sky-950/20 min-h-[50px]">
                  {newItemColumn === "actividad" ? (
                    <div className="flex gap-1">
                      <Input
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder="Nueva actividad..."
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addItem("actividad");
                          if (e.key === "Escape") setNewItemColumn(null);
                        }}
                      />
                      <Button size="sm" className="h-7 px-2" onClick={() => addItem("actividad")}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-1 text-muted-foreground"
                      onClick={() => setNewItemColumn("actividad")}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </Button>
                  )}
                </div>
                <div className="border-r bg-emerald-50/50 dark:bg-emerald-950/20 min-h-[50px]" />
                <div className="border-r bg-amber-50/50 dark:bg-amber-950/20 min-h-[50px]">
                  <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${subColumnCount}, 1fr)` }}>
                    {uniqueRoles.map((_, idx) => (
                      <div key={idx} className="border-r last:border-r-0" />
                    ))}
                  </div>
                </div>
                <div className="border-r bg-purple-50/50 dark:bg-purple-950/20 min-h-[50px]" />
                <div className="bg-red-50/50 dark:bg-red-950/20 min-h-[50px]" />
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer Progress Bar */}
      <div className="border-t bg-card px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Progress value={progressPercent} className="h-3" />
          </div>
          <div className="text-sm font-medium min-w-[60px] text-center">
            {progressPercent}%
          </div>
          <div className="text-sm text-muted-foreground">
            {completados} de {total} tareas completadas
          </div>
        </div>
      </div>
    </div>
  );
}

interface WorkFlowItemCardProps {
  item: WorkFlowItem;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  isEditing: boolean;
  onSaveEdit: (title: string, enlaceSharepoint?: string) => void;
  onCancelEdit: () => void;
  variant?: "default" | "diamond" | "rounded" | "oval";
  miembros?: MiembroCartera[];
  supervisores?: SupervisorProfile[];
  selectedAsignado?: string;
  selectedAsignadoNombre?: string;
  progreso?: number;
  onAsignar?: (userId: string) => void;
  onStartConnection: () => void;
  onCompleteConnection: () => void;
  isConnecting: boolean;
  isConnectingFrom: boolean;
  onRemoveConnections: () => void;
  hasConnections: boolean;
  setRef: (el: HTMLDivElement | null) => void;
  connectionLabels: { outgoing: string[]; incoming: string[] };
  showSharepointLink?: boolean;
  profilesMap?: Record<string, { full_name: string | null; email: string }>;
}

function WorkFlowItemCard({
  item,
  onToggle,
  onDelete,
  onEdit,
  isEditing,
  onSaveEdit,
  onCancelEdit,
  variant = "default",
  miembros,
  supervisores,
  selectedAsignado,
  selectedAsignadoNombre,
  progreso,
  onAsignar,
  onStartConnection,
  onCompleteConnection,
  isConnecting,
  isConnectingFrom,
  onRemoveConnections,
  hasConnections,
  setRef,
  connectionLabels,
  showSharepointLink = false,
  profilesMap,
}: WorkFlowItemCardProps) {
  const [editTitle, setEditTitle] = useState(item.titulo);
  const [editSharepointLink, setEditSharepointLink] = useState(item.enlaceSharepoint || "");

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const shapeClasses = {
    default: "rounded-lg",
    diamond: "rounded-lg rotate-0", 
    rounded: "rounded-2xl",
    oval: "rounded-full px-3",
  };

  const borderStyles = {
    default: "border-blue-400",
    diamond: "border-emerald-400",
    rounded: "border-purple-400",
    oval: "border-blue-400",
  };

  if (isEditing) {
    return (
      <div 
        ref={setRef}
        className={cn(
          "p-2 bg-white dark:bg-gray-800 border-2 border-primary shadow-sm",
          shapeClasses[variant]
        )}
      >
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="h-7 text-sm mb-2"
          autoFocus
          placeholder="Título..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !showSharepointLink) onSaveEdit(editTitle, editSharepointLink);
            if (e.key === "Escape") onCancelEdit();
          }}
        />
        {showSharepointLink && (
          <Input
            value={editSharepointLink}
            onChange={(e) => setEditSharepointLink(e.target.value)}
            className="h-7 text-sm mb-2"
            placeholder="Enlace SharePoint (opcional)..."
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit(editTitle, editSharepointLink);
              if (e.key === "Escape") onCancelEdit();
            }}
          />
        )}
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={onCancelEdit}>
            Cancelar
          </Button>
          <Button size="sm" className="h-6 px-2" onClick={() => onSaveEdit(editTitle, editSharepointLink)}>
            Guardar
          </Button>
        </div>
      </div>
    );
  }

  const hasLabels = connectionLabels.outgoing.length > 0 || connectionLabels.incoming.length > 0;

  return (
    <div
      ref={setRef}
      onClick={() => {
        if (isConnecting && !isConnectingFrom) {
          onCompleteConnection();
        }
      }}
      className={cn(
        "group relative p-2 bg-white dark:bg-gray-800 border-2 shadow-sm hover:shadow-md transition-all",
        item.completado && "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700",
        !item.completado && borderStyles[variant],
        shapeClasses[variant],
        isConnecting && !isConnectingFrom && "cursor-pointer ring-2 ring-blue-300 ring-offset-1",
        isConnectingFrom && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* Connection labels - Incoming */}
      {connectionLabels.incoming.length > 0 && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full flex flex-col gap-0.5 max-w-[80px]">
          {connectionLabels.incoming.map((label, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-0.5 text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded-sm whitespace-nowrap overflow-hidden"
              title={label}
            >
              <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Connection labels - Outgoing */}
      {connectionLabels.outgoing.length > 0 && (
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 translate-x-full flex flex-col gap-0.5 max-w-[80px]">
          {connectionLabels.outgoing.map((label, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-0.5 text-[9px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded-sm whitespace-nowrap overflow-hidden"
              title={label}
            >
              <span className="truncate">{label}</span>
              <ArrowLeft className="h-2.5 w-2.5 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="mt-0.5 flex-shrink-0"
        >
          {item.completado ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className={cn(
              "text-xs font-medium line-clamp-2 flex-1",
              item.completado && "line-through text-muted-foreground"
            )}>
              {item.titulo}
            </p>
            {item.enlaceSharepoint && (
              <a
                href={item.enlaceSharepoint}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 text-blue-500 hover:text-blue-700"
                title="Abrir documento en SharePoint"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          
          {/* Assignee and Progress Row */}
          <div className="mt-1 flex items-center justify-between gap-2">
            {/* Assignee display/select */}
            {miembros && onAsignar ? (
              selectedAsignado ? (
                // Show assigned as circle with tooltip
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Avatar className="h-5 w-5 border-2 border-primary/20">
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">
                          {getInitials(selectedAsignadoNombre || miembros.find(m => m.user_id === selectedAsignado)?.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{selectedAsignadoNombre || miembros.find(m => m.user_id === selectedAsignado)?.profile?.full_name}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Select value="" onValueChange={onAsignar}>
                  <SelectTrigger className="h-5 text-[10px] w-auto min-w-[70px]">
                    <SelectValue placeholder="Asignar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {miembros.map(m => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">
                              {getInitials(m.profile?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{m.profile?.full_name || m.profile?.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            ) : supervisores && onAsignar ? (
              selectedAsignado ? (
                // Show supervisor as circle with tooltip
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Avatar className="h-5 w-5 border-2 border-red-200">
                        <AvatarFallback className="text-[9px] bg-red-100 text-red-700 font-semibold dark:bg-red-900/30 dark:text-red-300">
                          {getInitials(selectedAsignadoNombre || supervisores.find(s => s.id === selectedAsignado)?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      {supervisores.find(s => s.id === selectedAsignado)?.puesto && (
                        <span className="text-[9px] text-muted-foreground">
                          ({supervisores.find(s => s.id === selectedAsignado)?.puesto})
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{selectedAsignadoNombre || supervisores.find(s => s.id === selectedAsignado)?.full_name}</p>
                    {supervisores.find(s => s.id === selectedAsignado)?.puesto && (
                      <p className="text-muted-foreground">{supervisores.find(s => s.id === selectedAsignado)?.puesto}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Select value="" onValueChange={onAsignar}>
                  <SelectTrigger className="h-5 text-[10px] w-auto min-w-[100px]">
                    <SelectValue placeholder="Asignar supervisor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisores.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">
                              {getInitials(s.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{s.full_name || s.email}</span>
                          {s.puesto && (
                            <span className="text-[9px] text-muted-foreground">({s.puesto})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            ) : selectedAsignado && selectedAsignadoNombre ? (
              // Fallback: Show assignee from props (read-only)
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Avatar className="h-5 w-5 border-2 border-primary/20">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">
                      {getInitials(selectedAsignadoNombre)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">{selectedAsignadoNombre}</p>
                </TooltipContent>
              </Tooltip>
            ) : null}
            
            {/* Progress percentage */}
            {typeof progreso === 'number' && progreso > 0 && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[9px] px-1.5 py-0 h-4 font-semibold",
                      progreso >= 100 
                        ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700"
                        : progreso >= 50
                        ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700"
                        : "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700"
                    )}
                  >
                    {progreso}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>Progreso: {progreso}%</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
      
      {/* Action buttons on hover */}
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-white dark:bg-gray-800 rounded-lg shadow-md p-0.5 border z-20">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={(e) => {
            e.stopPropagation();
            onStartConnection();
          }}
          title="Crear conexión"
        >
          <Link2 className="h-3 w-3 text-blue-500" />
        </Button>
        {hasConnections && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveConnections();
            }}
            title="Eliminar conexiones"
          >
            <Unlink className="h-3 w-3 text-orange-500" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

