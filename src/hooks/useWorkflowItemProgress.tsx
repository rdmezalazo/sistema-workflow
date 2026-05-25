import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook to sync workflow item progress to the workflow JSON.
 * When an item's progress changes (Data, Kanban, Supervision), 
 * this updates the `progreso` field in the workflow items JSON
 * so the Gantt chart displays the updated value.
 */
export function useWorkflowItemProgress(
  workflowId: string | undefined,
  itemId: string,
  onRefresh?: () => void
) {
  const lastUpdatedProgress = useRef<number | null>(null);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncProgress = useCallback(async (progress: number) => {
    if (!workflowId) return;
    
    // Round to integer
    const roundedProgress = Math.round(progress);
    
    // Skip if same as last update
    if (lastUpdatedProgress.current === roundedProgress) return;
    
    // Debounce updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(async () => {
      try {
        // Fetch current workflow
        const { data: workflow, error: fetchError } = await supabase
          .from("workflows")
          .select("id, items")
          .eq("id", workflowId)
          .single();

        if (fetchError || !workflow) {
          console.error("Error fetching workflow:", fetchError);
          return;
        }

        // Parse items
        const items = Array.isArray(workflow.items) ? workflow.items : [];
        
        // Find and update the item
        const updateItemProgress = (itemsArray: any[]): boolean => {
          for (let i = 0; i < itemsArray.length; i++) {
            const item = itemsArray[i];
            if (item.id === itemId) {
              // Update the progreso field
              itemsArray[i] = {
                ...item,
                progreso: roundedProgress,
                completado: roundedProgress >= 100,
              };
              return true;
            }
            // Check children recursively
            if (item.children && Array.isArray(item.children)) {
              if (updateItemProgress(item.children)) return true;
            }
          }
          return false;
        };

        const updated = updateItemProgress(items);
        
        if (updated) {
          // Save back to database
          const { error: updateError } = await supabase
            .from("workflows")
            .update({
              items: items,
              updated_at: new Date().toISOString(),
            })
            .eq("id", workflowId);

          if (updateError) {
            console.error("Error updating workflow progress:", updateError);
            return;
          }

          lastUpdatedProgress.current = roundedProgress;
          
          // Trigger refresh so Gantt updates
          onRefresh?.();
        }
      } catch (error) {
        console.error("Error syncing progress:", error);
      }
    }, 500); // 500ms debounce
  }, [workflowId, itemId, onRefresh]);

  return { syncProgress };
}
