-- Add sort_order column for custom ordering within columns
ALTER TABLE public.video_productions ADD COLUMN sort_order integer NOT NULL DEFAULT 0;