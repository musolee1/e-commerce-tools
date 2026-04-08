-- Grid Images Storage Bucket oluşturma
-- Bu SQL'i Supabase Dashboard → SQL Editor'da çalıştırın

-- 1. Bucket oluştur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'grid-images',
    'grid-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Authenticated kullanıcılar kendi klasörlerinde upload yapabilsin
CREATE POLICY "Users can upload grid images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'grid-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Herkes görselleri görebilsin (public bucket)
CREATE POLICY "Public grid images access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'grid-images');

-- 4. Kullanıcılar kendi görsellerini silebilsin
CREATE POLICY "Users can delete own grid images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'grid-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
