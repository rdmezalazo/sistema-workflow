import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BlurredValue } from "@/components/ui/BlurredValue";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "secondary" | "warning";
  delay?: number;
  href?: string;
  isFinancial?: boolean;
}

const variantStyles = {
  default: {
    card: "bg-card border-border/50 hover:border-primary/30",
    icon: "bg-gradient-to-br from-muted to-muted/50 text-foreground",
    iconRing: "ring-1 ring-border/50",
  },
  primary: {
    card: "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-primary/20",
    icon: "bg-white/20 text-primary-foreground",
    iconRing: "ring-1 ring-white/20",
  },
  secondary: {
    card: "bg-gradient-to-br from-secondary to-secondary/90 text-secondary-foreground border-secondary/20",
    icon: "bg-white/20 text-secondary-foreground",
    iconRing: "ring-1 ring-white/20",
  },
  warning: {
    card: "bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-400/20",
    icon: "bg-white/20 text-white",
    iconRing: "ring-1 ring-white/20",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  delay = 0,
  href,
  isFinancial = false,
}: StatCardProps) {
  const navigate = useNavigate();
  const styles = variantStyles[variant];
  const isColoredVariant = variant !== "default";
  const isClickable = !!href;

  const handleClick = () => {
    if (href) {
      navigate(href);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "stat-card relative overflow-hidden group animate-slide-up",
        styles.card,
        isClickable && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 space-y-3">
          <p
            className={cn(
              "text-sm font-medium",
              isColoredVariant ? "opacity-80" : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          {isFinancial ? (
            <BlurredValue><p className="text-3xl font-bold tracking-tight">{value}</p></BlurredValue>
          ) : (
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          )}
          
          <div className="flex items-center gap-3">
            {trend && (
              <div className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                isColoredVariant
                  ? trend.isPositive ? "bg-white/20" : "bg-white/20"
                  : trend.isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.isPositive ? "+" : ""}{trend.value}%
              </div>
            )}
            {subtitle && (
              <p className={cn(
                "text-xs",
                isColoredVariant ? "opacity-70" : "text-muted-foreground"
              )}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        <div className={cn(
          "p-3.5 rounded-2xl transition-transform duration-300 group-hover:scale-110",
          styles.icon,
          styles.iconRing
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Navigate indicator */}
      {isClickable && (
        <div className={cn(
          "absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300",
          "flex items-center gap-1 text-xs font-medium",
          isColoredVariant ? "text-white/80" : "text-primary"
        )}>
          <span>Ver más</span>
          <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
        </div>
      )}

      {/* Decorative elements */}
      <div className={cn(
        "absolute -right-8 -bottom-8 h-32 w-32 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150",
        isColoredVariant ? "bg-white" : "bg-primary"
      )} />
      <div className={cn(
        "absolute -right-4 -bottom-4 h-20 w-20 rounded-full opacity-5 transition-transform duration-500 group-hover:scale-125",
        isColoredVariant ? "bg-white" : "bg-primary"
      )} />
    </div>
  );
}
