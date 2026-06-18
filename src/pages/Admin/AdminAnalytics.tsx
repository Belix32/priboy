import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import styles from './AdminTravel.module.css';
import { getAdminAnalytics } from '../../lib/travel/api';
import type { AdminAnalyticsData } from '../../lib/travel/types';

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num);
}

// ============================================================================
// Mini Chart SVG Components
// ============================================================================

function BarChart({ data, height = 180, color = '#0ea5e9' }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(20, Math.min(40, (600 / data.length) - 8));

  return (
    <div className={styles.chartContainer}>
      <svg width="100%" height={height} viewBox={`0 0 ${data.length * (barWidth + 8) + 20} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const y = height - 20 - (height - 40) * f;
          return (
            <g key={i}>
              <line x1="0" y1={y} x2={data.length * (barWidth + 8) + 20} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x="0" y={y + 4} fill="#9ca3af" fontSize="10">
                {formatCurrency(max * f)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = 10 + i * (barWidth + 8);
          const barHeight = ((d.value / max) * (height - 40));
          const y = height - 20 - barHeight;
          return (
            <g key={i}>
              <rect
                x={x} y={y} width={barWidth} height={barHeight}
                rx="4" ry="4"
                fill={color}
                opacity="0.85"
              >
                <title>{d.label}: {formatCurrency(d.value)}</title>
              </rect>
              <text x={x + barWidth / 2} y={height - 4} fill="#6b7280" fontSize="10" textAnchor="middle">
                {d.label}
              </text>
              {/* Value on top */}
              <text x={x + barWidth / 2} y={y - 6} fill={color} fontSize="10" fontWeight="600" textAnchor="middle">
                {d.value >= 1000000 ? `${(d.value / 1000000).toFixed(1)}M` : d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}K` : d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({ segments, size = 180 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;
  const strokeWidth = size * 0.12;

  let cumulativePercent = 0;
  const arcs = segments.map((seg) => {
    const percent = seg.value / total;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;

    const startAngle = startPercent * 360 - 90;
    const endAngle = cumulativePercent * 360 - 90;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = percent > 0.5 ? 1 : 0;

    return {
      path: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      color: seg.color,
      label: seg.label,
      percent: Math.round(percent * 100),
      value: seg.value,
    };
  });

  return (
    <div className={styles.donutContainer}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((arc, i) => (
          <path key={i} d={arc.path} fill="none" stroke={arc.color} strokeWidth={strokeWidth} strokeLinecap="round" />
        ))}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="#1a1a2e" fontSize="24" fontWeight="700">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#6b7280" fontSize="11">
          всего
        </text>
      </svg>
      <div className={styles.donutLegend}>
        {segments.map((seg, i) => (
          <div key={i} className={styles.donutLegendItem}>
            <span className={styles.donutDot} style={{ background: seg.color }} />
            <span className={styles.donutLabel}>{seg.label}</span>
            <span className={styles.donutValue}>{Math.round((seg.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function AdminAnalytics() {
  const { hasAdminAccess } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'year' | 'half' | 'quarter'>('year');
  const [data, setData] = useState<AdminAnalyticsData | null>(null);

  if (!hasAdminAccess) {
    return <Navigate to="/admin-login" />;
  }

  useEffect(() => {
    getAdminAnalytics().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  const monthlyData = data?.monthly || [];

  const filteredData = useMemo(() => {
    if (timeRange === 'year') return monthlyData;
    if (timeRange === 'half') return monthlyData.slice(-6);
    return monthlyData.slice(-3);
  }, [timeRange, monthlyData]);

  const totalRevenue = data?.totals.revenue ?? 0;
  const totalBookings = data?.totals.bookings ?? 0;
  const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  const TOP_DESTINATIONS = data?.topDestinations || [];
  const TOP_PARTNERS = data?.topPartners || [];
  const FLEET_STATS = data?.fleet || { total: 0, available: 0, rented: 0, maintenance: 0, utilization: 0 };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading">Загрузка аналитики...</div>
      </AdminLayout>
    );
  }

  const bookingStatusData = [
    { label: 'Активные', value: 18, color: '#059669' },
    { label: 'Подтвержд.', value: 12, color: '#2563eb' },
    { label: 'Завершён.', value: 42, color: '#6b7280' },
    { label: 'Отменён.', value: 8, color: '#dc2626' },
  ];

  return (
    <AdminLayout>
      <div className={styles.travelDashboard}>
        <div className={styles.travelPageHeader}>
          <h1>Аналитика</h1>
          <div className={styles.analyticsTimeRange}>
            <button
              className={`${styles.analyticsTimeBtn} ${timeRange === 'year' ? styles.analyticsTimeBtnActive : ''}`}
              onClick={() => setTimeRange('year')}
            >
              Год
            </button>
            <button
              className={`${styles.analyticsTimeBtn} ${timeRange === 'half' ? styles.analyticsTimeBtnActive : ''}`}
              onClick={() => setTimeRange('half')}
            >
              6 мес
            </button>
            <button
              className={`${styles.analyticsTimeBtn} ${timeRange === 'quarter' ? styles.analyticsTimeBtnActive : ''}`}
              onClick={() => setTimeRange('quarter')}
            >
              Квартал
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{formatCurrency(totalRevenue)}</span>
              <span className="admin-stat-label">Общая выручка (2025)</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{formatNumber(totalBookings)}</span>
              <span className="admin-stat-label">Всего бронирований</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{formatCurrency(avgBookingValue)}</span>
              <span className="admin-stat-label">Средний чек</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{FLEET_STATS.utilization}%</span>
              <span className="admin-stat-label">Загрузка автопарка</span>
            </div>
          </div>
        </div>

        <div className={styles.analyticsGrid}>
          {/* Revenue Chart */}
          <div className={styles.analyticsCard}>
            <h3 className={styles.analyticsCardTitle}>Выручка по месяцам</h3>
            <BarChart
              data={filteredData.map((d) => ({ label: d.label, value: d.revenue }))}
              height={200}
              color="#0ea5e9"
            />
            <div className={styles.analyticsChartFooter}>
              <span>Всего: {formatCurrency(filteredData.reduce((s, d) => s + d.revenue, 0))}</span>
              <span>{filteredData.length} мес.</span>
            </div>
          </div>

          {/* Bookings by Status */}
          <div className={styles.analyticsCard}>
            <h3 className={styles.analyticsCardTitle}>Бронирования по статусам</h3>
            <DonutChart segments={bookingStatusData} size={180} />
          </div>
        </div>

        <div className={styles.analyticsGrid}>
          {/* Top Destinations */}
          <div className={styles.analyticsCard}>
            <h3 className={styles.analyticsCardTitle}>Популярные направления</h3>
            <div className={styles.analyticsList}>
              {TOP_DESTINATIONS.map((dest, i) => (
                <div key={dest.name} className={styles.analyticsListItem}>
                  <div className={styles.analyticsListRank}>#{i + 1}</div>
                  <div className={styles.analyticsListInfo}>
                    <span className={styles.analyticsListName}>{dest.name}</span>
                    <div className={styles.analyticsListBar}>
                      <div
                        className={styles.analyticsListBarFill}
                        style={{ width: `${dest.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className={styles.analyticsListStats}>
                    <span>{formatNumber(dest.bookings)} броней</span>
                    <span className={styles.analyticsListRevenue}>{formatCurrency(dest.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Partners */}
          <div className={styles.analyticsCard}>
            <h3 className={styles.analyticsCardTitle}>Эффективность партнёров</h3>
            <div className={styles.analyticsTable}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Партнёр</th>
                    <th>Брони</th>
                    <th>Выручка</th>
                    <th>Авто</th>
                    <th>Рейтинг</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_PARTNERS.map((p) => (
                    <tr key={p.name}>
                      <td className="parking-title">{p.name}</td>
                      <td>{p.bookings}</td>
                      <td className={styles.travelPriceCell}>{formatCurrency(p.revenue)}</td>
                      <td>{p.cars}</td>
                      <td>
                        <span className={styles.travelRating}>
                          {'★'.repeat(Math.round(p.rating))} {p.rating.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Fleet Stats */}
        <div className={styles.analyticsCard}>
          <h3 className={styles.analyticsCardTitle}>Состояние автопарка</h3>
          <div className={styles.fleetGrid}>
            <div className={styles.fleetStat}>
              <span className={styles.fleetStatValue}>{FLEET_STATS.total}</span>
              <span className={styles.fleetStatLabel}>Всего авто</span>
            </div>
            <div className={styles.fleetStat}>
              <span className={styles.fleetStatValue} style={{ color: '#059669' }}>{FLEET_STATS.available}</span>
              <span className={styles.fleetStatLabel}>Доступны</span>
            </div>
            <div className={styles.fleetStat}>
              <span className={styles.fleetStatValue} style={{ color: '#2563eb' }}>{FLEET_STATS.rented}</span>
              <span className={styles.fleetStatLabel}>В аренде</span>
            </div>
            <div className={styles.fleetStat}>
              <span className={styles.fleetStatValue} style={{ color: '#d97706' }}>{FLEET_STATS.maintenance}</span>
              <span className={styles.fleetStatLabel}>На обслуживании</span>
            </div>
            <div className={styles.fleetUtilization}>
              <div className={styles.fleetUtilBar}>
                <div className={styles.fleetUtilFill} style={{ width: `${FLEET_STATS.utilization}%` }} />
              </div>
              <div className={styles.fleetUtilInfo}>
                <span>Загрузка автопарка</span>
                <span className={styles.fleetUtilPercent}>{FLEET_STATS.utilization}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings by Month */}
        <div className={styles.analyticsCard}>
          <h3 className={styles.analyticsCardTitle}>Бронирования по месяцам</h3>
          <BarChart
            data={filteredData.map((d) => ({ label: d.label, value: d.bookings }))}
            height={160}
            color="#059669"
          />
          <div className={styles.analyticsChartFooter}>
            <span>Всего: {filteredData.reduce((s, d) => s + d.bookings, 0)} бронирований</span>
            <span>В среднем: {Math.round(filteredData.reduce((s, d) => s + d.bookings, 0) / filteredData.length)}/мес</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminAnalytics;
