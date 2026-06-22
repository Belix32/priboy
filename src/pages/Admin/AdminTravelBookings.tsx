import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import { TravelModal, ModalButtons } from './components/TravelModal';
import modalStyles from './components/TravelModal.module.css';
import styles from './AdminTravel.module.css';
import type { TravelBooking, TravelDestination } from '../../lib/travel/types';
import { getAllTravelBookingsAdmin, getAllDestinationsAdmin, updateTravelBookingStatus, updateTravelBookingPaymentStatus, cancelTravelBooking } from '../../lib/travel/api';





const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'pending', label: 'Ожидает' },
  { value: 'confirmed', label: 'Подтверждено' },
  { value: 'active', label: 'Активно' },
  { value: 'completed', label: 'Завершено' },
  { value: 'cancelled', label: 'Отменено' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Все статусы оплаты' },
  { value: 'pending', label: 'Ожидает' },
  { value: 'paid', label: 'Оплачено' },
  { value: 'refunded', label: 'Возврат' },
  { value: 'partially_refunded', label: 'Частичный возврат' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждено',
  active: 'Активно',
  completed: 'Завершено',
  cancelled: 'Отменено',
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  paid: 'Оплачено',
  refunded: 'Возврат',
  partially_refunded: 'Частичный возврат',
};

const ITEMS_PER_PAGE = 20;

export function AdminTravelBookings() {
  const { hasAdminAccess } = useAuth();
  const navigate = useNavigate();

  const [actionError, setActionError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<TravelBooking[]>([]);
  const [allDestinations, setAllDestinations] = useState<TravelDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<TravelBooking | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editStatusBooking, setEditStatusBooking] = useState<TravelBooking | null>(null);
  const [editStatusValue, setEditStatusValue] = useState<string>('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  if (!hasAdminAccess) {
    return <Navigate to="/admin-login" />;
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([getAllTravelBookingsAdmin(), getAllDestinationsAdmin()]).then(([bookingsData, destData]) => {
      setBookings(bookingsData);
      setAllDestinations(destData);
      setLoading(false);
    });
  }, []);

  const getDestinationName = (booking: TravelBooking) => {
    return booking.destination?.name || allDestinations.find((d) => d.id === booking.destination_id)?.name || '-';
  };

  const getPartnerName = (booking: TravelBooking) => {
    return booking.partner?.name || '-';
  };

  const getCarDisplay = (booking: TravelBooking) => {
    if (booking.car) return `${booking.car.brand} ${booking.car.model}`;
    return '-';
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const destinationName = getDestinationName(b).toLowerCase();
        const partnerName = getPartnerName(b).toLowerCase();
        const carDisplay = getCarDisplay(b).toLowerCase();
        if (
          !b.id.toLowerCase().includes(q) &&
          !destinationName.includes(q) &&
          !partnerName.includes(q) &&
          !carDisplay.includes(q)
        ) {
          return false;
        }
      }
      if (statusFilter && b.status !== statusFilter) return false;
      if (paymentFilter && b.payment_status !== paymentFilter) return false;
      if (destinationFilter && b.destination_id !== destinationFilter) return false;
      if (dateFrom && new Date(b.start_date).getTime() < new Date(dateFrom).getTime()) return false;
      if (dateTo && new Date(b.end_date).getTime() > new Date(dateTo).getTime()) return false;
      return true;
    });
  }, [bookings, searchQuery, statusFilter, paymentFilter, destinationFilter, dateFrom, dateTo]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, paymentFilter, destinationFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      active: bookings.filter((b) => b.status === 'active' || b.status === 'confirmed').length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      revenue: bookings
        .filter((b) => b.payment_status === 'paid')
        .reduce((sum, b) => sum + (b.total_price || 0), 0),
    };
  }, [bookings]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setSavingId(bookingId);
    setActionError(null);
    try {
      await updateTravelBookingStatus(bookingId, newStatus as TravelBooking['status']);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: newStatus as TravelBooking['status'] } : b
        )
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingId(null);
    }
  };

  const handlePaymentStatusChange = async (bookingId: string, newPaymentStatus: string) => {
    setSavingId(bookingId);
    setActionError(null);
    try {
      await updateTravelBookingPaymentStatus(bookingId, newPaymentStatus as TravelBooking['payment_status']);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, payment_status: newPaymentStatus as TravelBooking['payment_status'] } : b
        )
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingId(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Вы уверены, что хотите отменить бронирование?')) return;
    setSavingId(bookingId);
    setActionError(null);
    try {
      await cancelTravelBooking(bookingId);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
        )
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ошибка отмены');
    } finally {
      setSavingId(null);
    }
  };

  const handleRefund = async (bookingId: string) => {
    if (!confirm('Вы уверены, что хотите сделать возврат?')) return;
    setSavingId(bookingId);
    setActionError(null);
    try {
      await updateTravelBookingPaymentStatus(bookingId, 'refunded');
      await cancelTravelBooking(bookingId);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, payment_status: 'refunded' as const, status: 'cancelled' as const } : b
        )
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ошибка возврата');
    } finally {
      setSavingId(null);
    }
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
      <div className="admin-bookings">
        {actionError && (
          <div className="admin-card admin-error-banner">{actionError}</div>
        )}
        {/* Stats */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{stats.total}</span>
              <span className="admin-stat-label">Всего бронирований</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{stats.active}</span>
              <span className="admin-stat-label">Активных сейчас</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{stats.completed}</span>
              <span className="admin-stat-label">Завершено</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{stats.cancelled}</span>
              <span className="admin-stat-label">Отменено</span>
            </div>
          </div>
        </div>

        {/* Revenue stat row */}
        <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{formatCurrency(stats.revenue)}</span>
              <span className="admin-stat-label">Общая выручка</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-card" style={{ marginBottom: 24 }}>
          <div className="admin-filters">
            <div className="admin-filters-row">
              <div className="admin-filter-group">
                <label>Поиск</label>
                <input
                  type="text"
                  placeholder="ID, направление, партнёр..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="admin-filter-group">
                <label>Статус</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="admin-filter-group">
                <label>Оплата</label>
                <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                  {PAYMENT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="admin-filter-group">
                <label>Направление</label>
                <select value={destinationFilter} onChange={(e) => setDestinationFilter(e.target.value)}>
                  <option value="">Все направления</option>
                  {allDestinations.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="admin-filter-group">
                <label>С</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>

              <div className="admin-filter-group">
                <label>По</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>

              <button
                className="admin-filter-reset"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('');
                  setPaymentFilter('');
                  setDestinationFilter('');
                  setDateFrom('');
                  setDateTo('');
                  setCurrentPage(1);
                }}
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="admin-card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Направление</th>
                  <th>Партнёр</th>
                  <th>Авто</th>
                  <th>Даты</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th>Оплата</th>
                  <th>Дата брони</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="admin-empty" style={{ textAlign: 'center' }}>Нет бронирований</td>
                  </tr>
                ) : (
                  paginatedBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="admin-id-cell">
                        <span className="admin-id">{booking.id.slice(0, 8)}</span>
                      </td>
                      <td>{getDestinationName(booking)}</td>
                      <td>{getPartnerName(booking)}</td>
                      <td>{getCarDisplay(booking)}</td>
                      <td>
                        <div className={styles.travelDatesCell}>
                          <span>{formatDate(booking.start_date)}</span>
                          <span className={styles.travelDatesSeparator}>—</span>
                          <span>{formatDate(booking.end_date)}</span>
                        </div>
                      </td>
                      <td className={styles.travelPriceCell}>{formatCurrency(booking.total_price || 0)}</td>
                      <td>
                        <span className={`${styles.travelBadge} ${styles['travelBadge' + booking.status.charAt(0).toUpperCase() + booking.status.slice(1)]}`}>
                          {STATUS_LABELS[booking.status]}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.travelPaymentBadge} ${styles['travelPaymentBadge' + booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)]}`}>
                          {PAYMENT_LABELS[booking.payment_status]}
                        </span>
                      </td>
                      <td className="parking-date">{formatDateTime(booking.created_at)}</td>
                      <td>
                        <div className="admin-actions-cell">
                          <button
                            className="admin-action-btn admin-action-view"
                            onClick={() => { setSelectedBooking(booking); setShowModal(true); }}
                            title="Подробнее"
                          >
                            Детали
                          </button>
                          <button
                            className="admin-action-btn admin-action-view"
                            onClick={() => { setEditStatusBooking(booking); setEditStatusValue(booking.status); }}
                            title="Изменить статус"
                          >
                            Статус
                          </button>
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <button
                              className="admin-action-btn admin-action-cancel"
                              onClick={() => handleCancelBooking(booking.id)}
                              title="Отменить"
                            >
                              Отмена
                            </button>
                          )}
                          {booking.payment_status === 'paid' && (booking.status === 'cancelled' || booking.status === 'completed') && (
                            <button
                              className="admin-action-btn admin-action-refund"
                              onClick={() => handleRefund(booking.id)}
                              title="Вернуть"
                            >
                              Возврат
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                className="admin-pagination-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Назад
              </button>
              <span className="admin-pagination-info">
                Страница {currentPage} из {totalPages} ({filteredBookings.length} записей)
              </span>
              <button
                className="admin-pagination-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Вперёд →
              </button>
            </div>
          )}
        </div>

        {/* View Booking Details Modal */}
        <TravelModal
          isOpen={showModal && !!selectedBooking}
          onClose={() => setShowModal(false)}
          title="Детали бронирования"
          subtitle={`ID: ${selectedBooking?.id || ''}`}
          icon="📋"
          size="wide"
          footer={
            <div style={{ display: 'flex', gap: 12 }}>
              {ModalButtons.close(() => setShowModal(false))}
            </div>
          }
        >
          {selectedBooking && (
            <div className={modalStyles.detailGrid}>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>ID бронирования</span>
                <span className={modalStyles.detailValue}>{selectedBooking.id}</span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Направление</span>
                <span className={modalStyles.detailValue}>{getDestinationName(selectedBooking)}</span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Партнёр</span>
                <span className={modalStyles.detailValue}>{getPartnerName(selectedBooking)}</span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Автомобиль</span>
                <span className={modalStyles.detailValue}>{getCarDisplay(selectedBooking)}</span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Дата заезда</span>
                <span className={modalStyles.detailValue}>{formatDateTime(selectedBooking.start_date)}</span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Дата выезда</span>
                <span className={modalStyles.detailValue}>{formatDateTime(selectedBooking.end_date)}</span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Дней аренды</span>
                <span className={modalStyles.detailValue}>{selectedBooking.total_rental_days}</span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Цена аренды</span>
                <span className={`${modalStyles.detailValue} ${modalStyles.detailValueHighlight}`}>{formatCurrency(selectedBooking.total_rental_price)}</span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Хранение авто</span>
                <span className={modalStyles.detailValue}>
                  {selectedBooking.has_storage ? `Да (${selectedBooking.total_storage_days} дн.)` : 'Нет'}
                </span>
              </div>
              {selectedBooking.has_storage && (
                <>
                  <div className={modalStyles.detailItem}>
                    <span className={modalStyles.detailLabel}>Своё авто</span>
                    <span className={modalStyles.detailValue}>
                      {[selectedBooking.own_car_brand, selectedBooking.own_car_model].filter(Boolean).join(' ') || '-'}
                    </span>
                  </div>
                  <div className={modalStyles.detailItem}>
                    <span className={modalStyles.detailLabel}>Госномер</span>
                    <span className={modalStyles.detailValue}>{selectedBooking.own_car_license_plate || '-'}</span>
                  </div>
                  <div className={modalStyles.detailItem}>
                    <span className={modalStyles.detailLabel}>Цвет</span>
                    <span className={modalStyles.detailValue}>{selectedBooking.own_car_color || '-'}</span>
                  </div>
                </>
              )}
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Статус</span>
                <span className={`${modalStyles.badge} ${modalStyles['badge' + selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)]}`}>
                  {STATUS_LABELS[selectedBooking.status]}
                </span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Статус оплаты</span>
                <span className={`${modalStyles.badge} ${
                  selectedBooking.payment_status === 'paid' ? modalStyles.badgePaid :
                  selectedBooking.payment_status === 'refunded' ? modalStyles.badgeRefunded :
                  modalStyles.badgePending
                }`}>
                  {PAYMENT_LABELS[selectedBooking.payment_status]}
                </span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Общая сумма</span>
                <span className={modalStyles.priceValue}>{formatCurrency(selectedBooking.total_price || 0)}</span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Комиссия</span>
                <span className={modalStyles.detailValue}>{formatCurrency(selectedBooking.commission_price)}</span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Метод оплаты</span>
                <span className={modalStyles.detailValue}>{selectedBooking.payment_method || '-'}</span>
              </div>
              <div className={`${modalStyles.detailItem} ${modalStyles.detailItemFull}`}>
                <span className={modalStyles.detailLabel}>Примечания</span>
                <span className={modalStyles.detailValue}>{selectedBooking.notes || '-'}</span>
              </div>
              <div className={modalStyles.detailItem}>
                <span className={modalStyles.detailLabel}>Дата создания</span>
                <span className={modalStyles.detailValue}>{formatDateTime(selectedBooking.created_at)}</span>
              </div>
            </div>
          )}
        </TravelModal>

        {/* Edit Status Modal */}
        <TravelModal
          isOpen={!!editStatusBooking}
          onClose={() => setEditStatusBooking(null)}
          title="Изменение статуса"
          subtitle={editStatusBooking ? `Бронирование #${editStatusBooking.id.slice(0, 8)}` : ''}
          icon="🔄"
          size="default"
          footer={
            <div style={{ display: 'flex', gap: 12 }}>
              {ModalButtons.cancel(() => setEditStatusBooking(null))}
              {ModalButtons.save(
                () => {
                  if (editStatusBooking) {
                    handleStatusChange(editStatusBooking.id, editStatusValue);
                    setEditStatusBooking(null);
                  }
                },
                false,
                'Изменить статус'
              )}
            </div>
          }
        >
          {editStatusBooking && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className={modalStyles.detailGrid}>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Текущий статус</span>
                  <span className={`${modalStyles.badge} ${modalStyles['badge' + editStatusBooking.status.charAt(0).toUpperCase() + editStatusBooking.status.slice(1)]}`}>
                    {STATUS_LABELS[editStatusBooking.status]}
                  </span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Оплата</span>
                  <span className={`${modalStyles.badge} ${
                    editStatusBooking.payment_status === 'paid' ? modalStyles.badgePaid :
                    editStatusBooking.payment_status === 'refunded' ? modalStyles.badgeRefunded :
                    modalStyles.badgePending
                  }`}>
                    {PAYMENT_LABELS[editStatusBooking.payment_status]}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className={modalStyles.formLabel}>Новый статус</label>
                <select
                  className={modalStyles.statusSelect}
                  value={editStatusValue}
                  onChange={(e) => setEditStatusValue(e.target.value)}
                >
                  <option value="pending">Ожидает</option>
                  <option value="confirmed">Подтверждено</option>
                  <option value="active">Активно</option>
                  <option value="completed">Завершено</option>
                  <option value="cancelled">Отменено</option>
                </select>
              </div>
            </div>
          )}
        </TravelModal>
      </div>
    </AdminLayout>
  );
}
