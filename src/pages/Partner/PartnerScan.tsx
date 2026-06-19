import { useState } from 'react';
import { getTravelBookingById } from '../../lib/travel/api';
import { getErrorMessage } from '../../lib/apiError';
import { PartnerLayout } from './PartnerLayout';
import styles from './Partner.module.css';

export function PartnerScan() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleLookup = async () => {
    const bookingId = query.trim().split('\n').find((line) => line.startsWith('ID: '))?.replace('ID: ', '').trim()
      || query.trim();
    if (!bookingId) {
      setError('Введите ID бронирования или текст QR-кода');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const booking = await getTravelBookingById(bookingId);
      if (!booking) {
        setError('Бронирование не найдено');
        return;
      }
      setResult(
        [
          `Клиент: ${booking.client_name || booking.user_id.slice(0, 8)}`,
          `Авто: ${booking.car?.brand || ''} ${booking.car?.model || ''}`.trim(),
          `Статус: ${booking.status}`,
          `Оплата: ${booking.payment_status}`,
          `Даты: ${booking.start_date} — ${booking.end_date}`,
          `Сумма: ${booking.total_price.toLocaleString('ru-RU')} ₽`,
        ].join('\n'),
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Ошибка поиска'));
    } finally {
      setLoading(false);
    }
  };

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
        {result && <pre className={styles.scanResult}>{result}</pre>}
      </div>
    </PartnerLayout>
  );
}

export default PartnerScan;
