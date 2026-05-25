import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TreeNode } from "@/components/workflow/WorkFlowTreeSidebar";

interface CategoryProgress {
  total: number;
  completed: number;
  percentage: number;
}

interface ActivityProgressData {
  data: CategoryProgress;
  procesos: CategoryProgress;
  outputs: CategoryProgress;
  supervision: CategoryProgress;
  overall: CategoryProgress;
}

/**
 * Hook to calculate activity progress based on subnodes (Data, Procesos, Output, Supervisión).
 * Also fetches real progress from workflow_kanban_cards, workflow_notes, and workflow_checklists.
 */
export function useActivityProgress(
  activityNode: TreeNode | null,
  workflowId?: string
) {
  const [progress, setProgress] = useState<ActivityProgressData>({
    data: { total: 0, completed: 0, percentage: 0 },
    procesos: { total: 0, completed: 0, percentage: 0 },
    outputs: { total: 0, completed: 0, percentage: 0 },
    supervision: { total: 0, completed: 0, percentage: 0 },
    overall: { total: 0, completed: 0, percentage: 0 },
  });
  const [loading, setLoading] = useState(true);

  const calculateProgress = useCallback(async () => {
    if (!activityNode || !workflowId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Collect all subnodes by category
      const nodesByCategory: Record<string, TreeNode[]> = {
        input: [],
        tarea: [],
        output: [],
        supervision_item: [],
      };

      const collectNodes = (n: TreeNode) => {
        if (nodesByCategory[n.type]) {
          nodesByCategory[n.type].push(n);
        }
        if (n.children) {
          n.children.forEach(collectNodes);
        }
      };

      if (activityNode.children) {
        activityNode.children.forEach(collectNodes);
      }

      // Fetch workflow data for each category
      const [kanbanCards, notes, checklists] = await Promise.all([
        supabase
          .from("workflow_kanban_cards")
          .select("workflow_item_id, status")
          .eq("workflow_id", workflowId),
        supabase
          .from("workflow_notes")
          .select("workflow_item_id, content, tipo")
          .eq("workflow_id", workflowId),
        supabase
          .from("workflow_checklists")
          .select("workflow_item_id, items, porcentaje_completado")
          .eq("workflow_id", workflowId),
      ]);

      // Calculate progress for each category
      const calculateCategoryProgress = (
        nodes: TreeNode[],
        categoryType: string
      ): CategoryProgress => {
        let total = 0;
        let completed = 0;

        nodes.forEach((node) => {
          total++;
          let nodeProgress = node.data?.progreso || 0;

          // Check kanban cards for "tarea" type
          if (categoryType === "tarea") {
            const cards = kanbanCards.data?.filter(
              (c) => c.workflow_item_id === node.id
            );
            if (cards && cards.length > 0) {
              const completedCards = cards.filter(
                (c) => c.status === "completado"
              ).length;
              nodeProgress = (completedCards / cards.length) * 100;
            }
          }

          // Check notes/checklists for "input" and "output" types
          if (categoryType === "input" || categoryType === "output") {
            const nodeNotes = notes.data?.filter(
              (n) => n.workflow_item_id === node.id
            );
            const nodeChecklists = checklists.data?.filter(
              (c) => c.workflow_item_id === node.id
            );

            if (nodeNotes || nodeChecklists) {
              let itemsCount = 0;
              let completedItems = 0;

              // Count checklist items
              nodeChecklists?.forEach((cl) => {
                const items = Array.isArray(cl.items) ? cl.items : [];
                itemsCount += items.length;
                completedItems += items.filter(
                  (item: any) => item.completed
                ).length;
              });

              // Count notes with content
              nodeNotes?.forEach((note) => {
                if (note.content) {
                  itemsCount++;
                  const hasContent =
                    typeof note.content === "string"
                      ? note.content.trim().length > 0
                      : Object.keys(note.content as object).length > 0;
                  if (hasContent) completedItems++;
                }
              });

              if (itemsCount > 0) {
                nodeProgress = (completedItems / itemsCount) * 100;
              }
            }
          }

          // Check checklists for "supervision_item" type
          if (categoryType === "supervision_item") {
            const nodeChecklists = checklists.data?.filter(
              (c) => c.workflow_item_id === node.id
            );
            if (nodeChecklists && nodeChecklists.length > 0) {
              let totalItems = 0;
              let completedItems = 0;
              nodeChecklists.forEach((cl) => {
                const items = Array.isArray(cl.items) ? cl.items : [];
                totalItems += items.length;
                completedItems += items.filter(
                  (item: any) => item.completed
                ).length;
              });
              if (totalItems > 0) {
                nodeProgress = (completedItems / totalItems) * 100;
              }
            }
          }

          // Consider completed if progress >= 100
          if (nodeProgress >= 100 || node.isCompleted) {
            completed++;
          }
        });

        return {
          total,
          completed,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      };

      const dataProgress = calculateCategoryProgress(
        nodesByCategory.input,
        "input"
      );
      const procesosProgress = calculateCategoryProgress(
        nodesByCategory.tarea,
        "tarea"
      );
      const outputsProgress = calculateCategoryProgress(
        nodesByCategory.output,
        "output"
      );
      const supervisionProgress = calculateCategoryProgress(
        nodesByCategory.supervision_item,
        "supervision_item"
      );

      // Calculate overall progress
      const totalNodes =
        dataProgress.total +
        procesosProgress.total +
        outputsProgress.total +
        supervisionProgress.total;
      const completedNodes =
        dataProgress.completed +
        procesosProgress.completed +
        outputsProgress.completed +
        supervisionProgress.completed;

      setProgress({
        data: dataProgress,
        procesos: procesosProgress,
        outputs: outputsProgress,
        supervision: supervisionProgress,
        overall: {
          total: totalNodes,
          completed: completedNodes,
          percentage:
            totalNodes > 0
              ? Math.round((completedNodes / totalNodes) * 100)
              : 0,
        },
      });
    } catch (error) {
      console.error("Error calculating activity progress:", error);
    }

    setLoading(false);
  }, [activityNode, workflowId]);

  useEffect(() => {
    calculateProgress();
  }, [calculateProgress]);

  return { progress, loading, refresh: calculateProgress };
}

/**
 * Calculate activity progress from tree node without async fetching
 * (uses the progreso field already in the JSON)
 */
export function calculateActivityProgressFromNode(node: TreeNode): number {
  const categoryNodes: TreeNode[] = [];

  const collectCategoryNodes = (n: TreeNode) => {
    if (["input", "tarea", "output", "supervision_item"].includes(n.type)) {
      categoryNodes.push(n);
    }
    if (n.children) {
      n.children.forEach(collectCategoryNodes);
    }
  };

  if (node.children) {
    node.children.forEach(collectCategoryNodes);
  }

  if (categoryNodes.length === 0) return 0;

  // Calculate average progress from all category nodes
  const totalProgress = categoryNodes.reduce((sum, n) => {
    const nodeProgress = n.data?.progreso || 0;
    return sum + (n.isCompleted ? 100 : nodeProgress);
  }, 0);

  return Math.round(totalProgress / categoryNodes.length);
}
