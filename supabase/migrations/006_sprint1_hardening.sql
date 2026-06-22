-- Sprint 1: booking overlap check + atomic promo increment

CREATE OR REPLACE FUNCTION public.is_car_available_for_dates(
  p_car_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM travel_bookings
    WHERE car_id = p_car_id
      AND status IN ('pending', 'confirmed', 'active')
      AND (p_exclude_booking_id IS NULL OR id <> p_exclude_booking_id)
      AND start_date < p_end_date
      AND end_date > p_start_date
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_car_available_for_dates(UUID, DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_car_available_for_dates(UUID, DATE, DATE, UUID) TO anon;

CREATE OR REPLACE FUNCTION public.increment_promo_use(p_promo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE promo_codes
  SET used_count = used_count + 1, updated_at = now()
  WHERE id = p_promo_id
    AND is_active = true
    AND (max_uses = 0 OR used_count < max_uses);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promo code usage limit reached or inactive';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_promo_use(UUID) TO authenticated;

SELECT 'Прибой v2 sprint1 hardening OK' AS status;
