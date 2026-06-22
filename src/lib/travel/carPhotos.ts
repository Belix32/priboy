import { getSupabaseClient, isSupabaseConfigured } from '../supabase';

const BUCKET = 'car-images';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateCarPhotoFile(file: File): string | null {
  const mime = file.type || guessMimeFromName(file.name);
  if (!ALLOWED_TYPES.includes(mime)) {
    return 'Допустимы только JPEG, PNG или WebP';
  }
  if (file.size > MAX_BYTES) {
    return 'Размер файла не более 5 МБ';
  }
  return null;
}

function guessMimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return '';
}

export async function uploadCarPhoto(
  file: File,
  partnerId: string,
  carId: string,
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Загрузка фото доступна только при подключённом Supabase');
  }

  const validationError = validateCarPhotoFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = getSupabaseClient();
  const mime = file.type || guessMimeFromName(file.name) || 'image/jpeg';
  const ext = file.name.split('.').pop()?.toLowerCase() || mime.split('/')[1] || 'jpg';
  const path = `${partnerId}/${carId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: mime,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteCarPhoto(publicUrl: string): Promise<void> {
  if (!isSupabaseConfigured() || !publicUrl.includes(`/${BUCKET}/`)) return;

  const supabase = getSupabaseClient();
  const marker = `/${BUCKET}/`;
  const path = decodeURIComponent(publicUrl.split(marker)[1] || '');
  if (!path) return;

  await supabase.storage.from(BUCKET).remove([path]);
}
