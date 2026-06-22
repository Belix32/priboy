export async function sendResendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: true };

  const from = process.env.NOTIFICATION_FROM_EMAIL || 'Прибой <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to send email');
  }
  return { sent: true };
}

function siteUrl() {
  return process.env.SITE_URL || 'https://priboy-six.vercel.app';
}

export function buildClientEmail(type, booking, userEmail) {
  const car = booking.car ? `${booking.car.brand} ${booking.car.model}` : 'Автомобиль';
  const dest = booking.destination?.name || 'Курорт';
  const dates = `${booking.start_date} — ${booking.end_date}`;
  const sum = `${Number(booking.total_price).toLocaleString('ru-RU')} ₽`;
  const site = siteUrl();

  const templates = {
    created: {
      subject: `Прибой — бронирование оформлено (#${booking.id.slice(0, 8)})`,
      html: `<p>Здравствуйте!</p><p>Ваша бронь <strong>${car}</strong> в ${dest} на ${dates} принята.</p><p>Сумма: <strong>${sum}</strong>. Статус: ожидает подтверждения партнёра.</p><p><a href="${site}/profile?tab=trips">Открыть в личном кабинете</a></p>`,
    },
    confirmed: {
      subject: 'Прибой — бронирование подтверждено',
      html: `<p>Бронь <strong>${car}</strong> (${dest}, ${dates}) подтверждена.</p><p>QR-код для получения авто: <a href="${site}/booking/success?id=${booking.id}">открыть</a></p>`,
    },
    paid: {
      subject: 'Прибой — оплата получена',
      html: `<p>Оплата брони <strong>${car}</strong> (${sum}) успешно получена.</p><p><a href="${site}/booking/success?id=${booking.id}">QR-код для выдачи</a></p>`,
    },
    handover: {
      subject: 'Прибой — автомобиль выдан',
      html: `<p>Автомобиль <strong>${car}</strong> выдан по брони ${dates}.</p><p>Хорошей поездки!</p>`,
    },
  };

  const template = templates[type];
  if (!template) throw new Error('Unknown notification type');

  return { to: userEmail, ...template };
}

export async function notifyBookingById(supabase, bookingId, type) {
  const { data: booking, error } = await supabase
    .from('travel_bookings')
    .select(
      '*, destination:travel_destinations(name), car:partner_cars(brand, model), partner:rental_partners(name, email)',
    )
    .eq('id', bookingId)
    .single();

  if (error || !booking) return { skipped: true, reason: 'booking_not_found' };

  const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
  const clientEmail = authUser?.user?.email;
  if (!clientEmail) return { skipped: true, reason: 'no_client_email' };

  const email = buildClientEmail(type, booking, clientEmail);
  const result = await sendResendEmail(email);

  if (booking.partner?.email && type === 'created') {
    await sendResendEmail({
      to: booking.partner.email,
      subject: `Прибой — новая бронь #${booking.id.slice(0, 8)}`,
      html: `<p>Новое бронирование: <strong>${booking.car?.brand} ${booking.car?.model}</strong>, ${booking.start_date} — ${booking.end_date}, ${Number(booking.total_price).toLocaleString('ru-RU')} ₽.</p><p><a href="${siteUrl()}/partner/bookings">Открыть в кабинете партнёра</a></p>`,
    });
  }

  return result;
}
