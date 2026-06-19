import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookings } from '../../hooks/useBookings';
import { cancelTravelBooking } from '../../lib/travel/api';
import { Button } from '../../components/Button/Button';
import type { TravelBooking } from '../../lib/travel/types';
import styles from './MyTravelTrips.module.css';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Ожидает подтверждения',
    confirmed: 'Подтверждено',
    active: 'Активно',
    completed: 'Завершено',
    cancelled: 'Отменено',
  };
  return map[status] || status;
}

function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    pending: styles.statusPending,
    confirmed: styles.statusConfirmed,
    active: styles.statusActive,
    completed: styles.statusCompleted,
    cancelled: styles.statusCancelled,
  };
  return map[status] || '';
}

export function MyTravelTrips() {
  const navigate = useNavigate();
  const { bookings, loading, error, refresh } = useBookings();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const activeTrips = bookings.filter((b) => ['pending', 'confirmed', 'active'].includes(b.status));
  const historyTrips = bookings.filter((b) => ['completed', 'cancelled'].includes(b.status));
  const displayed = activeTab === 'active' ? activeTrips : historyTrips;

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelTravelBooking(id);
      await refresh();
    } finally {
      setCancellingId(null);
    }
  };

  const renderTrip = (trip: TravelBooking) => {
    const carName = trip.car ? `${trip.car.brand} ${trip.car.model}` : 'Автомобиль';
    const destName = trip.destination?.name || 'Курорт';

    return (
      <div key={trip.id} className={styles.tripCard}>
        <div className={styles.tripHeader}>
          <h3 className={styles.tripTitle}>{carName}</h3>
          <span className={`${styles.status} ${getStatusClass(trip.status)}`}>{getStatusLabel(trip.status)}</span>
        </div>
        <div className={styles.tripDetails}>
          <p>{destName}</p>
          <p>{formatDate(trip.start_date)} — {formatDate(trip.end_date)}</p>
          {trip.has_storage && trip.own_car_license_plate && (
            <p className={styles.storageInfo}>Парковка: {trip.own_car_brand} {trip.own_car_model} ({trip.own_car_license_plate})</p>
          )}
          <p className={styles.tripPrice}>{trip.total_price.toLocaleString('ru-RU')} ₽</p>
        </div>
        <div className={styles.tripActions}>
          {trip.status === 'confirmed' && (
            <Button variant="outline" size="small" onClick={() => navigate(`/booking/success?id=${trip.id}`)}>
              QR-код
            </Button>
          )}
          {['pending', 'confirmed'].includes(trip.status) && (
            <Button variant="ghost" size="small" onClick={() => handleCancel(trip.id)} disabled={cancellingId === trip.id}>
              {cancellingId === trip.id ? 'Отмена...' : 'Отменить'}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Мои поездки</h1>

        <div className={styles.tabs}>
          <button type="button" className={`${styles.tab} ${activeTab === 'active' ? styles.tabActive : ''}`} onClick={() => setActiveTab('active')}>
            Активные ({activeTrips.length})
          </button>
          <button type="button" className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`} onClick={() => setActiveTab('history')}>
            История ({historyTrips.length})
          </button>
        </div>

        {loading ? (
          <p className={styles.loading}>Загрузка...</p>
        ) : error ? (
          <div className={styles.empty}>
            <p>{error}</p>
            <Button variant="primary" onClick={() => refresh()}>Повторить</Button>
          </div>
        ) : displayed.length === 0 ? (
          <div className={styles.empty}>
            <p>Нет поездок</p>
            <Button variant="primary" onClick={() => navigate('/search')}>Найти авто</Button>
          </div>
        ) : (
          <div className={styles.tripList}>{displayed.map(renderTrip)}</div>
        )}
      </div>
    </div>
  );
}

export default MyTravelTrips;
