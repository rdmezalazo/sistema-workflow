import { useState, useRef, useCallback } from "react";
import { WorkFlowTreeSidebar, TreeNode } from "@/components/workflow/WorkFlowTreeSidebar";
import { WorkFlowContentPanel } from "@/components/workflow/WorkFlowContentPanel";
import { WorkflowToolbar } from "@/components/workflow/WorkflowToolbar";
import { useWorkFlowTree } from "@/hooks/useWorkFlowTree";
import { Button } from "@/components/ui/button";
import { RefreshCw, Workflow, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_SIDEBAR_WIDTH = 48;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 240;

const CalendarioTrabajo = () => {
  const { loading, treeData, refresh } = useWorkFlowTree();
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isSidebarCollapsed) return;
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const deltaX = e.clientX - startX.current;
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidth.current + deltaX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isSidebarCollapsed, sidebarWidth]);

  const handleToggleCollapse = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
    if (isSidebarCollapsed) {
      setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    }
  }, [isSidebarCollapsed]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Page Header - Compact */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Workflow className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">WorkFlow</h1>
            <p className="text-xs text-muted-foreground">
              Gestiona los flujos de trabajo por cartera
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-2 h-8">
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </Button>
      </div>

      {/* Workflow Toolbar */}
      <WorkflowToolbar onRefresh={refresh} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with Resizable Handle */}
        <div 
          className="flex-shrink-0 overflow-hidden relative"
          style={{ width: isSidebarCollapsed ? MIN_SIDEBAR_WIDTH : sidebarWidth }}
        >
          <WorkFlowTreeSidebar
            treeData={treeData}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            loading={loading}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </div>

        {/* Resize Handle */}
        {!isSidebarCollapsed && (
          <div
            className="w-1 flex-shrink-0 bg-border hover:bg-primary/50 cursor-col-resize transition-colors group relative flex items-center justify-center"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
            <div className="z-20 flex h-8 w-4 items-center justify-center rounded-sm border bg-border opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Content Panel */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          <WorkFlowContentPanel 
            selectedNode={selectedNode} 
            treeData={treeData} 
            onRefresh={refresh}
            onNavigateNode={setSelectedNode}
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarioTrabajo;
