import { useState, useCallback } from 'react';
import { getAvailableCars } from '../lib/travel/api';
import { getErrorMessage } from '../lib/apiError';
import type { PartnerCar, TravelSearchParams } from '../lib/travel/types';

export function useCars() {
  const [cars, setCars] = useState<PartnerCar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (params: TravelSearchParams) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAvailableCars(params);
      setCars(data);
      return data;
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось найти автомобили'));
      setCars([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { cars, loading, error, search };
}
