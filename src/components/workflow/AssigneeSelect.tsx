import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string | null;
}

interface AssigneeSelectProps {
  taskId: string;
  contratoId?: string;
  currentAssigneeId?: string;
  currentAssigneeName?: string;
  profiles: Profile[];
  onRefresh?: () => void;
}

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export function AssigneeSelect({
  taskId,
  contratoId,
  currentAssigneeId,
  currentAssigneeName,
  profiles,
  onRefresh,
}: AssigneeSelectProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Local state for optimistic updates
  const [localAssigneeId, setLocalAssigneeId] = useState<string | null | undefined>(currentAssigneeId);
  const [localAssigneeName, setLocalAssigneeName] = useState<string | null | undefined>(currentAssigneeName);

  // Sync with props when they change
  useEffect(() => {
    setLocalAssigneeId(currentAssigneeId);
    setLocalAssigneeName(currentAssigneeName);
  }, [currentAssigneeId, currentAssigneeName]);

  const handleAssign = async (profileId: string | null, profileName: string | null) => {
    if (!contratoId) {
      toast.error("No se puede actualizar: falta el ID del contrato");
      return;
    }

    setSaving(true);
    
    // Optimistic update
    setLocalAssigneeId(profileId ?? undefined);
    setLocalAssigneeName(profileName ?? undefined);
    setOpen(false);

    try {
      // Fetch the current workflow
      const { data: workflow, error: wfError } = await supabase
        .from("workflows")
        .select("id, items")
        .eq("contrato_id", contratoId)
        .maybeSingle();

      if (wfError) throw wfError;

      if (!workflow) {
        toast.error("No se encontró el workflow");
        // Revert optimistic update
        setLocalAssigneeId(currentAssigneeId);
        setLocalAssigneeName(currentAssigneeName);
        setSaving(false);
        return;
      }

      const items = (workflow.items as any[]) || [];

      // Recursively update the specific item (handles nested children)
      const updateItemRecursive = (itemsArray: any[]): any[] => {
        return itemsArray.map((item: any) => {
          if (item.id === taskId) {
            return { 
              ...item, 
              asignado_a: profileId,
              asignado_nombre: profileName,
            };
          }
          // Check children recursively
          if (item.children && Array.isArray(item.children)) {
            return {
              ...item,
              children: updateItemRecursive(item.children),
            };
          }
          return item;
        });
      };

      const updatedItems = updateItemRecursive(items);

      // Save to database
      const { error: updateError } = await supabase
        .from("workflows")
        .update({ items: updatedItems, updated_at: new Date().toISOString() })
        .eq("id", workflow.id);

      if (updateError) throw updateError;

      toast.success(profileId ? "Responsable asignado" : "Responsable removido");

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error updating assignee:", error);
      toast.error("Error al guardar los cambios");
      // Revert optimistic update on error
      setLocalAssigneeId(currentAssigneeId);
      setLocalAssigneeName(currentAssigneeName);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto py-1 px-2 justify-start font-normal gap-2",
            !localAssigneeName && "text-muted-foreground"
          )}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : localAssigneeName ? (
            <>
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                  {getInitials(localAssigneeName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[120px]">{localAssigneeName}</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              <span>Sin asignar</span>
            </>
          )}
          <ChevronsUpDown className="h-3 w-3 ml-auto opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar persona..." />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {/* Option to remove assignee */}
              <CommandItem
                value="sin-asignar"
                onSelect={() => handleAssign(null, null)}
                className="gap-2"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Sin asignar</span>
                {!localAssigneeId && (
                  <Check className="h-4 w-4 ml-auto" />
                )}
              </CommandItem>
              {/* Profile list */}
              {profiles.map((profile) => (
                <CommandItem
                  key={profile.id}
                  value={profile.full_name || profile.id}
                  onSelect={() => handleAssign(profile.id, profile.full_name)}
                  className="gap-2"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{profile.full_name || "Sin nombre"}</span>
                  {localAssigneeId === profile.id && (
                    <Check className="h-4 w-4 ml-auto" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
