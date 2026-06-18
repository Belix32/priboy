-- Fix infinite recursion in RLS policies that query profiles from within profiles policies.
-- Run this in Supabase SQL Editor after 001_init.sql.

-- Helper: read current user's role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_moderator()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_id = auth.uid()
      AND role IN ('admin', 'moderator')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_id = auth.uid()
      AND role = 'partner'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM public.profiles WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Admin email bootstrap (set your admin email here or update after deploy)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO public.app_settings (key, value) VALUES ('admin_email', 'admin@priboi.ru')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT USING (true);

-- Callable after login to promote admin by email
CREATE OR REPLACE FUNCTION public.sync_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  admin_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  SELECT value INTO admin_email FROM public.app_settings WHERE key = 'admin_email';

  IF user_email IS NOT NULL AND admin_email IS NOT NULL
     AND lower(user_email) = lower(admin_email) THEN
    UPDATE public.profiles SET role = 'admin' WHERE auth_id = auth.uid();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_moderator() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_partner() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_partner_id() TO authenticated, anon;

-- ===== profiles policies =====
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
CREATE POLICY "Admins can manage profiles" ON profiles
  FOR ALL USING (public.is_admin_or_moderator());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth_id = auth.uid());

-- ===== travel_destinations =====
DROP POLICY IF EXISTS "Admins can manage destinations" ON travel_destinations;
CREATE POLICY "Admins can manage destinations" ON travel_destinations
  FOR ALL USING (public.is_admin_or_moderator());

-- ===== rental_partners =====
DROP POLICY IF EXISTS "Admins can manage partners" ON rental_partners;
CREATE POLICY "Admins can manage partners" ON rental_partners
  FOR ALL USING (public.is_admin_or_moderator());

-- ===== partner_locations =====
DROP POLICY IF EXISTS "Admins can manage locations" ON partner_locations;
DROP POLICY IF EXISTS "Partners can manage own locations" ON partner_locations;
CREATE POLICY "Admins can manage locations" ON partner_locations
  FOR ALL USING (public.is_admin_or_moderator());
CREATE POLICY "Partners can manage own locations" ON partner_locations
  FOR ALL USING (
    public.is_partner() AND partner_id = public.current_partner_id()
  );

-- ===== partner_cars =====
DROP POLICY IF EXISTS "Admins can manage cars" ON partner_cars;
DROP POLICY IF EXISTS "Partners can manage own cars" ON partner_cars;
DROP POLICY IF EXISTS "Anyone can view active available cars" ON partner_cars;
CREATE POLICY "Anyone can view active available cars" ON partner_cars
  FOR SELECT USING (is_active = true AND is_available = true);
CREATE POLICY "Admins can manage cars" ON partner_cars
  FOR ALL USING (public.is_admin_or_moderator());
CREATE POLICY "Partners can manage own cars" ON partner_cars
  FOR ALL USING (
    public.is_partner() AND partner_id = public.current_partner_id()
  );

-- ===== travel_bookings =====
DROP POLICY IF EXISTS "Admins can manage travel bookings" ON travel_bookings;
DROP POLICY IF EXISTS "Partners can view own bookings" ON travel_bookings;
DROP POLICY IF EXISTS "Partners can update own bookings" ON travel_bookings;
CREATE POLICY "Admins can manage travel bookings" ON travel_bookings
  FOR ALL USING (public.is_admin_or_moderator());
CREATE POLICY "Partners can view own bookings" ON travel_bookings
  FOR SELECT USING (
    public.is_partner() AND partner_id = public.current_partner_id()
  );
CREATE POLICY "Partners can update own bookings" ON travel_bookings
  FOR UPDATE USING (
    public.is_partner() AND partner_id = public.current_partner_id()
  );

-- ===== car_storage =====
DROP POLICY IF EXISTS "Admins can manage car storage" ON car_storage;
DROP POLICY IF EXISTS "Partners can manage own storage" ON car_storage;
CREATE POLICY "Admins can manage car storage" ON car_storage
  FOR ALL USING (public.is_admin_or_moderator());
CREATE POLICY "Partners can manage own storage" ON car_storage
  FOR ALL USING (
    public.is_partner() AND partner_id = public.current_partner_id()
  );

SELECT 'RLS policies fixed' AS status;
