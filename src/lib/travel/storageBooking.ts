import { getSupabaseClient, isSupabaseConfigured } from '../supabase';
import { throwIfSupabaseError } from '../apiError';
import { getAppSettings, getRentalDayLimits, getStoragePricePerDay } from './settings';
import { getCurrentUserProfile } from './profileApi';
import { validatePromoCode, incrementPromoUse } from './promos';
import { createStorageRecord } from './api';
import type { PartnerLocation, TravelBooking, TravelPriceBreakdown, StandaloneStorageForm } from './types';

const LS_LOCATIONS = 'priboi_travel_locations';
const LS_BOOKINGS = 'priboi_travel_bookings';
const LS_DESTINATIONS = 'priboi_travel_destinations';

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

function generateId(): string {
  return crypto.randomUUID();
}

async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    try {
      const stored = localStorage.getItem('priboi_user');
      if (stored) return JSON.parse(stored).id || null;
    } catch {
      /* ignore */
    }
    return null;
  }
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id || null;
}

export function calculateStorageOnlyPrice(
  startDate: string,
  endDate: string,
  storagePricePerDay: number,
  commissionRate: number = 15,
  discountAmount: number = 0,
): TravelPriceBreakdown {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalStorageDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const totalStoragePrice = totalStorageDays * storagePricePerDay;
  const discountedSubtotal = Math.max(0, totalStoragePrice - discountAmount);
  const commissionPrice = Math.round(discountedSubtotal * (commissionRate / 100) * 100) / 100;

  return {
    totalRentalDays: 0,
    totalRentalPrice: 0,
    totalStorageDays,
    totalStoragePrice,
    commissionPrice,
    totalPrice: discountedSubtotal + commissionPrice,
    discountAmount: discountAmount > 0 ? discountAmount : undefined,
    commissionRate,
  };
}

export async function searchStorageLocations(destinationSlug: string): Promise<PartnerLocation[]> {
  if (!isSupabaseConfigured()) {
    const destinations = getLocalData<{ id: string; slug: string }>(LS_DESTINATIONS);
    const dest = destinations.find((d) => d.slug === destinationSlug);
    if (!dest) return [];
    return getLocalData<PartnerLocation>(LS_LOCATIONS).filter(
      (l) => l.destination_id === dest.id && l.has_storage,
    );
  }

  const supabase = getSupabaseClient();
  const { data: dest, error: destError } = await supabase
    .from('travel_destinations')
    .select('id')
    .eq('slug', destinationSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (destError || !dest) return [];

  const { data, error } = await supabase
    .from('partner_locations')
    .select('*, partner:rental_partners(*), destination:travel_destinations(*)')
    .eq('destination_id', dest.id)
    .eq('has_storage', true)
    .order('name');

  throwIfSupabaseError(error, 'Не удалось найти парковки');
  return (data as PartnerLocation[]) || [];
}

export async function createStandaloneStorageBooking(
  form: StandaloneStorageForm,
): Promise<TravelBooking> {
  const start = new Date(form.start_date);
  const end = new Date(form.end_date);
  if (end <= start) {
    throw new Error('Дата выезда должна быть позже даты заезда');
  }

  const settings = await getAppSettings();
  if (!settings.enable_storage) {
    throw new Error('Услуга хранения временно недоступна');
  }

  const { min, max } = await getRentalDayLimits();
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  if (days < min) {
    throw new Error(`Минимальный срок — ${min} ${min === 1 ? 'день' : 'дня'}`);
  }
  if (days > max) {
    throw new Error(`Максимальный срок — ${max} дней`);
  }

  const storagePricePerDay = await getStoragePricePerDay();
  let discountAmount = 0;
  let promoCode: string | null = null;

  if (form.promo_code) {
    const preview = calculateStorageOnlyPrice(
      form.start_date,
      form.end_date,
      storagePricePerDay,
      settings.default_commission_rate,
    );
    const promoResult = await validatePromoCode(form.promo_code, preview.totalStoragePrice);
    if (!promoResult.valid) {
      throw new Error(promoResult.message || 'Неверный промокод');
    }
    discountAmount = promoResult.discountAmount;
    promoCode = form.promo_code.toUpperCase();
  }

  const price = calculateStorageOnlyPrice(
    form.start_date,
    form.end_date,
    storagePricePerDay,
    settings.default_commission_rate,
    discountAmount,
  );

  const profile = await getCurrentUserProfile();
  const clientName = profile?.name || null;

  if (!isSupabaseConfigured()) {
    const booking: TravelBooking = {
      id: generateId(),
      user_id: (await getCurrentUserId()) || 'local-user',
      booking_type: 'storage_only',
      destination_id: form.destination_id,
      partner_id: form.partner_id,
      car_id: null,
      location_id: form.location_id,
      start_date: form.start_date,
      end_date: form.end_date,
      rental_price_per_day: 0,
      total_rental_days: 0,
      total_rental_price: 0,
      has_storage: true,
      storage_price_per_day: storagePricePerDay,
      total_storage_days: price.totalStorageDays,
      total_storage_price: price.totalStoragePrice,
      own_car_brand: form.own_car_brand,
      own_car_model: form.own_car_model,
      own_car_color: form.own_car_color || null,
      own_car_license_plate: form.own_car_license_plate,
      total_price: price.totalPrice,
      commission_price: price.commissionPrice,
      promo_code: promoCode,
      discount_amount: discountAmount,
      client_name: clientName,
      status: 'pending',
      payment_status: 'pending',
      payment_method: null,
      payment_id: null,
      notes: form.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const all = getLocalData<TravelBooking>(LS_BOOKINGS);
    all.push(booking);
    setLocalData(LS_BOOKINGS, all);
    await createStorageRecord({
      travel_booking_id: booking.id,
      partner_id: form.partner_id,
      location_id: form.location_id,
      car_brand: form.own_car_brand,
      car_model: form.own_car_model,
      car_color: form.own_car_color,
      car_license_plate: form.own_car_license_plate,
      check_in_date: form.start_date,
      check_out_date: form.end_date,
    });
    return booking;
  }

  const supabase = getSupabaseClient();
  const dbRecord: Record<string, unknown> = {
    user_id: (await getCurrentUserId()) || 'anonymous',
    booking_type: 'storage_only',
    destination_id: form.destination_id,
    partner_id: form.partner_id,
    car_id: null,
    location_id: form.location_id,
    start_date: form.start_date,
    end_date: form.end_date,
    rental_price_per_day: 0,
    total_rental_days: 0,
    total_rental_price: 0,
    has_storage: true,
    storage_price_per_day: storagePricePerDay,
    total_storage_days: price.totalStorageDays,
    total_storage_price: price.totalStoragePrice,
    own_car_brand: form.own_car_brand,
    own_car_model: form.own_car_model,
    own_car_color: form.own_car_color || null,
    own_car_license_plate: form.own_car_license_plate,
    total_price: price.totalPrice,
    commission_price: price.commissionPrice,
    promo_code: promoCode,
    discount_amount: discountAmount,
    client_name: clientName,
    status: 'pending',
    payment_status: 'pending',
    notes: form.notes || null,
  };

  const { data: result, error } = await supabase
    .from('travel_bookings')
    .insert(dbRecord)
    .select()
    .single();

  throwIfSupabaseError(error, 'Не удалось создать бронь хранения');

  const booking = result as TravelBooking;

  if (promoCode && discountAmount > 0) {
    const promoResult = await validatePromoCode(promoCode, price.totalStoragePrice + discountAmount);
    if (promoResult.promo) {
      await incrementPromoUse(promoResult.promo.id);
    }
  }

  await createStorageRecord({
    travel_booking_id: booking.id,
    partner_id: form.partner_id,
    location_id: form.location_id,
    car_brand: form.own_car_brand,
    car_model: form.own_car_model,
    car_color: form.own_car_color,
    car_license_plate: form.own_car_license_plate,
    check_in_date: form.start_date,
    check_out_date: form.end_date,
  });

  return booking;
}
