-- Промокоды, сезонные скидки, RPC для списка пользователей admin

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

-- Admin: profiles with email from auth.users
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
    p.id,
    p.auth_id,
    p.name,
    p.phone,
    p.role,
    p.partner_id,
    u.email::TEXT,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.auth_id
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_profiles() TO authenticated;
