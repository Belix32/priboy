import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPartnerStats, getPartnerBookings } from '../../lib/travel/api';
import type { TravelBooking } from '../../lib/travel/types';
import { PartnerLayout } from './PartnerLayout';
import styles from './Partner.module.css';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждено',
  active: 'Активно',
  completed: 'Завершено',
  cancelled: 'Отменено',
};

export function PartnerDashboard() {
  const navigate = useNavigate();
  const { partnerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalBookings: 0, activeBookings: 0, totalCars: 0, availableCars: 0, totalStorage: 0, activeStorage: 0, totalRevenue: 0 });
  const [bookings, setBookings] = useState<TravelBooking[]>([]);

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }
    Promise.all([getPartnerStats(partnerId), getPartnerBookings(partnerId)]).then(([statsData, bookingsData]) => {
      setStats(statsData);
      setBookings(bookingsData.slice(0, 5));
      setLoading(false);
    });
  }, [partnerId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      pending: styles.badgePending,
      confirmed: styles.badgeConfirmed,
      active: styles.badgeActive,
      completed: styles.badgeCompleted,
      cancelled: styles.badgeCancelled,
    };
    return map[status] || '';
  };

  if (loading) {
    return (
      <PartnerLayout>
        <div className={styles.loading}>Загрузка...</div>
      </PartnerLayout>
    );
  }

  return (
    <PartnerLayout title="Дашборд">
      <div>
        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📋</div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.totalBookings}</span>
              <span className={styles.statLabel}>Всего броней</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconOrange}`}>🚀</div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.activeBookings}</span>
              <span className={styles.statLabel}>Активные поездки</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}>🚗</div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>
                {stats.availableCars}/{stats.totalCars}
              </span>
              <span className={styles.statLabel}>Автомобили</span>
              <span className={styles.statSub}>{stats.availableCars} свободно</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconPurple}`}>💰</div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{formatCurrency(stats.totalRevenue)}</span>
              <span className={styles.statLabel}>Доход</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle} style={{ marginBottom: 20 }}>
            Быстрые действия
          </h3>
          <div className={styles.quickActionsGrid}>
            <button className={styles.quickAction} onClick={() => navigate('/partner/cars')}>
              <span className={styles.quickActionIcon}>🚗</span>
              Мои автомобили
            </button>
            <button className={styles.quickAction} onClick={() => navigate('/partner/bookings')}>
              <span className={styles.quickActionIcon}>📅</span>
              Бронирования
            </button>
            <button className={styles.quickAction} onClick={() => navigate('/partner/storage')}>
              <span className={styles.quickActionIcon}>🔒</span>
              Хранение
            </button>
            <button className={styles.quickAction} onClick={() => navigate('/travel')}>
              <span className={styles.quickActionIcon}>🌊</span>
              На сайт
            </button>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Последние бронирования</h3>
          </div>
          {bookings.length === 0 ? (
            <div className={styles.empty}>
              <h3>Нет бронирований</h3>
              <p>Бронирования пока не поступали.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Направление</th>
                    <th>Автомобиль</th>
                    <th>Даты</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <span className={styles.idCell}>{booking.id.slice(0, 8)}</span>
                      </td>
                      <td>{booking.destination?.name || '-'}</td>
                      <td>{booking.car ? `${booking.car.brand} ${booking.car.model}` : '-'}</td>
                      <td>{booking.start_date} — {booking.end_date}</td>
                      <td className={styles.priceCell}>{formatCurrency(booking.total_price)}</td>
                      <td>
                        <span className={`${styles.badge} ${getStatusClass(booking.status)}`}>
                          {STATUS_LABELS[booking.status] || booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PartnerLayout>
  );
}
