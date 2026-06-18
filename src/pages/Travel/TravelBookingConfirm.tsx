import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { getTravelBookingById, confirmTravelBooking } from '../../lib/travel/api';
import type { TravelBooking } from '../../lib/travel/types';
import styles from './TravelBookingConfirm.module.css';
import sharedStyles from './Travel.module.css';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function TravelBookingConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState<TravelBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setError('ID бронирования не указан');
      setLoading(false);
      return;
    }
    getTravelBookingById(bookingId).then((found) => {
      if (found) setBooking(found);
      else setError('Бронирование не найдено');
      setLoading(false);
    });
  }, [bookingId]);

  const handleConfirm = async () => {
    if (!booking) return;
    setConfirming(true);
    try {
      await confirmTravelBooking(booking.id);
      navigate(`/booking/success?id=${booking.id}`);
    } catch {
      setError('Не удалось подтвердить бронирование');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={sharedStyles.loading}>
            <div className={sharedStyles.spinner} />
            <p>Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={sharedStyles.error}>
            <p>{error}</p>
            <Button variant="primary" onClick={() => navigate('/search')}>К поиску</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const carName = booking.car ? `${booking.car.brand} ${booking.car.model}` : 'Автомобиль';
  const destName = booking.destination?.name || 'Курорт';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Подтверждение бронирования</h1>

        <div className={styles.summary}>
          <div className={styles.row}>
            <span className={styles.label}>Автомобиль</span>
            <span className={styles.value}>{carName}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Направление</span>
            <span className={styles.value}>{destName}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Даты</span>
            <span className={styles.value}>{formatDate(booking.start_date)} — {formatDate(booking.end_date)}</span>
          </div>
          {booking.has_storage && booking.own_car_license_plate && (
            <div className={styles.row}>
              <span className={styles.label}>Ваш авто на парковке</span>
              <span className={styles.value}>{booking.own_car_brand} {booking.own_car_model} ({booking.own_car_license_plate})</span>
            </div>
          )}
          <div className={styles.row}>
            <span className={styles.label}>Аренда</span>
            <span className={styles.value}>{booking.total_rental_price?.toLocaleString('ru-RU')} ₽</span>
          </div>
          {booking.has_storage && (
            <div className={styles.row}>
              <span className={styles.label}>Парковка</span>
              <span className={styles.value}>{booking.total_storage_price?.toLocaleString('ru-RU')} ₽</span>
            </div>
          )}
          <div className={styles.row}>
            <span className={styles.label}>Сервисный сбор</span>
            <span className={styles.value}>{booking.commission_price?.toLocaleString('ru-RU')} ₽</span>
          </div>
          <div className={`${styles.row} ${styles.totalRow}`}>
            <span className={styles.label}>Итого</span>
            <span className={styles.totalValue}>{booking.total_price?.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => navigate(-1)}>Назад</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={confirming}>
            {confirming ? 'Подтверждение...' : 'Подтвердить бронирование'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TravelBookingConfirm;
