import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ParsedServicio {
  grupo_servicio: "Contabilidad" | "Trámites" | "Auditoría y Control Interno";
  tipo_servicio: string | null;
  regimen_tributario: string | null;
  compras_ventas_mensual_soles: string | null;
  compras_ventas_anual_soles: string | null;
  valoracion: string | null;
  entidad: string | null;
  servicio: string;
  base_imponible: number | null;
  igv_monto: number | null;
  precio_servicio: number | null;
  activo: boolean;
}

interface ImportResult {
  servicio: string;
  success: boolean;
  error?: string;
}

const COLUMN_HEADERS = [
  "GRUPO DE SERVICIO",
  "TIPO DE SERVICIO",
  "REGIMEN TRIBUTARIO",
  "COMPRAS/VENTAS MENSUAL SOLES",
  "COMPRAS/VENTAS ANUAL SOLES",
  "VALORACION",
  "ENTIDAD",
  "SERVICIO",
  "BASE IMPONIBLE",
  "IGV",
  "PRECIO DEL SERVICIO",
];

const VALID_GRUPOS = ["Contabilidad", "Trámites", "Auditoría y Control Interno"] as const;

export function ImportServiciosDialog() {
  const [open, setOpen] = useState(false);
  const [pastedData, setPastedData] = useState("");
  const [parsedData, setParsedData] = useState<ParsedServicio[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"paste" | "preview" | "importing" | "results">("paste");
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const queryClient = useQueryClient();

  const parseNumber = (value: string): number | null => {
    if (!value || value.trim() === "") return null;
    const cleaned = value.replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const normalizeGrupoServicio = (value: string): "Contabilidad" | "Trámites" | "Auditoría y Control Interno" | null => {
    const lower = value.toLowerCase().trim();
    if (lower.includes("contab")) return "Contabilidad";
    if (lower.includes("tramit") || lower.includes("trámit")) return "Trámites";
    if (lower.includes("audit") || lower.includes("control")) return "Auditoría y Control Interno";
    return null;
  };

  const parseExcelData = () => {
    const lines = pastedData.trim().split("\n");
    const newErrors: string[] = [];
    const parsed: ParsedServicio[] = [];

    if (lines.length === 0) {
      setErrors(["No se encontraron datos para importar"]);
      return;
    }

    // Check if first line is header
    const firstLine = lines[0].toLowerCase();
    const startIndex = firstLine.includes("grupo") || firstLine.includes("tipo") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by tab (Excel default) or multiple spaces
      const columns = line.split(/\t/);

      if (columns.length < 11) {
        newErrors.push(`Fila ${i + 1}: Número insuficiente de columnas (${columns.length} de 11 requeridas)`);
        continue;
      }

      const grupoServicioRaw = columns[0]?.trim();
      const grupoServicio = normalizeGrupoServicio(grupoServicioRaw || "");
      
      if (!grupoServicio) {
        newErrors.push(`Fila ${i + 1}: Grupo de servicio inválido "${grupoServicioRaw}". Debe ser Contabilidad, Trámites o Auditoría y Control Interno`);
        continue;
      }

      const descripcionServicio = columns[7]?.trim();
      if (!descripcionServicio) {
        newErrors.push(`Fila ${i + 1}: La descripción del servicio es obligatoria`);
        continue;
      }

      parsed.push({
        grupo_servicio: grupoServicio,
        tipo_servicio: columns[1]?.trim() || null,
        regimen_tributario: columns[2]?.trim() || null,
        compras_ventas_mensual_soles: columns[3]?.trim() || null,
        compras_ventas_anual_soles: columns[4]?.trim() || null,
        valoracion: columns[5]?.trim() || null,
        entidad: columns[6]?.trim() || null,
        servicio: descripcionServicio,
        base_imponible: parseNumber(columns[8] || ""),
        igv_monto: parseNumber(columns[9] || ""),
        precio_servicio: parseNumber(columns[10] || ""),
        activo: true,
      });
    }

    setErrors(newErrors);
    setParsedData(parsed);

    if (parsed.length > 0) {
      setStep("preview");
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsLoading(true);
    setStep("importing");
    setProgress(0);
    const results: ImportResult[] = [];
    
    // Import in batches of 10 for better UX
    const batchSize = 10;
    const totalBatches = Math.ceil(parsedData.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, parsedData.length);
      const batch = parsedData.slice(start, end);

      try {
        const { data, error } = await supabase.from("servicios").insert(batch).select();

        if (error) {
          // If batch fails, try one by one
          for (const item of batch) {
            try {
              const { error: singleError } = await supabase.from("servicios").insert(item);
              if (singleError) {
                results.push({
                  servicio: item.servicio,
                  success: false,
                  error: singleError.message,
                });
              } else {
                results.push({
                  servicio: item.servicio,
                  success: true,
                });
              }
            } catch (e: any) {
              results.push({
                servicio: item.servicio,
                success: false,
                error: e.message,
              });
            }
          }
        } else {
          // Batch success
          batch.forEach((item) => {
            results.push({
              servicio: item.servicio,
              success: true,
            });
          });
        }
      } catch (e: any) {
        // Batch failed completely
        batch.forEach((item) => {
          results.push({
            servicio: item.servicio,
            success: false,
            error: e.message,
          });
        });
      }

      // Update progress
      const newProgress = Math.round(((batchIndex + 1) / totalBatches) * 100);
      setProgress(newProgress);
    }

    setImportResults(results);
    setStep("results");
    setIsLoading(false);
    queryClient.invalidateQueries({ queryKey: ["servicios"] });

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount === 0) {
      toast.success(`${successCount} servicios importados correctamente`);
    } else if (successCount === 0) {
      toast.error(`No se pudo importar ningún servicio`);
    } else {
      toast.warning(`${successCount} importados, ${failCount} con errores`);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPastedData("");
    setParsedData([]);
    setErrors([]);
    setStep("paste");
    setProgress(0);
    setImportResults([]);
  };

  const getGrupoBadgeColor = (grupo: string) => {
    switch (grupo) {
      case "Contabilidad":
        return "bg-blue-100 text-blue-800";
      case "Trámites":
        return "bg-green-100 text-green-800";
      case "Auditoría y Control Interno":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const successCount = importResults.filter((r) => r.success).length;
  const failCount = importResults.filter((r) => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Servicios desde Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Servicios desde Excel
          </DialogTitle>
          <DialogDescription>
            Copia y pega los datos desde Excel respetando el orden de las columnas
          </DialogDescription>
        </DialogHeader>

        {step === "paste" && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Orden de columnas requerido:</strong>
                <div className="mt-2 flex flex-wrap gap-1">
                  {COLUMN_HEADERS.map((header, index) => (
                    <Badge key={header} variant="outline" className="text-xs">
                      {index + 1}. {header}
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 text-xs">
                  <strong>Grupos válidos:</strong> {VALID_GRUPOS.join(", ")}
                </div>
              </AlertDescription>
            </Alert>

            <Textarea
              placeholder="Pega aquí los datos copiados desde Excel (Ctrl+V)..."
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              className="flex-1 min-h-[200px] font-mono text-sm"
            />

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {errors.slice(0, 5).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {errors.length > 5 && <li>...y {errors.length - 5} errores más</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={parseExcelData} disabled={!pastedData.trim()}>
                Procesar Datos
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Se encontraron <strong>{parsedData.length}</strong> servicios para importar
                {errors.length > 0 && ` (${errors.length} filas con errores fueron omitidas)`}
              </AlertDescription>
            </Alert>

            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Régimen</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((servicio, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {servicio.servicio}
                      </TableCell>
                      <TableCell>
                        <Badge className={getGrupoBadgeColor(servicio.grupo_servicio)}>
                          {servicio.grupo_servicio}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {servicio.tipo_servicio || "-"}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {servicio.regimen_tributario || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {servicio.precio_servicio != null
                          ? `S/ ${servicio.precio_servicio.toFixed(2)}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("paste")}>
                Volver
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button onClick={handleImport} disabled={isLoading}>
                  {isLoading ? "Importando..." : `Importar ${parsedData.length} Servicios`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-primary animate-pulse" />
              <h3 className="mt-4 text-lg font-semibold">Importando servicios...</h3>
              <p className="text-muted-foreground">Por favor, no cierre esta ventana</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-center text-sm text-muted-foreground">
                Procesando {Math.round((progress / 100) * parsedData.length)} de {parsedData.length} servicios
              </p>
            </div>
          </div>
        )}

        {step === "results" && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>{successCount}</strong> servicios importados correctamente
                </AlertDescription>
              </Alert>
              
              {failCount > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{failCount}</strong> servicios con errores
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Results Table */}
            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="w-[100px]">Estado</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResults.map((result, index) => (
                    <TableRow key={index} className={result.success ? "" : "bg-red-50"}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="max-w-[250px] truncate">
                        {result.servicio}
                      </TableCell>
                      <TableCell>
                        {result.success ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {result.success ? "Importado correctamente" : result.error}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
