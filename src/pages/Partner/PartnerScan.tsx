import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getTravelBookingById, handoverPartnerBooking } from '../../lib/travel/api';
import { getErrorMessage } from '../../lib/apiError';
import { sendBookingNotification } from '../../lib/travel/notifications';
import { parseBookingIdFromQrText } from '../../lib/travel/qrCode';
import type { TravelBooking } from '../../lib/travel/types';
import { PartnerLayout } from './PartnerLayout';
import styles from './Partner.module.css';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает подтверждения',
  confirmed: 'Подтверждено',
  active: 'Авто выдано',
  completed: 'Завершено',
  cancelled: 'Отменено',
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачено',
  refunded: 'Возврат',
  partially_refunded: 'Частичный возврат',
};

export function PartnerScan() {
  const { partnerId } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [booking, setBooking] = useState<TravelBooking | null>(null);

  const handleLookup = async () => {
    const bookingId = parseBookingIdFromQrText(query);
    if (!bookingId) {
      setError('Введите ID бронирования или текст QR-кода');
      return;
    }
    if (!partnerId) {
      setError('Партнёр не привязан к аккаунту');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setBooking(null);

    try {
      const found = await getTravelBookingById(bookingId);
      if (!found) {
        setError('Бронирование не найдено');
        return;
      }
      if (found.partner_id !== partnerId) {
        setError('Это бронирование принадлежит другому партнёру');
        return;
      }
      setBooking(found);
    } catch (err) {
      setError(getErrorMessage(err, 'Ошибка поиска'));
    } finally {
      setLoading(false);
    }
  };

  const handleHandover = async () => {
    if (!booking || !partnerId) return;
    if (!confirm(`Выдать авто по брони ${booking.id.slice(0, 8)}… клиенту?`)) return;

    setHandoverLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await handoverPartnerBooking(booking.id, partnerId);
      setBooking(updated);
      setSuccess('Автомобиль успешно выдан. Статус: активно.');
      void sendBookingNotification(booking.id, 'handover');
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось выдать авто'));
    } finally {
      setHandoverLoading(false);
    }
  };

  const canHandover =
    booking &&
    booking.status === 'confirmed' &&
    booking.payment_status === 'paid';

  return (
    <PartnerLayout title="Проверка QR">
      <div className={styles.scanPage}>
        <p className={styles.scanHint}>
          Вставьте текст QR-кода или ID бронирования для проверки перед выдачей авто.
        </p>
        <textarea
          className={styles.scanInput}
          rows={6}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ID: ... или полный текст QR"
        />
        <button type="button" className={styles.scanBtn} onClick={handleLookup} disabled={loading}>
          {loading ? 'Поиск...' : 'Найти бронирование'}
        </button>
        {error && <p className={styles.scanError}>{error}</p>}
        {success && <p className={styles.scanSuccess}>{success}</p>}

        {booking && (
          <div className={styles.scanCard}>
            <h3 className={styles.scanCardTitle}>Бронирование #{booking.id.slice(0, 8)}</h3>
            <dl className={styles.scanDetails}>
              <div>
                <dt>Клиент</dt>
                <dd>{booking.client_name || booking.user_id.slice(0, 8)}</dd>
              </div>
              <div>
                <dt>Авто</dt>
                <dd>
                  {booking.car ? `${booking.car.brand} ${booking.car.model}` : '—'}
                  {booking.car?.license_plate ? ` (${booking.car.license_plate})` : ''}
                </dd>
              </div>
              <div>
                <dt>Направление</dt>
                <dd>{booking.destination?.name || '—'}</dd>
              </div>
              <div>
                <dt>Даты</dt>
                <dd>
                  {booking.start_date} — {booking.end_date}
                </dd>
              </div>
              <div>
                <dt>Статус</dt>
                <dd>{STATUS_LABELS[booking.status] || booking.status}</dd>
              </div>
              <div>
                <dt>Оплата</dt>
                <dd>{PAYMENT_LABELS[booking.payment_status] || booking.payment_status}</dd>
              </div>
              <div>
                <dt>Сумма</dt>
                <dd>{booking.total_price.toLocaleString('ru-RU')} ₽</dd>
              </div>
            </dl>

            {canHandover && (
              <button
                type="button"
                className={styles.scanHandoverBtn}
                onClick={handleHandover}
                disabled={handoverLoading}
              >
                {handoverLoading ? 'Выдача...' : 'Выдать авто'}
              </button>
            )}
            {booking.status === 'active' && (
              <p className={styles.scanActiveNote}>Автомобиль уже выдан клиенту.</p>
            )}
            {booking.payment_status !== 'paid' && booking.status !== 'cancelled' && (
              <p className={styles.scanWarn}>Оплата не получена — выдача недоступна.</p>
            )}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}

export default PartnerScan;
