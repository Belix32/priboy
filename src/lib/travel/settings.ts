import { getSupabaseClient, isSupabaseConfigured } from '../supabase';
import { throwIfSupabaseError } from '../apiError';

export interface ServiceSettings {
  site_name: string;
  tagline: string;
  logo_url: string;
  support_email: string;
  support_phone: string;
  address: string;
  default_commission_rate: number;
  storage_price_per_day: number;
  min_rental_days: number;
  max_rental_days: number;
  currency: string;
  booking_confirmation_required: boolean;
  enable_storage: boolean;
}

const LS_SETTINGS = 'priboi_admin_settings';

export const DEFAULT_SERVICE_SETTINGS: ServiceSettings = {
  site_name: 'Прибой',
  tagline: 'Колёса к морю',
  logo_url: '',
  support_email: 'support@priboi.ru',
  support_phone: '+7 (800) 555-35-35',
  address: 'г. Сочи, ул. Курортная, д. 1',
  default_commission_rate: 15,
  storage_price_per_day: 500,
  min_rental_days: 1,
  max_rental_days: 30,
  currency: '₽',
  booking_confirmation_required: true,
  enable_storage: true,
};

function loadLocalSettings(): ServiceSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    return raw ? { ...DEFAULT_SERVICE_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SERVICE_SETTINGS;
  } catch {
    return DEFAULT_SERVICE_SETTINGS;
  }
}

function saveLocalSettings(settings: ServiceSettings): void {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
}

export async function getAppSettings(): Promise<ServiceSettings> {
  if (!isSupabaseConfigured()) {
    return loadLocalSettings();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'service_settings')
    .maybeSingle();

  throwIfSupabaseError(error, 'Не удалось загрузить настройки');

  if (!data?.value) return DEFAULT_SERVICE_SETTINGS;

  try {
    return { ...DEFAULT_SERVICE_SETTINGS, ...JSON.parse(String(data.value)) };
  } catch {
    return DEFAULT_SERVICE_SETTINGS;
  }
}

export async function updateAppSettingsAdmin(settings: ServiceSettings): Promise<void> {
  if (!isSupabaseConfigured()) {
    saveLocalSettings(settings);
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('app_settings').upsert({
    key: 'service_settings',
    value: JSON.stringify(settings),
  });
  throwIfSupabaseError(error, 'Не удалось сохранить настройки');
}

export async function getStoragePricePerDay(): Promise<number> {
  const settings = await getAppSettings();
  return settings.storage_price_per_day;
}
