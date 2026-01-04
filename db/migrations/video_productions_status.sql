-- Drop the existing check constraint
ALTER TABLE public.video_productions DROP CONSTRAINT IF EXISTS video_productions_status_check;

-- Add new check constraint with all status values including scripting and editing
ALTER TABLE public.video_productions ADD CONSTRAINT video_productions_status_check 
CHECK (status IN ('idea', 'scripting', 'in_process', 'editing', 'released'));