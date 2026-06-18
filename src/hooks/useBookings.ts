import { useState, useEffect, useCallback } from 'react';
import { getUserTravelBookings, getTravelBookingById } from '../lib/travel/api';
import type { TravelBooking } from '../lib/travel/types';
import { useAuth } from '../contexts/AuthContext';

export function useBookings() {
  const { user, isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState<TravelBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setBookings([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getUserTravelBookings(user.id);
      setBookings(data);
    } catch {
      setError('Не удалось загрузить бронирования');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getBooking = useCallback(async (id: string) => {
    return getTravelBookingById(id);
  }, []);

  return { bookings, loading, error, refresh, getBooking };
}
