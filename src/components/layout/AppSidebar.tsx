import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck,
  UserCheck,
  Briefcase,
  Calendar,
  Workflow,
  BarChart3,
  Settings,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  HelpCircle,
} from "lucide-react";
import logo from "@/assets/logo-ca.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSedeContext } from "@/hooks/useSedeContext";
import { Building2 } from "lucide-react";
import { clearStoredActiveSedeId } from "@/lib/activeSede";

interface SidebarItem {
  title: string;
  icon: React.ElementType;
  path: string;
  children?: { title: string; path: string }[];
}

const menuItems: SidebarItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Clientes", icon: Users, path: "/clientes" },
  { title: "Proformas", icon: FileText, path: "/proformas" },
  { title: "Contratos", icon: FileCheck, path: "/contratos" },
  { title: "Asignaciones", icon: UserCheck, path: "/asignaciones" },
  { title: "Carteras", icon: Briefcase, path: "/carteras" },
  { title: "Calendario Pagos", icon: Calendar, path: "/calendario-pagos" },
  { title: "WorkFlow", icon: Workflow, path: "/calendario-trabajo" },
  {
    title: "Reportes",
    icon: BarChart3,
    path: "/reportes",
    children: [
      { title: "Todos los Clientes", path: "/reportes/clientes" },
      { title: "Avance por Contrato", path: "/reportes/avance-contrato" },
      { title: "Avance por Asesor", path: "/reportes/avance-asesor" },
      { title: "Avance por Cartera", path: "/reportes/avance-cartera" },
    ],
  },
  { title: "Usuarios", icon: Shield, path: "/usuarios" },
  { title: "Configuración", icon: Settings, path: "/configuracion" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const { availableSedes, activeSedeId, canViewAllSedes } = useSedeContext();
  const sedeNombre = activeSedeId
    ? availableSedes.find((s) => s.id === activeSedeId)?.nombre
    : availableSedes.length === 1
      ? availableSedes[0].nombre
      : null;
  const [expandedItems, setExpandedItems] = useState<string[]>(["Reportes"]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);

  // Auto-collapse sidebar when on WorkFlow page
  useEffect(() => {
    if (location.pathname === "/calendario-trabajo") {
      setIsCollapsed(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const roleDisplay = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Usuario';

  const handleSignOut = async () => {
    clearStoredActiveSedeId();
    await signOut();
    navigate('/auth');
  };

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: SidebarItem) =>
    item.children?.some((child) => location.pathname === child.path);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95">
      {/* Logo Section */}
      <div className={cn("p-4", isCollapsed ? "px-2" : "p-6")}>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="relative">
            <img
              src={logo}
              alt="C&A Contadores y Auditores"
              className={cn("object-contain drop-shadow-lg transition-all", isCollapsed ? "h-8 w-8" : "h-14 w-auto")}
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold text-sidebar-foreground tracking-tight">
                Contadores
              </span>
              <span className="text-base font-bold text-sidebar-foreground tracking-tight">
                & Auditores
              </span>
              <span className="text-[11px] font-medium text-sidebar-foreground/70 tracking-wide mt-1">
                Sistema de Gestión Contable
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-4 -right-3 z-50 p-1 rounded-full bg-sidebar border border-sidebar-foreground/20 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shadow-md"
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-sidebar-foreground/20 to-transparent" />

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-1 overflow-y-auto scrollbar-modern", isCollapsed ? "p-2 flex flex-col items-center" : "p-4")}>
        {!isCollapsed && (
          <p className="px-4 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Menú Principal
          </p>
        )}
        {menuItems.slice(0, 8).map((item, index) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.title);
          const active = isActive(item.path) || isParentActive(item);

          if (isCollapsed) {
            return (
              <Tooltip key={item.title} delayDuration={0}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-center p-2.5 rounded-lg transition-colors mx-auto",
                        isActive ? "bg-sidebar-accent text-sidebar-primary-foreground" : "text-sidebar-primary-foreground/80 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent/30"
                      )
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <div key={item.title} className={`animate-slide-up stagger-${index + 1}`}>
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.title)}
                    className={cn(
                      "sidebar-item w-full justify-between",
                      active && "sidebar-item-active"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 transition-transform duration-300",
                        isExpanded && "rotate-180"
                      )} 
                    />
                  </button>
                  <div className={cn(
                    "ml-4 pl-4 border-l border-sidebar-foreground/10 space-y-1 overflow-hidden transition-all duration-300",
                    isExpanded ? "max-h-48 opacity-100 mt-1" : "max-h-0 opacity-0"
                  )}>
                    {item.children?.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={() => setIsMobileOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "block px-4 py-2 rounded-lg text-sm transition-all duration-200",
                            isActive
                              ? "bg-sidebar-accent/60 text-sidebar-foreground font-medium"
                              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                          )
                        }
                      >
                        {child.title}
                      </NavLink>
                    ))}
                  </div>
                </>
              ) : (
                <NavLink
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    cn("sidebar-item", isActive && "sidebar-item-active")
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.title}</span>
                </NavLink>
              )}
            </div>
          );
        })}

        {/* Admin Section */}
        <div className="pt-4">
          {!isCollapsed && (
            <p className="px-4 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              ADM
            </p>
          )}
          {menuItems.slice(8).map((item) => {
            const Icon = item.icon;
            
            if (isCollapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center justify-center p-2.5 rounded-lg transition-colors mx-auto",
                          isActive ? "bg-sidebar-accent text-sidebar-primary-foreground" : "text-sidebar-primary-foreground/80 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent/30"
                        )
                      }
                    >
                      <Icon className="h-5 w-5" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  cn("sidebar-item", isActive && "sidebar-item-active")
                }
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className={cn("space-y-3", isCollapsed ? "p-2" : "p-4")}>
        {/* Help Button */}
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button className="flex items-center justify-center p-2.5 rounded-lg w-full text-sidebar-primary-foreground/80 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent/30 transition-colors mx-auto">
                <HelpCircle className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Centro de Ayuda
            </TooltipContent>
          </Tooltip>
        ) : (
          <button className="sidebar-item w-full text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <HelpCircle className="h-5 w-5" />
            <span className="text-sm">Centro de Ayuda</span>
          </button>
        )}

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-sidebar-foreground/20 to-transparent" />

        {/* User Profile */}
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button 
                onClick={handleSignOut}
                className="flex items-center justify-center p-2 rounded-xl w-full bg-gradient-to-r from-sidebar-accent/40 to-sidebar-accent/20 border border-sidebar-foreground/10"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sidebar-primary to-secondary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold shadow-lg">
                  {initials}
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              <p>{displayName}</p>
              <p className="text-xs text-muted-foreground">{roleDisplay}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-sidebar-accent/40 to-sidebar-accent/20 border border-sidebar-foreground/10">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sidebar-primary to-secondary flex items-center justify-center text-sidebar-primary-foreground text-sm font-bold shadow-lg">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {displayName}
              </p>
              <p className="text-xs text-sidebar-foreground/60">{roleDisplay}</p>
              <div className="flex items-center gap-1 mt-1">
                <Building2 className="h-3 w-3 text-sidebar-foreground/60" />
                <p className="text-[11px] text-sidebar-foreground/70 font-medium truncate">
                  {sedeNombre || (canViewAllSedes ? 'Todas las sedes' : 'Sin sede')}
                </p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors"
            >
              <LogOut className="h-4 w-4 text-sidebar-foreground/60" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl transition-all"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 transform transition-all duration-300 ease-out lg:translate-x-0 shadow-2xl lg:shadow-none relative",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-16" : "w-72"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
