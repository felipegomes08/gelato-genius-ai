CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL,
  created_by UUID NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  recurrence_type TEXT,
  recurrence_day_of_week INTEGER,
  recurrence_day_of_month INTEGER,
  recurrence_week_parity TEXT,
  recurrence_start_date DATE,
  recurrence_end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  completed_by UUID NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(task_id, completion_date)
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;