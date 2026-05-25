import { useState, useEffect, useMemo } from "react";
import { Filter, X, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface ServiceFilterDropdownProps {
  selectedServices: string[];
  onServicesChange: (services: string[]) => void;
}

export function ServiceFilterDropdown({
  selectedServices,
  onServicesChange,
}: ServiceFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [allServices, setAllServices] = useState<string[]>([]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from("servicios")
      .select("servicio, grupo_servicio, regimen_tributario, entidad, tramite")
      .eq("activo", true)
      .order("grupo_servicio")
      .order("servicio");

    if (data && !error) {
      // Create unique service descriptions
      const serviceDescriptions = data.map((s) => {
        let label = s.servicio;
        if (s.regimen_tributario) label += ` - ${s.regimen_tributario}`;
        if (s.entidad) label += ` (${s.entidad})`;
        return label;
      });
      
      // Also add grupos for broader filtering
      const grupos = [...new Set(data.map((s) => s.grupo_servicio).filter(Boolean))];
      
      setAllServices([...grupos, ...serviceDescriptions]);
    }
  };

  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return allServices;
    const search = searchTerm.toLowerCase();
    return allServices.filter((service) =>
      service.toLowerCase().includes(search)
    );
  }, [allServices, searchTerm]);

  const toggleService = (service: string) => {
    if (selectedServices.includes(service)) {
      onServicesChange(selectedServices.filter((s) => s !== service));
    } else {
      onServicesChange([...selectedServices, service]);
    }
  };

  const clearAll = () => {
    onServicesChange([]);
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Filter className="h-4 w-4" />
          {selectedServices.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
              {selectedServices.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filtrar por Servicios</h4>
            {selectedServices.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
                Limpiar
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar servicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        {selectedServices.length > 0 && (
          <div className="p-2 border-b flex flex-wrap gap-1">
            {selectedServices.map((service) => (
              <Badge
                key={service}
                variant="secondary"
                className="text-xs gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => toggleService(service)}
              >
                {service.length > 20 ? `${service.slice(0, 20)}...` : service}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}

        <ScrollArea className="h-64">
          <div className="p-2 space-y-1">
            {filteredServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No se encontraron servicios
              </p>
            ) : (
              filteredServices.map((service) => (
                <button
                  key={service}
                  onClick={() => toggleService(service)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between hover:bg-muted transition-colors ${
                    selectedServices.includes(service) ? "bg-primary/10 text-primary" : ""
                  }`}
                >
                  <span className="truncate">{service}</span>
                  {selectedServices.includes(service) && (
                    <Check className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}