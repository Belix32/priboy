import { getSupabaseClient, isSupabaseConfigured } from '../supabase';
import { throwIfSupabaseError } from '../apiError';
import {
  clearLegacyUserData,
  loadUserProfileCache,
  saveUserProfileCache,
} from '../userStorage';
import type { Profile, UserCarInfo } from './types';

export interface UserProfileData extends Profile {
  own_car_brand?: string | null;
  own_car_model?: string | null;
  own_car_color?: string | null;
  own_car_license_plate?: string | null;
}

async function getLocalAuthId(): Promise<string | null> {
  try {
    const stored = localStorage.getItem('priboi_user');
    const token = localStorage.getItem('priboi_token');
    if (!stored || !token) return null;
    const data = JSON.parse(atob(stored));
    return data.id || null;
  } catch {
    return null;
  }
}

export async function getCurrentUserProfile(): Promise<UserProfileData | null> {
  if (!isSupabaseConfigured()) {
    const authId = await getLocalAuthId();
    if (!authId) return null;
    clearLegacyUserData();
    return loadUserProfileCache<UserProfileData>(authId);
  }

  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const authId = sessionData?.session?.user?.id;
  if (!authId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_id', authId)
    .maybeSingle();

  throwIfSupabaseError(error, 'Не удалось загрузить профиль');
  return data as UserProfileData | null;
}

export async function updateUserProfile(updates: {
  name?: string;
  phone?: string;
  own_car?: UserCarInfo | null;
}): Promise<UserProfileData | null> {
  if (!isSupabaseConfigured()) {
    const authId = await getLocalAuthId();
    if (!authId) throw new Error('Необходима авторизация');

    const existing = (await getCurrentUserProfile()) || ({} as UserProfileData);
    const merged: UserProfileData = {
      ...existing,
      name: updates.name ?? existing.name,
      phone: updates.phone ?? existing.phone,
      own_car_brand: updates.own_car?.brand ?? existing.own_car_brand,
      own_car_model: updates.own_car?.model ?? existing.own_car_model,
      own_car_color: updates.own_car?.color ?? existing.own_car_color,
      own_car_license_plate: updates.own_car?.license_plate ?? existing.own_car_license_plate,
    };
    saveUserProfileCache(authId, merged);
    return merged;
  }

  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const authId = sessionData?.session?.user?.id;
  if (!authId) throw new Error('Необходима авторизация');

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.own_car !== undefined) {
    if (updates.own_car === null) {
      payload.own_car_brand = null;
      payload.own_car_model = null;
      payload.own_car_color = null;
      payload.own_car_license_plate = null;
    } else {
      payload.own_car_brand = updates.own_car.brand;
      payload.own_car_model = updates.own_car.model;
      payload.own_car_color = updates.own_car.color || null;
      payload.own_car_license_plate = updates.own_car.license_plate || null;
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('auth_id', authId)
    .select('*')
    .single();

  throwIfSupabaseError(error, 'Не удалось обновить профиль');
  return data as UserProfileData;
}

export function profileToUserCar(profile: UserProfileData | null): UserCarInfo | null {
  if (!profile?.own_car_brand || !profile.own_car_model) return null;
  return {
    brand: profile.own_car_brand,
    model: profile.own_car_model,
    color: profile.own_car_color || undefined,
    license_plate: profile.own_car_license_plate || undefined,
  };
}
