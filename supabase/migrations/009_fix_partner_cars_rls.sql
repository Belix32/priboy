-- Fix partner_cars RLS: explicit WITH CHECK for INSERT/UPDATE

DROP POLICY IF EXISTS "Admins can manage cars" ON public.partner_cars;
CREATE POLICY "Admins can manage cars" ON public.partner_cars
  FOR ALL
  USING (public.is_admin_or_moderator())
  WITH CHECK (public.is_admin_or_moderator());

DROP POLICY IF EXISTS "Partners can manage own cars" ON public.partner_cars;
CREATE POLICY "Partners can manage own cars" ON public.partner_cars
  FOR ALL
  USING (
    public.is_partner() AND partner_id = public.current_partner_id()
  )
  WITH CHECK (
    public.is_partner() AND partner_id = public.current_partner_id()
  );
