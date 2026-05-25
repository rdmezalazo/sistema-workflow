import { useState, useEffect } from "react";
import { Eye, Palette, Type, Layout, RotateCcw, Save, Download, ArrowLeft, Building2, Landmark, FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateProformaPDF, DEFAULT_PDF_CONFIG, PDFStyleConfig } from "@/lib/generateProformaPDF";

// Re-export for convenience
export type { PDFStyleConfig } from "@/lib/generateProformaPDF";
export { DEFAULT_PDF_CONFIG as DEFAULT_STYLE_CONFIG } from "@/lib/generateProformaPDF";

const COLOR_PRESETS = [
  { name: "Dorado Corporativo", primary: "#CA9348", accent: "#D91A22" },
  { name: "Azul Profesional", primary: "#2563EB", accent: "#DC2626" },
  { name: "Verde Empresarial", primary: "#059669", accent: "#7C3AED" },
  { name: "Gris Elegante", primary: "#4B5563", accent: "#0891B2" },
  { name: "Borgoña Clásico", primary: "#991B1B", accent: "#CA8A04" },
  { name: "Marino Ejecutivo", primary: "#1E3A5F", accent: "#F59E0B" },
];

interface PDFStyleEditorProps {
  plantillaId: string;
  plantillaNombre: string;
  plantillaTipo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PDFStyleEditor({ plantillaId, plantillaNombre, plantillaTipo, open, onOpenChange }: PDFStyleEditorProps) {
  const [config, setConfig] = useState<PDFStyleConfig>(DEFAULT_PDF_CONFIG);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  useEffect(() => {
    if (open && plantillaId) {
      loadConfig();
      setPreviewUrl(null);
    }
  }, [plantillaId, open]);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("proforma_plantillas")
      .select("estilos_pdf")
      .eq("id", plantillaId)
      .single();

    if (data?.estilos_pdf && typeof data.estilos_pdf === "object" && !Array.isArray(data.estilos_pdf) && Object.keys(data.estilos_pdf).length > 0) {
      const savedConfig = data.estilos_pdf as unknown as Partial<PDFStyleConfig>;
      setConfig({ 
        ...DEFAULT_PDF_CONFIG, 
        colors: { ...DEFAULT_PDF_CONFIG.colors, ...savedConfig.colors },
        typography: { ...DEFAULT_PDF_CONFIG.typography, ...savedConfig.typography },
        layout: { ...DEFAULT_PDF_CONFIG.layout, ...savedConfig.layout },
        company: { ...DEFAULT_PDF_CONFIG.company, ...savedConfig.company },
        bank: { ...DEFAULT_PDF_CONFIG.bank, ...savedConfig.bank },
        annotations: savedConfig.annotations ?? DEFAULT_PDF_CONFIG.annotations,
      });
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    
    const { error } = await supabase
      .from("proforma_plantillas")
      .update({ estilos_pdf: JSON.parse(JSON.stringify(config)) })
      .eq("id", plantillaId);

    if (error) {
      toast.error("Error al guardar configuración");
      console.error("Error saving PDF styles:", error);
    } else {
      toast.success("Estilos guardados correctamente");
    }
    setLoading(false);
  };

  const resetConfig = () => {
    setConfig(DEFAULT_PDF_CONFIG);
    toast.info("Estilos restaurados a valores por defecto");
  };

  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setConfig(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        primary: preset.primary,
        primaryDark: adjustColor(preset.primary, -20),
        accent: preset.accent,
      }
    }));
    toast.success(`Preset "${preset.name}" aplicado`);
  };

  const generatePreview = async () => {
    setIsGeneratingPreview(true);
    try {
      const sampleData = {
        numero: "PC-2026-001",
        tipo: plantillaTipo || "CONTABILIDAD",
        fecha_emision: new Date().toISOString().split("T")[0],
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        cliente: {
          razon_social: "EMPRESA DE EJEMPLO S.A.C.",
          codigo: "20123456789",
          direccion: "Av. Principal 123, Lima",
          email: "ejemplo@empresa.com",
          telefono: "987654321",
        },
        items: [
          { descripcion: "Servicio de Contabilidad Mensual - Régimen General", cantidad: 1, precio_unitario: 1500, subtotal: 1500 },
          { descripcion: "Declaración Anual de Impuestos", cantidad: 1, precio_unitario: 800, subtotal: 800 },
          { descripcion: "Asesoría Tributaria", cantidad: 2, precio_unitario: 350, subtotal: 700 },
        ],
        subtotal: 3000,
        igv: 540,
        total: 3540,
        notas: "Proforma de ejemplo para vista previa",
        moneda: "PEN",
        // Sample calendar projection data
        calendarProjection: [
          { numero: 1, fecha_pago: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], servicio: "Cont. Mensual", monto: 1180 },
          { numero: 2, fecha_pago: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], servicio: "Cont. Mensual", monto: 1180 },
          { numero: 3, fecha_pago: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], servicio: "Cont. Mensual", monto: 1180 },
        ],
      };

      const blob = await generateProformaPDF(sampleData, config);
      const url = URL.createObjectURL(blob);
      
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(url);
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Error al generar vista previa");
    }
    setIsGeneratingPreview(false);
  };

  const downloadPreview = () => {
    if (previewUrl) {
      const link = document.createElement("a");
      link.href = previewUrl;
      link.download = `preview-${plantillaNombre}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const updateColor = (key: keyof PDFStyleConfig["colors"], value: string) => {
    setConfig(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value }
    }));
  };

  const updateTypography = (key: keyof PDFStyleConfig["typography"], value: number | string) => {
    setConfig(prev => ({
      ...prev,
      typography: { ...prev.typography, [key]: value }
    }));
  };

  const updateLayout = (key: keyof PDFStyleConfig["layout"], value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      layout: { ...prev.layout, [key]: value }
    }));
  };

  const updateCompany = (key: keyof PDFStyleConfig["company"], value: string) => {
    setConfig(prev => ({
      ...prev,
      company: { ...prev.company, [key]: value }
    }));
  };

  const updateBank = (key: keyof PDFStyleConfig["bank"], value: string) => {
    setConfig(prev => ({
      ...prev,
      bank: { ...prev.bank, [key]: value }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0 rounded-none border-0">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-background flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al diseñador
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Editor de Estilos PDF
              </h2>
              <p className="text-sm text-muted-foreground">{plantillaNombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={resetConfig}>
              <RotateCcw className="h-4 w-4" />
              Restaurar
            </Button>
            <Button size="sm" className="gap-2" onClick={saveConfig} disabled={loading}>
              <Save className="h-4 w-4" />
              Guardar estilos
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor Panel */}
          <div className="w-[420px] border-r flex flex-col bg-muted/30 shrink-0">
            <ScrollArea className="flex-1">
              <div className="p-4">
                <Accordion type="multiple" defaultValue={["colors", "typography", "layout"]} className="space-y-2">
                  {/* Colors Section */}
                  <AccordionItem value="colors" className="border rounded-lg px-3 bg-background">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        <span className="font-medium text-sm">Colores</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Presets de color</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {COLOR_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => applyColorPreset(preset)}
                              className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                            >
                              <div className="flex gap-1">
                                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: preset.primary }} />
                                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: preset.accent }} />
                              </div>
                              <span className="text-xs font-medium truncate">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <ColorPicker label="Color Principal" value={config.colors.primary} onChange={(v) => updateColor("primary", v)} />
                        <ColorPicker label="Color Secundario" value={config.colors.primaryDark} onChange={(v) => updateColor("primaryDark", v)} />
                        <ColorPicker label="Color de Acento" value={config.colors.accent} onChange={(v) => updateColor("accent", v)} />
                        <ColorPicker label="Fondo del Encabezado" value={config.colors.headerBackground} onChange={(v) => updateColor("headerBackground", v)} />
                        <ColorPicker label="Fondo de Tablas/Totales" value={config.colors.tableBackground} onChange={(v) => updateColor("tableBackground", v)} />
                        <Separator className="my-2" />
                        <Label className="text-xs font-medium text-foreground">Textos del Encabezado</Label>
                        <ColorPicker label="Título de encabezado" value={config.colors.headerTitleText} onChange={(v) => updateColor("headerTitleText", v)} />
                        <ColorPicker label="Subtítulo de encabezado" value={config.colors.headerSubtitleText} onChange={(v) => updateColor("headerSubtitleText", v)} />
                        <ColorPicker label="Texto de contacto" value={config.colors.headerContactText} onChange={(v) => updateColor("headerContactText", v)} />
                        <Separator className="my-2" />
                        <Label className="text-xs font-medium text-foreground">Textos del Contenido</Label>
                        <ColorPicker label="Texto Principal" value={config.colors.textDark} onChange={(v) => updateColor("textDark", v)} />
                        <ColorPicker label="Texto Secundario" value={config.colors.textMuted} onChange={(v) => updateColor("textMuted", v)} />
                        <ColorPicker label="Color de Borde" value={config.colors.border} onChange={(v) => updateColor("border", v)} />
                        <Separator className="my-2" />
                        <Label className="text-xs font-medium text-foreground">Pie de Página</Label>
                        <ColorPicker label="Barra separadora del pie" value={config.colors.footerSeparator} onChange={(v) => updateColor("footerSeparator", v)} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Typography Section */}
                  <AccordionItem value="typography" className="border rounded-lg px-3 bg-background">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        <span className="font-medium text-sm">Tipografía</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Familia de fuente</Label>
                        <Select value={config.typography.fontFamily} onValueChange={(v) => updateTypography("fontFamily", v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="helvetica">Helvetica (Sans-serif)</SelectItem>
                            <SelectItem value="times">Times (Serif)</SelectItem>
                            <SelectItem value="courier">Courier (Monospace)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <SizeSlider label="Título del encabezado" value={config.typography.headerTitleSize} min={12} max={24} onChange={(v) => updateTypography("headerTitleSize", v)} />
                      <SizeSlider label="Subtítulo" value={config.typography.headerSubtitleSize} min={7} max={14} onChange={(v) => updateTypography("headerSubtitleSize", v)} />
                      <SizeSlider label="Títulos de sección" value={config.typography.sectionTitleSize} min={8} max={16} onChange={(v) => updateTypography("sectionTitleSize", v)} />
                      <SizeSlider label="Texto del cuerpo" value={config.typography.bodyTextSize} min={8} max={14} onChange={(v) => updateTypography("bodyTextSize", v)} />
                      <SizeSlider label="Texto pequeño" value={config.typography.smallTextSize} min={6} max={10} onChange={(v) => updateTypography("smallTextSize", v)} />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Layout Section */}
                  <AccordionItem value="layout" className="border rounded-lg px-3 bg-background">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Layout className="h-4 w-4" />
                        <span className="font-medium text-sm">Diseño</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-4">
                      <SizeSlider label="Margen horizontal" value={config.layout.marginHorizontal} min={10} max={25} suffix="mm" onChange={(v) => updateLayout("marginHorizontal", v)} />
                      <SizeSlider label="Altura del encabezado" value={config.layout.headerHeight} min={25} max={50} suffix="mm" onChange={(v) => updateLayout("headerHeight", v)} />
                      <SizeSlider label="Espaciado entre secciones" value={config.layout.sectionSpacing} min={6} max={20} suffix="mm" onChange={(v) => updateLayout("sectionSpacing", v)} />
                      <Separator />
                      <Label className="text-xs font-medium text-foreground">Datos del Cliente</Label>
                      <SizeSlider label="Ancho columna cliente" value={config.layout.clientColumnWidth} min={50} max={75} suffix="%" onChange={(v) => updateLayout("clientColumnWidth", v)} />
                      <SizeSlider label="Alto sección cliente" value={config.layout.clientSectionHeight} min={30} max={60} suffix="mm" onChange={(v) => updateLayout("clientSectionHeight", v)} />
                      <SizeSlider label="Interlineado cliente" value={config.layout.clientLineSpacing} min={4} max={10} suffix="mm" onChange={(v) => updateLayout("clientLineSpacing", v)} />
                      <Separator />
                      <Label className="text-xs font-medium text-foreground">Tablas</Label>
                      <SizeSlider label="Separación entre tablas" value={config.layout.tableSeparation} min={8} max={30} suffix="mm" onChange={(v) => updateLayout("tableSeparation", v)} />
                      <Separator />
                      <div className="space-y-3">
                        <ToggleOption label="Mostrar logo" checked={config.layout.showLogo} onChange={(v) => updateLayout("showLogo", v)} />
                        <ToggleOption label="Mostrar slogan" checked={config.layout.showSlogan} onChange={(v) => updateLayout("showSlogan", v)} />
                        <ToggleOption label="Mostrar información bancaria" checked={config.layout.showBankInfo} onChange={(v) => updateLayout("showBankInfo", v)} />
                        <ToggleOption label="Mostrar términos y condiciones" checked={config.layout.showTerms} onChange={(v) => updateLayout("showTerms", v)} />
                        <ToggleOption label="Mostrar proyección de calendario" checked={config.layout.showCalendarProjection} onChange={(v) => updateLayout("showCalendarProjection", v)} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Company Info */}
                  <AccordionItem value="company" className="border rounded-lg px-3 bg-background">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium text-sm">Datos de la empresa</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Nombre</Label>
                        <Input value={config.company.name} onChange={(e) => updateCompany("name", e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Slogan</Label>
                        <Input value={config.company.slogan} onChange={(e) => updateCompany("slogan", e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Dirección</Label>
                        <Input value={config.company.address} onChange={(e) => updateCompany("address", e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Teléfono</Label>
                        <Input value={config.company.phone} onChange={(e) => updateCompany("phone", e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <Input value={config.company.email} onChange={(e) => updateCompany("email", e.target.value)} className="mt-1" />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Bank Info */}
                  <AccordionItem value="bank" className="border rounded-lg px-3 bg-background">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4" />
                        <span className="font-medium text-sm">Cuentas bancarias</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">BCP Soles</Label>
                        <Input value={config.bank.bcp_soles} onChange={(e) => updateBank("bcp_soles", e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">BCP Dólares</Label>
                        <Input value={config.bank.bcp_dolares} onChange={(e) => updateBank("bcp_dolares", e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Interbank Soles</Label>
                        <Input value={config.bank.interbank_soles} onChange={(e) => updateBank("interbank_soles", e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Interbank Dólares</Label>
                        <Input value={config.bank.interbank_dolares} onChange={(e) => updateBank("interbank_dolares", e.target.value)} className="mt-1" />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Annotations */}
                  <AccordionItem value="annotations" className="border rounded-lg px-3 bg-background">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium text-sm">Anotaciones</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Estas anotaciones aparecen junto a los totales en el PDF.
                      </p>
                      {config.annotations.map((annotation, index) => (
                        <div key={index} className="flex gap-2">
                          <Input 
                            value={annotation} 
                            onChange={(e) => {
                              const newAnnotations = [...config.annotations];
                              newAnnotations[index] = e.target.value;
                              setConfig(prev => ({ ...prev, annotations: newAnnotations }));
                            }} 
                            className="flex-1"
                            placeholder={`Anotación ${index + 1}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-10 w-10 text-destructive hover:text-destructive"
                            onClick={() => {
                              const newAnnotations = config.annotations.filter((_, i) => i !== index);
                              setConfig(prev => ({ ...prev, annotations: newAnnotations }));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => {
                          setConfig(prev => ({ ...prev, annotations: [...prev.annotations, "• Nueva anotación"] }));
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Agregar anotación
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </ScrollArea>

            {/* Generate Preview Button */}
            <div className="p-4 border-t bg-background">
              <Button
                variant="secondary"
                size="lg"
                className="w-full gap-2"
                onClick={generatePreview}
                disabled={isGeneratingPreview}
              >
                <Eye className="h-4 w-4" />
                {isGeneratingPreview ? "Generando..." : "Generar Vista Previa"}
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
            <div className="px-6 py-4 border-b bg-background flex items-center justify-between shrink-0">
              <div>
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  Vista Previa del PDF
                </h4>
                <p className="text-sm text-muted-foreground">Plantilla: {plantillaNombre}</p>
              </div>
              {previewUrl && (
                <Button variant="outline" size="sm" className="gap-2" onClick={downloadPreview}>
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </Button>
              )}
            </div>

            <div className="flex-1 p-8 flex items-start justify-center overflow-auto bg-[#e5e5e5]">
              {previewUrl ? (
                <div className="bg-white rounded-lg shadow-2xl overflow-hidden" style={{ width: "595px", minHeight: "842px" }}>
                  <object
                    data={previewUrl}
                    type="application/pdf"
                    className="w-full"
                    style={{ height: "842px" }}
                  >
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <p className="text-muted-foreground mb-4">No se puede mostrar el PDF en este navegador.</p>
                      <Button variant="outline" onClick={downloadPreview} className="gap-2">
                        <Download className="h-4 w-4" />
                        Descargar PDF
                      </Button>
                    </div>
                  </object>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-32 h-44 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center mb-6 bg-white">
                    <Eye className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground text-base font-medium">
                    Haz clic en "Generar Vista Previa" para ver el PDF
                  </p>
                  <p className="text-muted-foreground/60 text-sm mt-2">
                    Personaliza los estilos y genera una vista previa con datos de ejemplo
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper Components
function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 p-1 rounded border hover:bg-muted/50 transition-colors">
            <div className="w-6 h-6 rounded border" style={{ backgroundColor: value }} />
            <span className="text-xs font-mono">{value}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="space-y-3">
            <Input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-32 cursor-pointer p-1" />
            <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="#FFFFFF" className="font-mono text-sm" />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SizeSlider({ label, value, min, max, suffix = "pt", onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Badge variant="secondary" className="text-xs font-mono">{value}{suffix}</Badge>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={([v]) => onChange(v)} className="w-full" />
    </div>
  );
}

function ToggleOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
