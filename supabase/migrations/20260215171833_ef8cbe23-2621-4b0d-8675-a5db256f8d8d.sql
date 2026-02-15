-- Create storage bucket for contact avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-avatars', 'contact-avatars', true);

-- Allow authenticated users to upload to contact-avatars bucket
CREATE POLICY "Authenticated users can upload contact avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contact-avatars' AND auth.uid() IS NOT NULL);

-- Allow public read access
CREATE POLICY "Anyone can view contact avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'contact-avatars');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update contact avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'contact-avatars' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete contact avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'contact-avatars' AND auth.uid() IS NOT NULL);