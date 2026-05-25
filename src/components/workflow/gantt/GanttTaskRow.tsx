import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  GripVertical,
  Calendar,
  User,
  Link2,
  Check,
  X,
  Loader2,
  Database,
  ListTodo,
  Package,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface GanttTask {
  id: string;
  label: string;
  tipo: string;
  fecha_inicio?: string;
  fecha_termino?: string;
  progreso: number;
  asignado_a?: string;
  asignado_nombre?: string;
  dependencias?: string[];
  isCompleted: boolean;
  contratoId?: string;
}

interface GanttTaskRowProps {
  task: GanttTask;
  index: number;
  profiles: { id: string; full_name: string | null }[];
  allTasks: GanttTask[];
  saving: boolean;
  onUpdateDates: (task: GanttTask, start: Date, end: Date) => void;
  onUpdateAssignee: (task: GanttTask, userId: string | null) => void;
  onAddDependency: (task: GanttTask, depId: string) => void;
  onRemoveDependency: (task: GanttTask, depId: string) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  input: Database,
  tarea: ListTodo,
  output: Package,
  supervision: ShieldCheck,
};

const typeColors: Record<string, { bg: string; text: string; badge: string }> = {
  input: { 
    bg: "bg-emerald-500", 
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
  },
  tarea: { 
    bg: "bg-orange-500", 
    text: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
  },
  output: { 
    bg: "bg-purple-500", 
    text: "text-purple-600 dark:text-purple-400",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
  },
  supervision: { 
    bg: "bg-red-500", 
    text: "text-red-600 dark:text-red-400",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  },
};

const typeLabels: Record<string, string> = {
  input: "Data",
  tarea: "Proceso",
  output: "Output",
  supervision: "Supervisión",
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export function GanttTaskRow({
  task,
  index,
  profiles,
  allTasks,
  saving,
  onUpdateDates,
  onUpdateAssignee,
  onAddDependency,
  onRemoveDependency,
}: GanttTaskRowProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [depOpen, setDepOpen] = useState(false);

  const Icon = typeIcons[task.tipo] || ListTodo;
  const colors = typeColors[task.tipo] || typeColors.tarea;

  const parseDate = (dateStr?: string) => {
    if (!dateStr) return undefined;
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const startDate = parseDate(task.fecha_inicio);
  const endDate = parseDate(task.fecha_termino);

  const handleStartChange = (date: Date | undefined) => {
    if (!date) return;
    const end = endDate || date;
    onUpdateDates(task, date, end < date ? date : end);
    setStartOpen(false);
  };

  const handleEndChange = (date: Date | undefined) => {
    if (!date) return;
    const start = startDate || date;
    onUpdateDates(task, start > date ? date : start, date);
    setEndOpen(false);
  };

  const availableDeps = allTasks.filter(
    (t) => t.id !== task.id && !task.dependencias?.includes(t.id)
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 border-b text-sm transition-colors",
        index % 2 === 0 ? "bg-background" : "bg-muted/10",
        task.isCompleted && "opacity-60"
      )}
    >
      {/* Drag Handle */}
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />

      {/* Type Badge */}
      <Badge className={cn("gap-1 text-xs flex-shrink-0", colors.badge)}>
        <Icon className="h-3 w-3" />
        {typeLabels[task.tipo]}
      </Badge>

      {/* Task Name */}
      <span className="font-medium truncate min-w-[120px] max-w-[180px]">{task.label}</span>

      {/* Start Date */}
      <Popover open={startOpen} onOpenChange={setStartOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 px-2.5 gap-1.5 text-xs font-medium border-dashed hover:border-solid transition-all",
              startDate 
                ? "border-emerald-300 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/80 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" 
                : "text-muted-foreground hover:text-foreground hover:border-primary/50"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            {startDate ? format(startDate, "dd MMM yy", { locale: es }) : "Inicio"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 shadow-lg border-2" align="start" sideOffset={8}>
          <div className="p-3 border-b bg-muted/30">
            <p className="text-xs font-semibold text-foreground">Fecha de Inicio</p>
            <p className="text-[10px] text-muted-foreground">Selecciona cuándo comienza esta tarea</p>
          </div>
          <CalendarComponent
            mode="single"
            selected={startDate}
            onSelect={handleStartChange}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground/60 text-xs">→</span>

      {/* End Date */}
      <Popover open={endOpen} onOpenChange={setEndOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 px-2.5 gap-1.5 text-xs font-medium border-dashed hover:border-solid transition-all",
              endDate 
                ? "border-blue-300 bg-blue-50/50 text-blue-700 hover:bg-blue-100/80 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400" 
                : "text-muted-foreground hover:text-foreground hover:border-primary/50"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            {endDate ? format(endDate, "dd MMM yy", { locale: es }) : "Fin"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 shadow-lg border-2" align="start" sideOffset={8}>
          <div className="p-3 border-b bg-muted/30">
            <p className="text-xs font-semibold text-foreground">Fecha de Fin</p>
            <p className="text-[10px] text-muted-foreground">Selecciona cuándo termina esta tarea</p>
          </div>
          <CalendarComponent
            mode="single"
            selected={endDate}
            onSelect={handleEndChange}
            disabled={(date) => startDate ? date < startDate : false}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Assignee */}
      <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 text-xs"
          >
            {task.asignado_nombre ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[8px]">
                    {getInitials(task.asignado_nombre)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[80px] truncate">{task.asignado_nombre.split(" ")[0]}</span>
              </>
            ) : (
              <>
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Asignar</span>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">Responsable</p>
            {task.asignado_a && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-muted-foreground"
                onClick={() => {
                  onUpdateAssignee(task, null);
                  setAssigneeOpen(false);
                }}
              >
                <X className="h-3 w-3 mr-2" />
                Sin asignar
              </Button>
            )}
            {profiles.map((profile) => (
              <Button
                key={profile.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start text-xs",
                  task.asignado_a === profile.id && "bg-muted"
                )}
                onClick={() => {
                  onUpdateAssignee(task, profile.id);
                  setAssigneeOpen(false);
                }}
              >
                <Avatar className="h-5 w-5 mr-2">
                  <AvatarFallback className="text-[8px]">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                {profile.full_name}
                {task.asignado_a === profile.id && (
                  <Check className="h-3 w-3 ml-auto" />
                )}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Dependencies */}
      <Popover open={depOpen} onOpenChange={setDepOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 text-xs"
          >
            <Link2 className="h-3 w-3" />
            {task.dependencias?.length ? (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {task.dependencias.length}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Deps</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-2">Predecesoras</p>
            
            {/* Current dependencies */}
            {task.dependencias?.length ? (
              <div className="space-y-1">
                {task.dependencias.map((depId) => {
                  const depTask = allTasks.find((t) => t.id === depId);
                  if (!depTask) return null;
                  return (
                    <div
                      key={depId}
                      className="flex items-center justify-between px-2 py-1 bg-muted/50 rounded text-xs"
                    >
                      <span className="truncate">{depTask.label}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => onRemoveDependency(task, depId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-2 py-1">Sin predecesoras</p>
            )}

            {/* Add new dependency */}
            {availableDeps.length > 0 && (
              <>
                <div className="border-t pt-2">
                  <p className="text-xs font-medium text-muted-foreground px-2 mb-1">Agregar</p>
                  <Select
                    onValueChange={(value) => {
                      onAddDependency(task, value);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Seleccionar tarea..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDeps.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Saving indicator */}
      {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />}
    </div>
  );
}
