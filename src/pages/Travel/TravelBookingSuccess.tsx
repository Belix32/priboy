import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getTravelBookingById } from '../../lib/travel/api';
import { buildBookingQrText, generateBookingQrDataUrl } from '../../lib/travel/qrCode';
import type { TravelBooking } from '../../lib/travel/types';
import styles from './TravelBookingSuccess.module.css';
import sharedStyles from './Travel.module.css';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function TravelBookingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bookingId = searchParams.get('id');

  const [booking, setBooking] = useState<TravelBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (!bookingId) {
      setError('ID бронирования не указан');
      setLoading(false);
      return;
    }
    getTravelBookingById(bookingId).then((found) => {
      if (found) {
        setBooking(found);
      } else {
        setError('Бронирование не найдено');
      }
      setLoading(false);
    });
  }, [bookingId]);

  useEffect(() => {
    if (!booking) return;

    let cancelled = false;
    const qrText = buildBookingQrText(booking, {
      name: user?.name || '',
      phone: user?.phone || '',
      email: user?.email,
    });

    generateBookingQrDataUrl(qrText).then((url) => {
      if (!cancelled) setQrCodeUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [booking, user]);

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
          <Button variant="primary" onClick={() => navigate('/my-trips')}>Мои поездки</Button>
        </div>
      </div>
    );
  }

  const carName = booking.car ? `${booking.car.brand} ${booking.car.model}` : 'Автомобиль';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.successIcon}>✓</div>
        <h1 className={styles.title}>Бронирование подтверждено!</h1>
        <p className={styles.subtitle}>Покажите QR-код при получении автомобиля</p>

        {qrCodeUrl && (
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
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={() => navigate('/my-trips')}>Мои поездки</Button>
          <Button variant="secondary" onClick={() => navigate('/')}>На главную</Button>
        </div>
      </div>
    </div>
  );
}

export default TravelBookingSuccess;
