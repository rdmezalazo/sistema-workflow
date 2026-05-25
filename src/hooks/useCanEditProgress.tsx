import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook that determines if the current user can edit progress in Gantt/Table views.
 * Allowed roles:
 * - Administrador (system role from user_roles)
 * - Users with "Supervisión Gerencial" or "Supervisión" rol_en_cartera (from cartera_miembros)
 */
export function useCanEditProgress() {
  const { user, role } = useAuth();
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setCanEdit(false);
        setLoading(false);
        return;
      }

      // Administrador can always edit
      if (role === "administrador") {
        setCanEdit(true);
        setLoading(false);
        return;
      }

      // Check if user has supervision role in any cartera
      try {
        const { data, error } = await supabase
          .from("cartera_miembros")
          .select("rol_en_cartera")
          .eq("user_id", user.id)
          .in("rol_en_cartera", ["Supervisión Gerencial", "Supervisión"]);

        if (!error && data && data.length > 0) {
          setCanEdit(true);
        } else {
          setCanEdit(false);
        }
      } catch {
        setCanEdit(false);
      }

      setLoading(false);
    };

    check();
  }, [user, role]);

  /**
   * Check if user is a privileged role (admin/supervisor/gerente)
   * that can edit all workflow items regardless of assignment.
   */
  const isPrivileged = canEdit || role === "gerente" || role === "supervisor";

  return { 
    canEditProgress: canEdit, 
    /** Whether the user can edit all items (supervisor/admin/gerente) */
    canEditAll: isPrivileged,
    /** Current user ID for ownership checks */
    currentUserId: user?.id || null,
    loading 
  };
}
