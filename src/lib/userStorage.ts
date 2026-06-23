import type { UserCarInfo } from './travel/types';

const CAR_KEY_PREFIX = 'priboi_user_car:';
const PROFILE_CACHE_PREFIX = 'priboi_user_profile_cache:';
const LEGACY_CAR_KEY = 'priboi_user_car';
const LEGACY_PROFILE_KEY = 'priboi_user_profile_cache';

function carKey(userId: string): string {
  return `${CAR_KEY_PREFIX}${userId}`;
}

function profileCacheKey(userId: string): string {
  return `${PROFILE_CACHE_PREFIX}${userId}`;
}

export function loadUserCar(userId: string): UserCarInfo | null {
  if (!userId) return null;

  try {
    const raw = localStorage.getItem(carKey(userId));
    return raw ? (JSON.parse(raw) as UserCarInfo) : null;
  } catch {
    return null;
  }
}

export function saveUserCar(userId: string, car: UserCarInfo): void {
  if (!userId) return;
  localStorage.setItem(carKey(userId), JSON.stringify(car));
}

export function removeUserCar(userId: string): void {
  if (!userId) return;
  localStorage.removeItem(carKey(userId));
}

export function loadUserProfileCache<T>(userId: string): T | null {
  if (!userId) return null;

  try {
    const raw = localStorage.getItem(profileCacheKey(userId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveUserProfileCache<T>(userId: string, data: T): void {
  if (!userId) return;
  localStorage.setItem(profileCacheKey(userId), JSON.stringify(data));
}

export function removeUserProfileCache(userId: string): void {
  if (!userId) return;
  localStorage.removeItem(profileCacheKey(userId));
}

/** @deprecated Global keys leaked data between accounts — remove on auth changes */
export function clearLegacyUserData(): void {
  localStorage.removeItem(LEGACY_CAR_KEY);
  localStorage.removeItem(LEGACY_PROFILE_KEY);
}

export function clearUserLocalData(userId: string): void {
  removeUserCar(userId);
  removeUserProfileCache(userId);
}
