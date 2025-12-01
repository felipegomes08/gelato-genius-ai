import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { usePermissions } from "./usePermissions";
import { toast } from "sonner";
import { format, getWeek, getDay, getDate, isAfter, isBefore, isEqual, parseISO, startOfDay, endOfDay, addDays } from "date-fns";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  created_by: string;
  is_recurring: boolean;
  due_date: string | null;
  recurrence_type: string | null;
  recurrence_day_of_week: number | null;
  recurrence_day_of_month: number | null;
  recurrence_week_parity: string | null;
  recurrence_start_date: string | null;
  recurrence_end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_profile?: {
    id: string;
    full_name: string;
  };
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  completion_date: string;
  completed_by: string;
  completed_at: string;
  notes: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigned_to: string;
  is_recurring: boolean;
  due_date?: string;
  recurrence_type?: string;
  recurrence_day_of_week?: number;
  recurrence_day_of_month?: number;
  recurrence_week_parity?: string;
  recurrence_start_date?: string;
  recurrence_end_date?: string;
}

export function isTaskDueOnDate(task: Task, date: Date): boolean {
  if (!task.is_active) return false;

  if (!task.is_recurring && task.due_date) {
    const dueDate = parseISO(task.due_date);
    return format(dueDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
  }

  if (task.is_recurring) {
    const startDate = task.recurrence_start_date ? parseISO(task.recurrence_start_date) : null;
    const endDate = task.recurrence_end_date ? parseISO(task.recurrence_end_date) : null;

    if (startDate && isBefore(date, startOfDay(startDate))) return false;
    if (endDate && isAfter(date, endOfDay(endDate))) return false;

    const dayOfWeek = getDay(date);
    const dayOfMonth = getDate(date);
    const weekNumber = getWeek(date);

    switch (task.recurrence_type) {
      case 'weekly':
        return dayOfWeek === task.recurrence_day_of_week;
      
      case 'biweekly':
        if (dayOfWeek !== task.recurrence_day_of_week) return false;
        const isOddWeek = weekNumber % 2 === 1;
        return task.recurrence_week_parity === 'odd' ? isOddWeek : !isOddWeek;
      
      case 'monthly_date':
        return dayOfMonth === task.recurrence_day_of_month;
      
      default:
        return false;
    }
  }

  return false;
}

export function useTasks() {
  const { user } = useAuth();
  const { isMaster } = usePermissions();
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['tasks', user?.id, isMaster],
    queryFn: async () => {
      const query = supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });

  const completionsQuery = useQuery({
    queryKey: ['task_completions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_completions')
        .select('*')
        .order('completion_date', { ascending: false });

      if (error) throw error;
      return data as TaskCompletion[];
    },
    enabled: !!user,
  });

  const profilesQuery = useQuery({
    queryKey: ['profiles_for_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
    enabled: !!user && isMaster,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...input,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar tarefa: ' + error.message);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar tarefa: ' + error.message);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa removida!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover tarefa: ' + error.message);
    },
  });

  const toggleCompletionMutation = useMutation({
    mutationFn: async ({ taskId, date, completed }: { taskId: string; date: Date; completed: boolean }) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const completionDate = format(date, 'yyyy-MM-dd');

      if (completed) {
        const { error } = await supabase
          .from('task_completions')
          .delete()
          .eq('task_id', taskId)
          .eq('completion_date', completionDate);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('task_completions')
          .insert({
            task_id: taskId,
            completion_date: completionDate,
            completed_by: user.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_completions'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar conclusão: ' + error.message);
    },
  });

  const isTaskCompletedOnDate = (taskId: string, date: Date): boolean => {
    const completionDate = format(date, 'yyyy-MM-dd');
    return completionsQuery.data?.some(
      c => c.task_id === taskId && c.completion_date === completionDate
    ) ?? false;
  };

  const getTasksForDate = (date: Date): Task[] => {
    return tasksQuery.data?.filter(task => isTaskDueOnDate(task, date)) ?? [];
  };

  const getTasksWithProfiles = (): (Task & { assigned_profile?: { id: string; full_name: string } })[] => {
    if (!tasksQuery.data) return [];
    
    return tasksQuery.data.map(task => ({
      ...task,
      assigned_profile: profilesQuery.data?.find(p => p.id === task.assigned_to),
    }));
  };

  return {
    tasks: tasksQuery.data ?? [],
    completions: completionsQuery.data ?? [],
    profiles: profilesQuery.data ?? [],
    isLoading: tasksQuery.isLoading || completionsQuery.isLoading,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    toggleCompletion: toggleCompletionMutation.mutate,
    isTaskCompletedOnDate,
    getTasksForDate,
    getTasksWithProfiles,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
  };
}