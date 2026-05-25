import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImportCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FieldConfig {
  name: string;
  label: string;
  required: boolean;
  defaultRequired: boolean;
}

const CSV_FIELDS: FieldConfig[] = [
  { name: "id", label: "ID", required: false, defaultRequired: false },
  { name: "codigo", label: "Código (RUC/DNI)", required: true, defaultRequired: true },
  { name: "razon_social", label: "Razón Social", required: true, defaultRequired: true },
  { name: "nombre_comercial", label: "Nombre Comercial", required: false, defaultRequired: false },
  { name: "direccion", label: "Dirección", required: false, defaultRequired: false },
  { name: "telefono", label: "Teléfono", required: false, defaultRequired: false },
  { name: "email", label: "Email", required: false, defaultRequired: false },
  { name: "contacto_nombre", label: "Contacto Nombre", required: false, defaultRequired: false },
  { name: "contacto_telefono", label: "Contacto Teléfono", required: false, defaultRequired: false },
  { name: "contacto_email", label: "Contacto Email", required: false, defaultRequired: false },
  { name: "sector", label: "Sector", required: false, defaultRequired: false },
  { name: "notas", label: "Notas", required: false, defaultRequired: false },
  { name: "activo", label: "Activo", required: false, defaultRequired: false },
  { name: "created_by", label: "Creado Por", required: false, defaultRequired: false },
  { name: "created_at", label: "Fecha Creación", required: false, defaultRequired: false },
  { name: "updated_at", label: "Fecha Actualización", required: false, defaultRequired: false },
  { name: "tipo_cliente", label: "Tipo Cliente", required: false, defaultRequired: false },
  { name: "nombre_persona_natural", label: "Nombre Persona Natural", required: false, defaultRequired: false },
  { name: "contacto_telefono2", label: "Contacto Teléfono 2", required: false, defaultRequired: false },
  { name: "contacto_nombre2", label: "Contacto Nombre 2", required: false, defaultRequired: false },
  { name: "regimen_tributario", label: "Régimen Tributario", required: false, defaultRequired: false },
  { name: "regimen_laboral", label: "Régimen Laboral", required: false, defaultRequired: false },
  { name: "actividad_economica", label: "Actividad Económica", required: false, defaultRequired: false },
  { name: "usuario_sunat", label: "Usuario SUNAT", required: false, defaultRequired: false },
  { name: "clave_sunat", label: "Clave SUNAT", required: false, defaultRequired: false },
  { name: "nro_trabajadores", label: "Nro. Trabajadores", required: false, defaultRequired: false },
];

interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
  total: number;
}

export function ImportCSVDialog({ open, onOpenChange, onSuccess }: ImportCSVDialogProps) {
  const [delimiter, setDelimiter] = useState<"," | ";">(",");
  const [generateId, setGenerateId] = useState(true);
  const [registerCreatedAt, setRegisterCreatedAt] = useState(true);
  const [registerUpdatedAt, setRegisterUpdatedAt] = useState(true);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>(CSV_FIELDS);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setImporting(false);
    setProgress(0);
    setResult(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const toggleFieldRequired = (fieldName: string) => {
    setFieldConfigs((prev) =>
      prev.map((field) =>
        field.name === fieldName ? { ...field, required: !field.required } : field
      )
    );
  };

  const downloadTemplate = () => {
    const headers = CSV_FIELDS.map((f) => f.name).join(delimiter);
    const sampleRow = CSV_FIELDS.map((f) => {
      switch (f.name) {
        case "id": return "";
        case "codigo": return "20123456789";
        case "razon_social": return "Empresa Ejemplo S.A.C.";
        case "nombre_comercial": return "Ejemplo";
        case "direccion": return "Av. Principal 123";
        case "telefono": return "01-1234567";
        case "email": return "contacto@ejemplo.com";
        case "contacto_nombre": return "Juan Pérez";
        case "contacto_telefono": return "999888777";
        case "contacto_email": return "juan@ejemplo.com";
        case "sector": return "Comercio";
        case "notas": return "Cliente nuevo";
        case "activo": return "true";
        case "created_by": return "";
        case "created_at": return "";
        case "updated_at": return "";
        case "tipo_cliente": return "empresa";
        case "nombre_persona_natural": return "";
        case "contacto_telefono2": return "";
        case "contacto_nombre2": return "";
        case "regimen_tributario": return "Régimen General";
        case "regimen_laboral": return "Régimen General";
        case "actividad_economica": return "Venta al por mayor";
        case "usuario_sunat": return "USUARIO123";
        case "clave_sunat": return "";
        case "nro_trabajadores": return "10";
        default: return "";
      }
    }).join(delimiter);

    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_clientes.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Plantilla descargada correctamente");
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === delimiter) {
          currentRow.push(currentField.trim());
          currentField = "";
        } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
          currentRow.push(currentField.trim());
          if (currentRow.some((field) => field !== "")) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = "";
          if (char === "\r") i++;
        } else if (char !== "\r") {
          currentField += char;
        }
      }
    }

    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field !== "")) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const importCSV = async () => {
    if (!file) {
      toast.error("Por favor selecciona un archivo CSV");
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Debes iniciar sesión para importar clientes");
        setImporting(false);
        return;
      }

      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length < 2) {
        toast.error("El archivo CSV debe tener al menos una fila de datos");
        setImporting(false);
        return;
      }

      const headers = rows[0].map((h) => h.toLowerCase().trim());
      const dataRows = rows.slice(1);
      const requiredFields = fieldConfigs.filter((f) => f.required).map((f) => f.name);

      const importResult: ImportResult = {
        success: 0,
        errors: [],
        total: dataRows.length,
      };

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        setProgress(Math.round(((i + 1) / dataRows.length) * 100));

        try {
          const rowData: Record<string, any> = {};

          headers.forEach((header, index) => {
            const value = row[index] || "";
            if (CSV_FIELDS.some((f) => f.name === header)) {
              rowData[header] = value;
            }
          });

          // Validate required fields
          const missingFields = requiredFields.filter(
            (field) => !rowData[field] || rowData[field].toString().trim() === ""
          );

          if (missingFields.length > 0) {
            importResult.errors.push({
              row: i + 2,
              message: `Campos obligatorios vacíos: ${missingFields.join(", ")}`,
            });
            continue;
          }

          // Generate ID if enabled
          if (generateId) {
            delete rowData.id;
          }

          // Set created_by to current user
          rowData.created_by = user.id;

          // Handle timestamps
          if (registerCreatedAt) {
            rowData.created_at = new Date().toISOString();
          } else if (!rowData.created_at) {
            delete rowData.created_at;
          }

          if (registerUpdatedAt) {
            rowData.updated_at = new Date().toISOString();
          } else if (!rowData.updated_at) {
            delete rowData.updated_at;
          }

          // Convert activo to boolean
          if (rowData.activo !== undefined) {
            rowData.activo = rowData.activo.toLowerCase() === "true" || rowData.activo === "1";
          } else {
            rowData.activo = true;
          }

          // Convert nro_trabajadores to number
          if (rowData.nro_trabajadores) {
            const num = parseInt(rowData.nro_trabajadores, 10);
            rowData.nro_trabajadores = isNaN(num) ? null : num;
          }

          // Set default tipo_cliente if not provided
          if (!rowData.tipo_cliente) {
            rowData.tipo_cliente = "empresa";
          }

          // Clean empty values
          Object.keys(rowData).forEach((key) => {
            if (rowData[key] === "") {
              rowData[key] = null;
            }
          });

          // Check if record exists by codigo (RUC/DNI)
          if (replaceExisting && rowData.codigo) {
            const { data: existingClient } = await supabase
              .from("clientes")
              .select("id")
              .eq("codigo", rowData.codigo)
              .maybeSingle();

            if (existingClient) {
              // Update existing record
              const { error } = await supabase
                .from("clientes")
                .update(rowData as any)
                .eq("id", existingClient.id);

              if (error) {
                importResult.errors.push({
                  row: i + 2,
                  message: `Error al actualizar: ${error.message}`,
                });
              } else {
                importResult.success++;
              }
              continue;
            }
          }

          const { error } = await supabase.from("clientes").insert([rowData as any]);

          if (error) {
            importResult.errors.push({
              row: i + 2,
              message: error.message,
            });
          } else {
            importResult.success++;
          }
        } catch (error: any) {
          importResult.errors.push({
            row: i + 2,
            message: error.message || "Error desconocido",
          });
        }
      }

      setResult(importResult);

      if (importResult.success > 0) {
        toast.success(`Se importaron ${importResult.success} de ${importResult.total} clientes`);
        onSuccess();
      }

      if (importResult.errors.length > 0) {
        toast.warning(`${importResult.errors.length} registros con errores`);
      }
    } catch (error: any) {
      toast.error("Error al procesar el archivo: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Clientes desde CSV
          </DialogTitle>
          <DialogDescription>
            Importa múltiples clientes desde un archivo CSV
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Download Template */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">1. Descargar Plantilla</h4>
                <p className="text-sm text-muted-foreground">
                  Descarga la plantilla CSV con todos los campos disponibles
                </p>
              </div>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Descargar Plantilla
              </Button>
            </div>
          </div>

          {/* Import Options */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-foreground">2. Opciones de Importación</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Delimiter */}
              <div className="space-y-3">
                <Label>Delimitador del CSV</Label>
                <RadioGroup
                  value={delimiter}
                  onValueChange={(v) => setDelimiter(v as "," | ";")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="," id="comma" />
                    <Label htmlFor="comma" className="font-normal cursor-pointer">
                      Coma (,)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value=";" id="semicolon" />
                    <Label htmlFor="semicolon" className="font-normal cursor-pointer">
                      Punto y coma (;)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Toggle Options */}
              <div className="space-y-3">
                <Label>Opciones automáticas</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="generateId" className="font-normal">
                      Generar ID automáticamente
                    </Label>
                    <Switch
                      id="generateId"
                      checked={generateId}
                      onCheckedChange={setGenerateId}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="createdAt" className="font-normal">
                      Registrar fecha de creación
                    </Label>
                    <Switch
                      id="createdAt"
                      checked={registerCreatedAt}
                      onCheckedChange={setRegisterCreatedAt}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="updatedAt" className="font-normal">
                      Registrar fecha de actualización
                    </Label>
                    <Switch
                      id="updatedAt"
                      checked={registerUpdatedAt}
                      onCheckedChange={setRegisterUpdatedAt}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="replaceExisting" className="font-normal">
                      Reemplazar si ya existe (por Código RUC/DNI)
                    </Label>
                    <Switch
                      id="replaceExisting"
                      checked={replaceExisting}
                      onCheckedChange={setReplaceExisting}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Required Fields */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <div>
              <h4 className="font-medium text-foreground">3. Campos Obligatorios</h4>
              <p className="text-sm text-muted-foreground">
                Marca los campos que son obligatorios para la importación
              </p>
            </div>
            <ScrollArea className="h-48 rounded-md border border-border p-3">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {fieldConfigs.map((field) => (
                  <div key={field.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.name}
                      checked={field.required}
                      onCheckedChange={() => toggleFieldRequired(field.name)}
                      disabled={field.defaultRequired}
                    />
                    <Label
                      htmlFor={field.name}
                      className={`font-normal text-sm cursor-pointer ${
                        field.defaultRequired ? "text-muted-foreground" : ""
                      }`}
                    >
                      {field.label}
                      {field.defaultRequired && " *"}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              * Campos marcados con asterisco son obligatorios por defecto y no pueden ser desactivados
            </p>
          </div>

          {/* File Upload */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-foreground">4. Seleccionar Archivo</h4>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Seleccionar CSV
              </Button>
              {file && (
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importando...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <Alert variant={result.errors.length === 0 ? "default" : "destructive"}>
                {result.errors.length === 0 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {result.errors.length === 0
                    ? "Importación completada"
                    : "Importación con observaciones"}
                </AlertTitle>
                <AlertDescription>
                  {result.success} de {result.total} clientes importados correctamente.
                  {result.errors.length > 0 && ` ${result.errors.length} registros con errores.`}
                </AlertDescription>
              </Alert>

              {result.errors.length > 0 && (
                <div className="bg-destructive/10 rounded-lg p-4">
                  <h5 className="font-medium text-destructive mb-2">Errores encontrados:</h5>
                  <ScrollArea className="h-32">
                    <div className="space-y-1 text-sm">
                      {result.errors.map((error, index) => (
                        <div key={index} className="text-destructive">
                          <span className="font-medium">Fila {error.row}:</span> {error.message}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            onClick={importCSV}
            disabled={!file || importing}
            className="btn-gradient gap-2"
          >
            {importing ? (
              <>Importando...</>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
