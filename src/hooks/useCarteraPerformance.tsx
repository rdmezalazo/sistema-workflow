import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  endOfDay, 
  endOfMonth,
  parseISO, 
  isBefore, 
  isAfter, 
  isEqual,
  isWithinInterval 
} from "date-fns";

// Scoring constants
const SCORE_ON_TIME = 10;
const SCORE_BEFORE_DEADLINE = 15;
const SCORE_AFTER_DEADLINE = 5;

export type TimeFilter = "today" | "week" | "month" | "range" | "all";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface TimeFilterConfig {
  type: TimeFilter;
  selectedMonth?: Date; // For month filter with specific month selection
  dateRange?: DateRange; // For range filter
}

export interface CategoryScore {
  id: string;
  name: string;
  type: "data" | "tarea" | "entregable" | "output" | "supervision";
  responsibleId: string | null;
  responsibleName: string | null;
  contractId: string;
  contractNumber: string;
  activityId: string;
  activityName: string;
  dueDate: string | null;
  completedDate: string | null;
  progress: number;
  score: number;
  status: "pending" | "on_time" | "before_deadline" | "after_deadline";
}

export interface TeamMemberScore {
  id: string;
  name: string;
  initials: string;
  totalScore: number;
  onTimeCount: number;
  beforeDeadlineCount: number;
  afterDeadlineCount: number;
  pendingCount: number;
  totalCompleted: number;
}

export interface CarteraPerformanceData {
  teamRanking: TeamMemberScore[];
  categoryScores: CategoryScore[];
  loading: boolean;
}

interface WorkflowItem {
  id: string;
  titulo?: string;
  label?: string;
  tipo?: string;
  type?: string;
  progreso?: number;
  completado?: boolean;
  asignado_a?: string;
  asignado_nombre?: string;
  fecha_inicio?: string;
  fecha_termino?: string;
  updated_at?: string;
  children?: WorkflowItem[];
  parentId?: string | null;
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  try {
    const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    return parseISO(datePart);
  } catch {
    return null;
  }
}

function calculateScore(
  progress: number,
  dueDate: Date | null,
  completedDate: Date | null
): { score: number; status: CategoryScore["status"] } {
  // If not complete (progress < 100), no score yet
  if (progress < 100) {
    return { score: 0, status: "pending" };
  }

  // If no due date, give on_time score
  if (!dueDate) {
    return { score: SCORE_ON_TIME, status: "on_time" };
  }

  const effectiveCompletedDate = completedDate || new Date();
  const dueDateEnd = endOfDay(dueDate);

  if (isBefore(effectiveCompletedDate, dueDate)) {
    return { score: SCORE_BEFORE_DEADLINE, status: "before_deadline" };
  } else if (isAfter(effectiveCompletedDate, dueDateEnd)) {
    return { score: SCORE_AFTER_DEADLINE, status: "after_deadline" };
  } else {
    return { score: SCORE_ON_TIME, status: "on_time" };
  }
}

function getCategoryTypeFromTipo(tipo: string | undefined): CategoryScore["type"] | null {
  if (!tipo) return null;
  const lower = tipo.toLowerCase();
  if (lower === "input" || lower === "data") return "data";
  if (lower === "tarea") return "tarea";
  if (lower === "entregable" || lower === "output") return "entregable";
  if (lower === "output" || lower === "producto") return "output";
  if (lower === "supervision") return "supervision";
  return null;
}

function getCategoryTypeFromLabel(label: string | undefined): CategoryScore["type"] | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  if (lower.includes("data") || lower.startsWith("data")) return "data";
  if (lower.includes("tarea") || lower.startsWith("tarea")) return "tarea";
  if (lower.includes("entregable") || lower.startsWith("entregable")) return "entregable";
  if (lower.includes("output") || lower.includes("producto")) return "output";
  if (lower.includes("supervis") || lower.startsWith("supervis")) return "supervision";
  return null;
}

function buildHierarchy(flatItems: WorkflowItem[]): WorkflowItem[] {
  const itemMap = new Map<string, WorkflowItem>();
  const rootItems: WorkflowItem[] = [];

  // First pass: create map of all items
  for (const item of flatItems) {
    itemMap.set(item.id, { ...item, children: [] });
  }

  // Second pass: build tree
  for (const item of flatItems) {
    const node = itemMap.get(item.id)!;
    if (item.parentId && itemMap.has(item.parentId)) {
      const parent = itemMap.get(item.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      rootItems.push(node);
    }
  }

  return rootItems;
}

function extractCategoryItems(
  items: WorkflowItem[],
  contractId: string,
  contractNumber: string,
  profilesMap: Map<string, string>,
  parentActivityId: string = "",
  parentActivityName: string = ""
): CategoryScore[] {
  const results: CategoryScore[] = [];

  for (const item of items) {
    const itemLabel = item.titulo || item.label || "";
    const itemTipo = item.tipo || item.type;
    
    // Check category by tipo field first, then by label
    const categoryType = getCategoryTypeFromTipo(itemTipo) || getCategoryTypeFromLabel(itemLabel);
    
    // Determine if this is an activity (tipo === "actividad")
    const isActivity = itemTipo === "actividad";

    // If this item is a category type (Data, Tarea, Entregable, Output, Supervision)
    if (categoryType) {
      const dueDate = parseDate(item.fecha_termino);
      const completedDate = item.completado && item.updated_at ? parseDate(item.updated_at) : null;
      const progress = item.progreso ?? (item.completado ? 100 : 0);
      const { score, status } = calculateScore(progress, dueDate, completedDate);
      
      // Get responsible name from profilesMap
      const responsibleName = item.asignado_a ? (profilesMap.get(item.asignado_a) || item.asignado_nombre || null) : null;

      results.push({
        id: item.id,
        name: itemLabel,
        type: categoryType,
        responsibleId: item.asignado_a || null,
        responsibleName,
        contractId,
        contractNumber,
        activityId: parentActivityId,
        activityName: parentActivityName,
        dueDate: item.fecha_termino || null,
        completedDate: item.updated_at || null,
        progress,
        score,
        status,
      });
    }

    // Recursively process children
    if (item.children && item.children.length > 0) {
      const activityId = isActivity ? item.id : parentActivityId;
      const activityName = isActivity ? itemLabel : parentActivityName;

      results.push(
        ...extractCategoryItems(item.children, contractId, contractNumber, profilesMap, activityId, activityName)
      );
    }
  }

  return results;
}

function filterByTime(scores: CategoryScore[], filterConfig: TimeFilterConfig): CategoryScore[] {
  const { type, selectedMonth, dateRange } = filterConfig;
  
  if (type === "all") return scores;

  const now = new Date();
  let startDate: Date;
  let endDate: Date | null = null;

  switch (type) {
    case "today":
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case "week":
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      break;
    case "month":
      // Use selectedMonth if provided, otherwise current month
      const monthToUse = selectedMonth || now;
      startDate = startOfMonth(monthToUse);
      endDate = endOfMonth(monthToUse);
      break;
    case "range":
      if (!dateRange?.from) return scores;
      startDate = startOfDay(dateRange.from);
      endDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      break;
    default:
      return scores;
  }

  return scores.filter((score) => {
    // Filter by due date or completion date
    const dueDate = parseDate(score.dueDate || undefined);
    const completedDate = parseDate(score.completedDate || undefined);

    const checkDateInRange = (date: Date | null): boolean => {
      if (!date) return false;
      if (endDate) {
        return isWithinInterval(date, { start: startDate, end: endDate });
      }
      return isAfter(date, startDate) || isEqual(date, startDate);
    };

    if (checkDateInRange(dueDate)) return true;
    if (checkDateInRange(completedDate)) return true;
    
    // For pending items with due date in the future and within range, include them
    if (score.status === "pending" && dueDate && checkDateInRange(dueDate)) {
      return true;
    }
    
    return false;
  });
}

function calculateTeamRanking(scores: CategoryScore[]): TeamMemberScore[] {
  const memberMap = new Map<string, TeamMemberScore>();

  for (const score of scores) {
    if (!score.responsibleId) continue;

    const existing = memberMap.get(score.responsibleId);
    
    if (existing) {
      existing.totalScore += score.score;
      if (score.status === "on_time") existing.onTimeCount++;
      else if (score.status === "before_deadline") existing.beforeDeadlineCount++;
      else if (score.status === "after_deadline") existing.afterDeadlineCount++;
      else if (score.status === "pending") existing.pendingCount++;
      if (score.progress >= 100) existing.totalCompleted++;
    } else {
      const name = score.responsibleName || "Sin nombre";
      const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
      
      memberMap.set(score.responsibleId, {
        id: score.responsibleId,
        name,
        initials,
        totalScore: score.score,
        onTimeCount: score.status === "on_time" ? 1 : 0,
        beforeDeadlineCount: score.status === "before_deadline" ? 1 : 0,
        afterDeadlineCount: score.status === "after_deadline" ? 1 : 0,
        pendingCount: score.status === "pending" ? 1 : 0,
        totalCompleted: score.progress >= 100 ? 1 : 0,
      });
    }
  }

  return Array.from(memberMap.values()).sort((a, b) => b.totalScore - a.totalScore);
}

export function useCarteraPerformance(
  carteraId: string | null,
  filterConfig: TimeFilterConfig = { type: "month" },
  contractFilter: string | null = null
) {
  const [loading, setLoading] = useState(true);
  const [allScores, setAllScores] = useState<CategoryScore[]>([]);
  const [contracts, setContracts] = useState<{ id: string; numero: string }[]>([]);

  const fetchData = useCallback(async () => {
    if (!carteraId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Get cartera members
      const { data: members } = await supabase
        .from("cartera_miembros")
        .select("user_id")
        .eq("cartera_id", carteraId);

      const memberIds = members?.map(m => m.user_id) || [];
      
      // Get all profiles for name resolution
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, full_name");
      
      // Build a map of user_id -> name
      const profilesMap = new Map<string, string>();
      for (const profile of allProfiles || []) {
        if (profile.id) {
          profilesMap.set(profile.id, profile.full_name || "Sin nombre");
        }
      }

      if (memberIds.length === 0) {
        setAllScores([]);
        setContracts([]);
        setLoading(false);
        return;
      }

      // Get cartera clients
      const { data: carteraClients } = await supabase
        .from("cartera_clientes")
        .select("cliente_id")
        .eq("cartera_id", carteraId);

      const clientIds = carteraClients?.map(c => c.cliente_id) || [];

      // Get contracts for these clients
      const { data: contractsData } = await supabase
        .from("contratos")
        .select("id, numero, cliente_id")
        .in("cliente_id", clientIds.length > 0 ? clientIds : ["__none__"]);

      const contractsList = contractsData || [];
      setContracts(contractsList.map(c => ({ id: c.id, numero: c.numero })));

      if (contractsList.length === 0) {
        setAllScores([]);
        setLoading(false);
        return;
      }

      // Get workflows for these contracts
      const { data: workflows } = await supabase
        .from("workflows")
        .select("id, contrato_id, items")
        .in("contrato_id", contractsList.map(c => c.id));

      // Extract all category scores
      const scores: CategoryScore[] = [];

      for (const workflow of workflows || []) {
        const contract = contractsList.find(c => c.id === workflow.contrato_id);
        if (!contract) continue;

        const flatItems = Array.isArray(workflow.items) ? (workflow.items as unknown as WorkflowItem[]) : [];
        // Build hierarchy from flat items
        const hierarchicalItems = buildHierarchy(flatItems);
        const workflowScores = extractCategoryItems(hierarchicalItems, contract.id, contract.numero, profilesMap);

        // Filter by cartera members
        for (const score of workflowScores) {
          if (!score.responsibleId || memberIds.includes(score.responsibleId)) {
            scores.push(score);
          }
        }
      }

      setAllScores(scores);
    } catch (error) {
      console.error("Error fetching cartera performance:", error);
    } finally {
      setLoading(false);
    }
  }, [carteraId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters
  const filteredScores = useMemo(() => {
    let result = allScores;

    // Apply contract filter
    if (contractFilter) {
      result = result.filter(s => s.contractId === contractFilter);
    }

    // Apply time filter
    result = filterByTime(result, filterConfig);

    return result;
  }, [allScores, filterConfig, contractFilter]);

  // Calculate team ranking from filtered scores
  const teamRanking = useMemo(() => {
    return calculateTeamRanking(filteredScores);
  }, [filteredScores]);

  return {
    teamRanking,
    categoryScores: filteredScores,
    contracts,
    loading,
    refetch: fetchData,
  };
}
