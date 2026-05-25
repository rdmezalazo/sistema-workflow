import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Roles that always have financial visibility
const ROLES_SIEMPRE_ACCESO = ["administrador", "gerente", "supervisor"];

interface FinancialVisibilityContextType {
  canViewFinancials: boolean;
  loading: boolean;
}

const FinancialVisibilityContext = createContext<FinancialVisibilityContextType>({
  canViewFinancials: false,
  loading: true,
});

export function FinancialVisibilityProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [canView, setCanView] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user || !role) {
        setCanView(false);
        setLoading(false);
        return;
      }

      // Protected roles always have access
      if (ROLES_SIEMPRE_ACCESO.includes(role)) {
        setCanView(true);
        setLoading(false);
        return;
      }

      // Check config from DB
      try {
        const { data, error } = await supabase
          .from("configuracion")
          .select("valor")
          .eq("clave", "visibilidad_financiera")
          .single();

        if (!error && data?.valor) {
          const config = data.valor as Record<string, boolean>;
          setCanView(config[role] === true);
        } else {
          // No config saved yet — default: only protected roles
          setCanView(false);
        }
      } catch {
        setCanView(false);
      }

      setLoading(false);
    };

    check();
  }, [user, role]);

  return (
    <FinancialVisibilityContext.Provider value={{ canViewFinancials: canView, loading }}>
      {children}
    </FinancialVisibilityContext.Provider>
  );
}

export function useFinancialVisibility() {
  return useContext(FinancialVisibilityContext);
}
