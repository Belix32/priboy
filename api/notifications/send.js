import { createClient } from '@supabase/supabase-js';
import { notifyBookingById } from './email.js';

function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials not configured');
  return createClient(url, key);
}

async function getUserFromToken(authHeader) {
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { bookingId, type } = req.body || {};
    if (!bookingId || !type) {
      return res.status(400).json({ error: 'bookingId and type required' });
    }

    const allowed = ['created', 'confirmed', 'paid', 'handover'];
    if (!allowed.includes(type)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    const supabase = getServiceSupabase();

    const { data: booking } = await supabase
      .from('travel_bookings')
      .select('id, user_id, partner_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.user_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, partner_id')
        .eq('auth_id', user.id)
        .maybeSingle();

      const isPartner =
        profile?.role === 'partner' && profile.partner_id === booking.partner_id;
      const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';
      if (!isPartner && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const result = await notifyBookingById(supabase, bookingId, type);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('Notification error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
