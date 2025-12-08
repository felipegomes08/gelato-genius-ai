-- Add new permission column
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS can_access_notifications BOOLEAN NOT NULL DEFAULT false;

-- Create notifications table (templates)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  
  -- Recurrence
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_type TEXT, -- 'daily', 'weekly', 'monthly'
  recurrence_day_of_week INTEGER, -- 0-6
  recurrence_day_of_month INTEGER, -- 1-31
  recurrence_time TIME,
  recurrence_end_date DATE,
  last_sent_at TIMESTAMPTZ,
  
  -- Target
  target_type TEXT NOT NULL DEFAULT 'all', -- 'all' | 'specific'
  target_user_ids UUID[],
  
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create user_notifications table (received notifications)
CREATE TABLE public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create permission check function
CREATE OR REPLACE FUNCTION public.can_access_notifications_area(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'master'::app_role) OR
    EXISTS (
      SELECT 1 
      FROM public.user_permissions 
      WHERE user_id = _user_id AND can_access_notifications = true
    )
$$;

-- RLS Policies for notifications
CREATE POLICY "Users with notifications access can view notifications"
ON public.notifications FOR SELECT
USING (can_access_notifications_area(auth.uid()));

CREATE POLICY "Users with notifications access can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (can_access_notifications_area(auth.uid()));

CREATE POLICY "Users with notifications access can update notifications"
ON public.notifications FOR UPDATE
USING (can_access_notifications_area(auth.uid()))
WITH CHECK (can_access_notifications_area(auth.uid()));

CREATE POLICY "Users with notifications access can delete notifications"
ON public.notifications FOR DELETE
USING (can_access_notifications_area(auth.uid()));

-- RLS Policies for user_notifications
CREATE POLICY "Users can view their own notifications"
ON public.user_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.user_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.user_notifications FOR INSERT
WITH CHECK (true);

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for user_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- Create indexes for performance
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_is_read ON public.user_notifications(user_id, is_read);
CREATE INDEX idx_notifications_scheduled ON public.notifications(scheduled_at) WHERE is_sent = false AND is_active = true;
CREATE INDEX idx_notifications_recurring ON public.notifications(is_recurring) WHERE is_recurring = true AND is_active = true;