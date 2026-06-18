import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import { TravelModal, ModalButtons } from './components/TravelModal';
import modalStyles from './components/TravelModal.module.css';
import styles from './AdminTravel.module.css';
import type { PromoCode, SeasonalDiscount } from '../../lib/travel/types';
import {
  getAllPromoCodesAdmin,
  getAllSeasonalDiscountsAdmin,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  createSeasonalDiscount,
  updateSeasonalDiscount,
  deleteSeasonalDiscount,
  getAllDestinationsAdmin,
} from '../../lib/travel/api';

function formatDate(dateStr: string | null | undefined): string {
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

  const [destinations, setDestinations] = useState<{ id: string; name: string }[]>([]);

  if (!hasAdminAccess) {
    return <Navigate to="/admin-login" />;
  }

  useEffect(() => {
    Promise.all([getAllPromoCodesAdmin(), getAllSeasonalDiscountsAdmin(), getAllDestinationsAdmin()]).then(
      ([promoData, seasonData, destData]) => {
        setPromos(promoData);
        setSeasons(seasonData);
        setDestinations(destData.map((d) => ({ id: d.id, name: d.name })));
        setLoading(false);
      },
    );
  }, []);

  const filteredPromos = useMemo(() => {
    if (!searchQuery) return promos;
    const q = searchQuery.toLowerCase();
    return promos.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
  }, [promos, searchQuery]);

  const promoStats = useMemo(() => {
    const active = promos.filter((p) => p.is_active).length;
    const totalUses = promos.reduce((sum, p) => sum + p.used_count, 0);
    const activeSeasons = seasons.filter((s) => s.is_active).length;
    return { total: promos.length, active, totalUses, activeSeasons };
  }, [promos, seasons]);

  const handleTogglePromo = async (id: string) => {
    const item = promos.find((p) => p.id === id);
    if (!item) return;
    await updatePromoCode(id, { is_active: !item.is_active });
    setPromos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
  };

  const handleDeletePromo = async (id: string) => {
    await deletePromoCode(id);
    setPromos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddPromo = async () => {
    const created = await createPromoCode({
      code: promoForm.code.toUpperCase(),
      discount_type: promoForm.discount_type,
      discount_value: promoForm.discount_value,
      min_order_amount: promoForm.min_order_amount,
      max_uses: promoForm.max_uses,
      valid_from: promoForm.valid_from || null,
      valid_to: promoForm.valid_to || null,
      is_active: promoForm.is_active,
      description: promoForm.description || null,
    });
    if (created) {
      setPromos((prev) => [created, ...prev]);
      setAddPromoOpen(false);
      setPromoForm({ code: '', discount_type: 'percent', discount_value: 10, min_order_amount: 0, max_uses: 100, valid_from: '', valid_to: '', description: '', is_active: true });
    }
  };

  const handleToggleSeason = async (id: string) => {
    const item = seasons.find((s) => s.id === id);
    if (!item) return;
    await updateSeasonalDiscount(id, { is_active: !item.is_active });
    setSeasons((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s))
    );
  };

  const handleDeleteSeason = async (id: string) => {
    await deleteSeasonalDiscount(id);
    setSeasons((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddSeason = async () => {
    const month = seasonForm.date_from?.split('-')[1] || '06';
    const seasonNames: Record<string, string> = {
      '06': 'Лето', '07': 'Лето', '08': 'Лето',
      '09': 'Осень', '10': 'Осень', '11': 'Осень',
      '12': 'Зима', '01': 'Зима', '02': 'Зима',
      '03': 'Весна', '04': 'Весна', '05': 'Весна',
    };
    const created = await createSeasonalDiscount({
      name: seasonForm.name,
      season: seasonNames[month] || 'Лето',
      discount_percent: seasonForm.discount_percent,
      date_from: seasonForm.date_from,
      date_to: seasonForm.date_to,
      destination_ids: seasonForm.destinations,
      is_active: seasonForm.is_active,
    });
    if (created) {
      setSeasons((prev) => [...prev, created]);
      setAddSeasonOpen(false);
      setSeasonForm({ name: '', discount_percent: 0, date_from: '', date_to: '', destinations: [], is_active: true });
    }
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
                      {season.destination_ids.map((d) => (
                        <span key={d} className={styles.seasonDestBadge}>
                          {destinations.find((x) => x.id === d)?.name || d}
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
                {destinations.map(({ id, name }) => (
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
