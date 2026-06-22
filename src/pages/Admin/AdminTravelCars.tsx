import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import { TravelModal, ModalButtons } from './components/TravelModal';
import modalStyles from './components/TravelModal.module.css';
import styles from './AdminTravel.module.css';
import {
  getAllCarsAdmin,
  getAllPartnersAdmin,
  getAllLocationsAdmin,
  createCar,
  updateCar,
  deleteCar,
} from '../../lib/travel/api';
import { uploadCarPhoto, validateCarPhotoFile } from '../../lib/travel/carPhotos';
import { getErrorMessage } from '../../lib/apiError';
import type { PartnerCar, RentalPartner, PartnerLocation } from '../../lib/travel/types';

// Mock partners for partner_id select

// Mock locations for location_id select


interface CarFormData {
  partner_id: string;
  location_id: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  license_plate: string;
  transmission: 'manual' | 'automatic';
  fuel_type: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  seats: number;
  price_per_day: number;
  deposit: number;
  image: string;
  description: string;
  is_available: boolean;
  is_active: boolean;
}

const initialFormData: CarFormData = {
  partner_id: '',
  location_id: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  license_plate: '',
  transmission: 'manual',
  fuel_type: 'gasoline',
  seats: 5,
  price_per_day: 0,
  deposit: 0,
  image: '',
  description: '',
  is_available: true,
  is_active: true,
};

const TRANSMISSION_LABELS: Record<string, string> = {
  manual: 'Механика',
  automatic: 'Автомат',
};

const FUEL_LABELS: Record<string, string> = {
  gasoline: 'Бензин',
  diesel: 'Дизель',
  electric: 'Электро',
  hybrid: 'Гибрид',
};

export function AdminTravelCars() {
  const { hasAdminAccess } = useAuth();
  const navigate = useNavigate();

  const [cars, setCars] = useState<PartnerCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [transmissionFilter, setTransmissionFilter] = useState<string>('all');
  const [fuelFilter, setFuelFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [viewItem, setViewItem] = useState<PartnerCar | null>(null);
  const [editItem, setEditItem] = useState<PartnerCar | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<CarFormData>(initialFormData);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [partners, setPartners] = useState<RentalPartner[]>([]);
  const [locations, setLocations] = useState<PartnerLocation[]>([]);

  if (!hasAdminAccess) {
    return <Navigate to="/admin-login" />;
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([getAllCarsAdmin(), getAllPartnersAdmin(), getAllLocationsAdmin()]).then(([carsData, partnersData, locationsData]) => {
      setCars(carsData);
      setPartners(partnersData);
      setLocations(locationsData);
      setLoading(false);
    });
  }, []);

  const filteredData = useMemo(() => {
    let filtered = [...cars];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.brand.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q) ||
          (c.license_plate || '').toLowerCase().includes(q) ||
          (partners.find((p) => p.id === c.partner_id)?.name || '').toLowerCase().includes(q)
      );
    }
    if (transmissionFilter !== 'all') {
      filtered = filtered.filter((c) => c.transmission === transmissionFilter);
    }
    if (fuelFilter !== 'all') {
      filtered = filtered.filter((c) => c.fuel_type === fuelFilter);
    }
    return filtered;
  }, [cars, searchQuery, transmissionFilter, fuelFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, transmissionFilter, fuelFilter]);

  const total = cars.length;
  const availableCount = cars.filter((c) => c.is_available).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPartnerName = (partnerId: string) => {
    return partners.find((p) => p.id === partnerId)?.name || partnerId;
  };

  const getLocationName = (locationId: string | null) => {
    if (!locationId) return '-';
    return locations.find((l) => l.id === locationId)?.name || locationId;
  };

  const handleFormChange = (field: keyof CarFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddItem = async () => {
    if (photoFile) {
      const validation = validateCarPhotoFile(photoFile);
      if (validation) {
        setPhotoError(validation);
        return;
      }
    }

    setSaving(true);
    setFormError(null);
    setPhotoError(null);
    try {
      const created = await createCar({
        partner_id: formData.partner_id,
        location_id: formData.location_id || null,
        brand: formData.brand,
        model: formData.model,
        year: formData.year ? Number(formData.year) : null,
        color: formData.color || null,
        license_plate: formData.license_plate || null,
        transmission: formData.transmission,
        fuel_type: formData.fuel_type,
        seats: formData.seats,
        price_per_day: formData.price_per_day,
        deposit: formData.deposit,
        image: formData.image || null,
        description: formData.description || null,
        is_available: formData.is_available,
        is_active: formData.is_active,
      });
      if (!created) {
        throw new Error('Не удалось создать автомобиль');
      }

      let saved = created;
      if (photoFile) {
        const imageUrl = await uploadCarPhoto(photoFile, formData.partner_id, created.id);
        await updateCar(created.id, { image: imageUrl });
        saved = { ...created, image: imageUrl };
      }
      setCars((prev) => [saved, ...prev]);
      setAddModalOpen(false);
      setFormData(initialFormData);
      setPhotoFile(null);
      setPhotoError(null);
      setFormError(null);
    } catch (err) {
      const message = getErrorMessage(err, 'Не удалось добавить автомобиль');
      setFormError(
        message.includes('row-level security') || message.includes('RLS')
          ? `${message}. Проверьте роль admin в profiles и миграции 002/007 в Supabase.`
          : message,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editItem) return;
    if (photoFile) {
      const validation = validateCarPhotoFile(photoFile);
      if (validation) {
        setPhotoError(validation);
        return;
      }
      const imageUrl = await uploadCarPhoto(photoFile, editItem.partner_id, editItem.id);
      const updated = { ...editItem, image: imageUrl };
      await updateCar(editItem.id, { image: imageUrl });
      setCars((prev) => prev.map((c) => (c.id === editItem.id ? updated : c)));
      setEditItem(null);
      setPhotoFile(null);
      setPhotoError(null);
      return;
    }
    await updateCar(editItem.id, editItem);
    setCars((prev) => prev.map((c) => (c.id === editItem.id ? editItem : c)));
    setEditItem(null);
  };

  const handleToggleAvailable = async (item: PartnerCar) => {
    const nextAvailable = !item.is_available;
    await updateCar(item.id, { is_available: nextAvailable });
    setCars((prev) =>
      prev.map((c) =>
        c.id === item.id ? { ...c, is_available: nextAvailable } : c
      )
    );
  };

  const handleToggleActive = async (item: PartnerCar) => {
    const nextActive = !item.is_active;
    await updateCar(item.id, { is_active: nextActive });
    setCars((prev) =>
      prev.map((c) =>
        c.id === item.id ? { ...c, is_active: nextActive } : c
      )
    );
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirmId) return;
    await deleteCar(deleteConfirmId);
    setCars((prev) => prev.filter((c) => c.id !== deleteConfirmId));
    setDeleteConfirmId(null);
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
      <div className="admin-parkings">
        <div className="admin-page-header">
          <h2>Управление автомобилями</h2>
          <button className="admin-add-btn" onClick={() => { setFormData(initialFormData); setAddModalOpen(true); }}>
            + Добавить автомобиль
          </button>
        </div>

        {/* Stats */}
        <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{total}</span>
              <span className="admin-stat-label">Всего автомобилей</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <span className="admin-stat-value">{availableCount}</span>
              <span className="admin-stat-label">Доступно</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <div className="admin-search">
            <span className="admin-search-icon"></span>
            <input
              type="text"
              placeholder="Поиск по марке, модели, партнёру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
          </div>
          <select
            value={transmissionFilter}
            onChange={(e) => setTransmissionFilter(e.target.value)}
            className="admin-filter-select"
          >
            <option value="all">Все коробки</option>
            <option value="manual">Механика</option>
            <option value="automatic">Автомат</option>
          </select>
          <select
            value={fuelFilter}
            onChange={(e) => setFuelFilter(e.target.value)}
            className="admin-filter-select"
          >
            <option value="all">Всё топливо</option>
            <option value="gasoline">Бензин</option>
            <option value="diesel">Дизель</option>
            <option value="electric">Электро</option>
            <option value="hybrid">Гибрид</option>
          </select>
        </div>

        {/* Table */}
        {filteredData.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon"></div>
            <h3>Ничего не найдено</h3>
            <p>Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Марка</th>
                    <th>Модель</th>
                    <th>Год</th>
                    <th>КПП</th>
                    <th>Мест</th>
                    <th>Цена/день</th>
                    <th>Партнёр</th>
                    <th>Статус</th>
                    <th>Доступен</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item) => (
                    <tr key={item.id}>
                      <td className="parking-title">{item.brand}</td>
                      <td>{item.model}</td>
                      <td>{item.year || '-'}</td>
                      <td>{TRANSMISSION_LABELS[item.transmission]}</td>
                      <td>{item.seats}</td>
                      <td className="parking-price">{formatCurrency(item.price_per_day)}</td>
                      <td>{getPartnerName(item.partner_id)}</td>
                      <td>
                        <span className={`status-badge ${item.is_active ? 'status-active' : 'status-inactive'}`}>
                          {item.is_active ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${item.is_available ? 'status-active' : 'status-inactive'}`}>
                          {item.is_available ? 'Да' : 'Нет'}
                        </span>
                      </td>
                      <td className="parking-actions">
                        <button className="action-btn view-btn" onClick={() => setViewItem(item)} title="Просмотр">Просмотр</button>
                        <button className="action-btn edit-btn" onClick={() => setEditItem(item)} title="Редактировать">Ред.</button>
                        <button
                          className={`action-btn ${item.is_active ? 'deactivate-btn' : 'activate-btn'}`}
                          onClick={() => handleToggleActive(item)}
                          title={item.is_active ? 'Деактивировать' : 'Активировать'}
                        >
                          {item.is_active ? 'Выкл.' : 'Вкл.'}
                        </button>
                        <button
                          className={`action-btn ${item.is_available ? 'deactivate-btn' : 'activate-btn'}`}
                          onClick={() => handleToggleAvailable(item)}
                          title={item.is_available ? 'Забронирован' : 'Доступен'}
                        >
                          {item.is_available ? 'Занят' : 'Свободен'}
                        </button>
                        <button className="action-btn delete-btn" onClick={() => setDeleteConfirmId(item.id)} title="Удалить">Удалить</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  ← Назад
                </button>
                <span className="pagination-info">Страница {currentPage} из {totalPages}</span>
                <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Вперёд →
                </button>
              </div>
            )}
          </>
        )}

        {/* View Modal */}
        <TravelModal
          isOpen={!!viewItem}
          onClose={() => setViewItem(null)}
          title={viewItem ? `${viewItem.brand} ${viewItem.model}` : 'Информация об автомобиле'}
          subtitle="Детальная информация об автомобиле"
          icon="🚗"
          size="wide"
          footer={
            <div style={{ display: 'flex', gap: 12 }}>
              {ModalButtons.close(() => setViewItem(null))}
            </div>
          }
        >
          {viewItem && (
            <>
              {viewItem.image && (
                <div className={modalStyles.imagePreview}>
                  <img src={viewItem.image} alt={`${viewItem.brand} ${viewItem.model}`} />
                </div>
              )}
              <div className={modalStyles.detailGrid}>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>ID</span>
                  <span className={modalStyles.detailValue}>{viewItem.id}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Марка</span>
                  <span className={modalStyles.detailValue}>{viewItem.brand}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Модель</span>
                  <span className={modalStyles.detailValue}>{viewItem.model}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Год выпуска</span>
                  <span className={modalStyles.detailValue}>{viewItem.year || '-'}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Цвет</span>
                  <span className={modalStyles.detailValue}>{viewItem.color || '-'}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Госномер</span>
                  <span className={modalStyles.detailValue}>{viewItem.license_plate || '-'}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Коробка передач</span>
                  <span className={modalStyles.detailValue}>{TRANSMISSION_LABELS[viewItem.transmission]}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Топливо</span>
                  <span className={modalStyles.detailValue}>{FUEL_LABELS[viewItem.fuel_type]}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Кол-во мест</span>
                  <span className={modalStyles.detailValue}>{viewItem.seats}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Цена за день</span>
                  <span className={`${modalStyles.detailValue} ${modalStyles.detailValueHighlight}`}>{formatCurrency(viewItem.price_per_day)}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Депозит</span>
                  <span className={modalStyles.detailValue}>{formatCurrency(viewItem.deposit)}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Партнёр</span>
                  <span className={modalStyles.detailValue}>{getPartnerName(viewItem.partner_id)}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Локация</span>
                  <span className={modalStyles.detailValue}>{getLocationName(viewItem.location_id)}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Статус</span>
                  <span className={`${modalStyles.badge} ${viewItem.is_active ? modalStyles.badgeActive : modalStyles.badgeCancelled}`}>
                    {viewItem.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Доступен</span>
                  <span className={`${modalStyles.badge} ${viewItem.is_available ? modalStyles.badgeActive : modalStyles.badgeCancelled}`}>
                    {viewItem.is_available ? 'Да' : 'Нет'}
                  </span>
                </div>
                <div className={`${modalStyles.detailItem} ${modalStyles.detailItemFull}`}>
                  <span className={modalStyles.detailLabel}>Описание</span>
                  <span className={modalStyles.detailValue}>{viewItem.description || '-'}</span>
                </div>
                <div className={modalStyles.detailItem}>
                  <span className={modalStyles.detailLabel}>Дата создания</span>
                  <span className={modalStyles.detailValue}>
                    {new Date(viewItem.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </>
          )}
        </TravelModal>

        {/* Edit Modal */}
        <TravelModal
          isOpen={!!editItem}
          onClose={() => setEditItem(null)}
          title="Редактирование автомобиля"
          subtitle="Измените данные автомобиля"
          icon="✏️"
          size="full"
          footer={
            <div style={{ display: 'flex', gap: 12 }}>
              {ModalButtons.cancel(() => setEditItem(null))}
              {ModalButtons.save(handleUpdateItem)}
            </div>
          }
        >
          {editItem && (
            <div className={modalStyles.formGrid}>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Партнёр <span className={modalStyles.formRequired}>*</span></label>
                <select
                  className={modalStyles.formSelect}
                  value={editItem.partner_id}
                  onChange={(e) => setEditItem({ ...editItem, partner_id: e.target.value })}
                >
                  <option value="">Выберите партнёра</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Локация</label>
                <select
                  className={modalStyles.formSelect}
                  value={editItem.location_id || ''}
                  onChange={(e) => setEditItem({ ...editItem, location_id: e.target.value || null })}
                >
                  <option value="">Без локации</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Марка <span className={modalStyles.formRequired}>*</span></label>
                <input
                  className={modalStyles.formInput}
                  type="text"
                  value={editItem.brand}
                  onChange={(e) => setEditItem({ ...editItem, brand: e.target.value })}
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Модель <span className={modalStyles.formRequired}>*</span></label>
                <input
                  className={modalStyles.formInput}
                  type="text"
                  value={editItem.model}
                  onChange={(e) => setEditItem({ ...editItem, model: e.target.value })}
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Год выпуска</label>
                <input
                  className={modalStyles.formInput}
                  type="number"
                  value={editItem.year || ''}
                  onChange={(e) => setEditItem({ ...editItem, year: Number(e.target.value) || null })}
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Цвет</label>
                <input
                  className={modalStyles.formInput}
                  type="text"
                  value={editItem.color || ''}
                  onChange={(e) => setEditItem({ ...editItem, color: e.target.value })}
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Госномер</label>
                <input
                  className={modalStyles.formInput}
                  type="text"
                  value={editItem.license_plate || ''}
                  onChange={(e) => setEditItem({ ...editItem, license_plate: e.target.value })}
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Коробка передач</label>
                <select
                  className={modalStyles.formSelect}
                  value={editItem.transmission}
                  onChange={(e) => setEditItem({ ...editItem, transmission: e.target.value as 'manual' | 'automatic' })}
                >
                  <option value="manual">Механика</option>
                  <option value="automatic">Автомат</option>
                </select>
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Тип топлива</label>
                <select
                  className={modalStyles.formSelect}
                  value={editItem.fuel_type}
                  onChange={(e) => setEditItem({ ...editItem, fuel_type: e.target.value as any })}
                >
                  <option value="gasoline">Бензин</option>
                  <option value="diesel">Дизель</option>
                  <option value="electric">Электро</option>
                  <option value="hybrid">Гибрид</option>
                </select>
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Кол-во мест</label>
                <input
                  className={modalStyles.formInput}
                  type="number"
                  value={editItem.seats}
                  onChange={(e) => setEditItem({ ...editItem, seats: Number(e.target.value) })}
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Цена за день (₽) <span className={modalStyles.formRequired}>*</span></label>
                <input
                  className={modalStyles.formInput}
                  type="number"
                  value={editItem.price_per_day}
                  onChange={(e) => setEditItem({ ...editItem, price_per_day: Number(e.target.value) })}
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Депозит (₽)</label>
                <input
                  className={modalStyles.formInput}
                  type="number"
                  value={editItem.deposit}
                  onChange={(e) => setEditItem({ ...editItem, deposit: Number(e.target.value) })}
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Фото (JPEG/PNG/WebP, до 5 МБ)</label>
                <input
                  className={modalStyles.formInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    setPhotoFile(e.target.files?.[0] || null);
                    setPhotoError(null);
                  }}
                />
                {photoError && <p style={{ color: '#dc2626', fontSize: 13 }}>{photoError}</p>}
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>URL изображения</label>
                <input
                  className={modalStyles.formInput}
                  type="text"
                  value={editItem.image || ''}
                  onChange={(e) => setEditItem({ ...editItem, image: e.target.value })}
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Статус</label>
                <select
                  className={modalStyles.formSelect}
                  value={editItem.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setEditItem({ ...editItem, is_active: e.target.value === 'active' })}
                >
                  <option value="active">Активен</option>
                  <option value="inactive">Неактивен</option>
                </select>
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formCheckbox}>
                  <input
                    type="checkbox"
                    checked={editItem.is_available}
                    onChange={(e) => setEditItem({ ...editItem, is_available: e.target.checked })}
                  />
                  <span className={modalStyles.formCheckboxLabel}>Доступен для бронирования</span>
                </label>
              </div>
              <div className={`${modalStyles.formGroup} ${modalStyles.formGroupFull}`}>
                <label className={modalStyles.formLabel}>Описание</label>
                <textarea
                  className={modalStyles.formTextarea}
                  value={editItem.description || ''}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
        </TravelModal>

        {/* Delete Confirmation */}
        <TravelModal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Подтверждение удаления"
          subtitle="Это действие нельзя отменить"
          icon="🗑️"
          size="default"
          footer={
            <div style={{ display: 'flex', gap: 12 }}>
              {ModalButtons.cancel(() => setDeleteConfirmId(null))}
              {ModalButtons.delete(handleDeleteItem)}
            </div>
          }
        >
          <div className={modalStyles.confirmIcon}>🗑️</div>
          <p className={modalStyles.confirmText}>
            Вы уверены, что хотите удалить автомобиль <strong>{cars.find((c) => c.id === deleteConfirmId)?.brand} {cars.find((c) => c.id === deleteConfirmId)?.model}</strong>?
          </p>
          <p className={modalStyles.confirmWarning}>Это действие нельзя отменить!</p>
        </TravelModal>

        {/* Add Modal */}
        <TravelModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Добавить автомобиль"
          subtitle="Добавьте новый автомобиль в систему"
          icon="➕"
          size="full"
          footer={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              {formError && (
                <p style={{ margin: 0, color: '#dc2626', fontSize: 14 }}>{formError}</p>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                {ModalButtons.cancel(() => {
                  setAddModalOpen(false);
                  setFormError(null);
                })}
                {ModalButtons.add(
                  handleAddItem,
                  saving || !formData.partner_id || !formData.brand || !formData.model || !formData.price_per_day,
                  saving ? 'Сохранение...' : 'Добавить',
                )}
              </div>
            </div>
          }
        >
          <div className={modalStyles.formGrid}>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Партнёр <span className={modalStyles.formRequired}>*</span></label>
              <select
                className={modalStyles.formSelect}
                value={formData.partner_id}
                onChange={(e) => handleFormChange('partner_id', e.target.value)}
              >
                <option value="">Выберите партнёра</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Локация</label>
              <select
                className={modalStyles.formSelect}
                value={formData.location_id}
                onChange={(e) => handleFormChange('location_id', e.target.value)}
              >
                <option value="">Без локации</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Марка <span className={modalStyles.formRequired}>*</span></label>
              <input
                className={modalStyles.formInput}
                type="text"
                value={formData.brand}
                onChange={(e) => handleFormChange('brand', e.target.value)}
                placeholder="Например: Toyota"
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Модель <span className={modalStyles.formRequired}>*</span></label>
              <input
                className={modalStyles.formInput}
                type="text"
                value={formData.model}
                onChange={(e) => handleFormChange('model', e.target.value)}
                placeholder="Например: Camry"
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Год выпуска</label>
              <input
                className={modalStyles.formInput}
                type="number"
                value={formData.year}
                onChange={(e) => handleFormChange('year', e.target.value)}
                placeholder="2024"
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Цвет</label>
              <input
                className={modalStyles.formInput}
                type="text"
                value={formData.color}
                onChange={(e) => handleFormChange('color', e.target.value)}
                placeholder="Белый"
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Госномер</label>
              <input
                className={modalStyles.formInput}
                type="text"
                value={formData.license_plate}
                onChange={(e) => handleFormChange('license_plate', e.target.value)}
                placeholder="А123ВВ"
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Коробка передач</label>
              <select
                className={modalStyles.formSelect}
                value={formData.transmission}
                onChange={(e) => handleFormChange('transmission', e.target.value)}
              >
                <option value="manual">Механика</option>
                <option value="automatic">Автомат</option>
              </select>
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Тип топлива</label>
              <select
                className={modalStyles.formSelect}
                value={formData.fuel_type}
                onChange={(e) => handleFormChange('fuel_type', e.target.value)}
              >
                <option value="gasoline">Бензин</option>
                <option value="diesel">Дизель</option>
                <option value="electric">Электро</option>
                <option value="hybrid">Гибрид</option>
              </select>
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Кол-во мест</label>
              <input
                className={modalStyles.formInput}
                type="number"
                value={formData.seats}
                onChange={(e) => handleFormChange('seats', Number(e.target.value))}
                placeholder="5"
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Цена за день (₽) <span className={modalStyles.formRequired}>*</span></label>
              <input
                className={modalStyles.formInput}
                type="number"
                value={formData.price_per_day}
                onChange={(e) => handleFormChange('price_per_day', Number(e.target.value))}
                placeholder="2500"
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Депозит (₽)</label>
              <input
                className={modalStyles.formInput}
                type="number"
                value={formData.deposit}
                onChange={(e) => handleFormChange('deposit', Number(e.target.value))}
                placeholder="10000"
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Фото (JPEG/PNG/WebP, до 5 МБ)</label>
              <input
                className={modalStyles.formInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  setPhotoFile(e.target.files?.[0] || null);
                  setPhotoError(null);
                }}
              />
              {photoError && <p style={{ color: '#dc2626', fontSize: 13 }}>{photoError}</p>}
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>URL изображения</label>
              <input
                className={modalStyles.formInput}
                type="text"
                value={formData.image}
                onChange={(e) => handleFormChange('image', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formLabel}>Статус</label>
              <select
                className={modalStyles.formSelect}
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => handleFormChange('is_active', e.target.value === 'active')}
              >
                <option value="active">Активен</option>
                <option value="inactive">Неактивен</option>
              </select>
            </div>
            <div className={modalStyles.formGroup}>
              <label className={modalStyles.formCheckbox}>
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => handleFormChange('is_available', e.target.checked)}
                />
                <span className={modalStyles.formCheckboxLabel}>Доступен для бронирования</span>
              </label>
            </div>
            <div className={`${modalStyles.formGroup} ${modalStyles.formGroupFull}`}>
              <label className={modalStyles.formLabel}>Описание</label>
              <textarea
                className={modalStyles.formTextarea}
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                rows={3}
                placeholder="Описание автомобиля..."
              />
            </div>
          </div>
        </TravelModal>
      </div>
    </AdminLayout>
  );
}
