import { useState, useEffect, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Briefcase,
  Calendar,
  FileText,
  Activity,
  Database,
  ListTodo,
  Package,
  ShieldCheck,
  Plus,
  MoreHorizontal,
  FolderOpen,
  Check,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Tree node types
export type NodeType = 
  | "espacio" 
  | "mes" 
  | "contrato" 
  | "contratos_folder"
  | "actividad" 
  | "input" 
  | "procesos" 
  | "tarea" 
  | "outputs" 
  | "output" 
  | "supervision" 
  | "supervision_item";

export interface TreeNode {
  id: string;
  type: NodeType;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  data?: any;
  badge?: number;
  isCompleted?: boolean;
}

interface WorkFlowTreeSidebarProps {
  treeData: TreeNode[];
  selectedNode: TreeNode | null;
  onSelectNode: (node: TreeNode) => void;
  loading?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const nodeIcons: Record<NodeType, React.ElementType> = {
  espacio: Briefcase,
  mes: Calendar,
  contrato: FileText,
  contratos_folder: FolderOpen,
  actividad: Activity,
  input: Database,
  procesos: FolderOpen,
  tarea: ListTodo,
  outputs: FolderOpen,
  output: Package,
  supervision: ShieldCheck,
  supervision_item: Check,
};

const nodeColors: Record<NodeType, string> = {
  espacio: "text-violet-600 dark:text-violet-400",
  mes: "text-blue-600 dark:text-blue-400",
  contrato: "text-amber-600 dark:text-amber-400",
  contratos_folder: "text-amber-500 dark:text-amber-400",
  actividad: "text-green-600 dark:text-green-400",
  input: "text-emerald-600 dark:text-emerald-400",
  procesos: "text-amber-500 dark:text-amber-400",
  tarea: "text-orange-600 dark:text-orange-400",
  outputs: "text-purple-500 dark:text-purple-400",
  output: "text-purple-600 dark:text-purple-400",
  supervision: "text-red-600 dark:text-red-400",
  supervision_item: "text-red-500 dark:text-red-400",
};

interface TreeItemProps {
  node: TreeNode;
  level: number;
  selectedNode: TreeNode | null;
  onSelectNode: (node: TreeNode) => void;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
  isCollapsed?: boolean;
}

const TreeItem = ({
  node,
  level,
  selectedNode,
  onSelectNode,
  expandedNodes,
  toggleExpand,
  isCollapsed,
}: TreeItemProps) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  const Icon = nodeIcons[node.type] || FileText;

  // Collapsed view - only show top-level items with tooltips
  if (isCollapsed && level === 0) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-center p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
              isSelected && "bg-primary/10 text-primary"
            )}
            onClick={() => onSelectNode(node)}
          >
            <Icon className={cn("h-4 w-4", nodeColors[node.type])} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {node.label}
          {node.badge !== undefined && node.badge > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1 text-[10px]">
              {node.badge}
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isCollapsed) return null;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center py-1 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors group",
          isSelected && "bg-primary/10 text-primary",
          node.isCompleted && "opacity-60"
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={() => onSelectNode(node)}
      >
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
            className="p-0.5 rounded hover:bg-muted"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        <Icon className={cn("h-4 w-4 flex-shrink-0 ml-1", nodeColors[node.type])} />

        {/* Label */}
        <span className={cn(
          "text-sm truncate flex-1 ml-1",
          isSelected ? "font-medium" : "text-foreground"
        )}>
          {node.label}
        </span>

        {/* Badge */}
        {node.badge !== undefined && node.badge > 0 && (
          <Badge variant="secondary" className="h-5 min-w-[20px] px-1 text-[10px]">
            {node.badge}
          </Badge>
        )}

        {/* More actions button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>

        {/* Add button for certain node types */}
        {(node.type === "mes" || node.type === "actividad" || node.type === "procesos" || node.type === "outputs") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedNode={selectedNode}
              onSelectNode={onSelectNode}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function WorkFlowTreeSidebar({
  treeData,
  selectedNode,
  onSelectNode,
  loading,
  isCollapsed = false,
  onToggleCollapse,
}: WorkFlowTreeSidebarProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Auto-expand first level on mount
  useEffect(() => {
    if (treeData.length > 0 && expandedNodes.size === 0) {
      const initialExpanded = new Set<string>();
      treeData.forEach((node) => initialExpanded.add(node.id));
      setExpandedNodes(initialExpanded);
    }
  }, [treeData]);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-r border-border transition-all duration-300 relative",
      isCollapsed ? "w-12" : "w-full"
    )}>
      {/* Collapse Toggle - Positioned inside sidebar */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-2 right-1 z-10 p-1 rounded-md bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Header */}
      <div className={cn(
        "flex items-center border-b border-border",
        isCollapsed ? "justify-center px-1 py-2" : "justify-between px-3 py-2"
      )}>
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="p-1">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Espacios</TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Espacios</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Tree view */}
      <ScrollArea className="flex-1">
        <div className={cn("py-2", isCollapsed && "px-1")}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : treeData.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              {!isCollapsed && "No hay datos disponibles"}
            </div>
          ) : (
            treeData.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                level={0}
                selectedNode={selectedNode}
                onSelectNode={onSelectNode}
                expandedNodes={expandedNodes}
                toggleExpand={toggleExpand}
                isCollapsed={isCollapsed}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer with "All Carteras" option */}
      <div className={cn("border-t border-border", isCollapsed ? "p-1" : "p-2")}>
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-center p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                  !selectedNode && "bg-primary/10"
                )}
                onClick={() => onSelectNode({ id: "all", type: "espacio", label: "Todas las Carteras" })}
              >
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Todas las Carteras</TooltipContent>
          </Tooltip>
        ) : (
          <div
            className={cn(
              "flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
              !selectedNode && "bg-primary/10"
            )}
            onClick={() => onSelectNode({ id: "all", type: "espacio", label: "Todas las Carteras" })}
          >
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Todas las Carteras</span>
          </div>
        )}
      </div>
    </div>
  );
}
