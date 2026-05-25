import { useState } from 'react';
import { Shield, Edit2, Loader2, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRolePermisos, RolePermiso, PermisosPorModulo } from '@/hooks/useRolePermisos';
import { Database } from '@/integrations/supabase/types';
import { MoreHorizontal } from 'lucide-react';

type AppRole = Database['public']['Enums']['app_role'];

const moduloLabels: Record<string, string> = {
  clientes: 'Clientes',
  contratos: 'Contratos',
  proformas: 'Proformas',
  usuarios: 'Usuarios',
  configuracion: 'Configuración',
  reportes: 'Reportes',
};

const permisoLabels: Record<string, string> = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  exportar: 'Exportar',
};

const roleDisplayNames: Record<string, string> = {
  administrador: 'Administrador',
  gerente: 'Gerente',
  asesor: 'Asesor',
  auxiliar: 'Auxiliar',
  practicante: 'Practicante',
  supervisor: 'Supervisor',
  contador: 'Contador',
  asistente: 'Asistente',
};

export const RolesManager = () => {
  const { 
    roles, 
    loading, 
    createRole, 
    deleteRole, 
    updateRolePermisos, 
    updateRoleInfo, 
    toggleRoleActivo,
    getUnconfiguredRoles 
  } = useRolePermisos();
  
  const [editingRole, setEditingRole] = useState<RolePermiso | null>(null);
  const [editingPermisos, setEditingPermisos] = useState<PermisosPorModulo | null>(null);
  const [editInfoDialogOpen, setEditInfoDialogOpen] = useState(false);
  const [editPermisosDialogOpen, setEditPermisosDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RolePermiso | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Edit info form
  const [nombreDisplay, setNombreDisplay] = useState('');
  const [descripcion, setDescripcion] = useState('');
  
  // Create form
  const [newRoleKey, setNewRoleKey] = useState<AppRole | ''>('');
  const [newNombreDisplay, setNewNombreDisplay] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');

  const unconfiguredRoles = getUnconfiguredRoles();

  const handleEditInfo = (role: RolePermiso) => {
    setEditingRole(role);
    setNombreDisplay(role.nombre_display);
    setDescripcion(role.descripcion || '');
    setEditInfoDialogOpen(true);
  };

  const handleEditPermisos = (role: RolePermiso) => {
    setEditingRole(role);
    setEditingPermisos(JSON.parse(JSON.stringify(role.permisos)));
    setEditPermisosDialogOpen(true);
  };

  const handleSaveInfo = async () => {
    if (!editingRole) return;
    setSaving(true);
    await updateRoleInfo(editingRole.id, { nombre_display: nombreDisplay, descripcion });
    setSaving(false);
    setEditInfoDialogOpen(false);
  };

  const handleSavePermisos = async () => {
    if (!editingRole || !editingPermisos) return;
    setSaving(true);
    await updateRolePermisos(editingRole.id, editingPermisos);
    setSaving(false);
    setEditPermisosDialogOpen(false);
  };

  const handleCreateRole = async () => {
    if (!newRoleKey || !newNombreDisplay) return;
    setSaving(true);
    await createRole(newRoleKey, newNombreDisplay, newDescripcion);
    setSaving(false);
    setCreateDialogOpen(false);
    setNewRoleKey('');
    setNewNombreDisplay('');
    setNewDescripcion('');
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    setSaving(true);
    await deleteRole(roleToDelete.id);
    setSaving(false);
    setDeleteDialogOpen(false);
    setRoleToDelete(null);
  };

  const togglePermiso = (modulo: string, permiso: string, value: boolean) => {
    if (!editingPermisos) return;
    
    setEditingPermisos(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      (updated as any)[modulo] = { ...(updated as any)[modulo], [permiso]: value };
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Roles de Usuario</h3>
          <p className="text-sm text-muted-foreground">Gestiona los roles y permisos del sistema</p>
        </div>
        <Button 
          className="btn-gradient gap-2" 
          onClick={() => setCreateDialogOpen(true)}
          disabled={unconfiguredRoles.length === 0}
        >
          <Plus className="h-4 w-4" />
          Nuevo Rol
        </Button>
      </div>

      <div className="space-y-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
              role.activo 
                ? 'border-border hover:bg-muted/30' 
                : 'border-border/50 bg-muted/20 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${role.activo ? 'bg-primary/10' : 'bg-muted'}`}>
                <Shield className={`h-4 w-4 ${role.activo ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{role.nombre_display}</p>
                  <Badge variant="outline" className="text-xs">
                    {role.role}
                  </Badge>
                  {!role.activo && (
                    <Badge variant="secondary" className="text-xs">
                      Deshabilitado
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{role.descripcion || 'Sin descripción'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEditPermisos(role)}>
                <Shield className="h-3 w-3 mr-1" />
                Permisos
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditInfo(role)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar info
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleRoleActivo(role.id, !role.activo)}>
                    {role.activo ? (
                      <>
                        <ToggleLeft className="h-4 w-4 mr-2" />
                        Deshabilitar
                      </>
                    ) : (
                      <>
                        <ToggleRight className="h-4 w-4 mr-2" />
                        Habilitar
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      setRoleToDelete(role);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {roles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay roles configurados
          </div>
        )}
      </div>

      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Rol</DialogTitle>
            <DialogDescription>Agrega un nuevo rol al sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Rol</Label>
              <Select value={newRoleKey} onValueChange={(value) => {
                setNewRoleKey(value as AppRole);
                setNewNombreDisplay(roleDisplayNames[value] || value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {unconfiguredRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleDisplayNames[role] || role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre para mostrar</Label>
              <Input
                value={newNombreDisplay}
                onChange={(e) => setNewNombreDisplay(e.target.value)}
                placeholder="Ej: Supervisor de Área"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={newDescripcion}
                onChange={(e) => setNewDescripcion(e.target.value)}
                placeholder="Describe las responsabilidades de este rol"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateRole} disabled={saving || !newRoleKey || !newNombreDisplay}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Info Dialog */}
      <Dialog open={editInfoDialogOpen} onOpenChange={setEditInfoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Rol</DialogTitle>
            <DialogDescription>Modifica la información del rol</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre para mostrar</Label>
              <Input
                value={nombreDisplay}
                onChange={(e) => setNombreDisplay(e.target.value)}
                placeholder="Ej: Administrador"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe las responsabilidades de este rol"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInfoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveInfo} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permisos Dialog */}
      <Dialog open={editPermisosDialogOpen} onOpenChange={setEditPermisosDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permisos - {editingRole?.nombre_display}</DialogTitle>
            <DialogDescription>Configura los permisos para cada módulo</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {editingPermisos && Object.entries(editingPermisos).map(([modulo, permisos]) => (
              <div key={modulo} className="space-y-3">
                <h4 className="font-medium text-foreground border-b border-border pb-2">
                  {moduloLabels[modulo] || modulo}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(permisos as Record<string, boolean>).map(([permiso, value]) => (
                    <div key={permiso} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${modulo}-${permiso}`}
                        checked={value}
                        onCheckedChange={(checked) => togglePermiso(modulo, permiso, checked === true)}
                      />
                      <Label htmlFor={`${modulo}-${permiso}`} className="text-sm cursor-pointer">
                        {permisoLabels[permiso] || permiso}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPermisosDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePermisos} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Permisos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el rol "{roleToDelete?.nombre_display}" permanentemente. 
              No podrás deshacer esta acción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
