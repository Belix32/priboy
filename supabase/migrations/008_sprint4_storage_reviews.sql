-- Sprint 4: standalone storage bookings + partner reviews

ALTER TABLE public.travel_bookings
  ADD COLUMN IF NOT EXISTS booking_type TEXT NOT NULL DEFAULT 'rental'
    CHECK (booking_type IN ('rental', 'storage_only'));

ALTER TABLE public.travel_bookings
  ALTER COLUMN car_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.partner_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.travel_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.rental_partners(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_reviews_partner ON public.partner_reviews(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_reviews_user ON public.partner_reviews(user_id);

ALTER TABLE public.partner_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read partner reviews" ON public.partner_reviews;
CREATE POLICY "Anyone can read partner reviews" ON public.partner_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create review for own completed booking" ON public.partner_reviews;
CREATE POLICY "Users can create review for own completed booking" ON public.partner_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.travel_bookings b
      WHERE b.id = booking_id
        AND b.user_id = auth.uid()
        AND b.status = 'completed'
        AND b.partner_id = partner_reviews.partner_id
    )
  );

CREATE OR REPLACE FUNCTION public.refresh_partner_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE rental_partners
  SET rating = COALESCE((
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM partner_reviews
    WHERE partner_id = COALESCE(NEW.partner_id, OLD.partner_id)
  ), 0),
  updated_at = now()
  WHERE id = COALESCE(NEW.partner_id, OLD.partner_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_reviews_rating ON public.partner_reviews;
CREATE TRIGGER trg_partner_reviews_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.partner_reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_partner_rating();
