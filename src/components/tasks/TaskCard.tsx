import { Check, RotateCcw, Calendar, User, Users, Trash2, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Task } from "@/hooks/useTasks";
import { format } from "date-fns";

interface TaskCardProps {
  task: Task & { assigned_profiles?: { id: string; full_name: string }[] };
  date: Date;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showAssignee?: boolean;
  isMaster?: boolean;
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function getRecurrenceLabel(task: Task): string {
  if (!task.is_recurring) {
    return task.due_date ? format(new Date(task.due_date), "dd/MM/yyyy") : '';
  }

  switch (task.recurrence_type) {
    case 'weekly':
      return `Toda ${dayNames[task.recurrence_day_of_week ?? 0]}`;
    case 'biweekly':
      const parityLabel = task.recurrence_week_parity === 'odd' ? 'sim' : 'não';
      return `${dayNames[task.recurrence_day_of_week ?? 0]} ${parityLabel}, ${dayNames[task.recurrence_day_of_week ?? 0]} não`;
    case 'monthly_date':
      return `Todo dia ${task.recurrence_day_of_month}`;
    default:
      return '';
  }
}

export function TaskCard({
  task,
  date,
  isCompleted,
  onToggleComplete,
  onEdit,
  onDelete,
  showAssignee = false,
  isMaster = false,
}: TaskCardProps) {
  const assignedProfiles = task.assigned_profiles ?? [];
  const hasMultipleAssignees = assignedProfiles.length > 1;

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isCompleted && "opacity-60 bg-muted/50"
      )}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <Button
            variant={isCompleted ? "default" : "outline"}
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0 rounded-full",
              isCompleted && "bg-green-600 hover:bg-green-700"
            )}
            onClick={onToggleComplete}
          >
            {isCompleted ? (
              <Check className="h-4 w-4" />
            ) : (
              <div className="h-3 w-3 rounded-full border-2 border-current" />
            )}
          </Button>

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-medium text-sm sm:text-base",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </p>

            {task.description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {task.is_recurring && (
                <Badge variant="secondary" className="text-xs">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  {getRecurrenceLabel(task)}
                </Badge>
              )}

              {!task.is_recurring && task.due_date && (
                <Badge variant="outline" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {getRecurrenceLabel(task)}
                </Badge>
              )}

              {showAssignee && assignedProfiles.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {hasMultipleAssignees ? (
                    <Users className="h-3 w-3 mr-1" />
                  ) : (
                    <User className="h-3 w-3 mr-1" />
                  )}
                  {hasMultipleAssignees 
                    ? `${assignedProfiles.length} funcionários`
                    : assignedProfiles[0]?.full_name
                  }
                </Badge>
              )}
            </div>

            {/* Show all assignees when multiple */}
            {showAssignee && hasMultipleAssignees && (
              <div className="flex flex-wrap gap-1 mt-2">
                {assignedProfiles.map(profile => (
                  <Badge key={profile.id} variant="secondary" className="text-xs">
                    {profile.full_name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {isMaster && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onEdit}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}