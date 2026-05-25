import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeletePersonalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personName: string;
  hasUser: boolean;
  onConfirm: () => void;
  loading: boolean;
}

const DeletePersonalDialog = ({ 
  open, 
  onOpenChange, 
  personName, 
  hasUser,
  onConfirm, 
  loading 
}: DeletePersonalDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar personal?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar a <strong>{personName}</strong> del sistema.
            {hasUser && (
              <span className="block mt-2 text-amber-600">
                ⚠️ Este personal tiene una cuenta de usuario asociada. 
                Al eliminarlo, también se eliminará su acceso al sistema.
              </span>
            )}
            <span className="block mt-2">
              Esta acción no se puede deshacer.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeletePersonalDialog;
