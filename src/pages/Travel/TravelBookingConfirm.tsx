import { useState, useEffect, type ReactNode } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { getErrorMessage } from '../../lib/apiError';
import { getTravelBookingById } from '../../lib/travel/api';
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

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.detailRow}>
      <div className={styles.detailIcon}>{icon}</div>
      <div className={styles.detailContent}>
        <span className={styles.detailLabel}>{label}</span>
        <span className={styles.detailValue}>{value}</span>
      </div>
    </div>
  );
}

export function TravelBookingConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState<TravelBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setError('ID бронирования не указан');
      setLoading(false);
      return;
    }
    getTravelBookingById(bookingId)
      .then((found) => {
        if (found) setBooking(found);
        else setError('Бронирование не найдено');
      })
      .catch((err) => setError(getErrorMessage(err, 'Не удалось загрузить бронирование')))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const handleConfirm = () => {
    if (!booking) return;
    navigate(`/booking/success?id=${booking.id}`);
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
  const partnerName = booking.partner?.name;
  const days = booking.total_rental_days || 1;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.overline}>Шаг 3 из 3</span>
          <h1 className={styles.title}>Подтверждение бронирования</h1>
          <p className={styles.subtitle}>Проверьте детали поездки перед окончательным подтверждением</p>
        </header>

        <div className={styles.heroCard}>
          {booking.car?.image ? (
            <img src={booking.car.image} alt={carName} className={styles.carImage} />
          ) : (
            <div className={styles.carPlaceholder}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 16H9m10 0h3l-3-4m-6 4H6l-2 2H2l1.5-6.5A3 3 0 0 1 6.5 9H11l3 3v4Z" />
                <circle cx="7" cy="17" r="1" />
                <circle cx="17" cy="17" r="1" />
              </svg>
            </div>
          )}
          <div className={styles.heroInfo}>
            <h2 className={styles.carName}>{carName}</h2>
            <p className={styles.heroMeta}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {destName}
            </p>
            <div className={styles.dateRange}>
              <span className={styles.dateChip}>{formatShortDate(booking.start_date)}</span>
              <span className={styles.dateArrow}>→</span>
              <span className={styles.dateChip}>{formatShortDate(booking.end_date)}</span>
              <span className={styles.daysBadge}>{days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}</span>
            </div>
          </div>
        </div>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Детали поездки</h3>
          <DetailRow
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
            label="Период"
            value={`${formatDate(booking.start_date)} — ${formatDate(booking.end_date)}`}
          />
          {partnerName && (
            <DetailRow
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
              label="Офис"
              value={partnerName}
            />
          )}
          {booking.has_storage && booking.own_car_license_plate && (
            <DetailRow
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              label="Ваш авто на парковке"
              value={`${booking.own_car_brand} ${booking.own_car_model} (${booking.own_car_license_plate})`}
            />
          )}
        </section>

        <section className={styles.priceCard}>
          <h3 className={styles.cardTitle}>Стоимость</h3>
          <div className={styles.priceRow}>
            <span>Аренда ({days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'})</span>
            <span className={styles.priceValue}>{booking.total_rental_price?.toLocaleString('ru-RU')} ₽</span>
          </div>
          {booking.has_storage && (
            <div className={styles.priceRow}>
              <span>Парковка</span>
              <span className={styles.priceValue}>{booking.total_storage_price?.toLocaleString('ru-RU')} ₽</span>
            </div>
          )}
          <div className={styles.priceRow}>
            <span>Сервисный сбор</span>
            <span className={styles.priceValue}>{booking.commission_price?.toLocaleString('ru-RU')} ₽</span>
          </div>
          <div className={styles.priceTotal}>
            <span>Итого к оплате</span>
            <span className={styles.priceTotalValue}>{booking.total_price?.toLocaleString('ru-RU')} ₽</span>
          </div>
          <p className={styles.priceNote}>
            Оплата производится при получении автомобиля в офисе. Бронь будет подтверждена партнёром — после этого станет доступен QR-код.
          </p>
        </section>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.actions}>
          <Button
            variant="primary"
            className={styles.confirmButton}
            onClick={handleConfirm}
          >
            Завершить оформление
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>Назад</Button>
        </div>
      </div>
    </div>
  );
}

export default TravelBookingConfirm;
