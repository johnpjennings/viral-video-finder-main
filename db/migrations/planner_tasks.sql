-- Create planner_tasks table for daily/weekly/monthly to-dos
CREATE TABLE public.planner_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  task_type text NOT NULL CHECK (task_type IN ('daily', 'weekly', 'monthly')),
  due_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policy for single-user app
CREATE POLICY "Allow all operations on planner_tasks"
ON public.planner_tasks
FOR ALL
USING (true)
WITH CHECK (true);