import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";
import { EyeOff, Lock } from "lucide-react";

/**
 * Guard component that blocks access to fully financial pages.
 * Shows a message instead of blurring.
 */
export function FinancialPageGuard({ children }: { children: React.ReactNode }) {
  const { canViewFinancials, loading } = useFinancialVisibility();

  if (loading) return null;

  if (!canViewFinancials) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="p-4 rounded-full bg-muted">
          <EyeOff className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Acceso restringido</h2>
        <p className="text-muted-foreground max-w-md">
          No tienes permisos para ver información financiera. Contacta a tu administrador para solicitar acceso.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
