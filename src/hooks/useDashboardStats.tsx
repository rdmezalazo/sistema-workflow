import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO, startOfMonth, endOfMonth, format, isWithinInterval, addDays } from "date-fns";
import { useSedeContext } from "@/hooks/useSedeContext";

interface DashboardStats {
  clientesActivos: number;
  clientesTrend: number;
  contratosVigentes: number;
  contratosPorVencer: number;
  contratosTrend: number;
  proformasEnviadas: number;
  proformasTrend: number;
  ingresosMes: number;
  metaIngresos: number;
  tasaConversion: number;
  conversionTrend: number;
  pagosVencidos: number;
  montoPagosVencidos: number;
}

interface RecentContract {
  id: string;
  numero: string;
  cliente: string;
  tipo: string;
  asesor: string;
  fechaInicio: string;
  status: "Vigente" | "Por vencer" | "Vencido";
  progreso: number;
}

interface UpcomingPayment {
  id: string;
  cliente: string;
  monto: number;
  fechaVencimiento: string;
  diasRestantes: number;
  status: "pending" | "overdue" | "upcoming";
}

interface TeamMember {
  id: string;
  nombre: string;
  rol: string;
  iniciales: string;
  cartera: string;
  contratos: number;
  completados: number;
  progreso: number;
}

export function useDashboardStats() {
  const { activeSedeId } = useSedeContext();
  const [stats, setStats] = useState<DashboardStats>({
    clientesActivos: 0,
    clientesTrend: 0,
    contratosVigentes: 0,
    contratosPorVencer: 0,
    contratosTrend: 0,
    proformasEnviadas: 0,
    proformasTrend: 0,
    ingresosMes: 0,
    metaIngresos: 150000,
    tasaConversion: 0,
    conversionTrend: 0,
    pagosVencidos: 0,
    montoPagosVencidos: 0,
  });
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    fetchDashboardData();
  }, [activeSedeId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Get current user name
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile?.full_name) {
          setUserName(profile.full_name.split(" ")[0]);
        }
      }

      // Fetch all data in parallel
      const [
        clientesResult,
        contratosResult,
        proformasResult,
        pagosResult,
        carterasResult,
        miembrosResult,
        profilesResult
      ] = await Promise.all([
        supabase.from("clientes").select("id, activo, created_at, sede_id"),
        supabase.from("contratos").select("*, clientes(razon_social)"),
        supabase.from("proformas").select("id, status, created_at, contrato_id, sede_id"),
        supabase.from("pagos").select("*, contratos(sede_id, clientes(razon_social))"),
        supabase.from("carteras").select("id, nombre, especialidad, sede_id"),
        supabase.from("cartera_miembros").select("*, carteras(nombre)"),
        supabase.from("profiles").select("id, full_name, puesto")
      ]);

      // Calculate stats
      const matchesActiveSede = (item: any) => !activeSedeId || item?.sede_id === activeSedeId;
      const clientes = (clientesResult.data || []).filter(matchesActiveSede);
      const contratos = (contratosResult.data || []).filter(matchesActiveSede);
      const proformas = (proformasResult.data || []).filter(matchesActiveSede);
      const pagos = (pagosResult.data || []).filter((p: any) => !activeSedeId || p?.sede_id === activeSedeId || p?.contratos?.sede_id === activeSedeId);
      const carteras = (carterasResult.data || []).filter(matchesActiveSede);
      const miembros = miembrosResult.data || [];
      const profiles = profilesResult.data || [];

      // Clientes activos
      const clientesActivos = clientes.filter(c => c.activo).length;
      const clientesMesAnterior = clientes.filter(c => {
        const createdAt = parseISO(c.created_at);
        return createdAt < monthStart;
      }).length;
      const clientesTrend = clientesMesAnterior > 0 
        ? Math.round(((clientesActivos - clientesMesAnterior) / clientesMesAnterior) * 100)
        : 0;

      // Contratos vigentes y por vencer
      const contratosVigentes = contratos.filter(c => 
        c.status !== 'borrador' && c.condicion === 'Vigente'
      ).length;
      
      const contratosPorVencer = contratos.filter(c => {
        if (!c.fecha_fin || c.condicion !== 'Vigente') return false;
        const diasRestantes = differenceInDays(parseISO(c.fecha_fin), now);
        return diasRestantes >= 0 && diasRestantes <= 30;
      }).length;

      // Proformas enviadas este mes
      const proformasEnviadas = proformas.filter(p => 
        p.status === 'enviada' || p.status === 'aprobada'
      ).length;

      // Tasa de conversión (proformas que resultaron en contrato)
      const proformasConContrato = proformas.filter(p => p.contrato_id).length;
      const tasaConversion = proformas.length > 0 
        ? Math.round((proformasConContrato / proformas.length) * 100)
        : 0;

      // Ingresos del mes (pagos pagados)
      const pagosMes = pagos.filter(p => {
        if (p.status !== 'pagado' || !p.fecha_pago) return false;
        const fechaPago = parseISO(p.fecha_pago);
        return isWithinInterval(fechaPago, { start: monthStart, end: monthEnd });
      });
      const ingresosMes = pagosMes.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

      // Pagos vencidos
      const pagosVencidos = pagos.filter(p => {
        if (p.status === 'pagado') return false;
        const fechaVenc = parseISO(p.fecha_vencimiento);
        return fechaVenc < now;
      });
      const montoPagosVencidos = pagosVencidos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

      setStats({
        clientesActivos,
        clientesTrend,
        contratosVigentes,
        contratosPorVencer,
        contratosTrend: 12, // Could calculate based on previous month
        proformasEnviadas,
        proformasTrend: 5,
        ingresosMes,
        metaIngresos: 150000,
        tasaConversion,
        conversionTrend: 3,
        pagosVencidos: pagosVencidos.length,
        montoPagosVencidos,
      });

      // Recent contracts
      const recentContractsData: RecentContract[] = contratos
        .filter(c => c.status !== 'borrador')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(c => {
          let status: "Vigente" | "Por vencer" | "Vencido" = "Vigente";
          if (c.fecha_fin) {
            const diasRestantes = differenceInDays(parseISO(c.fecha_fin), now);
            if (diasRestantes < 0) status = "Vencido";
            else if (diasRestantes <= 30) status = "Por vencer";
          }

          // Get advisor name from profiles
          const advisor = profiles.find(p => p.id === c.responsable_id);

          // Calculate progress based on dates
          let progreso = 0;
          if (c.fecha_inicio && c.fecha_fin) {
            const inicio = parseISO(c.fecha_inicio);
            const fin = parseISO(c.fecha_fin);
            const totalDias = differenceInDays(fin, inicio);
            const diasTranscurridos = differenceInDays(now, inicio);
            progreso = totalDias > 0 ? Math.min(100, Math.max(0, Math.round((diasTranscurridos / totalDias) * 100))) : 0;
          }

          return {
            id: c.id,
            numero: c.numero,
            cliente: c.clientes?.razon_social || "Sin cliente",
            tipo: c.tipo_servicio || "General",
            asesor: advisor?.full_name || "Sin asignar",
            fechaInicio: c.fecha_inicio ? format(parseISO(c.fecha_inicio), "dd/MM/yyyy") : "-",
            status,
            progreso,
          };
        });
      setRecentContracts(recentContractsData);

      // Upcoming payments
      const upcomingPaymentsData: UpcomingPayment[] = pagos
        .filter(p => p.status !== 'pagado')
        .map(p => {
          const fechaVenc = parseISO(p.fecha_vencimiento);
          const diasRestantes = differenceInDays(fechaVenc, now);
          let status: "pending" | "overdue" | "upcoming" = "pending";
          if (diasRestantes < 0) status = "overdue";
          else if (diasRestantes <= 3) status = "upcoming";

          return {
            id: p.id,
            cliente: p.contratos?.clientes?.razon_social || "Sin cliente",
            monto: Number(p.monto) || 0,
            fechaVencimiento: format(fechaVenc, "dd/MM/yyyy"),
            diasRestantes,
            status,
          };
        })
        .sort((a, b) => a.diasRestantes - b.diasRestantes)
        .slice(0, 5);
      setUpcomingPayments(upcomingPaymentsData);

      // Team performance - based on carteras and their members
      const teamData: TeamMember[] = [];
      
      for (const miembro of miembros) {
        const profile = profiles.find(p => p.id === miembro.user_id);
        if (!profile) continue;

        // Count contracts assigned to this person's cartera
        const carteraContratos = contratos.filter(c => c.responsable_id === miembro.user_id);
        const completados = carteraContratos.filter(c => c.condicion === 'Terminado').length;
        const total = carteraContratos.length;
        const progreso = total > 0 ? Math.round((completados / total) * 100) : 0;

        const initials = profile.full_name 
          ? profile.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
          : "??";

        teamData.push({
          id: miembro.id,
          nombre: profile.full_name || "Sin nombre",
          rol: miembro.rol_en_cartera === 'responsable' ? 'Responsable' : 'Miembro',
          iniciales: initials,
          cartera: miembro.carteras?.nombre || "Sin cartera",
          contratos: total,
          completados,
          progreso,
        });
      }

      // If no team data from carteras, use profiles directly
      if (teamData.length === 0) {
        for (const profile of profiles.slice(0, 5)) {
          const userContratos = contratos.filter(c => c.responsable_id === profile.id);
          const completados = userContratos.filter(c => c.condicion === 'Terminado').length;
          const total = userContratos.length;
          const progreso = total > 0 ? Math.round((completados / total) * 100) : 0;

          const initials = profile.full_name 
            ? profile.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
            : "??";

          teamData.push({
            id: profile.id,
            nombre: profile.full_name || "Sin nombre",
            rol: profile.puesto || "Asesor",
            iniciales: initials,
            cartera: "",
            contratos: total,
            completados,
            progreso,
          });
        }
      }

      setTeamMembers(teamData.slice(0, 5));

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    recentContracts,
    upcomingPayments,
    teamMembers,
    loading,
    userName,
    refetch: fetchDashboardData,
  };
}
