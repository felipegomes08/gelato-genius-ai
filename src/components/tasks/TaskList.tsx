import { Task } from "@/hooks/useTasks";
import { TaskCard } from "./TaskCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskListProps {
  tasks: (Task & { assigned_profile?: { id: string; full_name: string } })[];
  date: Date;
  isTaskCompletedOnDate: (taskId: string, date: Date) => boolean;
  onToggleComplete: (taskId: string, date: Date, completed: boolean) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  showAssignee?: boolean;
  isMaster?: boolean;
}

export function TaskList({
  tasks,
  date,
  isTaskCompletedOnDate,
  onToggleComplete,
  onEdit,
  onDelete,
  showAssignee = false,
  isMaster = false,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhuma tarefa para {format(date, "dd 'de' MMMM", { locale: ptBR })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
        {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
      </h3>
      {tasks.map((task) => {
        const isCompleted = isTaskCompletedOnDate(task.id, date);
        return (
          <TaskCard
            key={task.id}
            task={task}
            date={date}
            isCompleted={isCompleted}
            onToggleComplete={() => onToggleComplete(task.id, date, isCompleted)}
            onEdit={onEdit ? () => onEdit(task) : undefined}
            onDelete={onDelete ? () => onDelete(task) : undefined}
            showAssignee={showAssignee}
            isMaster={isMaster}
          />
        );
      })}
    </div>
  );
}