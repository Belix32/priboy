import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';
import { getTravelBookingById } from '../../lib/travel/api';
import { createYooKassaPayment } from '../../lib/travel/payments';
import { getErrorMessage } from '../../lib/apiError';
import { buildBookingQrText, generateBookingQrDataUrl } from '../../lib/travel/qrCode';
import type { TravelBooking } from '../../lib/travel/types';
import styles from './TravelBookingSuccess.module.css';
import sharedStyles from './Travel.module.css';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 20;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isBookingSettled(booking: TravelBooking): boolean {
  return booking.payment_status === 'paid' || booking.status === 'confirmed' || booking.status === 'active';
}

export function TravelBookingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bookingId = searchParams.get('id');
  const awaitingPayment = searchParams.get('awaiting_payment') === '1';

  const [booking, setBooking] = useState<TravelBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setError('ID бронирования не указан');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;

    const finishPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      setPolling(false);
    };

    const startPolling = () => {
      setPolling(true);
      pollTimer = setInterval(async () => {
        if (cancelled) return;
        attempts += 1;
        try {
          const found = await getTravelBookingById(bookingId);
          if (!found) return;
          setBooking(found);
          if (isBookingSettled(found) || attempts >= MAX_POLL_ATTEMPTS) {
            finishPolling();
          }
        } catch {
          if (attempts >= MAX_POLL_ATTEMPTS) finishPolling();
        }
      }, POLL_INTERVAL_MS);
    };

    (async () => {
      try {
        const found = await getTravelBookingById(bookingId);
        if (cancelled) return;
        if (found) {
          setBooking(found);
          const shouldPoll =
            awaitingPayment || (found.status === 'pending' && found.payment_status === 'pending');
          if (shouldPoll && !isBookingSettled(found)) {
            startPolling();
          }
        } else {
          setError('Бронирование не найдено');
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Не удалось загрузить бронирование'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [bookingId, awaitingPayment]);

  useEffect(() => {
    if (!booking || (booking.status !== 'confirmed' && booking.status !== 'active')) return;

    let cancelled = false;
    const qrText = buildBookingQrText(booking, {
      name: user?.name || '',
      phone: user?.phone || '',
      email: user?.email,
    });

    generateBookingQrDataUrl(qrText)
      .then((url) => {
        if (!cancelled) setQrCodeUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось сгенерировать QR-код');
      });

    return () => {
      cancelled = true;
    };
  }, [booking, user]);

  const handlePayOnline = async () => {
    if (!booking || !isSupabaseConfigured()) return;
    setPayLoading(true);
    setPayError(null);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Необходима авторизация');
      const { confirmationUrl } = await createYooKassaPayment(booking.id, token);
      window.location.href = confirmationUrl;
    } catch (err) {
      setPayError(getErrorMessage(err, 'Оплата временно недоступна'));
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={sharedStyles.loading}><div className={sharedStyles.spinner} /><p>Загрузка...</p></div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p>{error || 'Ошибка'}</p>
          <Button variant="primary" onClick={() => navigate('/profile?tab=trips')}>Мои поездки</Button>
        </div>
      </div>
    );
  }

  const carName = booking.car ? `${booking.car.brand} ${booking.car.model}` : 'Автомобиль';
  const isPending = booking.status === 'pending';
  const isConfirmed = booking.status === 'confirmed' || booking.status === 'active';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.successIcon}>{isPending ? '⏳' : '✓'}</div>
        <h1 className={styles.title}>
          {isPending ? 'Бронирование оформлено' : 'Бронирование подтверждено!'}
        </h1>
        <p className={styles.subtitle}>
          {polling
            ? 'Проверяем статус оплаты…'
            : isPending
              ? 'Ожидайте подтверждения партнёра. После подтверждения или оплаты станет доступен QR-код.'
              : 'Покажите QR-код при получении автомобиля'}
        </p>

        {isConfirmed && qrCodeUrl && (
          <div className={styles.qrSection}>
            <img src={qrCodeUrl} alt="QR-код бронирования" className={styles.qrCode} width={200} height={200} />
          </div>
        )}

        <div className={styles.details}>
          <p><strong>{carName}</strong></p>
          <p>{booking.destination?.name} · {formatDate(booking.start_date)} — {formatDate(booking.end_date)}</p>
          {user?.name && <p>Клиент: {user.name}{user.phone ? ` · ${user.phone}` : ''}</p>}
          {booking.has_storage && booking.own_car_license_plate ? (
            <p className={styles.storageInfo}>
              Парковка: {booking.own_car_brand} {booking.own_car_model}
              {booking.own_car_color ? `, ${booking.own_car_color}` : ''} ({booking.own_car_license_plate})
            </p>
          ) : (
            <p className={styles.storageInfo}>Парковка не требуется</p>
          )}
          <p className={styles.total}>Итого: {booking.total_price.toLocaleString('ru-RU')} ₽</p>
          <p className={styles.storageInfo}>
            Оплата: {booking.payment_status === 'paid' ? 'Оплачено' : 'Ожидает'}
          </p>
        </div>

        {isPending && booking.payment_status === 'pending' && isSupabaseConfigured() && (
          <div className={styles.paySection}>
            <Button variant="primary" onClick={handlePayOnline} disabled={payLoading || polling}>
              {payLoading ? 'Переход к оплате...' : 'Оплатить онлайн (ЮKassa)'}
            </Button>
            <p className={styles.payNote}>Или оплатите при получении авто в офисе партнёра</p>
            {payError && <p className={styles.payError}>{payError}</p>}
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="primary" onClick={() => navigate('/profile?tab=trips')}>Мои поездки</Button>
          <Button variant="secondary" onClick={() => navigate('/')}>На главную</Button>
        </div>
      </div>
    </div>
  );
}

export default TravelBookingSuccess;
