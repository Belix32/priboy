import { useState, useEffect, useCallback } from 'react';
import { getActiveDestinations } from '../lib/travel/api';
import type { TravelDestination } from '../lib/travel/types';

export function useDestinations() {
  const [destinations, setDestinations] = useState<TravelDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActiveDestinations();
      setDestinations(data);
    } catch {
      setError('Не удалось загрузить направления');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { destinations, loading, error, refresh };
}
