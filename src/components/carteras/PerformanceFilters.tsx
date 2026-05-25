import { useState } from "react";
import { format, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, CalendarDays, CalendarRange, Infinity, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeFilter, TimeFilterConfig, DateRange } from "@/hooks/useCarteraPerformance";

interface PerformanceFiltersProps {
  filterConfig: TimeFilterConfig;
  onFilterChange: (config: TimeFilterConfig) => void;
  contractFilter: string | null;
  onContractFilterChange: (contractId: string | null) => void;
  contracts: { id: string; numero: string }[];
}

// Generate last 12 months for month selector
function getLast12Months(): Date[] {
  const months: Date[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    months.push(subMonths(now, i));
  }
  return months;
}

export function PerformanceFilters({
  filterConfig,
  onFilterChange,
  contractFilter,
  onContractFilterChange,
  contracts,
}: PerformanceFiltersProps) {
  const [monthSelectorOpen, setMonthSelectorOpen] = useState(false);
  const [rangeSelectorOpen, setRangeSelectorOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange>({
    from: filterConfig.dateRange?.from,
    to: filterConfig.dateRange?.to,
  });

  const months = getLast12Months();

  const handleTimeFilterChange = (value: string) => {
    if (!value) return;
    
    const newType = value as TimeFilter;
    
    if (newType === "month") {
      // When clicking month, show selector
      setMonthSelectorOpen(true);
    } else if (newType === "range") {
      // When clicking range, show date picker
      setRangeSelectorOpen(true);
    } else {
      onFilterChange({ type: newType });
    }
  };

  const handleMonthSelect = (month: Date) => {
    onFilterChange({ type: "month", selectedMonth: month });
    setMonthSelectorOpen(false);
  };

  const handleApplyRange = () => {
    if (tempDateRange.from) {
      onFilterChange({ type: "range", dateRange: tempDateRange });
      setRangeSelectorOpen(false);
    }
  };

  const getMonthLabel = () => {
    if (filterConfig.type === "month" && filterConfig.selectedMonth) {
      return format(filterConfig.selectedMonth, "MMM yyyy", { locale: es });
    }
    return "Mes";
  };

  const getRangeLabel = () => {
    if (filterConfig.type === "range" && filterConfig.dateRange?.from) {
      const from = format(filterConfig.dateRange.from, "dd/MM", { locale: es });
      const to = filterConfig.dateRange.to 
        ? format(filterConfig.dateRange.to, "dd/MM", { locale: es })
        : from;
      return `${from} - ${to}`;
    }
    return "Rango";
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      {/* Time Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Período:</span>
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          <ToggleGroup
            type="single"
            value={filterConfig.type}
            onValueChange={handleTimeFilterChange}
          >
            <ToggleGroupItem
              value="today"
              aria-label="Hoy"
              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
            >
              <CalendarIcon className="h-4 w-4 mr-1.5" />
              Hoy
            </ToggleGroupItem>
            <ToggleGroupItem
              value="week"
              aria-label="Semana"
              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
            >
              <CalendarDays className="h-4 w-4 mr-1.5" />
              Semana
            </ToggleGroupItem>
            
            {/* Month with Popover */}
            <Popover open={monthSelectorOpen} onOpenChange={setMonthSelectorOpen}>
              <PopoverTrigger asChild>
                <ToggleGroupItem
                  value="month"
                  aria-label="Mes"
                  className={cn(
                    "data-[state=on]:bg-background data-[state=on]:shadow-sm px-3",
                    filterConfig.type === "month" && "bg-background shadow-sm"
                  )}
                  data-state={filterConfig.type === "month" ? "on" : "off"}
                >
                  <CalendarRange className="h-4 w-4 mr-1.5" />
                  {getMonthLabel()}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </ToggleGroupItem>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="grid gap-1">
                  {months.map((month, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal",
                        filterConfig.selectedMonth?.getMonth() === month.getMonth() &&
                        filterConfig.selectedMonth?.getFullYear() === month.getFullYear() &&
                        "bg-accent"
                      )}
                      onClick={() => handleMonthSelect(month)}
                    >
                      {format(month, "MMMM yyyy", { locale: es })}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Range with Popover */}
            <Popover open={rangeSelectorOpen} onOpenChange={setRangeSelectorOpen}>
              <PopoverTrigger asChild>
                <ToggleGroupItem
                  value="range"
                  aria-label="Rango"
                  className={cn(
                    "data-[state=on]:bg-background data-[state=on]:shadow-sm px-3",
                    filterConfig.type === "range" && "bg-background shadow-sm"
                  )}
                  data-state={filterConfig.type === "range" ? "on" : "off"}
                >
                  <CalendarDays className="h-4 w-4 mr-1.5" />
                  {getRangeLabel()}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </ToggleGroupItem>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="space-y-3">
                  <Calendar
                    mode="range"
                    selected={{
                      from: tempDateRange.from,
                      to: tempDateRange.to,
                    }}
                    onSelect={(range) => {
                      setTempDateRange({
                        from: range?.from,
                        to: range?.to,
                      });
                    }}
                    numberOfMonths={2}
                    locale={es}
                    className="pointer-events-auto"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRangeSelectorOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApplyRange}
                      disabled={!tempDateRange.from}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <ToggleGroupItem
              value="all"
              aria-label="Todo"
              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
            >
              <Infinity className="h-4 w-4 mr-1.5" />
              Todo
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Contract Filter */}
      {contracts.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Contrato:</span>
          <Select
            value={contractFilter || "all"}
            onValueChange={(value) => onContractFilterChange(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los contratos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los contratos</SelectItem>
              {contracts.map((contract) => (
                <SelectItem key={contract.id} value={contract.id}>
                  {contract.numero}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
