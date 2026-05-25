import { useState, useEffect } from "react";
import { Settings, Shield, FileText, Bell, Database, Receipt, Users, ClipboardList, CreditCard, Percent, DollarSign, FileSignature, CalendarClock, Download, BookOpen, Loader2, Building2 } from "lucide-react";
import { SedesManager } from "@/components/configuracion/SedesManager";
import { generateUserManual } from "@/lib/generateUserManual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { OpcionesManager } from "@/components/configuracion/OpcionesManager";
import { RolesManager } from "@/components/configuracion/RolesManager";
import { ServiciosManager } from "@/components/configuracion/ServiciosManager";
import { ProformaEstadosManager } from "@/components/configuracion/ProformaEstadosManager";
import { ProformaSecuenciasManager } from "@/components/configuracion/ProformaSecuenciasManager";
import { ContratoSecuenciasManager } from "@/components/configuracion/ContratoSecuenciasManager";
import { ImportServiciosDialog } from "@/components/configuracion/ImportServiciosDialog";
import { DocumentosPagoManager } from "@/components/configuracion/DocumentosPagoManager";
import { MetodosPagoManager } from "@/components/configuracion/MetodosPagoManager";
import { CalendarioPagosConfig } from "@/components/configuracion/CalendarioPagosConfig";
import { VisibilidadFinancieraConfig } from "@/components/configuracion/VisibilidadFinancieraConfig";
import { useConfiguracionOpciones } from "@/hooks/useConfiguracionOpciones";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const Configuracion = () => {
  const regimenTributario = useConfiguracionOpciones("regimen_tributario");
  const regimenLaboral = useConfiguracionOpciones("regimen_laboral");
  const { config, updateConfig, loading: configLoading } = useSystemConfig();
  
  // Local state for system config form
  const [igvPercentage, setIgvPercentage] = useState(config.igv_percentage);
  const [useThousandsSeparator, setUseThousandsSeparator] = useState(config.use_thousands_separator);
  const [defaultCurrency, setDefaultCurrency] = useState<"PEN" | "USD">(config.default_currency);
  const [proformaExpirationDays, setProformaExpirationDays] = useState(config.proforma_expiration_days);
  const [generatingManual, setGeneratingManual] = useState(false);

  useEffect(() => {
    setIgvPercentage(config.igv_percentage);
    setUseThousandsSeparator(config.use_thousands_separator);
    setDefaultCurrency(config.default_currency);
    setProformaExpirationDays(config.proforma_expiration_days);
  }, [config]);

  const handleSaveSystemConfig = async () => {
    await updateConfig({
      igv_percentage: igvPercentage,
      use_thousands_separator: useThousandsSeparator,
      default_currency: defaultCurrency,
      proforma_expiration_days: proformaExpirationDays,
    });
    toast.success("Configuración del sistema guardada correctamente");
  };

  const handleDownloadManual = async () => {
    setGeneratingManual(true);
    try {
      await generateUserManual();
      toast.success("Manual de usuario descargado correctamente");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el manual. Intente nuevamente.");
    } finally {
      setGeneratingManual(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Configuración
        </h1>
        <p className="text-muted-foreground mt-1">
          Configura los parámetros del sistema
        </p>
      </div>

      <Tabs defaultValue="regimenes" className="space-y-6">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="regimenes" className="gap-2">
            <Receipt className="h-4 w-4" />
            Regímenes
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="sedes" className="gap-2">
            <Building2 className="h-4 w-4" />
            Sedes
          </TabsTrigger>
          <TabsTrigger value="proformas" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Proformas
          </TabsTrigger>
          <TabsTrigger value="contratos" className="gap-2">
            <FileSignature className="h-4 w-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="servicios" className="gap-2">
            <FileText className="h-4 w-4" />
            Servicios
          </TabsTrigger>
          <TabsTrigger value="pagos" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="calendario-pagos" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Calendario Pagos
          </TabsTrigger>
          <TabsTrigger value="notificaciones" className="gap-2">
            <Bell className="h-4 w-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="sistema" className="gap-2">
            <Database className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {/* Regímenes Tab */}
        <TabsContent value="regimenes">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OpcionesManager
              titulo="Régimen Tributario"
              descripcion="Gestiona las opciones de régimen tributario para clientes"
              opciones={regimenTributario.opciones}
              onAdd={regimenTributario.addOpcion}
              onUpdate={regimenTributario.updateOpcion}
              onToggle={regimenTributario.toggleOpcion}
              onDelete={regimenTributario.deleteOpcion}
              icon={<Receipt className="h-4 w-4" />}
              colorClass="bg-primary/10 text-primary"
            />
            <OpcionesManager
              titulo="Régimen Laboral"
              descripcion="Gestiona las opciones de régimen laboral para clientes"
              opciones={regimenLaboral.opciones}
              onAdd={regimenLaboral.addOpcion}
              onUpdate={regimenLaboral.updateOpcion}
              onToggle={regimenLaboral.toggleOpcion}
              onDelete={regimenLaboral.deleteOpcion}
              icon={<Users className="h-4 w-4" />}
              colorClass="bg-secondary/20 text-secondary"
            />
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <RolesManager />
        </TabsContent>

        {/* Sedes Tab */}
        <TabsContent value="sedes">
          <SedesManager />
        </TabsContent>

        {/* Proformas Tab */}
        <TabsContent value="proformas">
          <div className="space-y-6">
            {/* Codificación de proformas */}
            <ProformaSecuenciasManager />

            {/* Configuración de vencimiento */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Configuración General
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="proforma-expiration" className="flex items-center gap-2">
                    Tiempo de vencimiento por defecto
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="proforma-expiration"
                      type="number"
                      min={1}
                      max={365}
                      value={proformaExpirationDays}
                      onChange={(e) => setProformaExpirationDays(parseInt(e.target.value) || 30)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">días</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este valor se aplicará automáticamente al crear nuevas proformas
                  </p>
                </div>
              </div>

              <Button 
                className="mt-4 btn-gradient" 
                onClick={handleSaveSystemConfig}
              >
                Guardar configuración
              </Button>
            </div>

            {/* Estados de proforma */}
            <ProformaEstadosManager />
          </div>
        </TabsContent>

        {/* Contratos Tab */}
        <TabsContent value="contratos">
          <div className="space-y-6">
            <ContratoSecuenciasManager />
          </div>
        </TabsContent>

        {/* Servicios Tab */}
        <TabsContent value="servicios">
          <div className="space-y-4">
            {/* Import Button */}
            <div className="flex justify-end">
              <ImportServiciosDialog />
            </div>
            
            <Tabs defaultValue="contabilidad" className="space-y-4">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="contabilidad">Contabilidad</TabsTrigger>
                <TabsTrigger value="tramites">Trámites</TabsTrigger>
                <TabsTrigger value="auditoria">Auditoría y Control Interno</TabsTrigger>
              </TabsList>
              
              <TabsContent value="contabilidad">
                <ServiciosManager grupoServicio="Contabilidad" titulo="Servicios de Contabilidad" />
              </TabsContent>
              
              <TabsContent value="tramites">
                <ServiciosManager grupoServicio="Trámites" titulo="Servicios de Trámites" />
              </TabsContent>
              
              <TabsContent value="auditoria">
                <ServiciosManager grupoServicio="Auditoría y Control Interno" titulo="Servicios de Auditoría y Control Interno" />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        {/* Pagos Tab */}
        <TabsContent value="pagos">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DocumentosPagoManager />
            <MetodosPagoManager />
          </div>
        </TabsContent>

        {/* Calendario de Pagos Tab */}
        <TabsContent value="calendario-pagos">
          <CalendarioPagosConfig />
        </TabsContent>

        {/* Notificaciones Tab */}
        <TabsContent value="notificaciones">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Configuración de Notificaciones</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Notificaciones por email</p>
                  <p className="text-sm text-muted-foreground">Recibir alertas por correo electrónico</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Alertas de pagos vencidos</p>
                  <p className="text-sm text-muted-foreground">Notificar cuando un pago está vencido</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Recordatorios de contratos</p>
                  <p className="text-sm text-muted-foreground">Alertar contratos próximos a vencer</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Notificaciones push</p>
                  <p className="text-sm text-muted-foreground">Notificaciones en el navegador</p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Sistema Tab */}
        <TabsContent value="sistema">
          <div className="space-y-6">
            {/* Configuración Financiera */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Configuración Financiera
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="igv-percentage" className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    IGV (%)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="igv-percentage"
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={igvPercentage}
                      onChange={(e) => setIgvPercentage(parseFloat(e.target.value) || 18)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Porcentaje del IGV aplicado a los servicios
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="default-currency" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Moneda por defecto
                  </Label>
                  <Select
                    value={defaultCurrency}
                    onValueChange={(v) => setDefaultCurrency(v as "PEN" | "USD")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PEN">
                        <span className="flex items-center gap-2">
                          S/. Nuevos Soles (PEN)
                        </span>
                      </SelectItem>
                      <SelectItem value="USD">
                        <span className="flex items-center gap-2">
                          $ Dólares Americanos (USD)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Moneda utilizada en proformas y contratos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Formato de números
                  </Label>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                    <div>
                      <p className="font-medium text-sm">Usar coma de miles</p>
                      <p className="text-xs text-muted-foreground">
                        Ej: {useThousandsSeparator ? "1,234,567.89" : "1234567.89"}
                      </p>
                    </div>
                    <Switch
                      checked={useThousandsSeparator}
                      onCheckedChange={setUseThousandsSeparator}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Datos de la Empresa */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Datos de la Empresa</h3>
              
              <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del Estudio</Label>
                    <Input defaultValue="Contadores y Auditores Arequipa" />
                  </div>
                  <div className="space-y-2">
                    <Label>RUC</Label>
                    <Input defaultValue="20123456789" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email de contacto</Label>
                    <Input type="email" defaultValue="contacto@estudio.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input defaultValue="054-123456" />
                  </div>
                </div>
              </div>
            </div>

            {/* Visibilidad Financiera por Rol */}
            <VisibilidadFinancieraConfig />

            {/* Opciones Avanzadas */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Opciones Avanzadas</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Modo mantenimiento</p>
                    <p className="text-sm text-muted-foreground">Desactivar acceso temporalmente</p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Backup automático</p>
                    <p className="text-sm text-muted-foreground">Respaldo diario de datos</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>

            <Button className="w-fit btn-gradient" onClick={handleSaveSystemConfig}>
              Guardar cambios
            </Button>

            {/* Manual de Usuario */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Manual de Usuario
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Descarga el manual de usuario completo del sistema en formato PDF. Incluye todos los módulos, flujos operativos, preguntas frecuentes y glosario de términos.
              </p>
              <Button
                onClick={handleDownloadManual}
                disabled={generatingManual}
                className="btn-gradient gap-2"
              >
                {generatingManual ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando manual...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Descargar Manual de Usuario (PDF)
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracion;
