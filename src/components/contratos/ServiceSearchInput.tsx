import { useState, useEffect, useMemo } from "react";
import { Check, Search, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Servicio {
  id: string;
  servicio: string;
  tipo_servicio: string;
  grupo_servicio: string | null;
  precio_servicio: number | null;
  base_imponible: number | null;
  igv_monto: number | null;
}

interface ServiceSearchInputProps {
  value: string;
  onChange: (value: string, precio?: number) => void;
  placeholder?: string;
  className?: string;
  colorIndicator?: React.ReactNode;
  disabled?: boolean;
}

export const ServiceSearchInput = ({
  value,
  onChange,
  placeholder = "Buscar o escribir servicio...",
  className,
  colorIndicator,
  disabled = false,
}: ServiceSearchInputProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServicios = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("servicios")
        .select("id, servicio, tipo_servicio, grupo_servicio, precio_servicio, base_imponible, igv_monto")
        .eq("activo", true)
        .order("grupo_servicio")
        .order("servicio");

      if (!error && data) {
        setServicios(data);
      }
      setLoading(false);
    };

    if (open) {
      fetchServicios();
    }
  }, [open]);

  const filteredServicios = useMemo(() => {
    if (!searchTerm) return servicios;
    const term = searchTerm.toLowerCase();
    return servicios.filter(
      (s) =>
        s.servicio.toLowerCase().includes(term) ||
        s.grupo_servicio?.toLowerCase().includes(term) ||
        s.tipo_servicio.toLowerCase().includes(term)
    );
  }, [servicios, searchTerm]);

  // Group services by grupo_servicio
  const groupedServicios = useMemo(() => {
    const groups: { [key: string]: Servicio[] } = {};
    filteredServicios.forEach((s) => {
      const groupName = s.grupo_servicio || "Otros";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(s);
    });
    return groups;
  }, [filteredServicios]);

  const handleSelect = (servicio: Servicio) => {
    const precio = servicio.precio_servicio || servicio.base_imponible || 0;
    onChange(servicio.servicio, precio);
    setOpen(false);
    setSearchTerm("");
  };

  const handleInputChange = (newValue: string) => {
    setSearchTerm(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchTerm && filteredServicios.length === 0) {
      // Allow custom input when no matches found
      onChange(searchTerm);
      setOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between h-8 text-xs font-normal hover:bg-background",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {colorIndicator}
            <span className="truncate">{value || placeholder}</span>
          </div>
          <Search className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar servicio..."
            value={searchTerm}
            onValueChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Cargando servicios...
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      No se encontraron servicios
                    </p>
                    {searchTerm && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onChange(searchTerm);
                          setOpen(false);
                          setSearchTerm("");
                        }}
                      >
                        Usar "{searchTerm}" como servicio personalizado
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
                {Object.entries(groupedServicios).map(([group, items]) => (
                  <CommandGroup key={group} heading={group}>
                    {items.map((servicio) => (
                      <CommandItem
                        key={servicio.id}
                        value={servicio.id}
                        onSelect={() => handleSelect(servicio)}
                        className="flex items-start gap-2 py-2"
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 mt-0.5 shrink-0",
                            value === servicio.servicio ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {servicio.servicio}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {servicio.tipo_servicio}
                            </Badge>
                            {(servicio.precio_servicio || servicio.base_imponible) && (
                              <span className="text-xs text-muted-foreground">
                                S/ {(servicio.precio_servicio || servicio.base_imponible || 0).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
