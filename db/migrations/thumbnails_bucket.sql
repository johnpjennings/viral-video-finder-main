-- Create storage bucket for video thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);

-- Allow public read access to thumbnails
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

-- Allow all users to upload thumbnails (single-user app)
CREATE POLICY "Anyone can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'thumbnails');

-- Allow all users to update thumbnails
CREATE POLICY "Anyone can update thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'thumbnails');

-- Allow all users to delete thumbnails
CREATE POLICY "Anyone can delete thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'thumbnails');