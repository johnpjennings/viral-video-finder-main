-- Create subtasks table for planner tasks
CREATE TABLE public.planner_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.planner_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planner_subtasks ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single-user app)
CREATE POLICY "Allow all operations on planner_subtasks"
ON public.planner_subtasks
FOR ALL
USING (true)
WITH CHECK (true);