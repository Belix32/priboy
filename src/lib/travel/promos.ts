import { getSupabaseClient, isSupabaseConfigured } from '../supabase';
import { throwIfSupabaseError } from '../apiError';
import type { PromoCode, TravelPriceBreakdown } from './types';

const LS_PROMOS = 'priboi_promo_codes';

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

function mapPromoRow(row: Record<string, unknown>): PromoCode {
  return {
    id: String(row.id),
    code: String(row.code),
    discount_type: row.discount_type as 'percent' | 'fixed',
    discount_value: Number(row.discount_value),
    min_order_amount: Number(row.min_order_amount ?? 0),
    max_uses: Number(row.max_uses ?? 0),
    used_count: Number(row.used_count ?? 0),
    valid_from: (row.valid_from as string) || null,
    valid_to: (row.valid_to as string) || null,
    is_active: Boolean(row.is_active),
    description: (row.description as string) || null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export interface PromoValidationResult {
  valid: boolean;
  promo?: PromoCode;
  discountAmount: number;
  message?: string;
}

export function computePromoDiscount(promo: PromoCode, subtotal: number): number {
  if (promo.discount_type === 'percent') {
    return Math.round(subtotal * (promo.discount_value / 100) * 100) / 100;
  }
  return Math.min(subtotal, promo.discount_value);
}

export function applyDiscountToPrice(
  breakdown: TravelPriceBreakdown,
  discountAmount: number,
  commissionRate: number = breakdown.commissionRate ?? 15,
): TravelPriceBreakdown & { discountAmount: number } {
  const subtotal = breakdown.totalRentalPrice + breakdown.totalStoragePrice;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const commissionPrice = Math.round(discountedSubtotal * (commissionRate / 100) * 100) / 100;
  return {
    ...breakdown,
    discountAmount,
    commissionPrice,
    commissionRate,
    totalPrice: discountedSubtotal + commissionPrice,
  };
}

export async function validatePromoCode(
  code: string,
  orderAmount: number,
): Promise<PromoValidationResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, discountAmount: 0, message: 'Введите промокод' };
  }

  let promo: PromoCode | undefined;

  if (!isSupabaseConfigured()) {
    promo = getLocalData<PromoCode>(LS_PROMOS).find(
      (p) => p.code.toUpperCase() === normalized && p.is_active,
    );
  } else {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', normalized)
      .eq('is_active', true)
      .maybeSingle();
    throwIfSupabaseError(error, 'Не удалось проверить промокод');
    if (data) promo = mapPromoRow(data as Record<string, unknown>);
  }

  if (!promo) {
    return { valid: false, discountAmount: 0, message: 'Промокод не найден или неактивен' };
  }

  const now = new Date();
  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return { valid: false, discountAmount: 0, message: 'Промокод ещё не действует' };
  }
  if (promo.valid_to && new Date(promo.valid_to) < now) {
    return { valid: false, discountAmount: 0, message: 'Срок действия промокода истёк' };
  }
  if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) {
    return { valid: false, discountAmount: 0, message: 'Лимит использований промокода исчерпан' };
  }
  if (orderAmount < promo.min_order_amount) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Минимальная сумма заказа — ${promo.min_order_amount.toLocaleString('ru-RU')} ₽`,
    };
  }

  const discountAmount = computePromoDiscount(promo, orderAmount);
  return { valid: true, promo, discountAmount };
}

export async function incrementPromoUse(promoId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const all = getLocalData<PromoCode>(LS_PROMOS);
    const idx = all.findIndex((p) => p.id === promoId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], used_count: all[idx].used_count + 1 };
      setLocalData(LS_PROMOS, all);
    }
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('increment_promo_use', { p_promo_id: promoId });
  throwIfSupabaseError(error, 'Не удалось применить промокод');
}
