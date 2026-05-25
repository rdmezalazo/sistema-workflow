import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SystemConfigProvider } from "@/hooks/useSystemConfig";
import { PaymentNotificationProvider } from "@/hooks/usePaymentNotifications";
import { FinancialVisibilityProvider } from "@/hooks/useFinancialVisibility";
import { FinancialPageGuard } from "@/components/ui/FinancialPageGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { SedeProvider } from "@/hooks/useSedeContext";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Proformas from "./pages/Proformas";
import Contratos from "./pages/Contratos";
import Asignaciones from "./pages/Asignaciones";
import Carteras from "./pages/Carteras";
import CalendarioTrabajo from "./pages/CalendarioTrabajo";
import CalendarioPagos from "./pages/CalendarioPagos";
import Reportes from "./pages/Reportes";
import Usuarios from "./pages/Usuarios";
import Configuracion from "./pages/Configuracion";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/proformas" element={<Proformas />} />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/asignaciones" element={<Asignaciones />} />
        <Route path="/carteras" element={<Carteras />} />
        <Route path="/calendario-pagos" element={<FinancialPageGuard><CalendarioPagos /></FinancialPageGuard>} />
        <Route path="/calendario-trabajo" element={<CalendarioTrabajo />} />
        <Route path="/reportes/*" element={<FinancialPageGuard><Reportes /></FinancialPageGuard>} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SystemConfigProvider>
        <PaymentNotificationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <FinancialVisibilityProvider>
                <SedeProvider>
                  <AppRoutes />
                </SedeProvider>
              </FinancialVisibilityProvider>
            </AuthProvider>
          </BrowserRouter>
        </PaymentNotificationProvider>
      </SystemConfigProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
