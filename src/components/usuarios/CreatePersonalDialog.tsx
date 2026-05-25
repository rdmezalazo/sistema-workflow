import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreatePersonalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { dni: string; full_name: string; puesto: string; email: string; phone: string; asignar_supervision: boolean }) => void;
  loading: boolean;
}

const CreatePersonalDialog = ({ open, onOpenChange, onCreate, loading }: CreatePersonalDialogProps) => {
  const [dni, setDni] = useState('');
  const [fullName, setFullName] = useState('');
  const [puesto, setPuesto] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [asignarSupervision, setAsignarSupervision] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (!email.trim()) {
      setError('El email es requerido');
      return;
    }

    onCreate({ dni, full_name: fullName, puesto, email, phone, asignar_supervision: asignarSupervision });
  };

  const handleClose = () => {
    setDni('');
    setFullName('');
    setPuesto('');
    setEmail('');
    setPhone('');
    setAsignarSupervision(false);
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Personal</DialogTitle>
          <DialogDescription>
            Registra un nuevo miembro del personal (sin cuenta de usuario)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input
              id="dni"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="12345678"
              maxLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre Completo *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="puesto">Puesto</Label>
            <Input
              id="puesto"
              value={puesto}
              onChange={(e) => setPuesto(e.target.value)}
              placeholder="Contador, Asistente, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+51 999 999 999"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="asignar_supervision">Asignar Supervisión</Label>
              <p className="text-xs text-muted-foreground">
                Permite asignar a esta persona como supervisor en workflows
              </p>
            </div>
            <Switch
              id="asignar_supervision"
              checked={asignarSupervision}
              onCheckedChange={setAsignarSupervision}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Personal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePersonalDialog;
