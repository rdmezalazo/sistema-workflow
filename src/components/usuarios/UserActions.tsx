import { useState } from 'react';
import { MoreHorizontal, Pencil, Key, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserActionsProps {
  userId: string;
  userName: string;
  onEdit: () => void;
  onChangePassword: () => void;
  onDelete: () => void;
}

const UserActions = ({ userId, userName, onEdit, onChangePassword, onDelete }: UserActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acciones para {userName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
          <Pencil className="h-4 w-4 mr-2" />
          Editar usuario
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onChangePassword} className="cursor-pointer">
          <Key className="h-4 w-4 mr-2" />
          Cambiar contraseña
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onDelete} 
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar usuario
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserActions;
