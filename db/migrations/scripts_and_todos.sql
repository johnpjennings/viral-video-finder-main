-- Add thumbnail_url column to video_productions
ALTER TABLE public.video_productions
ADD COLUMN thumbnail_url text;

-- Create scripts table for video scripts
CREATE TABLE public.scripts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.video_productions(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create script_versions table for version history
CREATE TABLE public.script_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  content text NOT NULL,
  version_number integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create production_todos table
CREATE TABLE public.production_todos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.video_productions(id) ON DELETE CASCADE,
  task text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create editing_todos table
CREATE TABLE public.editing_todos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.video_productions(id) ON DELETE CASCADE,
  task text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create editing_notes table
CREATE TABLE public.editing_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.video_productions(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editing_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editing_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for scripts (allow all for single-user app)
CREATE POLICY "Allow all operations on scripts"
ON public.scripts
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS policies for script_versions
CREATE POLICY "Allow all operations on script_versions"
ON public.script_versions
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS policies for production_todos
CREATE POLICY "Allow all operations on production_todos"
ON public.production_todos
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS policies for editing_todos
CREATE POLICY "Allow all operations on editing_todos"
ON public.editing_todos
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS policies for editing_notes
CREATE POLICY "Allow all operations on editing_notes"
ON public.editing_notes
FOR ALL
USING (true)
WITH CHECK (true);

-- Add updated_at triggers
CREATE TRIGGER update_scripts_updated_at
BEFORE UPDATE ON public.scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_video_productions_updated_at();

CREATE TRIGGER update_editing_notes_updated_at
BEFORE UPDATE ON public.editing_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_video_productions_updated_at();