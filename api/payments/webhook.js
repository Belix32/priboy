import { createClient } from '@supabase/supabase-js';
import {
  fetchYooKassaPayment,
  getClientIp,
  getYooKassaCredentials,
  isYooKassaIp,
} from './yookassa.js';
import { notifyBookingById } from '../notifications/email.js';

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

  if (!getYooKassaCredentials()) {
    return res.status(503).json({ error: 'YooKassa not configured' });
  }

  const clientIp = getClientIp(req);
  if (process.env.NODE_ENV === 'production' && !isYooKassaIp(clientIp)) {
    console.warn('Webhook rejected: untrusted IP', clientIp);
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const event = req.body;
    const paymentId = event?.object?.id;
    if (!paymentId) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const verifiedPayment = await fetchYooKassaPayment(paymentId);
    const bookingId = verifiedPayment.metadata?.booking_id;
    if (!bookingId) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const supabase = getServiceSupabase();

    const { data: existingTx } = await supabase
      .from('payment_transactions')
      .select('id, status, booking_id')
      .eq('yookassa_payment_id', verifiedPayment.id)
      .maybeSingle();

    if (existingTx?.status === 'succeeded' && verifiedPayment.status === 'succeeded') {
      return res.status(200).json({ ok: true, duplicate: true });
    }

    const { data: booking } = await supabase
      .from('travel_bookings')
      .select('id, user_id, total_price, payment_status')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.user_id !== verifiedPayment.metadata?.user_id) {
      return res.status(400).json({ error: 'Booking user mismatch' });
    }

    const paidAmount = Number(verifiedPayment.amount?.value || 0);
    const expectedAmount = Number(booking.total_price);
    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
      console.error('Payment amount mismatch', { paidAmount, expectedAmount, bookingId });
      return res.status(400).json({ error: 'Amount mismatch' });
    }

    await supabase.from('payment_transactions').upsert(
      {
        booking_id: bookingId,
        user_id: booking.user_id,
        yookassa_payment_id: verifiedPayment.id,
        amount: paidAmount,
        currency: verifiedPayment.amount?.currency || 'RUB',
        status: verifiedPayment.status === 'succeeded' ? 'succeeded' : verifiedPayment.status,
        raw_payload: event,
      },
      { onConflict: 'yookassa_payment_id' },
    );

    if (verifiedPayment.status === 'succeeded') {
      const wasPaid = booking.payment_status === 'paid';
      await supabase
        .from('travel_bookings')
        .update({
          payment_status: 'paid',
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .neq('payment_status', 'paid');

      if (!wasPaid) {
        try {
          await notifyBookingById(supabase, bookingId, 'paid');
        } catch (notifyErr) {
          console.error('Payment notification error:', notifyErr);
        }
      }
    } else if (verifiedPayment.status === 'canceled') {
      await supabase
        .from('payment_transactions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('yookassa_payment_id', verifiedPayment.id);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
