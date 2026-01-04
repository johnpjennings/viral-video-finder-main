-- Create a table to cache YouTube API responses
CREATE TABLE public.api_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  cache_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index for faster lookups
CREATE INDEX idx_api_cache_key ON public.api_cache(cache_key);
CREATE INDEX idx_api_cache_expires ON public.api_cache(expires_at);

-- Enable RLS but allow public read/write for edge functions
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to read and write cache (using service role)
CREATE POLICY "Allow all operations on cache" 
ON public.api_cache 
FOR ALL 
USING (true)
WITH CHECK (true);