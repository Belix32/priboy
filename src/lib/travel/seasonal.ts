import { getSupabaseClient, isSupabaseConfigured } from '../supabase';
import type { SeasonalDiscount } from './types';

const LS_SEASONS = 'priboi_seasonal_discounts';

function getLocalData<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function mapSeasonRow(row: Record<string, unknown>): SeasonalDiscount {
  return {
    id: String(row.id),
    name: String(row.name),
    season: (row.season as string) || null,
    discount_percent: Number(row.discount_percent),
    date_from: String(row.date_from),
    date_to: String(row.date_to),
    destination_ids: (row.destination_ids as string[]) || [],
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA <= endB && endA >= startB;
}

/**
 * Find the best active seasonal discount for a booking window.
 * When several match, the highest percent wins.
 */
export async function getApplicableSeasonalDiscount(
  destinationId: string,
  startDate: string,
  endDate: string,
): Promise<SeasonalDiscount | null> {
  let seasons: SeasonalDiscount[] = [];

  if (!isSupabaseConfigured()) {
    seasons = getLocalData<SeasonalDiscount>(LS_SEASONS).filter((s) => s.is_active);
  } else {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('seasonal_discounts')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching seasonal discounts:', error);
      return null;
    }
    seasons = (data || []).map((row: Record<string, unknown>) => mapSeasonRow(row));
  }

  const matching = seasons.filter((season) => {
    if (!datesOverlap(startDate, endDate, season.date_from, season.date_to)) return false;
    if (season.destination_ids.length === 0) return true;
    return season.destination_ids.includes(destinationId);
  });

  if (matching.length === 0) return null;
  return matching.reduce((best, current) =>
    current.discount_percent > best.discount_percent ? current : best,
  );
}
