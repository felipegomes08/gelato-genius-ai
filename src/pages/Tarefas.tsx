import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks, isTaskDueOnDate, Task } from "@/hooks/useTasks";
import { usePermissions } from "@/hooks/usePermissions";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";
import { TaskList } from "@/components/tasks/TaskList";
import { AddTaskDialog } from "@/components/tasks/AddTaskDialog";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { DeleteTaskDialog } from "@/components/tasks/DeleteTaskDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function Tarefas() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { isMaster, loading: permissionsLoading } = usePermissions();
  const {
    tasks,
    completions,
    profiles,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    toggleCompletion,
    isTaskCompletedOnDate,
    getTaskAssignees,
    isCreating,
    isUpdating,
  } = useTasks();

  const tasksWithProfiles = tasks.map(task => {
    const assigneeIds = getTaskAssignees(task.id);
    const assignedProfiles = profiles.filter(p => assigneeIds.includes(p.id));
    
    // Fallback to legacy assigned_to if no assignees
    if (assignedProfiles.length === 0 && task.assigned_to) {
      const legacyProfile = profiles.find(p => p.id === task.assigned_to);
      if (legacyProfile) {
        assignedProfiles.push(legacyProfile);
      }
    }
    
    return {
      ...task,
      assigned_profiles: assignedProfiles,
    };
  });

  const tasksForSelectedDate = tasksWithProfiles.filter(task =>
    isTaskDueOnDate(task, selectedDate)
  );

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleDelete = (task: Task) => {
    setSelectedTask(task);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedTask) {
      deleteTask(selectedTask.id);
      setDeleteDialogOpen(false);
      setSelectedTask(null);
    }
  };

  const handleToggleComplete = (taskId: string, date: Date, completed: boolean) => {
    toggleCompletion({ taskId, date, completed });
  };

  if (permissionsLoading || isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-24 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">
          {isMaster ? "Calendário de Tarefas" : "Minhas Tarefas"}
        </h1>
        {isMaster && (
          <Button onClick={() => setAddDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Nova Tarefa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        )}
      </div>

      {/* Main content - responsive layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <TaskCalendar
            tasks={tasks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            completions={completions}
          />
        </div>

        {/* Task list for selected date */}
        <div className="lg:col-span-2">
          <TaskList
            tasks={tasksForSelectedDate}
            date={selectedDate}
            isTaskCompletedOnDate={isTaskCompletedOnDate}
            onToggleComplete={handleToggleComplete}
            onEdit={isMaster ? handleEdit : undefined}
            onDelete={isMaster ? handleDelete : undefined}
            showAssignee={isMaster}
            isMaster={isMaster}
          />
        </div>
      </div>

      {/* Dialogs */}
      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={createTask}
        profiles={profiles}
        isLoading={isCreating}
      />

      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={updateTask}
        task={selectedTask}
        profiles={profiles}
        currentAssignees={selectedTask ? getTaskAssignees(selectedTask.id) : []}
        isLoading={isUpdating}
      />

      <DeleteTaskDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        taskTitle={selectedTask?.title ?? ""}
      />
    </div>
  );
}