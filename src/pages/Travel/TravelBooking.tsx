import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { getCarById, getDestinationBySlug, createTravelBooking, calculateTravelPrice } from '../../lib/travel/api';
import { sendBookingNotification } from '../../lib/travel/notifications';
import { validatePromoCode } from '../../lib/travel/promos';
import { getStoragePricePerDay, getAppSettings, getRentalDayLimits } from '../../lib/travel/settings';
import { getApplicableSeasonalDiscount } from '../../lib/travel/seasonal';
import type { SeasonalDiscount } from '../../lib/travel/types';
import { getCurrentUserProfile, profileToUserCar } from '../../lib/travel/profileApi';
import { getErrorMessage } from '../../lib/apiError';
import type { PartnerCar } from '../../lib/travel/types';
import styles from './TravelBooking.module.css';
import sharedStyles from './Travel.module.css';

const PROFILE_CAR_KEY = 'priboi_user_car';

interface ProfileCar {
  brand: string;
  model: string;
  color: string;
  license_plate: string;
}

function loadProfileCar(): ProfileCar | null {
  try {
    const raw = localStorage.getItem(PROFILE_CAR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function TravelBooking() {
  const { carId } = useParams<{ carId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const startDate = searchParams.get('start') || '';
  const endDate = searchParams.get('end') || '';
  const destination = searchParams.get('destination') || '';

  const [car, setCar] = useState<PartnerCar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User's own car info for storage
  const [ownBrand, setOwnBrand] = useState('');
  const [ownModel, setOwnModel] = useState('');
  const [ownColor, setOwnColor] = useState('');
  const [ownPlate, setOwnPlate] = useState('');
  const [plateError, setPlateError] = useState('');

  // Profile car suggestion
  const [profileCar, setProfileCar] = useState<ProfileCar | null>(null);
  const [usedProfileCar, setUsedProfileCar] = useState(false);

  // Storage toggle
  const [storageEnabled, setStorageEnabled] = useState(true);
  const [storagePricePerDay, setStoragePricePerDay] = useState(500);
  const [commissionRate, setCommissionRate] = useState(15);
  const [minRentalDays, setMinRentalDays] = useState(1);
  const [maxRentalDays, setMaxRentalDays] = useState(30);
  const [seasonalDiscount, setSeasonalDiscount] = useState<SeasonalDiscount | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getStoragePricePerDay().then(setStoragePricePerDay);
    getAppSettings().then((s) => setCommissionRate(s.default_commission_rate));
    getRentalDayLimits().then(({ min, max }) => {
      setMinRentalDays(min);
      setMaxRentalDays(max);
    });
  }, []);

  useEffect(() => {
    if (!destination || !startDate || !endDate) {
      setSeasonalDiscount(null);
      return;
    }
    getDestinationBySlug(destination).then((dest) => {
      if (!dest) {
        setSeasonalDiscount(null);
        return;
      }
      getApplicableSeasonalDiscount(dest.id, startDate, endDate).then(setSeasonalDiscount);
    });
  }, [destination, startDate, endDate]);

  // Load car from API
  useEffect(() => {
    if (!carId) {
      setError('Автомобиль не указан');
      setLoading(false);
      return;
    }

    getCarById(carId)
      .then((found) => {
        if (found) setCar(found);
        else setError('Автомобиль не найден');
      })
      .catch((err) => setError(getErrorMessage(err, 'Не удалось загрузить автомобиль')))
      .finally(() => setLoading(false));
  }, [carId]);

  // Load saved car from user profile
  useEffect(() => {
    getCurrentUserProfile().then((profile) => {
      const saved = profileToUserCar(profile);
      if (saved?.brand && saved.model) {
        setProfileCar({
          brand: saved.brand,
          model: saved.model,
          color: saved.color || '',
          license_plate: saved.license_plate || '',
        });
      }
    });
  }, []);

  const priceOptions = useMemo(
    () => ({
      commissionRate,
      seasonalDiscountPercent: seasonalDiscount?.discount_percent,
      seasonalDiscountName: seasonalDiscount?.name,
    }),
    [commissionRate, seasonalDiscount],
  );

  const priceBreakdown = useMemo(() => {
    if (!car || !startDate || !endDate) return null;
    return calculateTravelPrice(
      car,
      startDate,
      endDate,
      storageEnabled,
      storagePricePerDay,
      promoDiscount,
      priceOptions,
    );
  }, [car, startDate, endDate, storageEnabled, storagePricePerDay, promoDiscount, priceOptions]);

  const days = priceBreakdown?.totalRentalDays || 0;
  const rentTotal = priceBreakdown?.totalRentalPrice || 0;
  const storageTotal = priceBreakdown?.totalStoragePrice || 0;
  const serviceFee = priceBreakdown?.commissionPrice || 0;
  const seasonalDiscountAmount = priceBreakdown?.seasonalDiscountAmount || 0;
  const totalPrice = priceBreakdown?.totalPrice || 0;

  const handleUseProfileCar = () => {
    if (!profileCar) return;
    setOwnBrand(profileCar.brand);
    setOwnModel(profileCar.model);
    setOwnColor(profileCar.color);
    setOwnPlate(profileCar.license_plate);
    setUsedProfileCar(true);
  };

  const handleClearProfileCar = () => {
    setOwnBrand('');
    setOwnModel('');
    setOwnColor('');
    setOwnPlate('');
    setUsedProfileCar(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }

    if (!car) return;

    if (!startDate || !endDate) {
      setError('Укажите даты поездки');
      return;
    }

    if (days < minRentalDays) {
      setError(`Минимальный срок аренды — ${minRentalDays} ${minRentalDays === 1 ? 'день' : minRentalDays < 5 ? 'дня' : 'дней'}`);
      return;
    }
    if (days > maxRentalDays) {
      setError(`Максимальный срок аренды — ${maxRentalDays} дней`);
      return;
    }

    // Validate plate if storage enabled
    if (storageEnabled) {
      if (!ownPlate || ownPlate.trim().length < 5) {
        setPlateError('Укажите госномер автомобиля');
        return;
      }
      setPlateError('');
    }

    setSubmitting(true);

    try {
      const dest = await getDestinationBySlug(destination);
      if (!dest) {
        setError('Направление не найдено');
        setSubmitting(false);
        return;
      }

      const booking = await createTravelBooking(
        {
          destination_id: dest.id,
          partner_id: car.partner_id,
          car_id: car.id,
          location_id: car.location_id || undefined,
          start_date: startDate,
          end_date: endDate,
          has_storage: storageEnabled,
          own_car_brand: ownBrand,
          own_car_model: ownModel,
          own_car_color: ownColor,
          own_car_license_plate: ownPlate.toUpperCase(),
          promo_code: promoDiscount > 0 ? promoCode.toUpperCase() : undefined,
          discount_amount: promoDiscount > 0 ? promoDiscount : undefined,
        },
        storageEnabled ? { brand: ownBrand, model: ownModel, color: ownColor, license_plate: ownPlate.toUpperCase() } : undefined,
      );

      if (booking) {
        void sendBookingNotification(booking.id, 'created');
        navigate(`/booking/confirm?bookingId=${booking.id}`);
      } else {
        setError('Не удалось создать бронирование');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка бронирования');
    } finally {
      setSubmitting(false);
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

  if (error && !car) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={sharedStyles.error}>
            <p>{error}</p>
            <Button variant="primary" onClick={() => navigate('/travel/search')}>
              Вернуться к поиску
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!car) return null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={sharedStyles.backButton} onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Назад
          </button>
          <h1 className={styles.title}>Бронирование</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Car Details */}
          <div className={styles.carCard}>
            <div className={styles.carImage}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div className={styles.carInfo}>
              <h2 className={styles.carName}>{car.brand} {car.model}</h2>
              <div className={styles.carSpecs}>
                <span className={styles.carSpec}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  {car.transmission === 'automatic' ? 'Автомат' : 'Механика'}
                </span>
                <span className={styles.carSpec}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {car.seats} мест
                </span>
                <span className={styles.carSpec}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="2" />
                    <path d="M6 12h12" />
                    <path d="M12 6v12" />
                  </svg>
                  {car.year} г.
                </span>
              </div>
              <div className={styles.carPartner}>
                Партнёр: {car.partner?.name || 'Партнёр'} {car.partner?.rating ? `★ ${car.partner.rating}` : ''}
              </div>
              <div className={styles.carPrice}>
                {car.price_per_day.toLocaleString('ru-RU')} ₽{' '}
                <span className={styles.carPriceLabel}>/ сутки</span>
              </div>
            </div>
          </div>

          {/* Date Display */}
          {startDate && endDate && (
            <div className={styles.dateDisplay}>
              <div className={styles.dateBox}>
                <div className={styles.dateLabel}>Заезд</div>
                <div className={styles.dateValue}>{formatDateDisplay(startDate)}</div>
              </div>
              <div className={styles.dateBox}>
                <div className={styles.dateLabel}>Выезд</div>
                <div className={styles.dateValue}>{formatDateDisplay(endDate)}</div>
              </div>
              <div className={styles.dateBox}>
                <div className={styles.dateLabel}>Длительность</div>
                <div className={styles.dateValue}>
                  {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                </div>
              </div>
            </div>
          )}

          {/* Profile Car Suggestion */}
          {profileCar && !usedProfileCar && (
            <div className={styles.profileCarSuggestion}>
              <div className={styles.profileCarSuggestionIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 16H9m10 0h3l-3-4m-6 4H6l-2 2H2l1.5-6.5A3 3 0 0 1 6.5 9H11l3 3v4Z" />
                  <circle cx="7" cy="17" r="1" />
                  <circle cx="17" cy="17" r="1" />
                </svg>
              </div>
              <div className={styles.profileCarSuggestionBody}>
                <div className={styles.profileCarSuggestionTitle}>
                  Ваш автомобиль из профиля
                </div>
                <div className={styles.profileCarSuggestionCar}>
                  {profileCar.brand} {profileCar.model}
                  {profileCar.color && <span className={styles.profileCarSuggestionDot}>·</span>}
                  {profileCar.color}
                  {profileCar.license_plate && (
                    <span className={styles.profileCarSuggestionPlate}>
                      {profileCar.license_plate}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.profileCarSuggestionActions}>
                <Button variant="primary" size="small" onClick={handleUseProfileCar}>
                  Использовать
                </Button>
              </div>
            </div>
          )}

          {/* Profile car already applied badge */}
          {usedProfileCar && profileCar && (
            <div className={styles.profileCarApplied}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Используется автомобиль из профиля:
              <strong>{profileCar.brand} {profileCar.model}</strong>
              <button
                type="button"
                className={styles.profileCarChangeBtn}
                onClick={handleClearProfileCar}
              >
                Изменить
              </button>
            </div>
          )}

          {/* Your Car Info for Storage */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Ваш автомобиль</h3>
            <div className={styles.carFormGrid}>
              <Input
                label="Марка"
                value={ownBrand}
                onChange={(e) => setOwnBrand(e.target.value)}
                placeholder="Toyota"
              />
              <Input
                label="Модель"
                value={ownModel}
                onChange={(e) => setOwnModel(e.target.value)}
                placeholder="Camry"
              />
            </div>
            <div className={styles.carFormGrid}>
              <Input
                label="Цвет"
                value={ownColor}
                onChange={(e) => setOwnColor(e.target.value)}
                placeholder="Белый"
              />
              <Input
                label="Госномер"
                value={ownPlate}
                onChange={(e) => {
                  setOwnPlate(e.target.value.toUpperCase());
                  if (plateError) setPlateError('');
                }}
                placeholder="А777АА77"
                maxLength={9}
                error={plateError}
              />
            </div>
          </div>

          {/* Storage Toggle */}
          <div
            className={`${styles.storageToggle} ${storageEnabled ? styles.storageToggleActive : ''}`}
            onClick={() => setStorageEnabled(!storageEnabled)}
            role="checkbox"
            aria-checked={storageEnabled}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStorageEnabled(!storageEnabled);
              }
            }}
          >
            <div className={`${styles.storageCheckbox} ${storageEnabled ? styles.storageCheckboxChecked : ''}`}>
              {storageEnabled && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div className={styles.storageInfo}>
              <div className={styles.storageTitle}>Оставить свою машину на хранение</div>
              <div className={styles.storagePrice}>{storagePricePerDay.toLocaleString('ru-RU')} ₽ / сутки</div>
            </div>
          </div>

          <div className={styles.promoSection}>
            <label className={styles.promoLabel}>Промокод</label>
            <div className={styles.promoRow}>
              <input
                type="text"
                className={styles.promoInput}
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="PRIBOY2026"
              />
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={async () => {
                  if (!car || !startDate || !endDate) return;
                  const base = calculateTravelPrice(
                    car,
                    startDate,
                    endDate,
                    storageEnabled,
                    storagePricePerDay,
                    0,
                    priceOptions,
                  );
                  const result = await validatePromoCode(promoCode, base.totalRentalPrice + base.totalStoragePrice);
                  if (result.valid) {
                    setPromoDiscount(result.discountAmount);
                    setPromoMessage(`Скидка −${result.discountAmount.toLocaleString('ru-RU')} ₽`);
                  } else {
                    setPromoDiscount(0);
                    setPromoMessage(result.message || 'Промокод недействителен');
                  }
                }}
              >
                Применить
              </Button>
            </div>
            {promoMessage && <p className={styles.promoMessage}>{promoMessage}</p>}
          </div>

          {/* Price Breakdown */}
          <div className={styles.priceBreakdown}>
            <h3 className={styles.sectionTitle}>Детализация стоимости</h3>
            <div className={styles.priceRow}>
              <span>Аренда: {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} × {car.price_per_day.toLocaleString('ru-RU')} ₽/день</span>
              <span className={styles.priceRowValue}>{rentTotal.toLocaleString('ru-RU')} ₽</span>
            </div>
            {storageEnabled && (
              <div className={styles.priceRow}>
                <span>Хранение: {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} × {storagePricePerDay.toLocaleString('ru-RU')} ₽/день</span>
                <span className={styles.priceRowValue}>{storageTotal.toLocaleString('ru-RU')} ₽</span>
              </div>
            )}
            {seasonalDiscountAmount > 0 && (
              <div className={styles.priceRow}>
                <span>
                  Сезонная скидка
                  {seasonalDiscount?.name ? ` (${seasonalDiscount.name})` : ''}
                </span>
                <span className={styles.priceRowValue}>
                  −{seasonalDiscountAmount.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            )}
            {promoDiscount > 0 && (
              <div className={styles.priceRow}>
                <span>Промокод</span>
                <span className={styles.priceRowValue}>−{promoDiscount.toLocaleString('ru-RU')} ₽</span>
              </div>
            )}
            <div className={styles.priceRow}>
              <span>Комиссия Прибой ({commissionRate}%)</span>
              <span className={styles.priceRowValue}>{serviceFee.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className={styles.priceTotal}>
              <span>ИТОГО</span>
              <span className={styles.priceTotalValue}>{totalPrice.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>

          {/* Error */}
          {error && <div className={sharedStyles.errorMessage}>{error}</div>}

          {/* Submit */}
          <div className={styles.formActions}>
            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={submitting}
              className={styles.submitButton}
            >
              {submitting ? 'Создание бронирования...' : 'Забронировать'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TravelBooking;
