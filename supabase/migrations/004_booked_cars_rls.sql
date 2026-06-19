-- Allow users to view rental cars linked to their own bookings
-- (even when is_available = false after booking)

DROP POLICY IF EXISTS "Users can view booked cars" ON partner_cars;
CREATE POLICY "Users can view booked cars" ON partner_cars
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM travel_bookings
      WHERE travel_bookings.car_id = partner_cars.id
        AND travel_bookings.user_id = auth.uid()
    )
  );
