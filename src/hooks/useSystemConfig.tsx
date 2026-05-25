import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SystemConfig {
  igv_percentage: number;
  use_thousands_separator: boolean;
  default_currency: "PEN" | "USD";
  currency_symbol: string;
  proforma_expiration_days: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  igv_percentage: 18,
  use_thousands_separator: true,
  default_currency: "PEN",
  currency_symbol: "S/.",
  proforma_expiration_days: 30,
};

interface SystemConfigContextType {
  config: SystemConfig;
  loading: boolean;
  updateConfig: (updates: Partial<SystemConfig>) => Promise<void>;
  formatCurrency: (amount: number, currency?: "PEN" | "USD") => string;
  formatNumber: (num: number, decimals?: number) => string;
  calculateIGV: (baseImponible: number) => number;
  calculatePrecioConIGV: (baseImponible: number) => number;
  deduceIGVFromTotal: (totalConIGV: number) => { base: number; igv: number };
}

const SystemConfigContext = createContext<SystemConfigContextType | null>(null);

export function SystemConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracion")
        .select("*")
        .eq("clave", "system_config")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching system config:", error);
      }

      if (data?.valor) {
        const savedConfig = data.valor as Record<string, unknown>;
        setConfig({
          igv_percentage: (savedConfig.igv_percentage as number) ?? DEFAULT_CONFIG.igv_percentage,
          use_thousands_separator: (savedConfig.use_thousands_separator as boolean) ?? DEFAULT_CONFIG.use_thousands_separator,
          default_currency: (savedConfig.default_currency as "PEN" | "USD") ?? DEFAULT_CONFIG.default_currency,
          currency_symbol: (savedConfig.currency_symbol as string) ?? DEFAULT_CONFIG.currency_symbol,
          proforma_expiration_days: (savedConfig.proforma_expiration_days as number) ?? DEFAULT_CONFIG.proforma_expiration_days,
        });
      }
    } catch (error) {
      console.error("Error loading system config:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<SystemConfig>) => {
    const newConfig = { ...config, ...updates };
    
    // Update currency symbol based on currency
    if (updates.default_currency) {
      newConfig.currency_symbol = updates.default_currency === "USD" ? "$" : "S/.";
    }

    setConfig(newConfig);

    const { data: existing } = await supabase
      .from("configuracion")
      .select("id")
      .eq("clave", "system_config")
      .single();

    const configJson = JSON.parse(JSON.stringify(newConfig));

    if (existing) {
      await supabase
        .from("configuracion")
        .update({ valor: configJson, updated_at: new Date().toISOString() })
        .eq("clave", "system_config");
    } else {
      await supabase
        .from("configuracion")
        .insert([{ 
          clave: "system_config", 
          valor: configJson,
          descripcion: "Configuración general del sistema"
        }]);
    }
  };

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (config.use_thousands_separator) {
      return num.toLocaleString("es-PE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return num.toFixed(decimals);
  };

  const formatCurrency = (amount: number, currency?: "PEN" | "USD"): string => {
    const curr = currency || config.default_currency;
    const symbol = curr === "USD" ? "$" : "S/.";
    return `${symbol} ${formatNumber(amount)}`;
  };

  const calculateIGV = (baseImponible: number): number => {
    return baseImponible * (config.igv_percentage / 100);
  };

  const calculatePrecioConIGV = (baseImponible: number): number => {
    return baseImponible + calculateIGV(baseImponible);
  };

  const deduceIGVFromTotal = (totalConIGV: number): { base: number; igv: number } => {
    const base = totalConIGV / (1 + config.igv_percentage / 100);
    const igv = totalConIGV - base;
    return { base, igv };
  };

  return (
    <SystemConfigContext.Provider
      value={{
        config,
        loading,
        updateConfig,
        formatCurrency,
        formatNumber,
        calculateIGV,
        calculatePrecioConIGV,
        deduceIGVFromTotal,
      }}
    >
      {children}
    </SystemConfigContext.Provider>
  );
}

export function useSystemConfig(): SystemConfigContextType {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error("useSystemConfig must be used within a SystemConfigProvider");
  }
  return context;
}
