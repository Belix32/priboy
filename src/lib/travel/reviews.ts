import { getSupabaseClient, isSupabaseConfigured } from '../supabase';
import { throwIfSupabaseError } from '../apiError';
import type { PartnerReview } from './types';

const LS_REVIEWS = 'priboi_partner_reviews';

function getLocalData<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function setLocalData<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function computeAverageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export async function getReviewForBooking(bookingId: string): Promise<PartnerReview | null> {
  if (!isSupabaseConfigured()) {
    return getLocalData<PartnerReview>(LS_REVIEWS).find((r) => r.booking_id === bookingId) || null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('partner_reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();

  throwIfSupabaseError(error, 'Не удалось загрузить отзыв');
  return data as PartnerReview | null;
}

export async function createPartnerReview(input: {
  bookingId: string;
  partnerId: string;
  rating: number;
  comment?: string;
}): Promise<PartnerReview> {
  if (input.rating < 1 || input.rating > 5) {
    throw new Error('Оценка должна быть от 1 до 5');
  }

  if (!isSupabaseConfigured()) {
    const existing = await getReviewForBooking(input.bookingId);
    if (existing) throw new Error('Отзыв уже оставлен');

    const review: PartnerReview = {
      id: crypto.randomUUID(),
      booking_id: input.bookingId,
      user_id: 'local-user',
      partner_id: input.partnerId,
      rating: input.rating,
      comment: input.comment?.trim() || null,
      created_at: new Date().toISOString(),
    };
    const all = getLocalData<PartnerReview>(LS_REVIEWS);
    all.push(review);
    setLocalData(LS_REVIEWS, all);
    return review;
  }

  const supabase = getSupabaseClient();
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error('Необходимо войти в аккаунт');

  const { data, error } = await supabase
    .from('partner_reviews')
    .insert({
      booking_id: input.bookingId,
      user_id: userId,
      partner_id: input.partnerId,
      rating: input.rating,
      comment: input.comment?.trim() || null,
    })
    .select()
    .single();

  throwIfSupabaseError(error, 'Не удалось сохранить отзыв');
  return data as PartnerReview;
}

export async function getPartnerReviews(partnerId: string, limit = 10): Promise<PartnerReview[]> {
  if (!isSupabaseConfigured()) {
    return getLocalData<PartnerReview>(LS_REVIEWS)
      .filter((r) => r.partner_id === partnerId)
      .slice(0, limit);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('partner_reviews')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  throwIfSupabaseError(error, 'Не удалось загрузить отзывы');
  return (data as PartnerReview[]) || [];
}
