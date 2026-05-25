import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface Permiso {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  exportar?: boolean;
}

export interface PermisosPorModulo {
  clientes: Permiso;
  contratos: Permiso;
  proformas: Permiso;
  usuarios: Permiso;
  configuracion: { ver: boolean; editar: boolean };
  reportes: { ver: boolean; exportar: boolean };
}

export interface RolePermiso {
  id: string;
  role: AppRole;
  nombre_display: string;
  descripcion: string | null;
  permisos: PermisosPorModulo;
  activo: boolean;
}

// Roles disponibles en el enum que aún no están configurados
export const availableEnumRoles: AppRole[] = [
  'administrador', 'gerente', 'asesor', 'auxiliar', 'practicante', 
  'supervisor', 'contador', 'asistente'
];

const defaultPermisos: PermisosPorModulo = {
  clientes: { ver: true, crear: false, editar: false, eliminar: false },
  contratos: { ver: true, crear: false, editar: false, eliminar: false },
  proformas: { ver: true, crear: false, editar: false, eliminar: false },
  usuarios: { ver: false, crear: false, editar: false, eliminar: false },
  configuracion: { ver: false, editar: false },
  reportes: { ver: true, exportar: false },
};

export const useRolePermisos = () => {
  const [roles, setRoles] = useState<RolePermiso[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('role_permisos')
        .select('*')
        .order('nombre_display');

      if (error) throw error;

      const mappedRoles: RolePermiso[] = (data || []).map(item => ({
        id: item.id,
        role: item.role as AppRole,
        nombre_display: item.nombre_display,
        descripcion: item.descripcion,
        permisos: item.permisos as unknown as PermisosPorModulo,
        activo: item.activo,
      }));

      setRoles(mappedRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Error al cargar roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const getUnconfiguredRoles = (): AppRole[] => {
    const configuredRoles = roles.map(r => r.role);
    return availableEnumRoles.filter(r => !configuredRoles.includes(r));
  };

  const createRole = async (role: AppRole, nombreDisplay: string, descripcion: string) => {
    try {
      const { error } = await supabase
        .from('role_permisos')
        .insert({
          role,
          nombre_display: nombreDisplay,
          descripcion,
          permisos: JSON.parse(JSON.stringify(defaultPermisos)),
          activo: true,
        });

      if (error) throw error;

      toast.success('Rol creado exitosamente');
      fetchRoles();
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Error al crear rol');
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      // Check if any users have this role
      const role = roles.find(r => r.id === roleId);
      if (role) {
        const { data: usersWithRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('role', role.role)
          .limit(1);

        if (usersWithRole && usersWithRole.length > 0) {
          toast.error('No se puede eliminar: hay usuarios con este rol asignado');
          return;
        }
      }

      const { error } = await supabase
        .from('role_permisos')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Rol eliminado');
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Error al eliminar rol');
    }
  };

  const updateRolePermisos = async (roleId: string, permisos: PermisosPorModulo) => {
    try {
      const { error } = await supabase
        .from('role_permisos')
        .update({ permisos: JSON.parse(JSON.stringify(permisos)) })
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Permisos actualizados');
      fetchRoles();
    } catch (error) {
      console.error('Error updating permisos:', error);
      toast.error('Error al actualizar permisos');
    }
  };

  const updateRoleInfo = async (roleId: string, data: { nombre_display: string; descripcion: string }) => {
    try {
      const { error } = await supabase
        .from('role_permisos')
        .update(data)
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Rol actualizado');
      fetchRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Error al actualizar rol');
    }
  };

  const toggleRoleActivo = async (roleId: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('role_permisos')
        .update({ activo })
        .eq('id', roleId);

      if (error) throw error;

      toast.success(activo ? 'Rol activado' : 'Rol desactivado');
      fetchRoles();
    } catch (error) {
      console.error('Error toggling role:', error);
      toast.error('Error al cambiar estado del rol');
    }
  };

  return {
    roles,
    loading,
    createRole,
    deleteRole,
    updateRolePermisos,
    updateRoleInfo,
    toggleRoleActivo,
    getUnconfiguredRoles,
    refetch: fetchRoles,
  };
};
