import { useState, useEffect } from "react";
import { Eye, EyeOff, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermisos } from "@/hooks/useRolePermisos";

interface VisibilidadRol {
  role: string;
  nombre_display: string;
  puede_ver_financiero: boolean;
}

const SECCIONES_FINANCIERAS = [
  { key: "montos_contratos", label: "Montos de Contratos", desc: "Montos mensuales y totales en contratos" },
  { key: "pagos", label: "Pagos y Cobros", desc: "Calendario de pagos, registro de cobros" },
  { key: "proformas_montos", label: "Montos en Proformas", desc: "Subtotales, IGV y totales en proformas" },
  { key: "dashboard_ingresos", label: "Dashboard - Ingresos", desc: "Gráficos y estadísticas de ingresos" },
  { key: "reporte_ventas", label: "Reporte de Ventas", desc: "Registro de ventas contable" },
  { key: "costos_servicios", label: "Costos de Servicios", desc: "Precios y tarifas en servicios" },
];

// Roles that always have access
const ROLES_SIEMPRE_ACCESO = ["administrador", "gerente", "supervisor"];

export function VisibilidadFinancieraConfig() {
  const { roles } = useRolePermisos();
  const [config, setConfig] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracion")
        .select("*")
        .eq("clave", "visibilidad_financiera")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching visibility config:", error);
      }

      if (data?.valor) {
        setConfig(data.valor as Record<string, boolean>);
      } else {
        // Default: roles with financial access
        const defaults: Record<string, boolean> = {};
        roles.filter(r => r.activo).forEach(r => {
          defaults[r.role] = ROLES_SIEMPRE_ACCESO.includes(r.role);
        });
        setConfig(defaults);
      }
    } catch (error) {
      console.error("Error loading visibility config:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roles.length > 0 && Object.keys(config).length === 0 && !loading) {
      const defaults: Record<string, boolean> = {};
      roles.filter(r => r.activo).forEach(r => {
        defaults[r.role] = ROLES_SIEMPRE_ACCESO.includes(r.role);
      });
      setConfig(defaults);
    }
  }, [roles, loading]);

  const handleToggle = (role: string, value: boolean) => {
    if (ROLES_SIEMPRE_ACCESO.includes(role)) return;
    setConfig(prev => ({ ...prev, [role]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("configuracion")
        .select("id")
        .eq("clave", "visibilidad_financiera")
        .single();

      const configJson = JSON.parse(JSON.stringify(config));

      if (existing) {
        await supabase
          .from("configuracion")
          .update({ valor: configJson, updated_at: new Date().toISOString() })
          .eq("clave", "visibilidad_financiera");
      } else {
        await supabase
          .from("configuracion")
          .insert([{
            clave: "visibilidad_financiera",
            valor: configJson,
            descripcion: "Configuración de visibilidad de datos financieros por rol"
          }]);
      }

      toast.success("Configuración de visibilidad guardada");
    } catch (error) {
      console.error("Error saving visibility config:", error);
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const activeRoles = roles.filter(r => r.activo);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
        <EyeOff className="h-5 w-5 text-primary" />
        Visibilidad de Datos Financieros por Rol
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Controla qué roles pueden ver montos, costos, pagos e ingresos. Los roles sin acceso verán los datos financieros ocultos (con blur).
      </p>

      {/* Info about always-access roles */}
      <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-border">
        <Shield className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          Los roles <strong>Administrador</strong>, <strong>Gerente</strong> y <strong>Supervisor</strong> siempre tienen acceso a la información financiera.
        </p>
      </div>

      {/* Roles list */}
      <div className="space-y-3">
        {activeRoles.map((role) => {
          const isProtected = ROLES_SIEMPRE_ACCESO.includes(role.role);
          const hasAccess = isProtected || config[role.role] === true;

          return (
            <div
              key={role.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${hasAccess ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {hasAccess ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-medium text-foreground">{role.nombre_display}</p>
                  <p className="text-xs text-muted-foreground">
                    {hasAccess ? "Puede ver datos financieros" : "Datos financieros ocultos"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isProtected && (
                  <Badge variant="secondary" className="text-xs">Siempre activo</Badge>
                )}
                <Switch
                  checked={hasAccess}
                  onCheckedChange={(v) => handleToggle(role.role, v)}
                  disabled={isProtected}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Affected sections info */}
      <Separator className="my-6" />
      <h4 className="text-sm font-semibold text-foreground mb-3">Secciones afectadas</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SECCIONES_FINANCIERAS.map((sec) => (
          <div key={sec.key} className="flex items-start gap-2 p-2 rounded-lg bg-muted/20">
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">{sec.label}</p>
              <p className="text-xs text-muted-foreground">{sec.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button className="mt-6 btn-gradient" onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar configuración de visibilidad"}
      </Button>
    </div>
  );
}
