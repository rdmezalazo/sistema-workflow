import { useState, useEffect } from "react";
import { CalendarClock, Bell, Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { usePaymentNotifications } from "@/hooks/usePaymentNotifications";
import { toast } from "sonner";

export function CalendarioPagosConfig() {
  const { config, updateConfig, loading } = usePaymentNotifications();
  
  const [daysBeforeDue, setDaysBeforeDue] = useState(config.days_before_due);
  const [daysAfterOverdue, setDaysAfterOverdue] = useState(config.days_after_overdue);
  const [colorBeforeDue, setColorBeforeDue] = useState(config.color_before_due);
  const [colorAfterOverdue, setColorAfterOverdue] = useState(config.color_after_overdue);
  const [enabled, setEnabled] = useState(config.enabled);

  useEffect(() => {
    setDaysBeforeDue(config.days_before_due);
    setDaysAfterOverdue(config.days_after_overdue);
    setColorBeforeDue(config.color_before_due);
    setColorAfterOverdue(config.color_after_overdue);
    setEnabled(config.enabled);
  }, [config]);

  const handleSave = async () => {
    await updateConfig({
      days_before_due: daysBeforeDue,
      days_after_overdue: daysAfterOverdue,
      color_before_due: colorBeforeDue,
      color_after_overdue: colorAfterOverdue,
      enabled,
    });
    toast.success("Configuración de notificaciones guardada correctamente");
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl" />;
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <CalendarClock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Calendario de Pagos</h3>
          <p className="text-sm text-muted-foreground">
            Configura las notificaciones y alertas de pagos
          </p>
        </div>
      </div>

      <Separator />

      {/* Enable notifications */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Habilitar notificaciones de pagos
          </p>
          <p className="text-sm text-muted-foreground">
            Mostrar alertas en el icono de notificaciones
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <Separator />

      {/* Days configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            Días antes de vencer
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={30}
              value={daysBeforeDue}
              onChange={(e) => setDaysBeforeDue(parseInt(e.target.value) || 5)}
              className="w-24"
              disabled={!enabled}
            />
            <span className="text-sm text-muted-foreground">días</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Se notificará diariamente cuando falten estos días para el vencimiento
          </p>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-red-500" />
            Días después de vencido
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={60}
              value={daysAfterOverdue}
              onChange={(e) => setDaysAfterOverdue(parseInt(e.target.value) || 15)}
              className="w-24"
              disabled={!enabled}
            />
            <span className="text-sm text-muted-foreground">días</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Se notificará diariamente hasta estos días después de vencido
          </p>
        </div>
      </div>

      <Separator />

      {/* Color configuration */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Colores de notificación
        </Label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg border-2 border-border shadow-sm"
                style={{ backgroundColor: colorBeforeDue }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Por vencer</p>
                <p className="text-xs text-muted-foreground">
                  Pagos próximos a vencer
                </p>
              </div>
              <Input
                type="color"
                value={colorBeforeDue}
                onChange={(e) => setColorBeforeDue(e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
                disabled={!enabled}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg border-2 border-border shadow-sm"
                style={{ backgroundColor: colorAfterOverdue }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Vencido</p>
                <p className="text-xs text-muted-foreground">
                  Pagos ya vencidos
                </p>
              </div>
              <Input
                type="color"
                value={colorAfterOverdue}
                onChange={(e) => setColorAfterOverdue(e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
                disabled={!enabled}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">Vista previa</p>
        <div className="flex flex-wrap gap-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: colorBeforeDue }}
          >
            <Bell className="h-4 w-4" />
            Por vencer (5 días)
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: colorAfterOverdue }}
          >
            <Bell className="h-4 w-4" />
            Vencido (3 días)
          </div>
        </div>
      </div>

      <Button className="btn-gradient" onClick={handleSave}>
        <Save className="h-4 w-4 mr-2" />
        Guardar configuración
      </Button>
    </div>
  );
}
