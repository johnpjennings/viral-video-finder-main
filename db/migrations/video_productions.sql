-- Create video production items table
CREATE TABLE public.video_productions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'in_process', 'released')),
  scheduled_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public access since single user)
ALTER TABLE public.video_productions ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single user, no auth)
CREATE POLICY "Allow all operations on video_productions"
ON public.video_productions
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_video_productions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_video_productions_updated_at
BEFORE UPDATE ON public.video_productions
FOR EACH ROW
EXECUTE FUNCTION public.update_video_productions_updated_at();