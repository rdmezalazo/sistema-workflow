import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { useCanEditProgress } from "@/hooks/useCanEditProgress";
import { es } from "date-fns/locale";
import { 
  Activity, 
  Database, 
  ListTodo, 
  Package, 
  ShieldCheck,
  FileText,
  Calendar,
  Briefcase,
  ExternalLink,
  CheckCircle2,
  Circle,
  Clock,
  User,
  Eye,
  FolderOpen,
  Building2,
  Hash,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { TreeNode, NodeType } from "./WorkFlowTreeSidebar";
import { ContractDetailModal } from "@/components/contratos/ContractDetailModal";
import { EspacioDashboard } from "./EspacioDashboard";
import { MesDashboard } from "./MesDashboard";
import { ContratoDashboard } from "./ContratoDashboard";
import { ActividadesBacklog } from "./ActividadesBacklog";
import { ActividadDetailDashboard } from "./ActividadDetailDashboard";
import { WorkFlowBreadcrumb } from "./WorkFlowBreadcrumb";
import { DataNotionView } from "./views/DataNotionView";
import { KanbanBoard } from "./views/KanbanBoard";
import { SupervisionView } from "./views/SupervisionView";
import { ProcesosDashboard } from "./ProcesosDashboard";

interface WorkFlowContentPanelProps {
  selectedNode: TreeNode | null;
  treeData?: TreeNode[];
  onRefresh?: () => void;
  onNavigateNode?: (node: TreeNode) => void;
}

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const typeLabels: Record<NodeType, string> = {
  espacio: "Cartera",
  mes: "Período",
  contrato: "Contrato",
  contratos_folder: "Contratos",
  actividad: "Actividad",
  input: "Input",
  procesos: "Procesos",
  tarea: "Tarea",
  outputs: "Outputs",
  output: "Output",
  supervision: "Supervisión",
  supervision_item: "Verificación",
};

const statusStyles: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  aprobado: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  en_gestion: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  activo: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  finalizado: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
};

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  aprobado: "Aprobado",
  en_gestion: "En Gestión",
  activo: "Activo",
  finalizado: "Finalizado",
};

export function WorkFlowContentPanel({ selectedNode, treeData = [], onRefresh, onNavigateNode }: WorkFlowContentPanelProps) {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string | null }[]>([]);
  const { canEditAll, currentUserId } = useCanEditProgress();

  // Fetch workflow ID and profiles
  useEffect(() => {
    const fetchContext = async () => {
      // Find contrato ID from context
      const contratoId = findContratoId(selectedNode, treeData);
      if (contratoId) {
        const { data: workflow } = await supabase
          .from("workflows")
          .select("id")
          .eq("contrato_id", contratoId)
          .maybeSingle();
        setWorkflowId(workflow?.id || null);
      }

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name");
      setProfiles(profilesData || []);
    };
    fetchContext();
  }, [selectedNode]);

  // Helper to find contrato ID
  const findContratoId = (node: TreeNode | null, allNodes: TreeNode[]): string | null => {
    if (!node) return null;
    if (node.type === "contrato") return node.id;
    if (node.data?.contratoId) return node.data.contratoId;
    // Search up the tree
    const findParent = (nodes: TreeNode[], targetId: string, path: TreeNode[] = []): TreeNode[] | null => {
      for (const n of nodes) {
        if (n.id === targetId) return path;
        if (n.children) {
          const found = findParent(n.children, targetId, [...path, n]);
          if (found) return found;
        }
      }
      return null;
    };
    const parentPath = findParent(allNodes, node.id);
    if (parentPath) {
      const contrato = parentPath.find(p => p.type === "contrato");
      if (contrato) return contrato.id;
    }
    return null;
  };

  const handleViewDetail = (contractId: string) => {
    setSelectedContractId(contractId);
    setDetailModalOpen(true);
  };

  if (!selectedNode) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Briefcase className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">Selecciona un elemento</p>
        <p className="text-sm">Navega por el árbol para ver los detalles</p>
      </div>
    );
  }

  const renderNodeContent = () => {
    const data = selectedNode.data || {};
    
    switch (selectedNode.type) {
      case "espacio":
        return <EspacioDashboard node={selectedNode} allNodes={treeData} />;

      case "mes":
        return (
          <MesDashboard 
            node={selectedNode} 
            allNodes={treeData} 
            onViewContractDetail={handleViewDetail}
          />
        );

      case "contratos_folder":
        const contratos = data.contratos || [];
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Contratos del Período</h2>
                <p className="text-sm text-muted-foreground">
                  {contratos.length} contrato{contratos.length !== 1 ? "s" : ""} en este mes
                </p>
              </div>
            </div>

            {/* Stats Summary */}
            {contratos.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold">{contratos.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-amber-600">
                      {contratos.filter((c: any) => c.status === "en_gestion").length}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">En Gestión</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-green-600">
                      {contratos.filter((c: any) => c.status === "activo" || c.status === "aprobado").length}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Activos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-purple-600">
                      {contratos.filter((c: any) => c.status === "finalizado").length}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Finalizados</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Contracts List */}
            <div className="space-y-3">
              {contratos.map((contrato: any) => (
                <Card key={contrato.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      {/* Left color indicator */}
                      <div className={cn(
                        "w-1.5 flex-shrink-0",
                        contrato.status === "en_gestion" && "bg-amber-500",
                        contrato.status === "activo" && "bg-green-500",
                        contrato.status === "aprobado" && "bg-blue-500",
                        contrato.status === "finalizado" && "bg-purple-500",
                        contrato.status === "borrador" && "bg-gray-400",
                      )} />
                      
                      {/* Main content */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Client & Contract number */}
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <h3 className="font-semibold truncate">{contrato.cliente}</h3>
                            </div>
                            
                            {/* Contract number */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Hash className="h-3.5 w-3.5" />
                              <span>{contrato.numero}</span>
                              {contrato.cliente_codigo && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span>{contrato.cliente_codigo}</span>
                                </>
                              )}
                            </div>

                            {/* Description */}
                            {contrato.descripcion && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {contrato.descripcion}
                              </p>
                            )}

                            {/* Tags row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn("text-xs", statusStyles[contrato.status])}>
                                {statusLabels[contrato.status] || contrato.status}
                              </Badge>
                              {contrato.tipo_servicio && (
                                <Badge variant="outline" className="text-xs">
                                  {contrato.tipo_servicio}
                                </Badge>
                              )}
                              {contrato.fecha_inicio && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <CalendarDays className="h-3 w-3" />
                                  {format(parseISO(contrato.fecha_inicio), "dd MMM yyyy", { locale: es })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action button */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1.5 flex-shrink-0"
                            onClick={() => handleViewDetail(contrato.id)}
                          >
                            <Eye className="h-4 w-4" />
                            Ver Detalle
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {contratos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay contratos en este período</p>
              </div>
            )}
          </div>
        );

      case "contrato":
        return (
          <ContratoDashboard 
            node={selectedNode} 
            onViewDetail={handleViewDetail}
          />
        );

      case "actividad":
        // Check if this is an activities folder or a single activity
        const isActivitiesFolder = selectedNode.label.toLowerCase().includes("actividades");
        const hasChildActivities = selectedNode.children?.some(c => c.type === "actividad");

        if (isActivitiesFolder && hasChildActivities) {
          // Activities folder - show backlog of all activities
          return <ActividadesBacklog node={selectedNode} allNodes={treeData} onRefresh={onRefresh} />;
        }

        // Single activity - show detailed dashboard with steps table
        return <ActividadDetailDashboard node={selectedNode} onRefresh={onRefresh} />;

      case "input":
        return (
          <DataNotionView 
            node={selectedNode} 
            workflowId={workflowId || undefined}
            onRefresh={onRefresh}
            canEditAll={canEditAll}
            currentUserId={currentUserId}
          />
        );

      case "procesos":
        return (
          <ProcesosDashboard
            node={selectedNode}
            workflowId={workflowId || undefined}
            profiles={profiles}
            onNavigateToTask={(taskNode) => onNavigateNode?.(taskNode)}
          />
        );

      case "tarea":
        return (
          <KanbanBoard
            node={selectedNode}
            workflowId={workflowId || undefined}
            profiles={profiles}
            onRefresh={onRefresh}
            canEditAll={canEditAll}
            currentUserId={currentUserId}
          />
        );

      case "output":
        return (
          <DataNotionView 
            node={selectedNode} 
            workflowId={workflowId || undefined}
            onRefresh={onRefresh}
            canEditAll={canEditAll}
            currentUserId={currentUserId}
          />
        );

      case "supervision":
      case "supervision_item":
        return (
          <SupervisionView
            node={selectedNode}
            workflowId={workflowId || undefined}
            profiles={profiles}
            onRefresh={onRefresh}
            canEditAll={canEditAll}
            currentUserId={currentUserId}
          />
        );

      default:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{selectedNode.label}</h2>
            <Badge variant="outline">{typeLabels[selectedNode.type]}</Badge>
          </div>
        );
    }
  };

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Dynamic Breadcrumb Navigation */}
        <WorkFlowBreadcrumb 
          selectedNode={selectedNode} 
          treeData={treeData} 
          onNavigate={(node) => onNavigateNode?.(node)} 
        />

        <ScrollArea className="flex-1">
          <div className="p-3">
            {renderNodeContent()}
          </div>
        </ScrollArea>
      </div>

      {/* Contract Detail Modal */}
      <ContractDetailModal
        contractId={selectedContractId}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </>
  );
}
