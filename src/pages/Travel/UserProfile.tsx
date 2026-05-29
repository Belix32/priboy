import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button/Button';
import styles from './UserProfile.module.css';

interface OwnCarInfo {
  brand: string;
  model: string;
  color: string;
  license_plate: string;
}

interface TravelBookingData {
  id: string;
  user_id: string;
  car_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  car_brand: string;
  car_model: string;
  car_color: string;
  car_plate: string;
  storage_enabled: boolean;
  rent_price: number;
  storage_price: number;
  service_fee: number;
  total_price: number;
  status: string;
  partner_name: string;
  partner_car_brand: string;
  partner_car_model: string;
  transmission: string;
  price_per_day: number;
  created_at: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDestinationLabel(slug: string): string {
  switch (slug) {
    case 'sochi': return 'Сочи';
    case 'anapa': return 'Анапа';
    case 'gelendzhik': return 'Геленджик';
    case 'novorossiysk': return 'Новороссийск';
    default: return slug;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Ожидает подтверждения';
    case 'confirmed': return 'Подтверждено';
    case 'active': return 'Активно';
    case 'completed': return 'Завершено';
    case 'cancelled': return 'Отменено';
    default: return status;
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'pending': return styles.statusPending;
    case 'confirmed': return styles.statusConfirmed;
    case 'active': return styles.statusActive;
    case 'completed': return styles.statusCompleted;
    case 'cancelled': return styles.statusCancelled;
    default: return '';
  }
}

const STORAGE_KEY = 'priboi_user_car';

function loadOwnCar(): OwnCarInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveOwnCar(car: OwnCarInfo): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(car));
}

export function UserProfile() {
  const { user, hasAdminAccess } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TravelBookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Own car state
  const [ownCar, setOwnCar] = useState<OwnCarInfo | null>(null);
  const [editingCar, setEditingCar] = useState(false);
  const [carForm, setCarForm] = useState<OwnCarInfo>({ brand: '', model: '', color: '', license_plate: '' });

  useEffect(() => {
    const saved = loadOwnCar();
    if (saved) {
      setOwnCar(saved);
      setCarForm(saved);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem('priboi_travel_bookings');
      if (stored) {
        const allBookings: TravelBookingData[] = JSON.parse(stored);
        const userBookings = allBookings.filter(b => b.user_id === user.id);
        userBookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setTrips(userBookings);
      }
    } catch (err) {
      console.error('Error loading trips:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleCancel = useCallback((tripId: string) => {
    if (!confirm('Вы уверены, что хотите отменить поездку?')) return;

    setCancellingId(tripId);
    try {
      const stored = localStorage.getItem('priboi_travel_bookings');
      if (stored) {
        const bookings: TravelBookingData[] = JSON.parse(stored);
        const updated = bookings.map(b =>
          b.id === tripId ? { ...b, status: 'cancelled' } : b
        );
        localStorage.setItem('priboi_travel_bookings', JSON.stringify(updated));
        setTrips(prev =>
          prev.map(t => t.id === tripId ? { ...t, status: 'cancelled' } : t)
        );
      }
    } catch (err) {
      console.error('Error cancelling trip:', err);
    } finally {
      setCancellingId(null);
    }
  }, []);

  const handleSaveCar = () => {
    if (!carForm.brand.trim() || !carForm.model.trim()) return;
    saveOwnCar(carForm);
    setOwnCar(carForm);
    setEditingCar(false);
  };

  const handleEditCar = () => {
    setCarForm(ownCar || { brand: '', model: '', color: '', license_plate: '' });
    setEditingCar(true);
  };

  const handleRemoveCar = () => {
    if (!confirm('Удалить информацию об автомобиле?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setOwnCar(null);
    setCarForm({ brand: '', model: '', color: '', license_plate: '' });
  };

  const activeTrips = trips.filter(t =>
    t.status === 'pending' || t.status === 'confirmed' || t.status === 'active'
  );
  const historyTrips = trips.filter(t =>
    t.status === 'completed' || t.status === 'cancelled'
  );
  const displayTrips = activeTab === 'active' ? activeTrips : historyTrips;

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Войдите в аккаунт</h2>
            <p className={styles.emptyText}>
              Чтобы просматривать профиль, необходимо авторизоваться
            </p>
            <Button variant="primary" onClick={() => navigate('/login')}>
              Войти
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Личный кабинет</h1>
            <p className={styles.subtitle}>{user.email}</p>
          </div>
          <div className={styles.headerActions}>
            {hasAdminAccess && (
              <Button variant="accent" onClick={() => navigate('/admin')}>
                Админ-панель
              </Button>
            )}
            <Button variant="primary" onClick={() => navigate('/travel/search')}>
              Новая поездка
            </Button>
          </div>
        </div>

        {/* === My Car Section === */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 16H9m10 0h3l-3-4m-6 4H6l-2 2H2l1.5-6.5A3 3 0 0 1 6.5 9H11l3 3v4Z" />
                <circle cx="7" cy="17" r="1" />
                <circle cx="17" cy="17" r="1" />
              </svg>
              Мой автомобиль
            </h2>
            <p className={styles.sectionDesc}>
              Информация о вашем автомобиле для хранения на время аренды
            </p>
          </div>

          <div className={styles.carCard}>
            {editingCar ? (
              <div className={styles.carForm}>
                <div className={styles.carFormRow}>
                  <div className={styles.carFormField}>
                    <label>Марка</label>
                    <input
                      type="text"
                      className={styles.carFormInput}
                      value={carForm.brand}
                      onChange={e => setCarForm(f => ({ ...f, brand: e.target.value }))}
                      placeholder="Напр. Lada"
                    />
                  </div>
                  <div className={styles.carFormField}>
                    <label>Модель</label>
                    <input
                      type="text"
                      className={styles.carFormInput}
                      value={carForm.model}
                      onChange={e => setCarForm(f => ({ ...f, model: e.target.value }))}
                      placeholder="Напр. Granta"
                    />
                  </div>
                </div>
                <div className={styles.carFormRow}>
                  <div className={styles.carFormField}>
                    <label>Цвет</label>
                    <input
                      type="text"
                      className={styles.carFormInput}
                      value={carForm.color}
                      onChange={e => setCarForm(f => ({ ...f, color: e.target.value }))}
                      placeholder="Напр. Белый"
                    />
                  </div>
                  <div className={styles.carFormField}>
                    <label>Гос. номер</label>
                    <input
                      type="text"
                      className={styles.carFormInput}
                      value={carForm.license_plate}
                      onChange={e => setCarForm(f => ({ ...f, license_plate: e.target.value }))}
                      placeholder="Напр. А123ВВ"
                    />
                  </div>
                </div>
                <div className={styles.carFormActions}>
                  <Button variant="primary" size="small" onClick={handleSaveCar}>
                    Сохранить
                  </Button>
                  <Button variant="ghost" size="small" onClick={() => setEditingCar(false)}>
                    Отмена
                  </Button>
                </div>
              </div>
            ) : ownCar ? (
              <div className={styles.carInfo}>
                <div className={styles.carInfoMain}>
                  <div className={styles.carAvatar}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 16H9m10 0h3l-3-4m-6 4H6l-2 2H2l1.5-6.5A3 3 0 0 1 6.5 9H11l3 3v4Z" />
                      <circle cx="7" cy="17" r="1" />
                      <circle cx="17" cy="17" r="1" />
                    </svg>
                  </div>
                  <div>
                    <div className={styles.carName}>
                      {ownCar.brand} {ownCar.model}
                    </div>
                    <div className={styles.carDetails}>
                      {ownCar.color && <span>{ownCar.color}</span>}
                      {ownCar.license_plate && (
                        <span className={styles.carPlate}>{ownCar.license_plate}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.carActions}>
                  <button className={styles.carActionBtn} onClick={handleEditCar}>
                    Редактировать
                  </button>
                  <button className={styles.carActionDangerBtn} onClick={handleRemoveCar}>
                    Удалить
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.carEmpty}>
                <p className={styles.carEmptyText}>
                  Вы ещё не добавили информацию о своём автомобиле
                </p>
                <Button variant="primary" size="small" onClick={handleEditCar}>
                  Добавить автомобиль
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* === My Bookings Section === */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Мои бронирования
            </h2>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'active' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Активные
              {activeTrips.length > 0 && (
                <span className={styles.badge}>{activeTrips.length}</span>
              )}
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('history')}
            >
              История
              {historyTrips.length > 0 && (
                <span className={styles.badge}>{historyTrips.length}</span>
              )}
            </button>
          </div>

          {/* Trip List */}
          <div className={styles.list}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Загрузка поездок...</p>
              </div>
            ) : displayTrips.length > 0 ? (
              displayTrips.map((trip) => (
                <div key={trip.id} className={styles.tripCard}>
                  <div className={styles.tripHeader}>
                    <h3 className={styles.tripDestination}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {getDestinationLabel(trip.destination)}
                    </h3>
                    <span className={`${styles.tripStatus} ${getStatusClass(trip.status)}`}>
                      {getStatusLabel(trip.status)}
                    </span>
                  </div>

                  <div className={styles.tripDetails}>
                    <div className={styles.tripDetailRow}>
                      <span>Автомобиль</span>
                      <span className={styles.tripDetailValue}>
                        {trip.partner_car_brand} {trip.partner_car_model}
                      </span>
                    </div>
                    <div className={styles.tripDetailRow}>
                      <span>Партнёр</span>
                      <span className={styles.tripDetailValue}>{trip.partner_name}</span>
                    </div>
                    <div className={styles.tripDetailRow}>
                      <span>Период</span>
                      <span className={styles.tripDetailValue}>
                        {formatDateShort(trip.start_date)} — {formatDateShort(trip.end_date)}
                      </span>
                    </div>
                    {trip.storage_enabled && (
                      <div className={styles.tripDetailRow}>
                        <span>Ваше авто на хранении</span>
                        <span className={styles.tripDetailValue}>
                          {trip.car_brand} {trip.car_model} ({trip.car_plate})
                        </span>
                      </div>
                    )}
                    <div className={styles.tripDetailRow}>
                      <span>Стоимость</span>
                      <span className={styles.tripPrice}>
                        {trip.total_price.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>

                  <div className={styles.tripActions}>
                    {trip.status === 'confirmed' && (
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => navigate(`/travel/booking/success?id=${trip.id}`)}
                      >
                        Открыть QR-код
                      </Button>
                    )}
                    {(trip.status === 'pending' || trip.status === 'confirmed') && (
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => handleCancel(trip.id)}
                        disabled={cancellingId === trip.id}
                      >
                        {cancellingId === trip.id ? 'Отмена...' : 'Отменить'}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1" y="3" width="15" height="13" rx="2" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <h2 className={styles.emptyTitle}>
                  {activeTab === 'active' ? 'Нет активных поездок' : 'История поездок пуста'}
                </h2>
                <p className={styles.emptyText}>
                  {activeTab === 'active'
                    ? 'Забронируйте авто на курорте через Прибой и отправляйтесь на море'
                    : 'У вас пока нет завершённых поездок'}
                </p>
                {activeTab === 'active' && (
                  <Button variant="primary" onClick={() => navigate('/travel/search')}>
                    Забронировать поездку
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Navigation back */}
        <div className={styles.bottomNav}>
          <button className={styles.backLink} onClick={() => navigate('/travel')}>
            ← На главную
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
