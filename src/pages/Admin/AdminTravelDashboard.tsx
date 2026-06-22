import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import styles from './AdminTravel.module.css';
import { getAdminTravelStats } from '../../lib/travel/api';
import type { TravelBooking } from '../../lib/travel/types';

interface DashboardStats {
  totalBookings: number;
  activeTrips: number;
  totalRevenue: number;
  totalCommission: number;
}


const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждено',
  active: 'Активно',
  completed: 'Завершено',
  cancelled: 'Отменено',
};

const QUICK_LINKS = [
  { path: '/admin/destinations', label: 'Управление направлениями' },
  { path: '/admin/partners', label: 'Партнёры' },
  { path: '/admin/cars', label: 'Автомобили' },
  { path: '/admin/bookings', label: 'Бронирования' },
  { path: '/admin/storage', label: 'Хранение' },
];

export function AdminTravelDashboard() {
  const { hasAdminAccess } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalBookings: 0, activeTrips: 0, totalRevenue: 0, totalCommission: 0 });
  const [recentBookings, setRecentBookings] = useState<TravelBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminTravelStats().then((data) => {
      setStats({
        totalBookings: data.total_bookings,
        activeTrips: data.active_bookings,
        totalRevenue: data.total_revenue,
        totalCommission: data.total_commission,
      });
      setRecentBookings(data.recent_bookings);
      setLoading(false);
    });
  }, []);

  if (!hasAdminAccess) {
    return <Navigate to="/admin-login" />;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading">Загрузка...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.travelDashboard}>
        <div className={styles.travelPageHeader}>
          <h1>Прибой — Дашборд</h1>
        </div>

        {/* Stats Grid */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className={styles.travelStatIcon + ' ' + styles.travelStatIconBookings} />
            <div className="admin-stat-content">
              <span className="admin-stat-value">{stats.totalBookings}</span>
              <span className="admin-stat-label">Всего бронирований</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className={styles.travelStatIcon + ' ' + styles.travelStatIconActive} />
            <div className="admin-stat-content">
              <span className="admin-stat-value">{stats.activeTrips}</span>
              <span className="admin-stat-label">Активных поездок</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className={styles.travelStatIcon + ' ' + styles.travelStatIconRevenue} />
            <div className="admin-stat-content">
              <span className="admin-stat-value">{formatCurrency(stats.totalRevenue)}</span>
              <span className="admin-stat-label">Доход</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className={styles.travelStatIcon + ' ' + styles.travelStatIconCommission} />
            <div className="admin-stat-content">
              <span className="admin-stat-value">{formatCurrency(stats.totalCommission)}</span>
              <span className="admin-stat-label">Комиссия</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className={styles.travelQuickLinks}>
          {QUICK_LINKS.map((link) => (
            <div
              key={link.path}
              className={styles.travelQuickLink}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </div>
          ))}
        </div>

        {/* Recent Bookings */}
        <div className="admin-card">
          <h3>Последние бронирования</h3>
          {recentBookings.length === 0 ? (
            <p className="admin-empty">Нет бронирований</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Направление</th>
                    <th>Партнёр</th>
                    <th>Даты</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                    <th>Дата брони</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <span className="admin-id">{booking.id?.slice(0, 8)}</span>
                      </td>
                      <td>{(booking.destination as any)?.name || '-'}</td>
                      <td>{(booking.partner as any)?.name || '-'}</td>
                      <td>
                        <div className={styles.travelDatesCell}>
                          <span>{formatDate(booking.start_date)}</span>
                          <span className={styles.travelDatesSeparator}>—</span>
                          <span>{formatDate(booking.end_date)}</span>
                        </div>
                      </td>
                      <td className={styles.travelPriceCell}>
                        {formatCurrency(booking.total_price || 0)}
                      </td>
                      <td>
                        <span className={`${styles.travelBadge} ${styles['travelBadge' + (booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : '')]}`}>
                          {STATUS_LABELS[booking.status || ''] || booking.status}
                        </span>
                      </td>
                      <td className="parking-date">{formatDate(booking.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
