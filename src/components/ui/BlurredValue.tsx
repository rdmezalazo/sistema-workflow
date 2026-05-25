import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";
import { cn } from "@/lib/utils";

interface BlurredValueProps {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "div" | "p" | "td";
}

/**
 * Wraps financial values and applies blur if the user doesn't have financial visibility.
 */
export function BlurredValue({ children, className, as: Tag = "span" }: BlurredValueProps) {
  const { canViewFinancials } = useFinancialVisibility();

  if (canViewFinancials) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Tag
      className={cn("select-none blur-sm", className)}
      title="No tienes permisos para ver esta información"
    >
      {children}
    </Tag>
  );
}

/**
 * Wraps entire sections and applies blur overlay if user doesn't have financial visibility.
 */
export function BlurredSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const { canViewFinancials } = useFinancialVisibility();

  if (canViewFinancials) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="blur-md select-none pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-card/50 rounded-xl">
        <p className="text-sm text-muted-foreground font-medium px-4 py-2 bg-muted rounded-lg">
          No tienes permisos para ver datos financieros
        </p>
      </div>
    </div>
  );
}
