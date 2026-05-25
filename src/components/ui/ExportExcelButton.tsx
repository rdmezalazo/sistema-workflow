import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { exportRowsToExcel, ExportColumn } from "@/lib/exportToExcel";

interface ExportExcelButtonProps<T> {
  allRows: T[];
  filteredRows: T[];
  columns: ExportColumn<T>[];
  fileName: string;
  sheetName?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  hasFilters?: boolean;
}

export function ExportExcelButton<T>({
  allRows,
  filteredRows,
  columns,
  fileName,
  sheetName,
  label = "Exportar Excel",
  variant = "outline",
  size = "default",
  className,
  hasFilters = true,
}: ExportExcelButtonProps<T>) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"filtered" | "all">("filtered");

  const handleClick = () => {
    if (!hasFilters || allRows.length === filteredRows.length) {
      // No filters applied, export directly
      exportRowsToExcel(allRows, columns, fileName, sheetName);
      return;
    }
    setOpen(true);
  };

  const handleConfirm = () => {
    const rows = scope === "filtered" ? filteredRows : allRows;
    exportRowsToExcel(rows, columns, fileName, sheetName);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={`gap-2 ${className ?? ""}`}
      >
        <Download className="h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar a Excel</DialogTitle>
            <DialogDescription>
              Elige qué información quieres exportar.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={scope}
            onValueChange={(v) => setScope(v as "filtered" | "all")}
            className="space-y-3 py-2"
          >
            <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 cursor-pointer">
              <RadioGroupItem value="filtered" id="scope-filtered" className="mt-1" />
              <Label htmlFor="scope-filtered" className="flex-1 cursor-pointer">
                <div className="font-medium">Datos filtrados</div>
                <div className="text-sm text-muted-foreground">
                  {filteredRows.length} registro{filteredRows.length !== 1 ? "s" : ""}{" "}
                  visibles según los filtros actuales
                </div>
              </Label>
            </div>
            <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 cursor-pointer">
              <RadioGroupItem value="all" id="scope-all" className="mt-1" />
              <Label htmlFor="scope-all" className="flex-1 cursor-pointer">
                <div className="font-medium">Todos los registros</div>
                <div className="text-sm text-muted-foreground">
                  {allRows.length} registro{allRows.length !== 1 ? "s" : ""} totales
                  (sin filtros)
                </div>
              </Label>
            </div>
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
