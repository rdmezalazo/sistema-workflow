import { useState } from "react";
import { BarChart3, Receipt } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegistroVentasReport } from "@/components/reportes/RegistroVentasReport";

export default function Reportes() {
  const [activeTab, setActiveTab] = useState("registro-ventas");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">
          Generación y consulta de reportes contables y de gestión
        </p>
      </div>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="registro-ventas" className="gap-2">
            <Receipt className="h-4 w-4" />
            Registro de Ventas
          </TabsTrigger>
          {/* Future tabs will be added here */}
        </TabsList>

        <TabsContent value="registro-ventas" className="mt-6">
          <RegistroVentasReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
