import { createClient } from '@supabase/supabase-js';
import { getYooKassaCredentials } from './yookassa.js';

const YOOKASSA_API = 'https://api.yookassa.ru/v3';

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

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  const creds = getYooKassaCredentials();
  if (!creds) {
    return res.status(503).json({ error: 'YooKassa not configured' });
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { bookingId } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: 'bookingId required' });

    const supabase = getServiceSupabase();
    const { data: booking, error: bookingError } = await supabase
      .from('travel_bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.payment_status === 'paid') {
      return res.status(400).json({ error: 'Booking already paid' });
    }

    const amount = Number(booking.total_price).toFixed(2);
    const idempotenceKey = `${bookingId}-${Date.now()}`;
    const returnUrl = `${req.headers.origin || 'https://priboy-six.vercel.app'}/booking/success?id=${bookingId}&awaiting_payment=1`;

    const ykRes = await fetch(`${YOOKASSA_API}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${creds.shopId}:${creds.secretKey}`).toString('base64')}`,
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify({
        amount: { value: amount, currency: 'RUB' },
        capture: true,
        confirmation: { type: 'redirect', return_url: returnUrl },
        description: `Бронирование Прибой #${bookingId.slice(0, 8)}`,
        metadata: { booking_id: bookingId, user_id: user.id },
      }),
    });

    const payment = await ykRes.json();
    if (!ykRes.ok) {
      return res.status(502).json({ error: payment.description || 'YooKassa error' });
    }

    await supabase.from('payment_transactions').upsert({
      booking_id: bookingId,
      user_id: user.id,
      yookassa_payment_id: payment.id,
      amount: Number(amount),
      currency: 'RUB',
      status: payment.status === 'succeeded' ? 'succeeded' : 'pending',
      confirmation_url: payment.confirmation?.confirmation_url || null,
      raw_payload: payment,
    }, { onConflict: 'yookassa_payment_id' });

    return res.status(200).json({
      confirmationUrl: payment.confirmation?.confirmation_url,
      paymentId: payment.id,
    });
  } catch (err) {
    console.error('Payment create error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
