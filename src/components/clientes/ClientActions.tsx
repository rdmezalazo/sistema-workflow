import { MoreHorizontal, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientActionsProps {
  clientName: string;
  isActive: boolean;
  onToggleStatus: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ClientActions({
  clientName,
  isActive,
  onToggleStatus,
  onEdit,
  onDelete,
}: ClientActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acciones para {clientName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onToggleStatus} className="cursor-pointer">
          {isActive ? (
            <>
              <ToggleLeft className="h-4 w-4 mr-2" />
              Suspender
            </>
          ) : (
            <>
              <ToggleRight className="h-4 w-4 mr-2" />
              Activar
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
