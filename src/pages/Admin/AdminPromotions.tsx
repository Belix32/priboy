import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import { TravelModal, ModalButtons } from './components/TravelModal';
import modalStyles from './components/TravelModal.module.css';
import styles from './AdminTravel.module.css';

// ============================================================================
// Types
// ============================================================================

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number;
  used_count: number;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  description: string;
  created_at: string;
}

interface SeasonalDiscount {
  id: string;
  name: string;
  season: string;
  discount_percent: number;
  date_from: string;
  date_to: string;
  destinations: string[];
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// Mock data
// ============================================================================

const PROMOS_KEY = 'priboi_admin_promos';

const MOCK_PROMOS: PromoCode[] = [
  {
    id: 'pr1', code: 'MORE2025', discount_type: 'percent', discount_value: 10,
    min_order_amount: 5000, max_uses: 100, used_count: 23,
    valid_from: '2025-06-01', valid_to: '2025-08-31',
    is_active: true, description: 'Скидка 10% на летний сезон', created_at: '2025-05-15',
  },
  {
    id: 'pr2', code: 'FIRSTTRIP', discount_type: 'percent', discount_value: 15,
    min_order_amount: 3000, max_uses: 50, used_count: 12,
    valid_from: '2025-01-01', valid_to: '2025-12-31',
    is_active: true, description: 'Скидка 15% для новых клиентов', created_at: '2025-01-01',
  },
  {
    id: 'pr3', code: 'SOCHI2000', discount_type: 'fixed', discount_value: 2000,
    min_order_amount: 10000, max_uses: 30, used_count: 5,
    valid_from: '2025-07-01', valid_to: '2025-09-30',
    is_active: true, description: '2000 ₽ на аренду в Сочи', created_at: '2025-06-01',
  },
  {
    id: 'pr4', code: 'WELCOME', discount_type: 'percent', discount_value: 5,
    min_order_amount: 0, max_uses: 200, used_count: 45,
    valid_from: '2025-01-01', valid_to: '2025-12-31',
    is_active: false, description: 'Приветственная скидка 5%', created_at: '2025-01-10',
  },
  {
    id: 'pr5', code: 'LONGTRIP', discount_type: 'percent', discount_value: 20,
    min_order_amount: 20000, max_uses: 20, used_count: 3,
    valid_from: '2025-06-15', valid_to: '2025-09-15',
    is_active: true, description: '20% на аренду от 7 дней', created_at: '2025-06-10',
  },
];

const MOCK_SEASONS: SeasonalDiscount[] = [
  {
    id: 's1', name: 'Высокий сезон', season: 'Лето',
    discount_percent: 0, date_from: '2025-06-01', date_to: '2025-08-31',
    destinations: ['d1', 'd2', 'd3'], is_active: true, created_at: '2025-01-15',
  },
  {
    id: 's2', name: 'Бархатный сезон', season: 'Осень',
    discount_percent: 15, date_from: '2025-09-01', date_to: '2025-10-15',
    destinations: ['d1', 'd3'], is_active: true, created_at: '2025-02-01',
  },
  {
    id: 's3', name: 'Низкий сезон', season: 'Зима',
    discount_percent: 25, date_from: '2025-11-01', date_to: '2026-03-31',
    destinations: ['d1', 'd2', 'd3', 'd4'], is_active: true, created_at: '2025-03-01',
  },
  {
    id: 's4', name: 'Весенние скидки', season: 'Весна',
    discount_percent: 10, date_from: '2026-03-01', date_to: '2026-05-31',
    destinations: ['d1', 'd2'], is_active: false, created_at: '2025-04-01',
  },
];

const DESTINATION_NAMES: Record<string, string> = {
  d1: 'Сочи', d2: 'Анапа', d3: 'Геленджик', d4: 'Новороссийск',
};

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ============================================================================
// Component
// ============================================================================

export function AdminPromotions() {
  const { hasAdminAccess } = useAuth();

  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [seasons, setSeasons] = useState<SeasonalDiscount[]>([]);
  const [activeTab, setActiveTab] = useState<'promos' | 'seasons'>('promos');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Promo modals
  const [editPromo, setEditPromo] = useState<PromoCode | null>(null);
  const [addPromoOpen, setAddPromoOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: '', discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: 10, min_order_amount: 0, max_uses: 100,
    valid_from: '', valid_to: '', description: '', is_active: true,
  });

  // Season modals
  const [editSeason, setEditSeason] = useState<SeasonalDiscount | null>(null);
  const [addSeasonOpen, setAddSeasonOpen] = useState(false);
  const [seasonForm, setSeasonForm] = useState({
    name: '', discount_percent: 0,
    date_from: '', date_to: '',
    destinations: [] as string[], is_active: true,
  });

  if (!hasAdminAccess) {
    return <Navigate to="/admin-login" />;
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setPromos(MOCK_PROMOS);
      setSeasons(MOCK_SEASONS);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const filteredPromos = useMemo(() => {
    if (!searchQuery) return promos;
    const q = searchQuery.toLowerCase();
    return promos.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [promos, searchQuery]);

  const promoStats = useMemo(() => {
    const active = promos.filter((p) => p.is_active).length;
    const totalUses = promos.reduce((sum, p) => sum + p.used_count, 0);
    const activeSeasons = seasons.filter((s) => s.is_active).length;
    return { total: promos.length, active, totalUses, activeSeasons };
  }, [promos, seasons]);

  const handleTogglePromo = (id: string) => {
    setPromos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
  };

  const handleDeletePromo = (id: string) => {
    setPromos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddPromo = () => {
    const newPromo: PromoCode = {
      id: generateId(),
      code: promoForm.code,
      discount_type: promoForm.discount_type,
      discount_value: promoForm.discount_value,
      min_order_amount: promoForm.min_order_amount,
      max_uses: promoForm.max_uses,
      used_count: 0,
      valid_from: promoForm.valid_from,
      valid_to: promoForm.valid_to,
      is_active: promoForm.is_active,
      description: promoForm.description,
      created_at: new Date().toISOString().split('T')[0],
    };
    setPromos((prev) => [newPromo, ...prev]);
    setAddPromoOpen(false);
    setPromoForm({ code: '', discount_type: 'percent', discount_value: 10, min_order_amount: 0, max_uses: 100, valid_from: '', valid_to: '', description: '', is_active: true });
  };

  const handleToggleSeason = (id: string) => {
    setSeasons((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s))
    );
  };

  const handleDeleteSeason = (id: string) => {
    setSeasons((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddSeason = () => {
    const seasonName = seasonForm.name;
    const seasonNames: Record<string, string> = {
      '06': 'Лето', '07': 'Лето', '08': 'Лето',
      '09': 'Осень', '10': 'Осень', '11': 'Осень',
      '12': 'Зима', '01': 'Зима', '02': 'Зима',
      '03': 'Весна', '04': 'Весна', '05': 'Весна',
    };
    const month = seasonForm.date_from?.split('-')[1] || '06';
    const newSeason: SeasonalDiscount = {
      id: generateId(),
      name: seasonForm.name,
      season: seasonNames[month] || 'Лето',
      discount_percent: seasonForm.discount_percent,
      date_from: seasonForm.date_from,
      date_to: seasonForm.date_to,
      destinations: seasonForm.destinations,
      is_active: seasonForm.is_active,
      created_at: new Date().toISOString().split('T')[0],
    };
    setSeasons((prev) => [...prev, newSeason]);
    setAddSeasonOpen(false);
    setSeasonForm({ name: '', discount_percent: 0, date_from: '', date_to: '', destinations: [], is_active: true });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading">Загрузка акций...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.travelDashboard}>
        <div className={styles.travelPageHeader}>
          <h1>Акции и скидки</h1>
        </div>

        {/* Stats */}
        <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{promoStats.total}</span>
              <span className="admin-stat-label">Промокодов</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{promoStats.active}</span>
              <span className="admin-stat-label">Активных</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{promoStats.totalUses}</span>
              <span className="admin-stat-label">Всего использований</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{promoStats.activeSeasons}</span>
              <span className="admin-stat-label">Сезонных акций</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.settingsTabs}>
          <button
            className={`${styles.settingsTab} ${activeTab === 'promos' ? styles.settingsTabActive : ''}`}
            onClick={() => setActiveTab('promos')}
          >
            🏷️ Промокоды
          </button>
          <button
            className={`${styles.settingsTab} ${activeTab === 'seasons' ? styles.settingsTabActive : ''}`}
            onClick={() => setActiveTab('seasons')}
          >
            📅 Сезонные скидки
          </button>
        </div>

        {/* === PROMOS TAB === */}
        {activeTab === 'promos' && (
          <div>
            <div className="admin-page-header" style={{ marginBottom: 16 }}>
              <div className="admin-search" style={{ flex: 1, maxWidth: 400 }}>
                <input
                  type="text"
                  placeholder="Поиск по коду или описанию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-search-input"
                />
              </div>
              <button
                className="admin-add-btn"
                onClick={() => setAddPromoOpen(true)}
              >
                + Создать промокод
              </button>
            </div>

            <div className="admin-card">
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Код</th>
                      <th>Скидка</th>
                      <th>Мин. заказ</th>
                      <th>Использовано</th>
                      <th>Действует</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPromos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="admin-empty" style={{ textAlign: 'center' }}>Промокоды не найдены</td>
                      </tr>
                    ) : (
                      filteredPromos.map((promo) => (
                        <tr key={promo.id}>
                          <td>
                            <span className={styles.promoCode}>{promo.code}</span>
                          </td>
                          <td className={styles.promoDiscountCell}>
                            {promo.discount_type === 'percent'
                              ? `${promo.discount_value}%`
                              : `${promo.discount_value.toLocaleString('ru-RU')} ₽`}
                          </td>
                          <td>{promo.min_order_amount > 0 ? `${promo.min_order_amount.toLocaleString('ru-RU')} ₽` : 'Нет'}</td>
                          <td>
                            <div className={styles.promoUsageBar}>
                              <div
                                className={styles.promoUsageFill}
                                style={{
                                  width: `${Math.min(100, (promo.used_count / promo.max_uses) * 100)}%`,
                                }}
                              />
                              <span>{promo.used_count}/{promo.max_uses}</span>
                            </div>
                          </td>
                          <td className="parking-date">
                            {formatDate(promo.valid_from)} — {formatDate(promo.valid_to)}
                          </td>
                          <td>
                            <span className={`status-badge ${promo.is_active ? 'status-active' : 'status-inactive'}`}>
                              {promo.is_active ? 'Активен' : 'Неактивен'}
                            </span>
                          </td>
                          <td>
                            <div className={styles.travelActions}>
                              <button
                                className={`${styles.travelActionBtn} ${promo.is_active ? styles.travelActionBtnDanger : styles.travelActionBtnSuccess}`}
                                onClick={() => handleTogglePromo(promo.id)}
                              >
                                {promo.is_active ? 'Выкл.' : 'Вкл.'}
                              </button>
                              <button
                                className={`${styles.travelActionBtn} ${styles.travelActionBtnDanger}`}
                                onClick={() => handleDeletePromo(promo.id)}
                              >
                                Удалить
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* === SEASONS TAB === */}
        {activeTab === 'seasons' && (
          <div>
            <div className="admin-page-header" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 600 }}>Сезонные скидки</h3>
              <button className="admin-add-btn" onClick={() => setAddSeasonOpen(true)}>
                + Добавить сезон
              </button>
            </div>

            <div className={styles.seasonsGrid}>
              {seasons.length === 0 ? (
                <div className="admin-empty">
                  <p>Сезонные скидки не настроены</p>
                </div>
              ) : (
                seasons.map((season) => (
                  <div key={season.id} className={`${styles.seasonCard} ${!season.is_active ? styles.seasonCardInactive : ''}`}>
                    <div className={styles.seasonCardHeader}>
                      <span className={styles.seasonCardName}>{season.name}</span>
                      <span className={styles.seasonBadge}>{season.season}</span>
                    </div>
                    {season.discount_percent > 0 ? (
                      <div className={styles.seasonDiscount}>
                        <span className={styles.seasonDiscountValue}>−{season.discount_percent}%</span>
                        <span className={styles.seasonDiscountLabel}>скидка</span>
                      </div>
                    ) : (
                      <div className={styles.seasonDiscount}>
                        <span className={styles.seasonDiscountValue}>Базовая</span>
                        <span className={styles.seasonDiscountLabel}>цена сезона</span>
                      </div>
                    )}
                    <div className={styles.seasonDates}>
                      📅 {formatDate(season.date_from)} — {formatDate(season.date_to)}
                    </div>
                    <div className={styles.seasonDestinations}>
                      {season.destinations.map((d) => (
                        <span key={d} className={styles.seasonDestBadge}>
                          {DESTINATION_NAMES[d] || d}
                        </span>
                      ))}
                    </div>
                    <div className={styles.seasonCardActions}>
                      <span className={`status-badge ${season.is_active ? 'status-active' : 'status-inactive'}`}>
                        {season.is_active ? 'Активно' : 'Неактивно'}
                      </span>
                      <div className={styles.travelActions}>
                        <button
                          className={`${styles.travelActionBtn} ${!season.is_active ? styles.travelActionBtnSuccess : styles.travelActionBtnDanger}`}
                          onClick={() => handleToggleSeason(season.id)}
                        >
                          {season.is_active ? 'Выкл.' : 'Вкл.'}
                        </button>
                        <button
                          className={`${styles.travelActionBtn} ${styles.travelActionBtnDanger}`}
                          onClick={() => handleDeleteSeason(season.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Add Promo Modal */}
        <TravelModal
          isOpen={addPromoOpen}
          onClose={() => setAddPromoOpen(false)}
          title="Создать промокод"
          subtitle="Новый код для скидки"
          icon="🏷️"
          size="wide"
          footer={
            <div style={{ display: 'flex', gap: 12 }}>
              {ModalButtons.cancel(() => setAddPromoOpen(false))}
              {ModalButtons.add(handleAddPromo, !promoForm.code)}
            </div>
          }
        >
          <div className={modalStyles.formGrid}>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Код <span className={modalStyles.formRequired}>*</span></label>
              <input
                className={modalStyles.formInput}
                type="text"
                value={promoForm.code}
                onChange={(e) => setPromoForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER2025"
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Тип скидки</label>
              <select
                className={modalStyles.formSelect}
                value={promoForm.discount_type}
                onChange={(e) => setPromoForm((p) => ({ ...p, discount_type: e.target.value as 'percent' | 'fixed' }))}
              >
                <option value="percent">Процент (%)</option>
                <option value="fixed">Фиксированная (₽)</option>
              </select>
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>
                {promoForm.discount_type === 'percent' ? 'Процент скидки' : 'Сумма скидки (₽)'}
              </label>
              <input
                className={modalStyles.formInput}
                type="number"
                value={promoForm.discount_value}
                onChange={(e) => setPromoForm((p) => ({ ...p, discount_value: Number(e.target.value) }))}
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Мин. сумма заказа (₽)</label>
              <input
                className={modalStyles.formInput}
                type="number"
                value={promoForm.min_order_amount}
                onChange={(e) => setPromoForm((p) => ({ ...p, min_order_amount: Number(e.target.value) }))}
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Макс. использований</label>
              <input
                className={modalStyles.formInput}
                type="number"
                value={promoForm.max_uses}
                onChange={(e) => setPromoForm((p) => ({ ...p, max_uses: Number(e.target.value) }))}
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Активен</label>
              <label className={modalStyles.formCheckbox}>
                <input
                  type="checkbox"
                  checked={promoForm.is_active}
                  onChange={(e) => setPromoForm((p) => ({ ...p, is_active: e.target.checked }))}
                />
                <span className={modalStyles.formCheckboxLabel}>Да</span>
              </label>
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Действует с</label>
              <input
                className={modalStyles.formInput}
                type="date"
                value={promoForm.valid_from}
                onChange={(e) => setPromoForm((p) => ({ ...p, valid_from: e.target.value }))}
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Действует по</label>
              <input
                className={modalStyles.formInput}
                type="date"
                value={promoForm.valid_to}
                onChange={(e) => setPromoForm((p) => ({ ...p, valid_to: e.target.value }))}
              />
            </div>
            <div className={`${modalStyles.formGroup} ${modalStyles.formGroupFull}`}>
              <label className={modalStyles.formLabel}>Описание</label>
              <input
                className={modalStyles.formInput}
                type="text"
                value={promoForm.description}
                onChange={(e) => setPromoForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Для каких целей промокод"
              />
            </div>
          </div>
        </TravelModal>

        {/* Add Season Modal */}
        <TravelModal
          isOpen={addSeasonOpen}
          onClose={() => setAddSeasonOpen(false)}
          title="Добавить сезон"
          subtitle="Настройка сезонных цен и скидок"
          icon="📅"
          size="wide"
          footer={
            <div style={{ display: 'flex', gap: 12 }}>
              {ModalButtons.cancel(() => setAddSeasonOpen(false))}
              {ModalButtons.add(handleAddSeason, !seasonForm.name || !seasonForm.date_from || !seasonForm.date_to)}
            </div>
          }
        >
          <div className={modalStyles.formGrid}>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Название <span className={modalStyles.formRequired}>*</span></label>
              <input
                className={modalStyles.formInput}
                type="text"
                value={seasonForm.name}
                onChange={(e) => setSeasonForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Высокий сезон"
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Скидка (%)</label>
              <input
                className={modalStyles.formInput}
                type="number"
                min={0}
                max={100}
                value={seasonForm.discount_percent}
                onChange={(e) => setSeasonForm((p) => ({ ...p, discount_percent: Number(e.target.value) }))}
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Дата с <span className={modalStyles.formRequired}>*</span></label>
              <input
                className={modalStyles.formInput}
                type="date"
                value={seasonForm.date_from}
                onChange={(e) => setSeasonForm((p) => ({ ...p, date_from: e.target.value }))}
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Дата по <span className={modalStyles.formRequired}>*</span></label>
              <input
                className={modalStyles.formInput}
                type="date"
                value={seasonForm.date_to}
                onChange={(e) => setSeasonForm((p) => ({ ...p, date_to: e.target.value }))}
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Направления</label>
              <div className={modalStyles.checkboxGroup}>
                {Object.entries(DESTINATION_NAMES).map(([id, name]) => (
                  <label key={id} className={modalStyles.formCheckbox}>
                    <input
                      type="checkbox"
                      checked={seasonForm.destinations.includes(id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSeasonForm((p) => ({ ...p, destinations: [...p.destinations, id] }));
                        } else {
                          setSeasonForm((p) => ({ ...p, destinations: p.destinations.filter((d) => d !== id) }));
                        }
                      }}
                    />
                    <span className={modalStyles.formCheckboxLabel}>{name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Статус</label>
              <label className={modalStyles.formCheckbox}>
                <input
                  type="checkbox"
                  checked={seasonForm.is_active}
                  onChange={(e) => setSeasonForm((p) => ({ ...p, is_active: e.target.checked }))}
                />
                <span className={modalStyles.formCheckboxLabel}>Активен</span>
              </label>
            </div>
          </div>
        </TravelModal>
      </div>
    </AdminLayout>
  );
}

export default AdminPromotions;
