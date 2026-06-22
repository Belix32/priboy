import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { getLocationById } from '../../lib/travel/api';
import {
  calculateStorageOnlyPrice,
  createStandaloneStorageBooking,
} from '../../lib/travel/storageBooking';
import { sendBookingNotification } from '../../lib/travel/notifications';
import { validatePromoCode } from '../../lib/travel/promos';
import { getAppSettings, getRentalDayLimits, getStoragePricePerDay } from '../../lib/travel/settings';
import { getCurrentUserProfile, profileToUserCar } from '../../lib/travel/profileApi';
import { getErrorMessage } from '../../lib/apiError';
import type { PartnerLocation } from '../../lib/travel/types';
import styles from './TravelBooking.module.css';
import sharedStyles from './Travel.module.css';

const PROFILE_CAR_KEY = 'priboi_user_car';

function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function StandaloneStorageBooking() {
  const { locationId } = useParams<{ locationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const startDate = searchParams.get('start') || '';
  const endDate = searchParams.get('end') || '';

  const [location, setLocation] = useState<PartnerLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [ownBrand, setOwnBrand] = useState('');
  const [ownModel, setOwnModel] = useState('');
  const [ownColor, setOwnColor] = useState('');
  const [ownPlate, setOwnPlate] = useState('');
  const [plateError, setPlateError] = useState('');

  const [storagePricePerDay, setStoragePricePerDay] = useState(500);
  const [commissionRate, setCommissionRate] = useState(15);
  const [minDays, setMinDays] = useState(1);
  const [maxDays, setMaxDays] = useState(30);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');

  useEffect(() => {
    getStoragePricePerDay().then(setStoragePricePerDay);
    getAppSettings().then((s) => setCommissionRate(s.default_commission_rate));
    getRentalDayLimits().then(({ min, max }) => {
      setMinDays(min);
      setMaxDays(max);
    });
  }, []);

  useEffect(() => {
    if (!locationId) {
      setError('Парковка не указана');
      setLoading(false);
      return;
    }
    getLocationById(locationId)
      .then((found) => {
        if (!found?.has_storage) {
          setError('Парковка не найдена или не принимает авто на хранение');
          return;
        }
        setLocation(found);
      })
      .catch((err) => setError(getErrorMessage(err, 'Не удалось загрузить парковку')))
      .finally(() => setLoading(false));
  }, [locationId]);

  useEffect(() => {
    getCurrentUserProfile().then((profile) => {
      const car = profileToUserCar(profile);
      if (car?.brand && car.model) {
        setOwnBrand(car.brand);
        setOwnModel(car.model);
        setOwnColor(car.color || '');
        setOwnPlate(car.license_plate || '');
      } else {
        try {
          const raw = localStorage.getItem(PROFILE_CAR_KEY);
          if (raw) {
            const saved = JSON.parse(raw);
            setOwnBrand(saved.brand || '');
            setOwnModel(saved.model || '');
            setOwnColor(saved.color || '');
            setOwnPlate(saved.license_plate || '');
          }
        } catch {
          /* ignore */
        }
      }
    });
  }, []);

  const priceBreakdown = useMemo(() => {
    if (!startDate || !endDate) return null;
    return calculateStorageOnlyPrice(
      startDate,
      endDate,
      storagePricePerDay,
      commissionRate,
      promoDiscount,
    );
  }, [startDate, endDate, storagePricePerDay, commissionRate, promoDiscount]);

  const days = priceBreakdown?.totalStorageDays || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    if (!location) return;
    if (!startDate || !endDate) {
      setError('Укажите даты хранения');
      return;
    }
    if (!ownBrand.trim() || !ownModel.trim()) {
      setError('Укажите марку и модель автомобиля');
      return;
    }
    if (!ownPlate || ownPlate.trim().length < 5) {
      setPlateError('Укажите госномер автомобиля');
      return;
    }
    if (days < minDays || days > maxDays) {
      setError(`Срок хранения: от ${minDays} до ${maxDays} дней`);
      return;
    }

    setSubmitting(true);
    try {
      const booking = await createStandaloneStorageBooking({
        destination_id: location.destination_id,
        partner_id: location.partner_id,
        location_id: location.id,
        start_date: startDate,
        end_date: endDate,
        own_car_brand: ownBrand.trim(),
        own_car_model: ownModel.trim(),
        own_car_color: ownColor.trim() || undefined,
        own_car_license_plate: ownPlate.toUpperCase(),
        promo_code: promoDiscount > 0 ? promoCode.toUpperCase() : undefined,
      });
      void sendBookingNotification(booking.id, 'created');
      navigate(`/booking/success?id=${booking.id}&type=storage`);
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось оформить хранение'));
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

  if (error && !location) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={sharedStyles.errorMessage}>{error}</div>
          <Button variant="secondary" onClick={() => navigate('/search?mode=storage')}>
            К поиску парковок
          </Button>
        </div>
      </div>
    );
  }

  if (!location) return null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.carCard} style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div className={styles.carInfo}>
            <p style={{ margin: '0 0 8px', color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>Только хранение</p>
            <h1 className={styles.carName}>{location.name}</h1>
            <p className={styles.carSpec}>{location.address}</p>
            {location.partner?.name && <p className={styles.carSpec}>Партнёр: {location.partner.name}</p>}
          </div>
        </div>

        <div className={styles.carCard} style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div className={styles.carInfo}>
            <div className={styles.priceRow}>
              <span>Заезд</span>
              <strong>{formatDateDisplay(startDate)}</strong>
            </div>
            <div className={styles.priceRow}>
              <span>Выезд</span>
              <strong>{formatDateDisplay(endDate)}</strong>
            </div>
            <div className={styles.priceRow}>
              <span>Срок</span>
              <strong>{days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Ваш автомобиль</h3>
            <div className={styles.carFormGrid}>
              <Input label="Марка" value={ownBrand} onChange={(e) => setOwnBrand(e.target.value)} placeholder="Toyota" />
              <Input label="Модель" value={ownModel} onChange={(e) => setOwnModel(e.target.value)} placeholder="Camry" />
            </div>
            <div className={styles.carFormGrid}>
              <Input label="Цвет" value={ownColor} onChange={(e) => setOwnColor(e.target.value)} placeholder="Белый" />
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
                  if (!startDate || !endDate) return;
                  const base = calculateStorageOnlyPrice(startDate, endDate, storagePricePerDay, commissionRate);
                  const result = await validatePromoCode(promoCode, base.totalStoragePrice);
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

          {priceBreakdown && (
            <div className={styles.priceBreakdown}>
              <h3 className={styles.sectionTitle}>Стоимость хранения</h3>
              <div className={styles.priceRow}>
                <span>
                  Хранение: {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} × {storagePricePerDay.toLocaleString('ru-RU')} ₽
                </span>
                <span className={styles.priceRowValue}>
                  {priceBreakdown.totalStoragePrice.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              {promoDiscount > 0 && (
                <div className={styles.priceRow}>
                  <span>Промокод</span>
                  <span className={styles.priceRowValue}>−{promoDiscount.toLocaleString('ru-RU')} ₽</span>
                </div>
              )}
              <div className={styles.priceRow}>
                <span>Комиссия Прибой ({commissionRate}%)</span>
                <span className={styles.priceRowValue}>
                  {priceBreakdown.commissionPrice.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className={styles.priceTotal}>
                <span>ИТОГО</span>
                <span className={styles.priceTotalValue}>
                  {priceBreakdown.totalPrice.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          )}

          {error && <div className={sharedStyles.errorMessage}>{error}</div>}

          <div className={styles.formActions}>
            <Button type="submit" variant="primary" size="large" disabled={submitting} className={styles.submitButton}>
              {submitting ? 'Оформление...' : 'Забронировать хранение'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StandaloneStorageBooking;
