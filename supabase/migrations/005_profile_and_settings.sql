-- Profile car fields + app_settings admin write + payment transactions

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

SELECT 'Прибой v2 profile + payments OK' AS status;
