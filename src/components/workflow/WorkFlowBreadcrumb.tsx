import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeNode } from "./WorkFlowTreeSidebar";

interface WorkFlowBreadcrumbProps {
  selectedNode: TreeNode | null;
  treeData: TreeNode[];
  onNavigate: (node: TreeNode) => void;
}

/**
 * Recursively finds the path from root to the target node
 */
function findNodePath(nodes: TreeNode[], targetId: string, currentPath: TreeNode[] = []): TreeNode[] | null {
  for (const node of nodes) {
    const newPath = [...currentPath, node];
    
    if (node.id === targetId) {
      return newPath;
    }
    
    if (node.children && node.children.length > 0) {
      const found = findNodePath(node.children, targetId, newPath);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export function WorkFlowBreadcrumb({ selectedNode, treeData, onNavigate }: WorkFlowBreadcrumbProps) {
  // Build the path from root to selected node
  const path = selectedNode ? findNodePath(treeData, selectedNode.id) || [] : [];
  
  if (path.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border min-h-[40px]">
        <Home className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Selecciona un elemento del árbol</span>
      </div>
    );
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className="flex items-center gap-1 px-4 py-2 bg-muted/30 border-b border-border min-h-[40px] overflow-x-auto"
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {path.map((node, index) => {
          const isLast = index === path.length - 1;
          
          return (
            <li key={node.id} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
              
              {isLast ? (
                // Current page - not clickable
                <span 
                  className="text-sm font-medium text-foreground px-2 py-0.5 rounded bg-background border border-border shadow-sm"
                >
                  {node.label}
                </span>
              ) : (
                // Clickable ancestor
                <button
                  onClick={() => onNavigate(node)}
                  className={cn(
                    "text-sm text-muted-foreground hover:text-primary hover:underline",
                    "px-1.5 py-0.5 rounded transition-colors",
                    "hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  )}
                >
                  {node.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
