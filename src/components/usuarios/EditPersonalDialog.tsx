import { useState, useEffect } from 'react';
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
import { PersonalProfile } from './PersonalTable';

interface EditPersonalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: PersonalProfile | null;
  onSave: (id: string, data: { dni: string; full_name: string; puesto: string; email: string; phone: string; asignar_supervision: boolean }) => void;
  loading: boolean;
}

const EditPersonalDialog = ({ open, onOpenChange, person, onSave, loading }: EditPersonalDialogProps) => {
  const [dni, setDni] = useState('');
  const [fullName, setFullName] = useState('');
  const [puesto, setPuesto] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [asignarSupervision, setAsignarSupervision] = useState(false);

  useEffect(() => {
    if (person) {
      setDni(person.dni || '');
      setFullName(person.full_name || '');
      setPuesto(person.puesto || '');
      setEmail(person.email || '');
      setPhone(person.phone || '');
      setAsignarSupervision(person.asignar_supervision || false);
    }
  }, [person]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (person) {
      onSave(person.id, { dni, full_name: fullName, puesto, email, phone, asignar_supervision: asignarSupervision });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Personal</DialogTitle>
          <DialogDescription>
            Actualiza la información del personal
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
            />
          </div>
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
            <Label htmlFor="fullName">Nombre Completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
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
              <Label htmlFor="asignar_supervision_edit">Asignar Supervisión</Label>
              <p className="text-xs text-muted-foreground">
                Permite asignar a esta persona como supervisor en workflows
              </p>
            </div>
            <Switch
              id="asignar_supervision_edit"
              checked={asignarSupervision}
              onCheckedChange={setAsignarSupervision}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPersonalDialog;
