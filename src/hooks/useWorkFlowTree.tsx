import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { TreeNode } from "@/components/workflow/WorkFlowTreeSidebar";

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
  dependencias?: string[];
  subColumna?: number;
  parentId?: string;
  enlaceSharepoint?: string;
  fecha_inicio?: string;
  fecha_termino?: string;
  fecha_vencimiento?: string;
  progreso?: number;
}

interface Workflow {
  id: string;
  codigo: string;
  contrato_id: string;
  items: WorkFlowItem[];
}

interface Contrato {
  id: string;
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  status: string;
  cliente: {
    id: string;
    razon_social: string;
    codigo: string;
  };
}

interface Cartera {
  id: string;
  nombre: string;
  especialidad: string | null;
  descripcion: string | null;
  miembros: any[];
  stats: {
    total: number;
    en_gestion: number;
    finalizados: number;
  };
  clientes: { cliente_id: string }[];
}

interface ProfileMap {
  [key: string]: { full_name: string | null; email: string };
}

export function useWorkFlowTree() {
  const [loading, setLoading] = useState(true);
  const [carteras, setCarteras] = useState<Cartera[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [carteraClientesMap, setCarteraClientesMap] = useState<Map<string, string>>(new Map());
  const [profilesMap, setProfilesMap] = useState<ProfileMap>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    try {
      // Fetch carteras with members
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

      // Fetch contratos
      const { data: contratosData } = await supabase
        .from("contratos")
        .select(`
          id, numero, descripcion, tipo_servicio, fecha_inicio, status,
          cliente:clientes(id, razon_social, codigo)
        `)
        .neq("status", "borrador")
        .order("fecha_inicio", { ascending: false });

      // Fetch all workflows
      const { data: workflowsData } = await supabase
        .from("workflows")
        .select("id, codigo, contrato_id, items");

      // Fetch profiles for name resolution
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      // Build cartera-cliente map
      const ccMap = new Map<string, string>();
      if (carterasData) {
        carterasData.forEach((c: any) => {
          (c.clientes || []).forEach((cc: any) => {
            ccMap.set(cc.cliente_id, c.id);
          });
        });
      }
      setCarteraClientesMap(ccMap);

      // Build profiles map
      const pMap: ProfileMap = {};
      if (profilesData) {
        profilesData.forEach((p) => {
          pMap[p.id] = { full_name: p.full_name, email: p.email };
        });
      }
      setProfilesMap(pMap);

      // Calculate cartera stats
      if (carterasData && contratosData) {
        const carterasWithStats = carterasData.map((c: any) => {
          const clienteIds = (c.clientes || []).map((cc: any) => cc.cliente_id);
          const carteraContratos = contratosData.filter(
            (ct: any) => ct.cliente && clienteIds.includes(ct.cliente.id)
          );

          return {
            id: c.id,
            nombre: c.nombre,
            especialidad: c.especialidad,
            descripcion: c.descripcion,
            miembros: (c.miembros || []).map((m: any) => ({
              user_id: m.user_id,
              rol_en_cartera: m.rol_en_cartera,
              profile: m.profile,
            })),
            clientes: c.clientes || [],
            stats: {
              total: carteraContratos.length,
              en_gestion: carteraContratos.filter((ct: any) =>
                ["en_gestion", "aprobado", "activo"].includes(ct.status)
              ).length,
              finalizados: carteraContratos.filter((ct: any) => ct.status === "finalizado").length,
            },
          };
        });
        setCarteras(carterasWithStats);
      }

      if (contratosData) {
        setContratos(contratosData.filter((c: any) => c.cliente));
      }

      if (workflowsData) {
        setWorkflows(
          workflowsData.map((w: any) => ({
            id: w.id,
            codigo: w.codigo,
            contrato_id: w.contrato_id,
            items: (w.items as WorkFlowItem[]) || [],
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching workflow data:", error);
    }

    setLoading(false);
  };

  // Build tree structure
  const treeData = useMemo<TreeNode[]>(() => {
    if (!carteras.length) return [];

    return carteras.map((cartera) => {
      // Get all clients for this cartera
      const clienteIds = cartera.clientes.map((c) => c.cliente_id);
      
      // Get contratos for this cartera
      const carteraContratos = contratos.filter(
        (c) => c.cliente && clienteIds.includes(c.cliente.id)
      );

      // Group contratos by month
      const contratosByMonth = new Map<string, Contrato[]>();
      carteraContratos.forEach((contrato) => {
        const monthKey = format(parseISO(contrato.fecha_inicio), "yyyy-MM");
        const monthLabel = format(parseISO(contrato.fecha_inicio), "MMMM yyyy", { locale: es });
        
        if (!contratosByMonth.has(monthKey)) {
          contratosByMonth.set(monthKey, []);
        }
        contratosByMonth.get(monthKey)!.push(contrato);
      });

      // Build month nodes
      const monthNodes: TreeNode[] = Array.from(contratosByMonth.entries())
        .sort((a, b) => b[0].localeCompare(a[0])) // Sort descending
        .map(([monthKey, monthContratos]) => {
          const monthLabel = format(parseISO(`${monthKey}-01`), "MMMM", { locale: es });
          
          // Build contrato nodes
          const contratoNodes: TreeNode[] = monthContratos.map((contrato) => {
            // Get workflow for this contrato
            const workflow = workflows.find((w) => w.contrato_id === contrato.id);
            
            // Build activity nodes from workflow
            const actividadNodes: TreeNode[] = [];
            
            if (workflow) {
              // Preserve the original JSON array order by using index
              const itemsWithIndex = workflow.items.map((item, index) => ({ ...item, _originalIndex: index }));
              
              const actividades = itemsWithIndex
                .filter((item) => item.tipo === "actividad")
                .sort((a, b) => a._originalIndex - b._originalIndex);

              // Helper function to get all descendant IDs starting from a set of root item IDs
              // Uses conexiones from activity to find the root input, then follows parentId chain
              const getActivityDescendantIds = (rootInputIds: string[]): Set<string> => {
                const descendantIds = new Set<string>(rootInputIds);
                const queue: string[] = [...rootInputIds];
                
                while (queue.length > 0) {
                  const currentId = queue.shift()!;
                  // Find all items that have this ID as their parentId
                  const children = itemsWithIndex.filter(item => item.parentId === currentId);
                  children.forEach(child => {
                    if (!descendantIds.has(child.id)) {
                      descendantIds.add(child.id);
                      queue.push(child.id);
                    }
                  });
                }
                
                return descendantIds;
              };

              actividades.forEach((actividad) => {
                // Get root input IDs from the activity's conexiones array
                // This defines which inputs belong to this specific activity
                let rootInputIds = (actividad.conexiones || []).filter((id: string) => 
                  itemsWithIndex.some(item => item.id === id && item.tipo === "input")
                );
                
                // Fallback: if conexiones is empty, find inputs whose parentId is this activity
                if (rootInputIds.length === 0) {
                  rootInputIds = itemsWithIndex
                    .filter(item => item.tipo === "input" && item.parentId === actividad.id)
                    .map(item => item.id);
                }
                
                // Get all descendant IDs starting from these root inputs
                const activityDescendantIds = getActivityDescendantIds(rootInputIds);
                
                // Get inputs for this activity (from conexiones only)
                const inputs = itemsWithIndex
                  .filter((item) => item.tipo === "input" && rootInputIds.includes(item.id))
                  .sort((a, b) => a._originalIndex - b._originalIndex);

                const inputNodes: TreeNode[] = inputs.map((input) => ({
                  id: input.id,
                  type: "input" as const,
                  label: input.titulo,
                  data: {
                    ...input,
                    contratoId: contrato.id,
                    workflowId: workflow?.id,
                    enlaceSharepoint: input.enlaceSharepoint,
                    asignado_nombre: input.asignado_a ? profilesMap[input.asignado_a]?.full_name : null,
                  },
                  isCompleted: input.completado,
                }));

                // Get all tareas that belong to THIS activity's descendants
                const tareas = itemsWithIndex
                  .filter((item) => item.tipo === "tarea" && activityDescendantIds.has(item.id))
                  .sort((a, b) => a._originalIndex - b._originalIndex);

                const tareaNodes: TreeNode[] = tareas.map((tarea) => ({
                  id: tarea.id,
                  type: "tarea" as const,
                  label: tarea.titulo,
                  data: {
                    ...tarea,
                    contratoId: contrato.id,
                    workflowId: workflow?.id,
                    asignado_nombre: tarea.asignado_a ? profilesMap[tarea.asignado_a]?.full_name : null,
                  },
                  isCompleted: tarea.completado,
                }));

                // Get outputs that belong to THIS activity's descendants
                const outputs = itemsWithIndex
                  .filter((item) => item.tipo === "output" && activityDescendantIds.has(item.id))
                  .sort((a, b) => a._originalIndex - b._originalIndex);

                const outputNodes: TreeNode[] = outputs.map((output) => ({
                  id: output.id,
                  type: "output" as const,
                  label: output.titulo,
                  data: {
                    ...output,
                    contratoId: contrato.id,
                    workflowId: workflow?.id,
                    asignado_nombre: output.asignado_a ? profilesMap[output.asignado_a]?.full_name : null,
                  },
                  isCompleted: output.completado,
                }));

                // Get supervision items that belong to THIS activity's descendants
                const supervisionItems = itemsWithIndex
                  .filter((item) => item.tipo === "supervision" && activityDescendantIds.has(item.id))
                  .sort((a, b) => a._originalIndex - b._originalIndex);

                const supervisionNodes: TreeNode[] = supervisionItems.map((sup) => ({
                  id: sup.id,
                  type: "supervision_item" as const,
                  label: sup.titulo,
                  data: {
                    ...sup,
                    contratoId: contrato.id,
                    workflowId: workflow?.id,
                    asignado_nombre: sup.asignado_a ? profilesMap[sup.asignado_a]?.full_name : null,
                  },
                  isCompleted: sup.completado,
                }));

                // Build activity node with children
                const activityChildren: TreeNode[] = [];

                // Add Inputs folder
                if (inputNodes.length > 0) {
                  activityChildren.push(...inputNodes);
                }

                // Add Procesos folder
                if (tareaNodes.length > 0) {
                  activityChildren.push({
                    id: `procesos-${actividad.id}`,
                    type: "procesos" as const,
                    label: "Procesos",
                    children: tareaNodes,
                  });
                }

                // Add Outputs folder
                if (outputNodes.length > 0) {
                  activityChildren.push({
                    id: `outputs-${actividad.id}`,
                    type: "outputs" as const,
                    label: "Outputs",
                    badge: outputNodes.length,
                    children: outputNodes,
                  });
                }

                // Add Supervision folder
                if (supervisionNodes.length > 0) {
                  activityChildren.push({
                    id: `supervision-${actividad.id}`,
                    type: "supervision" as const,
                    label: "Supervisión",
                    badge: supervisionNodes.length,
                    children: supervisionNodes,
                  });
                }

                actividadNodes.push({
                  id: actividad.id,
                  type: "actividad" as const,
                  label: actividad.titulo,
                  data: {
                    ...actividad,
                    contratoId: contrato.id,
                    workflowId: workflow?.id, // Add workflowId for progress calculation
                    fecha_inicio: actividad.fecha_inicio,
                    fecha_termino: actividad.fecha_termino,
                  },
                  isCompleted: actividad.completado,
                  children: activityChildren.length > 0 ? activityChildren : undefined,
                });
              });
            }

            return {
              id: contrato.id,
              type: "contrato" as const,
              label: contrato.cliente.razon_social,
              data: {
                contrato_id: contrato.id,
                numero: contrato.numero,
                descripcion: contrato.descripcion,
                tipo_servicio: contrato.tipo_servicio,
                status: contrato.status,
                fecha_inicio: contrato.fecha_inicio,
                cliente: contrato.cliente.razon_social,
                cliente_codigo: contrato.cliente.codigo,
              },
              children: actividadNodes.length > 0 
                ? [
                    {
                      id: `actividades-${contrato.id}`,
                      type: "actividad" as const,
                      label: "Actividades",
                      children: actividadNodes,
                    }
                  ] 
                : undefined,
            };
          });

          return {
            id: `${cartera.id}-${monthKey}`,
            type: "mes" as const,
            label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
            data: { contractCount: monthContratos.length },
            children: contratoNodes.length > 0
              ? [
                  {
                    id: `contratos-${cartera.id}-${monthKey}`,
                    type: "contratos_folder" as const,
                    label: "Contratos",
                    badge: contratoNodes.length,
                    data: { 
                      contratos: monthContratos.map(c => ({
                        id: c.id,
                        numero: c.numero,
                        descripcion: c.descripcion,
                        tipo_servicio: c.tipo_servicio,
                        status: c.status,
                        fecha_inicio: c.fecha_inicio,
                        cliente: c.cliente.razon_social,
                        cliente_codigo: c.cliente.codigo,
                      }))
                    },
                    children: contratoNodes,
                  }
                ]
              : undefined,
          };
        });

      return {
        id: cartera.id,
        type: "espacio" as const,
        label: cartera.nombre,
        data: {
          especialidad: cartera.especialidad,
          miembros: cartera.miembros,
          stats: cartera.stats,
        },
        children: monthNodes.length > 0 ? monthNodes : undefined,
      };
    });
  }, [carteras, contratos, workflows, profilesMap]);

  return {
    loading,
    treeData,
    refresh: fetchData,
  };
}
