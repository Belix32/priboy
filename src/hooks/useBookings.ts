import { useState, useEffect, useCallback } from 'react';
import { getUserTravelBookings, getTravelBookingById } from '../lib/travel/api';
import type { TravelBooking } from '../lib/travel/types';
import { useAuth } from '../contexts/AuthContext';

export function useBookings() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<TravelBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      setBookings([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getUserTravelBookings();
      setBookings(data);
    } catch {
      setError('Не удалось загрузить бронирования');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getBooking = useCallback(async (id: string) => {
    return getTravelBookingById(id);
  }, []);

  return { bookings, loading: authLoading || loading, error, refresh, getBooking };
}
