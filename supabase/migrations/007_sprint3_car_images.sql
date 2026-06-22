-- Sprint 3: Supabase Storage bucket for car photos

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'car-images',
  'car-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read car images" ON storage.objects;
CREATE POLICY "Public read car images" ON storage.objects
  FOR SELECT USING (bucket_id = 'car-images');

DROP POLICY IF EXISTS "Partners upload car images" ON storage.objects;
CREATE POLICY "Partners upload car images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'car-images'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE auth_id = auth.uid()
          AND role IN ('admin', 'moderator')
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE auth_id = auth.uid()
          AND role = 'partner'
          AND partner_id::text = (storage.foldername(name))[1]
      )
    )
  );

DROP POLICY IF EXISTS "Partners update car images" ON storage.objects;
CREATE POLICY "Partners update car images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'car-images'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE auth_id = auth.uid()
          AND role IN ('admin', 'moderator')
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE auth_id = auth.uid()
          AND role = 'partner'
          AND partner_id::text = (storage.foldername(name))[1]
      )
    )
  );

DROP POLICY IF EXISTS "Partners delete car images" ON storage.objects;
CREATE POLICY "Partners delete car images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'car-images'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE auth_id = auth.uid()
          AND role IN ('admin', 'moderator')
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE auth_id = auth.uid()
          AND role = 'partner'
          AND partner_id::text = (storage.foldername(name))[1]
      )
    )
  );
