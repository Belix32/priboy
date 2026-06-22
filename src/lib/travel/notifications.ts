import { getSupabaseClient, isSupabaseConfigured } from '../supabase';

export type BookingNotificationType = 'created' | 'confirmed' | 'paid' | 'handover';

export async function sendBookingNotification(
  bookingId: string,
  type: BookingNotificationType,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookingId, type }),
    });
  } catch {
    // Notifications are best-effort; never block UX
  }
}
