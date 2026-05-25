import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';
import { useRolePermisos } from '@/hooks/useRolePermisos';
import { useSedes } from '@/hooks/useSedes';
import { supabase } from '@/integrations/supabase/client';

type AppRole = Database['public']['Enums']['app_role'];

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  sede_id?: string | null;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSave: (userId: string, data: { full_name: string; role: AppRole; sede_id: string | null; sede_ids: string[] }) => Promise<void>;
  loading: boolean;
}

const EditUserDialog = ({ open, onOpenChange, user, onSave, loading }: EditUserDialogProps) => {
  const { roles: availableRoles } = useRolePermisos();
  const { sedes } = useSedes();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('asesor');
  const [sedeId, setSedeId] = useState<string>(''); // primary sede
  const [sedeIds, setSedeIds] = useState<string[]>([]); // all assigned sedes

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setRole(user.role);
      setSedeId(user.sede_id || '');
      // Load assigned sedes
      (async () => {
        const { data } = await supabase
          .from('user_sedes' as any)
          .select('sede_id')
          .eq('user_id', user.id);
        const ids = (data as any[] | null)?.map((r) => r.sede_id) || [];
        // Ensure the primary sede is included
        if (user.sede_id && !ids.includes(user.sede_id)) ids.push(user.sede_id);
        setSedeIds(ids);
      })();
    }
  }, [user]);

  const toggleSede = (id: string, checked: boolean) => {
    setSedeIds((prev) => {
      const next = checked ? Array.from(new Set([...prev, id])) : prev.filter((s) => s !== id);
      // If primary sede is removed, pick the first remaining as primary
      if (!checked && sedeId === id) {
        setSedeId(next[0] || '');
      }
      // If only one selected, make it primary
      if (checked && !sedeId) setSedeId(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const primary = sedeId || sedeIds[0] || null;
      await onSave(user.id, {
        full_name: fullName,
        role,
        sede_id: primary,
        sede_ids: Array.from(new Set([...sedeIds, ...(primary ? [primary] : [])])),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre del usuario"
              className="input-focus"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
              <SelectTrigger className="input-focus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.filter(r => r.activo).map((r) => (
                  <SelectItem key={r.role} value={r.role}>
                    {r.nombre_display}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sedes asignadas</Label>
            <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
              {sedes.filter(s => s.activa).map((s) => {
                const checked = sedeIds.includes(s.id);
                const isPrimary = sedeId === s.id;
                return (
                  <div key={s.id} className="flex items-center gap-2 p-2.5 hover:bg-muted/50">
                    <Checkbox
                      id={`sede-${s.id}`}
                      checked={checked}
                      onCheckedChange={(v) => toggleSede(s.id, !!v)}
                    />
                    <label htmlFor={`sede-${s.id}`} className="flex items-center gap-2 flex-1 cursor-pointer text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{s.nombre}</span>
                      <span className="text-xs text-muted-foreground">({s.codigo})</span>
                      {isPrimary && checked && (
                        <Badge variant="secondary" className="ml-auto text-[10px] h-5">Principal</Badge>
                      )}
                    </label>
                    {checked && !isPrimary && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px]"
                        onClick={() => setSedeId(s.id)}
                      >
                        Hacer principal
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Selecciona una o más sedes. La sede principal es la activa por defecto al iniciar sesión.
              Si tiene varias, podrá cambiar desde el selector en la esquina superior derecha.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-gradient" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
