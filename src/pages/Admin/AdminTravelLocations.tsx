import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import { TravelModal, ModalButtons } from './components/TravelModal';
import modalStyles from './components/TravelModal.module.css';
import styles from './AdminTravel.module.css';
import type { PartnerLocation, RentalPartner, TravelDestination } from '../../lib/travel/types';
import {
  getAllLocationsAdmin,
  getAllPartnersAdmin,
  getAllDestinationsAdmin,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../../lib/travel/api';

interface LocationFormData {
  partner_id: string;
  destination_id: string;
  name: string;
  address: string;
  phone: string;
  latitude: string;
  longitude: string;
  has_storage: boolean;
  has_rental: boolean;
}

const initialForm: LocationFormData = {
  partner_id: '',
  destination_id: '',
  name: '',
  address: '',
  phone: '',
  latitude: '',
  longitude: '',
  has_storage: false,
  has_rental: true,
};

export function AdminTravelLocations() {
  const { hasAdminAccess } = useAuth();
  const [locations, setLocations] = useState<PartnerLocation[]>([]);
  const [partners, setPartners] = useState<RentalPartner[]>([]);
  const [destinations, setDestinations] = useState<TravelDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [viewItem, setViewItem] = useState<PartnerLocation | null>(null);
  const [editItem, setEditItem] = useState<PartnerLocation | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<LocationFormData>(initialForm);

  if (!hasAdminAccess) return <Navigate to="/admin-login" />;

  useEffect(() => {
    setLoading(true);
    Promise.all([getAllLocationsAdmin(), getAllPartnersAdmin(), getAllDestinationsAdmin()]).then(
      ([locData, partnerData, destData]) => {
        setLocations(locData);
        setPartners(partnerData);
        setDestinations(destData);
        setLoading(false);
      },
    );
  }, []);

  const filtered = useMemo(() => {
    let list = [...locations];
    if (partnerFilter) list = list.filter((l) => l.partner_id === partnerFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q) ||
          (l.partner?.name || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [locations, searchQuery, partnerFilter]);

  const partnerName = (id: string) => partners.find((p) => p.id === id)?.name || '—';
  const destName = (id: string) => destinations.find((d) => d.id === id)?.name || '—';

  const handleAdd = async () => {
    const created = await createLocation({
      partner_id: formData.partner_id,
      destination_id: formData.destination_id,
      name: formData.name,
      address: formData.address,
      phone: formData.phone || null,
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
      has_storage: formData.has_storage,
      has_rental: formData.has_rental,
    });
    if (created) {
      setLocations((prev) => [created, ...prev]);
      setAddModalOpen(false);
      setFormData(initialForm);
    }
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    await updateLocation(editItem.id, editItem);
    setLocations((prev) => prev.map((l) => (l.id === editItem.id ? editItem : l)));
    setEditItem(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteLocation(deleteConfirmId);
    setLocations((prev) => prev.filter((l) => l.id !== deleteConfirmId));
    setDeleteConfirmId(null);
  };

  const formFields = (data: LocationFormData, onChange: (f: keyof LocationFormData, v: unknown) => void) => (
    <div className={modalStyles.formGrid}>
      <div className={modalStyles.formGroup}>
        <label>Партнёр *</label>
        <select value={data.partner_id} onChange={(e) => onChange('partner_id', e.target.value)}>
          <option value="">Выберите партнёра</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className={modalStyles.formGroup}>
        <label>Направление *</label>
        <select value={data.destination_id} onChange={(e) => onChange('destination_id', e.target.value)}>
          <option value="">Выберите направление</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      <div className={modalStyles.formGroup}>
        <label>Название *</label>
        <input value={data.name} onChange={(e) => onChange('name', e.target.value)} />
      </div>
      <div className={modalStyles.formGroupFull}>
        <label>Адрес *</label>
        <input value={data.address} onChange={(e) => onChange('address', e.target.value)} />
      </div>
      <div className={modalStyles.formGroup}>
        <label>Телефон</label>
        <input value={data.phone} onChange={(e) => onChange('phone', e.target.value)} />
      </div>
      <div className={modalStyles.formGroup}>
        <label>Аренда</label>
        <select value={data.has_rental ? 'yes' : 'no'} onChange={(e) => onChange('has_rental', e.target.value === 'yes')}>
          <option value="yes">Да</option>
          <option value="no">Нет</option>
        </select>
      </div>
      <div className={modalStyles.formGroup}>
        <label>Хранение</label>
        <select value={data.has_storage ? 'yes' : 'no'} onChange={(e) => onChange('has_storage', e.target.value === 'yes')}>
          <option value="yes">Да</option>
          <option value="no">Нет</option>
        </select>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading">Загрузка...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.travelPageHeader}>
        <h2>Локации партнёров</h2>
        <button type="button" className={styles.travelAddBtn} onClick={() => setAddModalOpen(true)}>
          + Добавить локацию
        </button>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-content">
            <span className="admin-stat-value">{locations.length}</span>
            <span className="admin-stat-label">Всего локаций</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-content">
            <span className="admin-stat-value">{locations.filter((l) => l.has_storage).length}</span>
            <span className="admin-stat-label">С хранением</span>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-filters">
          <div className="admin-filters-row">
            <div className="admin-filter-group">
              <label>Поиск</label>
              <input type="text" placeholder="Название, адрес..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="admin-filter-group">
              <label>Партнёр</label>
              <select value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)}>
                <option value="">Все</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Партнёр</th>
              <th>Направление</th>
              <th>Адрес</th>
              <th>Услуги</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((loc) => (
              <tr key={loc.id}>
                <td><strong>{loc.name}</strong></td>
                <td>{loc.partner?.name || partnerName(loc.partner_id)}</td>
                <td>{loc.destination?.name || destName(loc.destination_id)}</td>
                <td>{loc.address}</td>
                <td>
                  {loc.has_rental && <span className={`${styles.travelBadge} ${styles.travelBadgeActive}`}>Аренда</span>}
                  {loc.has_storage && <span className={`${styles.travelBadge} ${styles.travelBadgePending}`}>Хранение</span>}
                </td>
                <td>
                  <div className={styles.travelActions}>
                    <button type="button" className={styles.travelActionBtn} onClick={() => setViewItem(loc)}>Просмотр</button>
                    <button type="button" className={styles.travelActionBtn} onClick={() => setEditItem({ ...loc })}>Ред.</button>
                    <button type="button" className={`${styles.travelActionBtn} ${styles.travelActionBtnDanger}`} onClick={() => setDeleteConfirmId(loc.id)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addModalOpen && (
        <TravelModal isOpen={addModalOpen} title="Новая локация" onClose={() => setAddModalOpen(false)} footer={
          <>
            {ModalButtons.cancel(() => setAddModalOpen(false))}
            {ModalButtons.add(handleAdd, false, 'Создать')}
          </>
        }>
          {formFields(formData, (f, v) => setFormData((p) => ({ ...p, [f]: v })))}
        </TravelModal>
      )}

      {editItem && (
        <TravelModal isOpen={!!editItem} title="Редактировать локацию" onClose={() => setEditItem(null)} footer={
          <>
            {ModalButtons.cancel(() => setEditItem(null))}
            {ModalButtons.save(handleUpdate, false, 'Сохранить')}
          </>
        }>
          {formFields(
            {
              partner_id: editItem.partner_id,
              destination_id: editItem.destination_id,
              name: editItem.name,
              address: editItem.address,
              phone: editItem.phone || '',
              latitude: editItem.latitude?.toString() || '',
              longitude: editItem.longitude?.toString() || '',
              has_storage: editItem.has_storage,
              has_rental: editItem.has_rental,
            },
            (f, v) => setEditItem((item) => (item ? { ...item, [f]: v } : item)),
          )}
        </TravelModal>
      )}

      {viewItem && (
        <TravelModal isOpen={!!viewItem} title={viewItem.name} onClose={() => setViewItem(null)} footer={
          ModalButtons.close(() => setViewItem(null))
        }>
          <div className={modalStyles.detailGrid}>
            <div><strong>Партнёр:</strong> {partnerName(viewItem.partner_id)}</div>
            <div><strong>Направление:</strong> {destName(viewItem.destination_id)}</div>
            <div><strong>Адрес:</strong> {viewItem.address}</div>
            <div><strong>Телефон:</strong> {viewItem.phone || '—'}</div>
          </div>
        </TravelModal>
      )}

      {deleteConfirmId && (
        <TravelModal isOpen={!!deleteConfirmId} title="Удалить локацию?" onClose={() => setDeleteConfirmId(null)} footer={
          <>
            {ModalButtons.cancel(() => setDeleteConfirmId(null))}
            {ModalButtons.delete(handleDelete)}
          </>
        }>
          <p>Локация будет удалена без возможности восстановления.</p>
        </TravelModal>
      )}
    </AdminLayout>
  );
}
