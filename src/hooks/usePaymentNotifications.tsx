import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentNotificationConfig {
  days_before_due: number;
  days_after_overdue: number;
  color_before_due: string;
  color_after_overdue: string;
  enabled: boolean;
}

const DEFAULT_CONFIG: PaymentNotificationConfig = {
  days_before_due: 5,
  days_after_overdue: 15,
  color_before_due: "#F59E0B", // Amber
  color_after_overdue: "#EF4444", // Red
  enabled: true,
};

interface PaymentNotificationContextType {
  config: PaymentNotificationConfig;
  loading: boolean;
  updateConfig: (updates: Partial<PaymentNotificationConfig>) => Promise<void>;
  getPaymentNotificationStatus: (fechaVencimiento: string, status: string) => {
    shouldNotify: boolean;
    type: "before_due" | "overdue" | null;
    color: string | null;
  };
  getNotificationPayments: (payments: Array<{
    fecha_vencimiento: string;
    status: string;
    [key: string]: unknown;
  }>) => Array<{
    fecha_vencimiento: string;
    status: string;
    [key: string]: unknown;
  }>;
}

const PaymentNotificationContext = createContext<PaymentNotificationContextType | null>(null);

export function PaymentNotificationProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PaymentNotificationConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracion")
        .select("*")
        .eq("clave", "payment_notifications")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching payment notification config:", error);
      }

      if (data?.valor) {
        const savedConfig = data.valor as Record<string, unknown>;
        setConfig({
          days_before_due: (savedConfig.days_before_due as number) ?? DEFAULT_CONFIG.days_before_due,
          days_after_overdue: (savedConfig.days_after_overdue as number) ?? DEFAULT_CONFIG.days_after_overdue,
          color_before_due: (savedConfig.color_before_due as string) ?? DEFAULT_CONFIG.color_before_due,
          color_after_overdue: (savedConfig.color_after_overdue as string) ?? DEFAULT_CONFIG.color_after_overdue,
          enabled: (savedConfig.enabled as boolean) ?? DEFAULT_CONFIG.enabled,
        });
      }
    } catch (error) {
      console.error("Error loading payment notification config:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<PaymentNotificationConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    const { data: existing } = await supabase
      .from("configuracion")
      .select("id")
      .eq("clave", "payment_notifications")
      .single();

    const configJson = JSON.parse(JSON.stringify(newConfig));

    if (existing) {
      await supabase
        .from("configuracion")
        .update({ valor: configJson, updated_at: new Date().toISOString() })
        .eq("clave", "payment_notifications");
    } else {
      await supabase
        .from("configuracion")
        .insert([{
          clave: "payment_notifications",
          valor: configJson,
          descripcion: "Configuración de notificaciones de pagos"
        }]);
    }
  };

  const getPaymentNotificationStatus = (fechaVencimiento: string, status: string) => {
    if (!config.enabled || status === "pagado") {
      return { shouldNotify: false, type: null, color: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(fechaVencimiento);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Payment is overdue
    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      if (daysOverdue <= config.days_after_overdue) {
        return {
          shouldNotify: true,
          type: "overdue" as const,
          color: config.color_after_overdue,
        };
      }
    }
    
    // Payment is coming due
    if (diffDays >= 0 && diffDays <= config.days_before_due) {
      return {
        shouldNotify: true,
        type: "before_due" as const,
        color: config.color_before_due,
      };
    }

    return { shouldNotify: false, type: null, color: null };
  };

  const getNotificationPayments = (payments: Array<{
    fecha_vencimiento: string;
    status: string;
    [key: string]: unknown;
  }>) => {
    return payments.filter((payment) => {
      const { shouldNotify } = getPaymentNotificationStatus(
        payment.fecha_vencimiento,
        payment.status
      );
      return shouldNotify;
    });
  };

  return (
    <PaymentNotificationContext.Provider
      value={{
        config,
        loading,
        updateConfig,
        getPaymentNotificationStatus,
        getNotificationPayments,
      }}
    >
      {children}
    </PaymentNotificationContext.Provider>
  );
}

export function usePaymentNotifications(): PaymentNotificationContextType {
  const context = useContext(PaymentNotificationContext);
  if (!context) {
    throw new Error("usePaymentNotifications must be used within a PaymentNotificationProvider");
  }
  return context;
}
