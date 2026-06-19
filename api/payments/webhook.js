import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials not configured');
  return createClient(url, key);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;
    const payment = event?.object;
    if (!payment?.id) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const bookingId = payment.metadata?.booking_id;
    if (!bookingId) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const supabase = getServiceSupabase();

    await supabase.from('payment_transactions').upsert({
      booking_id: bookingId,
      user_id: payment.metadata?.user_id,
      yookassa_payment_id: payment.id,
      amount: Number(payment.amount?.value || 0),
      currency: payment.amount?.currency || 'RUB',
      status: payment.status === 'succeeded' ? 'succeeded' : payment.status,
      raw_payload: event,
    }, { onConflict: 'yookassa_payment_id' });

    if (payment.status === 'succeeded') {
      await supabase
        .from('travel_bookings')
        .update({
          payment_status: 'paid',
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);
    } else if (payment.status === 'canceled') {
      await supabase
        .from('payment_transactions')
        .update({ status: 'canceled' })
        .eq('yookassa_payment_id', payment.id);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
