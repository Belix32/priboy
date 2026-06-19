import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBookings } from '../../hooks/useBookings';
import { getErrorMessage } from '../../lib/apiError';
import { cancelTravelBooking } from '../../lib/travel/api';
import { getCurrentUserProfile, updateUserProfile, profileToUserCar } from '../../lib/travel/profileApi';
import { Button } from '../../components/Button/Button';
import type { TravelBooking } from '../../lib/travel/types';
import styles from './UserProfile.module.css';

interface OwnCarInfo {
  brand: string;
  model: string;
  color: string;
  license_plate: string;
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
  const [searchParams] = useSearchParams();
  const { bookings, loading, error, refresh } = useBookings();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);

  const [ownCar, setOwnCar] = useState<OwnCarInfo | null>(null);
  const [editingCar, setEditingCar] = useState(false);
  const [carForm, setCarForm] = useState<OwnCarInfo>({ brand: '', model: '', color: '', license_plate: '' });

  useEffect(() => {
    if (searchParams.get('tab') === 'trips') {
      setActiveTab('active');
    }
  }, [searchParams]);

  useEffect(() => {
    getCurrentUserProfile().then((profile) => {
      if (profile) {
        setName(profile.name || user?.name || '');
        setPhone(profile.phone || user?.phone || '');
        const car = profileToUserCar(profile);
        if (car) {
          setOwnCar({
            brand: car.brand,
            model: car.model,
            color: car.color || '',
            license_plate: car.license_plate || '',
          });
          setCarForm({
            brand: car.brand,
            model: car.model,
            color: car.color || '',
            license_plate: car.license_plate || '',
          });
        }
      }
    });
  }, [user]);

  useEffect(() => {
    const saved = loadOwnCar();
    if (saved && !ownCar) {
      setOwnCar(saved);
      setCarForm(saved);
    }
  }, [ownCar]);

  const handleCancel = useCallback(async (tripId: string) => {
    if (!confirm('Вы уверены, что хотите отменить поездку?')) return;

    setCancellingId(tripId);
    setCancelError(null);
    try {
      await cancelTravelBooking(tripId);
      await refresh();
    } catch (err) {
      setCancelError(getErrorMessage(err, 'Не удалось отменить поездку'));
    } finally {
      setCancellingId(null);
    }
  }, [refresh]);

  const handleSaveCar = async () => {
    if (!carForm.brand.trim() || !carForm.model.trim()) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      await updateUserProfile({ own_car: carForm });
      saveOwnCar(carForm);
      setOwnCar(carForm);
      setEditingCar(false);
    } catch (err) {
      setProfileError(getErrorMessage(err, 'Не удалось сохранить автомобиль'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError(null);
    try {
      await updateUserProfile({ name: name.trim(), phone: phone.trim() });
      setEditingProfile(false);
    } catch (err) {
      setProfileError(getErrorMessage(err, 'Не удалось сохранить профиль'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRemoveCar = async () => {
    if (!confirm('Удалить информацию об автомобиле?')) return;
    setSavingProfile(true);
    try {
      await updateUserProfile({ own_car: null });
      localStorage.removeItem(STORAGE_KEY);
      setOwnCar(null);
      setCarForm({ brand: '', model: '', color: '', license_plate: '' });
    } catch (err) {
      setProfileError(getErrorMessage(err, 'Не удалось удалить автомобиль'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleEditCar = () => {
    setCarForm(ownCar || { brand: '', model: '', color: '', license_plate: '' });
    setEditingCar(true);
  };

  const activeTrips = bookings.filter((t) =>
    t.status === 'pending' || t.status === 'confirmed' || t.status === 'active'
  );
  const historyTrips = bookings.filter((t) =>
    t.status === 'completed' || t.status === 'cancelled'
  );
  const displayTrips = activeTab === 'active' ? activeTrips : historyTrips;

  const renderTrip = (trip: TravelBooking) => {
    const destName = trip.destination?.name || 'Курорт';
    const carName = trip.car ? `${trip.car.brand} ${trip.car.model}` : 'Автомобиль';
    const partnerName = trip.partner?.name || 'Партнёр';

    return (
      <div key={trip.id} className={styles.tripCard}>
        <div className={styles.tripHeader}>
          <h3 className={styles.tripDestination}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {destName}
          </h3>
          <span className={`${styles.tripStatus} ${getStatusClass(trip.status)}`}>
            {getStatusLabel(trip.status)}
          </span>
        </div>

        <div className={styles.tripDetails}>
          <div className={styles.tripDetailRow}>
            <span>Автомобиль</span>
            <span className={styles.tripDetailValue}>{carName}</span>
          </div>
          <div className={styles.tripDetailRow}>
            <span>Партнёр</span>
            <span className={styles.tripDetailValue}>{partnerName}</span>
          </div>
          <div className={styles.tripDetailRow}>
            <span>Период</span>
            <span className={styles.tripDetailValue}>
              {formatDateShort(trip.start_date)} — {formatDateShort(trip.end_date)}
            </span>
          </div>
          {trip.has_storage && trip.own_car_license_plate && (
            <div className={styles.tripDetailRow}>
              <span>Ваше авто на хранении</span>
              <span className={styles.tripDetailValue}>
                {trip.own_car_brand} {trip.own_car_model} ({trip.own_car_license_plate})
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
              onClick={() => navigate(`/booking/success?id=${trip.id}`)}
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
    );
  };

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
            <Button variant="primary" onClick={() => navigate('/search')}>
              Новая поездка
            </Button>
          </div>
        </div>

        {profileError && <p className={styles.profileError}>{profileError}</p>}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Контактные данные</h2>
          </div>
          <div className={styles.carCard}>
            {editingProfile ? (
              <div className={styles.carForm}>
                <div className={styles.carFormRow}>
                  <div className={styles.carFormField}>
                    <label>Имя</label>
                    <input className={styles.carFormInput} value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className={styles.carFormField}>
                    <label>Телефон</label>
                    <input className={styles.carFormInput} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className={styles.carFormActions}>
                  <Button variant="primary" size="small" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                  <Button variant="ghost" size="small" onClick={() => setEditingProfile(false)}>Отмена</Button>
                </div>
              </div>
            ) : (
              <div className={styles.carInfo}>
                <div>
                  <div className={styles.carName}>{name || user.name || '—'}</div>
                  <div className={styles.carDetails}>{phone || user.phone || 'Телефон не указан'}</div>
                </div>
                <button type="button" className={styles.carActionBtn} onClick={() => setEditingProfile(true)}>
                  Редактировать
                </button>
              </div>
            )}
          </div>
        </section>

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
                      onChange={(e) => setCarForm((f) => ({ ...f, brand: e.target.value }))}
                      placeholder="Напр. Lada"
                    />
                  </div>
                  <div className={styles.carFormField}>
                    <label>Модель</label>
                    <input
                      type="text"
                      className={styles.carFormInput}
                      value={carForm.model}
                      onChange={(e) => setCarForm((f) => ({ ...f, model: e.target.value }))}
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
                      onChange={(e) => setCarForm((f) => ({ ...f, color: e.target.value }))}
                      placeholder="Напр. Белый"
                    />
                  </div>
                  <div className={styles.carFormField}>
                    <label>Гос. номер</label>
                    <input
                      type="text"
                      className={styles.carFormInput}
                      value={carForm.license_plate}
                      onChange={(e) => setCarForm((f) => ({ ...f, license_plate: e.target.value }))}
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
                  <button type="button" className={styles.carActionBtn} onClick={handleEditCar}>
                    Редактировать
                  </button>
                  <button type="button" className={styles.carActionDangerBtn} onClick={handleRemoveCar}>
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

          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'active' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Активные
              {activeTrips.length > 0 && (
                <span className={styles.badge}>{activeTrips.length}</span>
              )}
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('history')}
            >
              История
              {historyTrips.length > 0 && (
                <span className={styles.badge}>{historyTrips.length}</span>
              )}
            </button>
          </div>

          {cancelError && <p className={styles.cancelError}>{cancelError}</p>}

          <div className={styles.list}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Загрузка поездок...</p>
              </div>
            ) : error ? (
              <div className={styles.emptyState}>
                <h2 className={styles.emptyTitle}>Не удалось загрузить поездки</h2>
                <p className={styles.emptyText}>{error}</p>
                <Button variant="primary" onClick={() => refresh()}>Повторить</Button>
              </div>
            ) : displayTrips.length > 0 ? (
              displayTrips.map(renderTrip)
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
                  <Button variant="primary" onClick={() => navigate('/search')}>
                    Забронировать поездку
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        <div className={styles.bottomNav}>
          <button type="button" className={styles.backLink} onClick={() => navigate('/')}>
            ← На главную
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
