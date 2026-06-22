-- ====================================================================
-- ПРИБОЙ v2 — ПОЛНЫЙ ДЕПЛОЙ БД (Supabase SQL Editor)
-- Вставьте весь файл целиком и нажмите Run.
-- Проект: cuuwyvhoxdyolsqvjtgh
-- ====================================================================

-- ====================================================================
-- ЧАСТЬ 1: Схема + seed (001_init.sql)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'partner', 'moderator', 'admin')),
  partner_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_id ON profiles(auth_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_id, name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'user'
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth_id = auth.uid());
CREATE POLICY "Admins can manage profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.auth_id = auth.uid() AND p.role IN ('admin', 'moderator'))
  );

CREATE TABLE IF NOT EXISTS travel_destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image TEXT,
  hero_image TEXT,
  region TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  price_from INTEGER DEFAULT 1200,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rental_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  is_active BOOLEAN DEFAULT true,
  commission_rate DECIMAL(5, 2) DEFAULT 15.00,
  rating DECIMAL(3, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_partner_id_fkey;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES rental_partners(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS partner_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES rental_partners(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES travel_destinations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone TEXT,
  has_storage BOOLEAN DEFAULT true,
  has_rental BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES rental_partners(id) ON DELETE CASCADE,
  location_id UUID REFERENCES partner_locations(id) ON DELETE SET NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  color TEXT,
  license_plate TEXT,
  transmission TEXT CHECK (transmission IN ('manual', 'automatic')),
  fuel_type TEXT CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid')),
  seats INTEGER DEFAULT 5,
  price_per_day INTEGER NOT NULL CHECK (price_per_day > 0),
  deposit INTEGER DEFAULT 0,
  image TEXT,
  images TEXT[] DEFAULT '{}',
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS travel_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES travel_destinations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES rental_partners(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES partner_cars(id) ON DELETE CASCADE,
  location_id UUID REFERENCES partner_locations(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rental_price_per_day INTEGER,
  total_rental_days INTEGER,
  total_rental_price INTEGER,
  has_storage BOOLEAN DEFAULT true,
  storage_price_per_day INTEGER DEFAULT 0,
  total_storage_days INTEGER,
  total_storage_price INTEGER DEFAULT 0,
  own_car_brand TEXT,
  own_car_model TEXT,
  own_car_color TEXT,
  own_car_license_plate TEXT,
  total_price INTEGER NOT NULL,
  commission_price INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'partially_refunded')),
  payment_method TEXT,
  payment_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS car_storage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  travel_booking_id UUID NOT NULL REFERENCES travel_bookings(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES rental_partners(id) ON DELETE CASCADE,
  location_id UUID REFERENCES partner_locations(id) ON DELETE SET NULL,
  car_brand TEXT NOT NULL,
  car_model TEXT NOT NULL,
  car_color TEXT,
  car_license_plate TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_storage', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_destinations_slug ON travel_destinations(slug);
CREATE INDEX IF NOT EXISTS idx_destinations_is_active ON travel_destinations(is_active);
CREATE INDEX IF NOT EXISTS idx_partners_slug ON rental_partners(slug);
CREATE INDEX IF NOT EXISTS idx_cars_partner ON partner_cars(partner_id);
CREATE INDEX IF NOT EXISTS idx_cars_location ON partner_cars(location_id);
CREATE INDEX IF NOT EXISTS idx_travel_bookings_user ON travel_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_bookings_car ON travel_bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_travel_bookings_dates ON travel_bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_storage_booking ON car_storage(travel_booking_id);

DROP TRIGGER IF EXISTS trg_rental_partners_updated_at ON rental_partners;
DROP TRIGGER IF EXISTS trg_partner_cars_updated_at ON partner_cars;
DROP TRIGGER IF EXISTS trg_travel_bookings_updated_at ON travel_bookings;
DROP TRIGGER IF EXISTS trg_car_storage_updated_at ON car_storage;
DROP TRIGGER IF EXISTS trg_travel_destinations_updated_at ON travel_destinations;

CREATE TRIGGER trg_travel_destinations_updated_at BEFORE UPDATE ON travel_destinations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rental_partners_updated_at BEFORE UPDATE ON rental_partners FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_partner_cars_updated_at BEFORE UPDATE ON partner_cars FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_travel_bookings_updated_at BEFORE UPDATE ON travel_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_car_storage_updated_at BEFORE UPDATE ON car_storage FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE travel_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_storage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active destinations" ON travel_destinations;
DROP POLICY IF EXISTS "Admins can manage destinations" ON travel_destinations;
CREATE POLICY "Anyone can view active destinations" ON travel_destinations FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage destinations" ON travel_destinations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role IN ('admin', 'moderator'))
);

DROP POLICY IF EXISTS "Anyone can view active partners" ON rental_partners;
DROP POLICY IF EXISTS "Admins can manage partners" ON rental_partners;
CREATE POLICY "Anyone can view active partners" ON rental_partners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage partners" ON rental_partners FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role IN ('admin', 'moderator'))
);

DROP POLICY IF EXISTS "Anyone can view locations" ON partner_locations;
DROP POLICY IF EXISTS "Admins can manage locations" ON partner_locations;
DROP POLICY IF EXISTS "Partners can manage own locations" ON partner_locations;
CREATE POLICY "Anyone can view locations" ON partner_locations FOR SELECT USING (true);
CREATE POLICY "Admins can manage locations" ON partner_locations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "Partners can manage own locations" ON partner_locations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'partner' AND partner_id = partner_locations.partner_id)
);

DROP POLICY IF EXISTS "Anyone can view active available cars" ON partner_cars;
DROP POLICY IF EXISTS "Admins can manage cars" ON partner_cars;
DROP POLICY IF EXISTS "Partners can manage own cars" ON partner_cars;
CREATE POLICY "Anyone can view active available cars" ON partner_cars FOR SELECT USING (is_active = true AND is_available = true);
CREATE POLICY "Admins can manage cars" ON partner_cars FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "Partners can manage own cars" ON partner_cars FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'partner' AND partner_id = partner_cars.partner_id)
);

DROP POLICY IF EXISTS "Users can view own travel bookings" ON travel_bookings;
DROP POLICY IF EXISTS "Users can create travel booking" ON travel_bookings;
DROP POLICY IF EXISTS "Users can update own travel booking" ON travel_bookings;
DROP POLICY IF EXISTS "Admins can manage travel bookings" ON travel_bookings;
DROP POLICY IF EXISTS "Partners can view own bookings" ON travel_bookings;
DROP POLICY IF EXISTS "Partners can update own bookings" ON travel_bookings;
CREATE POLICY "Users can view own travel bookings" ON travel_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create travel booking" ON travel_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own travel booking" ON travel_bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage travel bookings" ON travel_bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "Partners can view own bookings" ON travel_bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'partner' AND partner_id = travel_bookings.partner_id)
);
CREATE POLICY "Partners can update own bookings" ON travel_bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'partner' AND partner_id = travel_bookings.partner_id)
);

DROP POLICY IF EXISTS "Users can view own car storage" ON car_storage;
DROP POLICY IF EXISTS "Admins can manage car storage" ON car_storage;
DROP POLICY IF EXISTS "Partners can manage own storage" ON car_storage;
CREATE POLICY "Users can view own car storage" ON car_storage FOR SELECT USING (
  EXISTS (SELECT 1 FROM travel_bookings WHERE travel_bookings.id = car_storage.travel_booking_id AND travel_bookings.user_id = auth.uid())
);
CREATE POLICY "Admins can manage car storage" ON car_storage FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "Partners can manage own storage" ON car_storage FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'partner' AND partner_id = car_storage.partner_id)
);

INSERT INTO travel_destinations (id, name, slug, description, region, latitude, longitude, price_from, hero_image, sort_order) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Сочи', 'sochi', 'Жемчужина Черноморского побережья', 'Краснодарский край', 43.60280000, 39.73430000, 2500, 'https://images.unsplash.com/photo-1596484552834-086a760e5a59?w=800&q=80', 1),
  ('a0000000-0000-4000-8000-000000000002', 'Анапа', 'anapa', 'Солнце, песчаные пляжи и целебный воздух', 'Краснодарский край', 44.89440000, 37.31670000, 1800, 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80', 2),
  ('a0000000-0000-4000-8000-000000000003', 'Геленджик', 'gelendzhik', 'Уютные бухты и набережная', 'Краснодарский край', 44.56110000, 38.07670000, 2000, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', 3),
  ('a0000000-0000-4000-8000-000000000004', 'Туапсе', 'tuapse', 'Город-порт на Черноморском побережье', 'Краснодарский край', 44.09370000, 39.07420000, 1500, 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&q=80', 4),
  ('a0000000-0000-4000-8000-000000000005', 'Крым', 'crimea', 'Полуостров с уникальной природой', 'Республика Крым', 44.95210000, 34.10240000, 2200, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', 5)
ON CONFLICT (id) DO UPDATE SET
  price_from = EXCLUDED.price_from,
  hero_image = EXCLUDED.hero_image;

INSERT INTO rental_partners (id, name, slug, description, commission_rate, rating) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'АвтоМоре Сочи', 'avtomore-sochi', 'Крупнейший прокат на Черноморском побережье', 15.00, 4.7),
  ('b0000000-0000-4000-8000-000000000002', 'Южный Прокат', 'yuzhny-prokat', 'Надёжный партнёр для ваших поездок', 12.00, 4.5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO partner_locations (id, partner_id, destination_id, name, address, latitude, longitude, phone) VALUES
  ('c0000000-0000-4000-8000-000000000101', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'АвтоМоре — Сочи', 'ул. Курортный проспект, 89, Сочи', 43.58550000, 39.72280000, '+7 (862) 200-10-01'),
  ('c0000000-0000-4000-8000-000000000102', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'АвтоМоре — Анапа', 'ул. Ленина, 12, Анапа', 44.89350000, 37.31850000, '+7 (861) 330-20-02'),
  ('c0000000-0000-4000-8000-000000000103', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'АвтоМоре — Геленджик', 'ул. Революционная, 45, Геленджик', 44.56200000, 38.07550000, '+7 (861) 410-30-03'),
  ('c0000000-0000-4000-8000-000000000201', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Южный Прокат — Сочи', 'ул. Навагинская, 7, Сочи', 43.58700000, 39.72400000, '+7 (862) 250-40-04'),
  ('c0000000-0000-4000-8000-000000000202', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Южный Прокат — Анапа', 'пр-т Пионерский, 38, Анапа', 44.89200000, 37.32000000, '+7 (861) 330-50-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partner_cars (id, partner_id, location_id, brand, model, year, transmission, fuel_type, seats, price_per_day, deposit, is_available, is_active) VALUES
  ('d0000000-0000-4000-8000-000000000101', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000101', 'Hyundai', 'Solaris', 2021, 'automatic', 'gasoline', 5, 2500, 5000, true, true),
  ('d0000000-0000-4000-8000-000000000102', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000101', 'Toyota', 'Camry', 2023, 'automatic', 'gasoline', 5, 4500, 10000, true, true),
  ('d0000000-0000-4000-8000-000000000105', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000102', 'Lada', 'Vesta', 2022, 'manual', 'gasoline', 5, 1800, 3000, true, true),
  ('d0000000-0000-4000-8000-000000000109', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000103', 'Hyundai', 'Creta', 2022, 'automatic', 'gasoline', 5, 3000, 6000, true, true),
  ('d0000000-0000-4000-8000-000000000201', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000201', 'Renault', 'Duster', 2022, 'manual', 'gasoline', 5, 2200, 4000, true, true),
  ('d0000000-0000-4000-8000-000000000202', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000201', 'Hyundai', 'Tucson', 2023, 'automatic', 'gasoline', 5, 3500, 7000, true, true)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- ЧАСТЬ 2: Исправление RLS (002_fix_rls_recursion.sql)
-- ====================================================================

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

DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
CREATE POLICY "Admins can manage profiles" ON profiles
  FOR ALL USING (public.is_admin_or_moderator());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage destinations" ON travel_destinations;
CREATE POLICY "Admins can manage destinations" ON travel_destinations
  FOR ALL USING (public.is_admin_or_moderator());

DROP POLICY IF EXISTS "Admins can manage partners" ON rental_partners;
CREATE POLICY "Admins can manage partners" ON rental_partners
  FOR ALL USING (public.is_admin_or_moderator());

DROP POLICY IF EXISTS "Admins can manage locations" ON partner_locations;
DROP POLICY IF EXISTS "Partners can manage own locations" ON partner_locations;
CREATE POLICY "Admins can manage locations" ON partner_locations
  FOR ALL USING (public.is_admin_or_moderator());
CREATE POLICY "Partners can manage own locations" ON partner_locations
  FOR ALL USING (
    public.is_partner() AND partner_id = public.current_partner_id()
  );

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

DROP POLICY IF EXISTS "Admins can manage car storage" ON car_storage;
DROP POLICY IF EXISTS "Partners can manage own storage" ON car_storage;
CREATE POLICY "Admins can manage car storage" ON car_storage
  FOR ALL USING (public.is_admin_or_moderator());
CREATE POLICY "Partners can manage own storage" ON car_storage
  FOR ALL USING (
    public.is_partner() AND partner_id = public.current_partner_id()
  );

SELECT 'Прибой v2 deployed OK' AS status;

-- ====================================================================
-- ЧАСТЬ 3: Промокоды + admin profiles RPC (003_admin_promos.sql)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seasonal_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  season TEXT,
  discount_percent NUMERIC NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  destination_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_promo_codes_updated_at ON public.promo_codes;
CREATE TRIGGER trg_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_seasonal_discounts_updated_at ON public.seasonal_discounts;
CREATE TRIGGER trg_seasonal_discounts_updated_at
  BEFORE UPDATE ON public.seasonal_discounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active promos" ON public.promo_codes;
CREATE POLICY "Anyone can read active promos" ON public.promo_codes
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage promos" ON public.promo_codes;
CREATE POLICY "Admins manage promos" ON public.promo_codes
  FOR ALL USING (public.is_admin_or_moderator());

DROP POLICY IF EXISTS "Anyone can read active seasons" ON public.seasonal_discounts;
CREATE POLICY "Anyone can read active seasons" ON public.seasonal_discounts
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage seasons" ON public.seasonal_discounts;
CREATE POLICY "Admins manage seasons" ON public.seasonal_discounts
  FOR ALL USING (public.is_admin_or_moderator());

CREATE OR REPLACE FUNCTION public.get_admin_profiles()
RETURNS TABLE (
  id UUID,
  auth_id UUID,
  name TEXT,
  phone TEXT,
  role TEXT,
  partner_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_moderator() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.auth_id, p.name, p.phone, p.role, p.partner_id,
    u.email::TEXT, p.created_at, p.updated_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.auth_id
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_profiles() TO authenticated;

-- ====================================================================
-- ЧАСТЬ 4: RLS для просмотра забронированных авто (004_booked_cars_rls.sql)
-- ====================================================================

DROP POLICY IF EXISTS "Users can view booked cars" ON partner_cars;
CREATE POLICY "Users can view booked cars" ON partner_cars
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM travel_bookings
      WHERE travel_bookings.car_id = partner_cars.id
        AND travel_bookings.user_id = auth.uid()
    )
  );

-- ====================================================================
-- ЧАСТЬ 5: Профиль, настройки, платежи (005_profile_and_settings.sql)
-- ====================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS own_car_brand TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS own_car_model TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS own_car_color TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS own_car_license_plate TEXT;

DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
CREATE POLICY "Admins can manage app settings" ON public.app_settings
  FOR ALL USING (public.is_admin_or_moderator())
  WITH CHECK (public.is_admin_or_moderator());

INSERT INTO public.app_settings (key, value) VALUES
  ('service_settings', '{"site_name":"Прибой","tagline":"Колёса к морю","default_commission_rate":15,"storage_price_per_day":500,"min_rental_days":1,"max_rental_days":30,"currency":"₽","booking_confirmation_required":true,"enable_storage":true}')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES travel_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  yookassa_payment_id TEXT UNIQUE,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'RUB',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'waiting_for_capture', 'succeeded', 'canceled', 'failed')),
  confirmation_url TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking ON payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);

DROP TRIGGER IF EXISTS trg_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER trg_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment transactions" ON payment_transactions;
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage payment transactions" ON payment_transactions;
CREATE POLICY "Admins can manage payment transactions" ON payment_transactions
  FOR ALL USING (public.is_admin_or_moderator());

ALTER TABLE travel_bookings ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE travel_bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE travel_bookings ADD COLUMN IF NOT EXISTS client_name TEXT;

SELECT 'Прибой v2 deploy complete' AS status;

-- ====================================================================
-- ЧАСТЬ 6: Sprint 1 hardening (006_sprint1_hardening.sql)
-- ====================================================================

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

-- End of DEPLOY_ALL (includes 001-007)
