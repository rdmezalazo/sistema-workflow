import { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSedes, Sede } from '@/hooks/useSedes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SedesManager = () => {
  const { sedes, loading, refetch } = useSedes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Sede | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '', codigo: '', direccion: '', telefono: '', activa: true, orden: 0,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', codigo: '', direccion: '', telefono: '', activa: true, orden: sedes.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (s: Sede) => {
    setEditing(s);
    setForm({
      nombre: s.nombre, codigo: s.codigo,
      direccion: s.direccion || '', telefono: s.telefono || '',
      activa: s.activa, orden: s.orden,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.codigo.trim()) {
      toast.error('Nombre y código son obligatorios');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('sedes' as any).update({
          nombre: form.nombre.trim(),
          codigo: form.codigo.trim().toUpperCase(),
          direccion: form.direccion.trim() || null,
          telefono: form.telefono.trim() || null,
          activa: form.activa,
          orden: form.orden,
        }).eq('id', editing.id);
        if (error) throw error;
        toast.success('Sede actualizada');
      } else {
        const { error } = await supabase.from('sedes' as any).insert({
          nombre: form.nombre.trim(),
          codigo: form.codigo.trim().toUpperCase(),
          direccion: form.direccion.trim() || null,
          telefono: form.telefono.trim() || null,
          activa: form.activa,
          orden: form.orden,
        });
        if (error) throw error;
        toast.success('Sede creada');
      }
      setDialogOpen(false);
      refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message?.includes('duplicate') ? 'Ya existe una sede con ese nombre o código' : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      const { error } = await supabase.from('sedes' as any).delete().eq('id', editing.id);
      if (error) throw error;
      toast.success('Sede eliminada');
      setDeleteOpen(false);
      refetch();
    } catch (e: any) {
      toast.error('No se puede eliminar: hay registros asociados a esta sede');
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Gestión de Sedes
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configura las sedes físicas del estudio. Los datos se aíslan por sede para los usuarios no administradores.
          </p>
        </div>
        <Button onClick={openCreate} className="btn-gradient gap-2">
          <Plus className="h-4 w-4" /> Nueva Sede
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {sedes.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">{s.codigo}</Badge>
                <div>
                  <p className="font-medium">{s.nombre}</p>
                  {s.direccion && <p className="text-xs text-muted-foreground">{s.direccion}</p>}
                </div>
                {!s.activa && <Badge variant="secondary">Inactiva</Badge>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setDeleteOpen(true); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Sede' : 'Nueva Sede'}</DialogTitle>
            <DialogDescription>Completa los datos de la sede</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Arequipa" />
              </div>
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder="AQP" maxLength={10} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Orden</Label>
                <Input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Sede activa</p>
                <p className="text-xs text-muted-foreground">Disponible para asignar a usuarios y datos</p>
              </div>
              <Switch checked={form.activa} onCheckedChange={(v) => setForm({ ...form, activa: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="btn-gradient">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sede?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Solo se podrá eliminar si no hay datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
