import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Task, isTaskDueOnDate } from "@/hooks/useTasks";

interface TaskCalendarProps {
  tasks: Task[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  completions: { task_id: string; completion_date: string }[];
}

export function TaskCalendar({ tasks, selectedDate, onSelectDate, completions }: TaskCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getTaskCountForDate = (date: Date) => {
    return tasks.filter(task => isTaskDueOnDate(task, date)).length;
  };

  const getCompletedCountForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const tasksForDate = tasks.filter(task => isTaskDueOnDate(task, date));
    return tasksForDate.filter(task => 
      completions.some(c => c.task_id === task.id && c.completion_date === dateStr)
    ).length;
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-semibold text-lg capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dayName) => (
          <div
            key={dayName}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          const taskCount = getTaskCountForDate(date);
          const completedCount = getCompletedCountForDate(date);
          const isSelected = isSameDay(date, selectedDate);
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isTodayDate = isToday(date);

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(date)}
              className={cn(
                "aspect-square p-1 rounded-lg text-sm transition-colors relative",
                "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
                !isCurrentMonth && "text-muted-foreground/50",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                isTodayDate && !isSelected && "ring-2 ring-primary"
              )}
            >
              <span className="block">{format(date, "d")}</span>
              {taskCount > 0 && isCurrentMonth && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {completedCount === taskCount ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  ) : completedCount > 0 ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Concluídas</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>Parcial</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>Pendentes</span>
        </div>
      </div>
    </div>
  );
}