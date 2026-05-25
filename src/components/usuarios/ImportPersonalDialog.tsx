import { useState } from 'react';
import { Loader2, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportPersonalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ParsedRow {
  dni: string;
  nombre_completo: string;
  puesto: string;
  email: string;
  telefono: string;
  isValid: boolean;
  error?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const ImportPersonalDialog = ({ open, onOpenChange, onImportComplete }: ImportPersonalDialogProps) => {
  const [rawData, setRawData] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'input' | 'preview' | 'result'>('input');

  const parseExcelData = (data: string): ParsedRow[] => {
    const lines = data.trim().split('\n');
    const parsed: ParsedRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by tab (Excel default) or comma
      const columns = line.includes('\t') ? line.split('\t') : line.split(',');
      
      // Skip header row if detected
      if (i === 0 && columns[0]?.toLowerCase().includes('dni')) {
        continue;
      }

      const [dni, nombre_completo, puesto, email, telefono] = columns.map(c => c?.trim() || '');

      const errors: string[] = [];
      
      if (!nombre_completo) {
        errors.push('Nombre requerido');
      }
      
      if (!email) {
        errors.push('Email requerido');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Email inválido');
      }

      if (dni && !/^\d{8}$/.test(dni)) {
        errors.push('DNI debe tener 8 dígitos');
      }

      parsed.push({
        dni: dni || '',
        nombre_completo: nombre_completo || '',
        puesto: puesto || '',
        email: email || '',
        telefono: telefono || '',
        isValid: errors.length === 0,
        error: errors.length > 0 ? errors.join(', ') : undefined,
      });
    }

    return parsed;
  };

  const handleValidate = () => {
    const parsed = parseExcelData(rawData);
    setParsedData(parsed);
    setStep('preview');
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(row => row.isValid);
    
    if (validRows.length === 0) {
      toast.error('No hay registros válidos para importar');
      return;
    }

    setImporting(true);
    setProgress(0);

    const importResult: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      
      try {
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: crypto.randomUUID(),
            email: row.email,
            full_name: row.nombre_completo,
            phone: row.telefono || null,
            dni: row.dni || null,
            puesto: row.puesto || null,
          });

        if (error) {
          importResult.failed++;
          if (error.code === '23505') {
            importResult.errors.push({
              row: i + 1,
              message: `${row.email} - Email ya existe`,
            });
          } else {
            importResult.errors.push({
              row: i + 1,
              message: `${row.email} - ${error.message}`,
            });
          }
        } else {
          importResult.success++;
        }
      } catch (error: any) {
        importResult.failed++;
        importResult.errors.push({
          row: i + 1,
          message: `${row.email} - Error inesperado`,
        });
      }

      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setResult(importResult);
    setStep('result');
    setImporting(false);

    if (importResult.success > 0) {
      onImportComplete();
    }
  };

  const handleClose = () => {
    setRawData('');
    setParsedData([]);
    setResult(null);
    setStep('input');
    setProgress(0);
    onOpenChange(false);
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Personal
          </DialogTitle>
          <DialogDescription>
            Copia y pega los registros desde Excel con el formato: DNI, Nombre Completo, Puesto, Email, Teléfono
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Formato esperado</AlertTitle>
                <AlertDescription className="font-mono text-xs mt-2">
                  dni, nombre_completo, puesto, email, telefono<br />
                  12345678, Juan Pérez, Contador, juan@email.com, 999999999
                </AlertDescription>
              </Alert>
              
              <Textarea
                placeholder="Pega aquí los datos copiados desde Excel..."
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleValidate} 
                disabled={!rawData.trim()}
              >
                Validar Datos
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{validCount} válidos</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span>{invalidCount} con errores</span>
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Estado</th>
                      <th className="text-left px-3 py-2 font-medium">DNI</th>
                      <th className="text-left px-3 py-2 font-medium">Nombre</th>
                      <th className="text-left px-3 py-2 font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedData.map((row, index) => (
                      <tr key={index} className={row.isValid ? '' : 'bg-destructive/10'}>
                        <td className="px-3 py-2">
                          {row.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="text-xs text-destructive">{row.error}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{row.dni || '-'}</td>
                        <td className="px-3 py-2">{row.nombre_completo || '-'}</td>
                        <td className="px-3 py-2">{row.email || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importing && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Importando... {progress}%
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep('input')}
                disabled={importing}
              >
                Volver
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={importing || validCount === 0}
              >
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Importar {validCount} Registros
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'result' && result && (
          <>
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 gap-3">
                {result.failed === 0 ? (
                  <>
                    <CheckCircle className="h-12 w-12 text-green-600" />
                    <p className="text-lg font-medium text-green-600">
                      ¡Importación completada!
                    </p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-12 w-12 text-amber-500" />
                    <p className="text-lg font-medium text-amber-500">
                      Importación completada con errores
                    </p>
                  </>
                )}
                <p className="text-muted-foreground">
                  {result.success} registros importados, {result.failed} con errores
                </p>
              </div>

              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Errores encontrados</AlertTitle>
                  <AlertDescription className="mt-2">
                    <ul className="list-disc pl-4 text-sm space-y-1">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>Fila {err.row}: {err.message}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>...y {result.errors.length - 10} errores más</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>
                Cerrar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportPersonalDialog;
