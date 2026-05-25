import { useState, useRef, useCallback } from "react";
import { format, differenceInDays, addDays, isSameDay, isWeekend } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { GanttTask } from "./GanttTaskRow";

interface GanttTimelineProps {
  tasks: GanttTask[];
  dateRange: Date[];
  cellWidth: number;
  groupedDates: { label: string; days: Date[] }[];
  onDragEnd: (task: GanttTask, newStart: Date, newEnd: Date) => void;
  onReorder?: (taskId: string, newIndex: number) => void;
}

const typeColors: Record<string, string> = {
  input: "from-emerald-500 to-emerald-600",
  tarea: "from-orange-500 to-orange-600",
  output: "from-purple-500 to-purple-600",
  supervision: "from-red-500 to-red-600",
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

type ResizeMode = "left" | "right" | null;

export function GanttTimeline({
  tasks,
  dateRange,
  cellWidth,
  groupedDates,
  onDragEnd,
  onReorder,
}: GanttTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalWidth = dateRange.length * cellWidth;

  // Resize state
  const [resizing, setResizing] = useState<{
    taskId: string;
    mode: ResizeMode;
    startX: number;
    originalBar: { left: number; width: number; startDate: Date; endDate: Date };
  } | null>(null);

  // Drag reorder state
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  const parseDate = (dateStr?: string) => {
    if (!dateStr) return undefined;
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const getTaskBar = useCallback((task: GanttTask) => {
    const startDate = parseDate(task.fecha_inicio);
    if (!startDate) return null;

    const endDate = parseDate(task.fecha_termino) || addDays(startDate, 1);
    
    const startIdx = dateRange.findIndex(d => isSameDay(d, startDate));
    const endIdx = dateRange.findIndex(d => isSameDay(d, endDate));

    if (startIdx === -1) return null;

    const left = startIdx * cellWidth;
    const width = Math.max((endIdx - startIdx + 1) * cellWidth - 4, cellWidth - 4);

    return { left, width, startIdx, endIdx, startDate, endDate };
  }, [dateRange, cellWidth]);

  // Dependency lines SVG
  const renderDependencyLines = () => {
    const lines: JSX.Element[] = [];

    tasks.forEach((task, taskIdx) => {
      if (!task.dependencias?.length) return;

      const taskBar = getTaskBar(task);
      if (!taskBar) return;

      task.dependencias.forEach((depId) => {
        const depTask = tasks.find(t => t.id === depId);
        if (!depTask) return;

        const depIdx = tasks.indexOf(depTask);
        const depBar = getTaskBar(depTask);
        if (!depBar) return;

        const x1 = depBar.left + depBar.width + 2;
        const y1 = depIdx * 48 + 24;
        const x2 = taskBar.left;
        const y2 = taskIdx * 48 + 24;

        const midX = (x1 + x2) / 2;

        lines.push(
          <g key={`${depId}-${task.id}`}>
            <path
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="6 3"
              opacity="0.7"
            />
            <polygon
              points={`${x2 - 1} ${y2 - 5}, ${x2 + 7} ${y2}, ${x2 - 1} ${y2 + 5}`}
              fill="hsl(var(--primary))"
              opacity="0.7"
            />
          </g>
        );
      });
    });

    return lines;
  };

  // ---- RESIZE HANDLERS ----
  const handleResizeStart = (
    e: React.MouseEvent,
    task: GanttTask,
    mode: ResizeMode,
    bar: NonNullable<ReturnType<typeof getTaskBar>>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing({
      taskId: task.id,
      mode,
      startX: e.clientX,
      originalBar: { left: bar.left, width: bar.width, startDate: bar.startDate, endDate: bar.endDate },
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizing && !resizing) return;
      // State is captured via closure on initial call
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - e.clientX;
      const daysDelta = Math.round(deltaX / cellWidth);

      if (mode === "right") {
        const newEndDate = addDays(bar.endDate, daysDelta);
        if (newEndDate >= bar.startDate) {
          // Live preview could be added here
        }
      } else if (mode === "left") {
        const newStartDate = addDays(bar.startDate, daysDelta);
        if (newStartDate <= bar.endDate) {
          // Live preview could be added here
        }
      }
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      const deltaX = upEvent.clientX - e.clientX;
      const daysDelta = Math.round(deltaX / cellWidth);

      if (mode === "right") {
        const newEndDate = addDays(bar.endDate, daysDelta);
        if (newEndDate >= bar.startDate) {
          onDragEnd(task, bar.startDate, newEndDate);
        }
      } else if (mode === "left") {
        const newStartDate = addDays(bar.startDate, daysDelta);
        if (newStartDate <= bar.endDate) {
          onDragEnd(task, newStartDate, bar.endDate);
        }
      }

      setResizing(null);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // ---- BAR DRAG (move) HANDLERS ----
  const handleBarDragStart = (
    e: React.MouseEvent,
    task: GanttTask,
    bar: NonNullable<ReturnType<typeof getTaskBar>>
  ) => {
    e.preventDefault();
    const startX = e.clientX;
    const duration = differenceInDays(bar.endDate, bar.startDate);

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Visual feedback handled by cursor
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      const scrollLeft = scrollRef.current?.scrollLeft || 0;
      const containerRect = scrollRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const deltaX = upEvent.clientX - startX;
      const daysDelta = Math.round(deltaX / cellWidth);
      
      const newStartDate = addDays(bar.startDate, daysDelta);
      const newEndDate = addDays(newStartDate, duration);

      // Validate within range
      const startIdx = dateRange.findIndex(d => isSameDay(d, newStartDate));
      if (startIdx >= 0) {
        onDragEnd(task, newStartDate, newEndDate);
      }

      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // ---- ROW REORDER HANDLERS ----
  const handleRowDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("reorderTaskId", taskId);
    setDraggingRowId(taskId);
  };

  const handleRowDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDropTargetIdx(idx);
  };

  const handleRowDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("reorderTaskId");
    if (taskId && onReorder) {
      onReorder(taskId, targetIdx);
    }
    setDraggingRowId(null);
    setDropTargetIdx(null);
  };

  const handleRowDragEnd = () => {
    setDraggingRowId(null);
    setDropTargetIdx(null);
  };

  return (
    <ScrollArea className="flex-1" ref={scrollRef as any}>
      <div 
        style={{ width: totalWidth, minWidth: "100%" }}
      >
        {/* Date Headers */}
        <div className="h-[56px] border-b flex flex-col sticky top-0 bg-card z-10">
          {/* Month/Week row */}
          <div className="h-[28px] flex">
            {groupedDates.map((group, idx) => (
              <div
                key={idx}
                className="border-r flex items-center justify-center text-xs font-medium capitalize bg-muted/30"
                style={{ width: group.days.length * cellWidth }}
              >
                {group.label}
              </div>
            ))}
          </div>

          {/* Day row */}
          <div className="h-[28px] flex">
            {dateRange.map((date, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-center text-xs border-r",
                  isWeekend(date) && "bg-muted/50 text-muted-foreground",
                  isSameDay(date, new Date()) && "bg-primary/10 font-bold text-primary"
                )}
                style={{ width: cellWidth }}
              >
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-[10px] text-muted-foreground">
                    {format(date, "EEE", { locale: es })}
                  </span>
                  <span>{format(date, "d")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Bars */}
        <div className="relative" style={{ height: tasks.length * 48 }}>
          {/* Grid lines */}
          {dateRange.map((date, idx) => (
            <div
              key={idx}
              className={cn(
                "absolute top-0 bottom-0 border-r border-border/50",
                isWeekend(date) && "bg-muted/20",
                isSameDay(date, new Date()) && "bg-primary/5"
              )}
              style={{ left: idx * cellWidth, width: cellWidth }}
            />
          ))}

          {/* Row backgrounds with drop zones */}
          {tasks.map((task, idx) => (
            <div
              key={task.id}
              className={cn(
                "absolute left-0 right-0 h-12 border-b transition-colors",
                idx % 2 === 0 ? "bg-background/50" : "bg-transparent",
                draggingRowId === task.id && "opacity-50",
                dropTargetIdx === idx && draggingRowId !== task.id && "bg-primary/10 border-primary"
              )}
              style={{ top: idx * 48 }}
              onDragOver={(e) => handleRowDragOver(e, idx)}
              onDrop={(e) => handleRowDrop(e, idx)}
            />
          ))}

          {/* Dependency lines SVG */}
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: totalWidth, height: tasks.length * 48 }}
          >
            {renderDependencyLines()}
          </svg>

          {/* Task bars */}
          {tasks.map((task, idx) => {
            const bar = getTaskBar(task);
            if (!bar) {
              // No dates - show placeholder
              return (
                <div
                  key={task.id}
                  className="absolute h-8 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
                  style={{
                    left: 8,
                    top: idx * 48 + 8,
                    width: 120,
                  }}
                  draggable
                  onDragStart={(e) => handleRowDragStart(e, task.id)}
                  onDragEnd={handleRowDragEnd}
                >
                  <span className="text-xs text-muted-foreground">Sin fechas</span>
                </div>
              );
            }

            const gradientColor = typeColors[task.tipo] || "from-gray-500 to-gray-600";

            return (
              <Tooltip key={task.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "absolute h-8 rounded-md shadow-sm transition-all group",
                      "flex items-center gap-1.5 px-2 text-white text-xs font-medium",
                      "bg-gradient-to-r",
                      gradientColor,
                      "hover:shadow-md hover:scale-[1.02]",
                      task.isCompleted && "opacity-60",
                      resizing?.taskId === task.id && "ring-2 ring-white/50"
                    )}
                    style={{
                      left: bar.left + 2,
                      top: idx * 48 + 8,
                      width: bar.width,
                    }}
                  >
                    {/* Progress overlay */}
                    <div
                      className="absolute inset-0 rounded-md bg-white/20 pointer-events-none"
                      style={{ width: `${task.progreso}%` }}
                    />

                    {/* Left resize handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/30 rounded-l-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart(e, task, "left", bar)}
                    >
                      <div className="w-0.5 h-4 bg-white/60 rounded-full" />
                    </div>

                    {/* Main draggable area */}
                    <div
                      className="relative flex-1 cursor-move truncate flex items-center gap-1.5 mx-3"
                      onMouseDown={(e) => handleBarDragStart(e, task, bar)}
                    >
                      <span className="truncate">{task.label}</span>
                      {task.asignado_nombre && bar.width > 100 && (
                        <Avatar className="h-5 w-5 border border-white/30 flex-shrink-0">
                          <AvatarFallback className="text-[8px] bg-white/20 text-white">
                            {getInitials(task.asignado_nombre)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>

                    {/* Right resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/30 rounded-r-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart(e, task, "right", bar)}
                    >
                      <div className="w-0.5 h-4 bg-white/60 rounded-full" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[300px]">
                  <div className="space-y-2">
                    <p className="font-semibold">{task.label}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="text-muted-foreground">Inicio:</div>
                      <div>
                        {task.fecha_inicio 
                          ? format(parseDate(task.fecha_inicio)!, "dd MMM yyyy", { locale: es })
                          : "-"}
                      </div>
                      <div className="text-muted-foreground">Fin:</div>
                      <div>
                        {task.fecha_termino 
                          ? format(parseDate(task.fecha_termino)!, "dd MMM yyyy", { locale: es })
                          : "-"}
                      </div>
                      {task.asignado_nombre && (
                        <>
                          <div className="text-muted-foreground">Responsable:</div>
                          <div>{task.asignado_nombre}</div>
                        </>
                      )}
                    </div>
                    <Progress value={task.progreso} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      {task.progreso}% completado
                    </p>
                    {task.dependencias?.length ? (
                      <p className="text-xs text-muted-foreground">
                        {task.dependencias.length} predecesora(s)
                      </p>
                    ) : null}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
