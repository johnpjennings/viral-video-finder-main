-- Create sessions table for server-side session management
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

-- Create indexes for efficient lookups
CREATE INDEX idx_sessions_token ON public.sessions(token);
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Only service role can manage sessions (edge functions use service role)
CREATE POLICY "Service role manages sessions"
ON public.sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.sessions WHERE expires_at < now();
END;
$$;

-- Fix storage policies: remove permissive policies
DROP POLICY IF EXISTS "Anyone can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update thumbnails" ON storage.objects;

-- Create restrictive policy: only service role (via edge functions) can manage thumbnails
CREATE POLICY "Service role manages thumbnails"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'thumbnails')
WITH CHECK (bucket_id = 'thumbnails');