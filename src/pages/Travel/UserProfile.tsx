import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBookings } from '../../hooks/useBookings';
import { getErrorMessage } from '../../lib/apiError';
import { cancelTravelBooking } from '../../lib/travel/api';
import { createYooKassaPayment } from '../../lib/travel/payments';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';
import { getCurrentUserProfile, updateUserProfile, profileToUserCar } from '../../lib/travel/profileApi';
import { loadUserCar, removeUserCar, saveUserCar } from '../../lib/userStorage';
import { Button } from '../../components/Button/Button';
import type { TravelBooking, PartnerReview } from '../../lib/travel/types';
import { getReviewForBooking, createPartnerReview } from '../../lib/travel/reviews';
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

function getPaymentLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Ожидает оплаты',
    paid: 'Оплачено',
    refunded: 'Возврат',
    partially_refunded: 'Частичный возврат',
  };
  return map[status] || status;
}

function getPaymentClass(status: string): string {
  const map: Record<string, string> = {
    pending: styles.paymentPending,
    paid: styles.paymentPaid,
    refunded: styles.paymentRefunded,
    partially_refunded: styles.paymentRefunded,
  };
  return map[status] || '';
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

function TripReview({ trip }: { trip: TravelBooking }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [existing, setExisting] = useState<PartnerReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    getReviewForBooking(trip.id)
      .then(setExisting)
      .finally(() => setLoading(false));
  }, [trip.id]);

  if (trip.status !== 'completed' || !trip.partner_id) return null;
  if (loading) return <p className={styles.reviewLoading}>Загрузка отзыва…</p>;

  if (existing) {
    return (
      <div className={styles.reviewSection}>
        <p className={styles.reviewTitle}>Ваш отзыв</p>
        <p className={styles.reviewStars}>{'★'.repeat(existing.rating)}{'☆'.repeat(5 - existing.rating)}</p>
        {existing.comment && <p className={styles.reviewText}>{existing.comment}</p>}
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating < 1) {
      setReviewError('Выберите оценку');
      return;
    }
    setSubmitting(true);
    setReviewError(null);
    try {
      const review = await createPartnerReview({
        bookingId: trip.id,
        partnerId: trip.partner_id!,
        rating,
        comment: comment.trim() || undefined,
      });
      setExisting(review);
    } catch (err) {
      setReviewError(getErrorMessage(err, 'Не удалось сохранить отзыв'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.reviewSection}>
      <p className={styles.reviewTitle}>Оцените поездку</p>
      <div className={styles.starRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`${styles.starBtn} ${n <= rating ? styles.starBtnActive : ''}`}
            onClick={() => setRating(n)}
            aria-label={`${n} звёзд`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className={styles.reviewComment}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Комментарий (необязательно)"
        rows={2}
      />
      {reviewError && <p className={styles.cancelError}>{reviewError}</p>}
      <Button variant="secondary" size="small" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Отправка…' : 'Оставить отзыв'}
      </Button>
    </div>
  );
}

export function UserProfile() {
  const { user, hasAdminAccess } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { bookings, loading, error, refresh } = useBookings();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
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
    if (!user?.id) {
      setOwnCar(null);
      setCarForm({ brand: '', model: '', color: '', license_plate: '' });
      return;
    }

    getCurrentUserProfile().then((profile) => {
      if (profile) {
        setName(profile.name || user.name || '');
        setPhone(profile.phone || user.phone || '');
        const car = profileToUserCar(profile);
        if (car) {
          const ownCarData = {
            brand: car.brand,
            model: car.model,
            color: car.color || '',
            license_plate: car.license_plate || '',
          };
          setOwnCar(ownCarData);
          setCarForm(ownCarData);
          saveUserCar(user.id, ownCarData);
          return;
        }
      }

      const saved = loadUserCar(user.id);
      if (saved?.brand && saved.model) {
        const ownCarData = {
          brand: saved.brand,
          model: saved.model,
          color: saved.color || '',
          license_plate: saved.license_plate || '',
        };
        setOwnCar(ownCarData);
        setCarForm(ownCarData);
      } else {
        setOwnCar(null);
        setCarForm({ brand: '', model: '', color: '', license_plate: '' });
      }
    });
  }, [user?.id, user?.name, user?.phone]);

  const handlePayOnline = useCallback(async (tripId: string) => {
    if (!isSupabaseConfigured()) {
      setPayError('Онлайн-оплата недоступна');
      return;
    }
    setPayingId(tripId);
    setPayError(null);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Необходимо войти в аккаунт');
      const { confirmationUrl } = await createYooKassaPayment(tripId, token);
      window.location.href = confirmationUrl;
    } catch (err) {
      setPayError(getErrorMessage(err, 'Не удалось создать платёж'));
      setPayingId(null);
    }
  }, []);

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
      if (user?.id) saveUserCar(user.id, carForm);
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
      if (user?.id) removeUserCar(user.id);
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
    const isStorageOnly = trip.booking_type === 'storage_only';
    const destName = trip.destination?.name || 'Курорт';
    const carName = isStorageOnly
      ? 'Только хранение'
      : trip.car
        ? `${trip.car.brand} ${trip.car.model}`
        : 'Автомобиль';
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
            <span>{isStorageOnly ? 'Услуга' : 'Автомобиль'}</span>
            <span className={styles.tripDetailValue}>{carName}</span>
          </div>
          {isStorageOnly && trip.location?.name && (
            <div className={styles.tripDetailRow}>
              <span>Парковка</span>
              <span className={styles.tripDetailValue}>{trip.location.name}</span>
            </div>
          )}
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
          {(trip.has_storage || isStorageOnly) && trip.own_car_license_plate && (
            <div className={styles.tripDetailRow}>
              <span>Ваше авто на хранении</span>
              <span className={styles.tripDetailValue}>
                {trip.own_car_brand} {trip.own_car_model} ({trip.own_car_license_plate})
              </span>
            </div>
          )}
          <div className={styles.tripDetailRow}>
            <span>Оплата</span>
            <span className={`${styles.paymentBadge} ${getPaymentClass(trip.payment_status)}`}>
              {getPaymentLabel(trip.payment_status)}
            </span>
          </div>
          <div className={styles.tripDetailRow}>
            <span>Стоимость</span>
            <span className={styles.tripPrice}>
              {trip.total_price.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        {trip.status === 'completed' && <TripReview trip={trip} />}

        <div className={styles.tripActions}>
          {trip.payment_status === 'pending' &&
            trip.status !== 'cancelled' &&
            isSupabaseConfigured() && (
              <Button
                variant="primary"
                size="small"
                onClick={() => handlePayOnline(trip.id)}
                disabled={payingId === trip.id}
              >
                {payingId === trip.id ? 'Переход к оплате...' : 'Оплатить онлайн'}
              </Button>
            )}
          {(trip.status === 'confirmed' || trip.status === 'active') && (
            <Button
              variant="primary"
              size="small"
              onClick={() =>
                navigate(
                  `/booking/success?id=${trip.id}${isStorageOnly ? '&type=storage' : ''}`,
                )
              }
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
          {payError && <p className={styles.cancelError}>{payError}</p>}

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
