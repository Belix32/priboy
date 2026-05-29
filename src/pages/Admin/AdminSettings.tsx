import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import { TravelModal, ModalButtons } from './components/TravelModal';
import modalStyles from './components/TravelModal.module.css';
import styles from './AdminTravel.module.css';

// ============================================================================
// Types
// ============================================================================

interface ServiceSettings {
  site_name: string;
  tagline: string;
  logo_url: string;
  support_email: string;
  support_phone: string;
  address: string;
  default_commission_rate: number;
  storage_price_per_day: number;
  min_rental_days: number;
  max_rental_days: number;
  currency: string;
  booking_confirmation_required: boolean;
  enable_storage: boolean;
}

// ============================================================================
// Mock / Default data
// ============================================================================

const SETTINGS_KEY = 'priboi_admin_settings';

const DEFAULT_SETTINGS: ServiceSettings = {
  site_name: 'Прибой',
  tagline: 'Колёса к морю',
  logo_url: '',
  support_email: 'support@priboi.ru',
  support_phone: '+7 (800) 555-35-35',
  address: 'г. Сочи, ул. Курортная, д. 1',
  default_commission_rate: 15,
  storage_price_per_day: 500,
  min_rental_days: 1,
  max_rental_days: 30,
  currency: '₽',
  booking_confirmation_required: true,
  enable_storage: true,
};

function loadSettings(): ServiceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: ServiceSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ============================================================================
// Social / SEO placeholders
// ============================================================================

interface SocialLink {
  id: string;
  label: string;
  url: string;
  icon: string;
}

const SOCIAL_PRESETS: SocialLink[] = [
  { id: 'tg', label: 'Telegram', url: 'https://t.me/priboi', icon: '✈️' },
  { id: 'vk', label: 'VKontakte', url: 'https://vk.com/priboi', icon: '📘' },
  { id: 'inst', label: 'Instagram', url: 'https://instagram.com/priboi', icon: '📷' },
];

// ============================================================================
// Component
// ============================================================================

export function AdminSettings() {
  const { hasAdminAccess } = useAuth();

  const [settings, setSettings] = useState<ServiceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'contacts' | 'branding'>('general');

  // Social links state
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(SOCIAL_PRESETS);
  const [editSocial, setEditSocial] = useState<SocialLink | null>(null);
  const [showSocialModal, setShowSocialModal] = useState(false);

  // SEO state  
  const [seoTitle, setSeoTitle] = useState('Аренда авто на море — Прибой');
  const [seoDesc, setSeoDesc] = useState('Сервис аренды автомобилей на курортах Черноморского побережья. Прилетел на море — получи машину.');
  const [seoKeywords, setSeoKeywords] = useState('аренда авто, море, сочи, анапа, геленджик, прокат машин');

  if (!hasAdminAccess) {
    return <Navigate to="/admin-login" />;
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettings(loadSettings());
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (field: keyof ServiceSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      saveSettings(settings);
      // Also save SEO data
      localStorage.setItem('priboi_seo_title', seoTitle);
      localStorage.setItem('priboi_seo_desc', seoDesc);
      localStorage.setItem('priboi_seo_keywords', seoKeywords);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 400);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading">Загрузка настроек...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.travelDashboard}>
        <div className={styles.travelPageHeader}>
          <h1>Настройки сервиса</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saved && <span className={styles.travelSavedBadge}>✓ Сохранено</span>}
            <button className={styles.travelSaveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.settingsTabs}>
          <button
            className={`${styles.settingsTab} ${activeTab === 'general' ? styles.settingsTabActive : ''}`}
            onClick={() => setActiveTab('general')}
          >
            ⚙️ Общие
          </button>
          <button
            className={`${styles.settingsTab} ${activeTab === 'contacts' ? styles.settingsTabActive : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            📞 Контакты и SEO
          </button>
          <button
            className={`${styles.settingsTab} ${activeTab === 'branding' ? styles.settingsTabActive : ''}`}
            onClick={() => setActiveTab('branding')}
          >
            🎨 Брендинг
          </button>
        </div>

        {/* === GENERAL TAB === */}
        {activeTab === 'general' && (
          <div className={styles.settingsSection}>
            <div className={styles.settingsCard}>
              <h3 className={styles.settingsCardTitle}>Основные параметры</h3>
              <div className={styles.settingsGrid}>
                <div className={styles.settingsField}>
                  <label>Название сервиса</label>
                  <input
                    type="text"
                    value={settings.site_name}
                    onChange={(e) => handleChange('site_name', e.target.value)}
                  />
                </div>
                <div className={styles.settingsField}>
                  <label>Слоган</label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                  />
                </div>
                <div className={styles.settingsField}>
                  <label>Валюта</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                  >
                    <option value="₽">🇷🇺 RUB (₽)</option>
                    <option value="$">💵 USD ($)</option>
                    <option value="€">💶 EUR (€)</option>
                  </select>
                </div>
                <div className={styles.settingsField}>
                  <label>Комиссия по умолчанию (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.default_commission_rate}
                    onChange={(e) => handleChange('default_commission_rate', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className={styles.settingsCard}>
              <h3 className={styles.settingsCardTitle}>Параметры бронирования</h3>
              <div className={styles.settingsGrid}>
                <div className={styles.settingsField}>
                  <label>Мин. дней аренды</label>
                  <input
                    type="number"
                    min={1}
                    value={settings.min_rental_days}
                    onChange={(e) => handleChange('min_rental_days', Number(e.target.value))}
                  />
                </div>
                <div className={styles.settingsField}>
                  <label>Макс. дней аренды</label>
                  <input
                    type="number"
                    min={1}
                    value={settings.max_rental_days}
                    onChange={(e) => handleChange('max_rental_days', Number(e.target.value))}
                  />
                </div>
                <div className={styles.settingsField}>
                  <label>Цена хранения (₽/день)</label>
                  <input
                    type="number"
                    min={0}
                    value={settings.storage_price_per_day}
                    onChange={(e) => handleChange('storage_price_per_day', Number(e.target.value))}
                  />
                </div>
                <div className={styles.settingsField}>
                  <label>&nbsp;</label>
                  <label className={styles.settingsCheckbox}>
                    <input
                      type="checkbox"
                      checked={settings.enable_storage}
                      onChange={(e) => handleChange('enable_storage', e.target.checked)}
                    />
                    <span>Включить хранение авто</span>
                  </label>
                </div>
                <div className={styles.settingsField}>
                  <label>&nbsp;</label>
                  <label className={styles.settingsCheckbox}>
                    <input
                      type="checkbox"
                      checked={settings.booking_confirmation_required}
                      onChange={(e) => handleChange('booking_confirmation_required', e.target.checked)}
                    />
                    <span>Требовать подтверждение брони</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === CONTACTS TAB === */}
        {activeTab === 'contacts' && (
          <div className={styles.settingsSection}>
            <div className={styles.settingsCard}>
              <h3 className={styles.settingsCardTitle}>Контактная информация</h3>
              <div className={styles.settingsGrid}>
                <div className={styles.settingsField}>
                  <label>Email поддержки</label>
                  <input
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => handleChange('support_email', e.target.value)}
                  />
                </div>
                <div className={styles.settingsField}>
                  <label>Телефон поддержки</label>
                  <input
                    type="text"
                    value={settings.support_phone}
                    onChange={(e) => handleChange('support_phone', e.target.value)}
                  />
                </div>
                <div className={styles.settingsField} style={{ gridColumn: '1 / -1' }}>
                  <label>Адрес центрального офиса</label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.settingsCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 className={styles.settingsCardTitle} style={{ margin: 0 }}>Социальные сети</h3>
                <button className={styles.travelActionBtn} onClick={() => { setEditSocial(null); setShowSocialModal(true); }}>
                  + Добавить
                </button>
              </div>
              <div className={styles.socialList}>
                {socialLinks.map((link) => (
                  <div key={link.id} className={styles.socialItem}>
                    <span className={styles.socialIcon}>{link.icon}</span>
                    <div className={styles.socialInfo}>
                      <span className={styles.socialName}>{link.label}</span>
                      <span className={styles.socialUrl}>{link.url}</span>
                    </div>
                    <button
                      className={styles.travelActionBtn}
                      onClick={() => { setEditSocial(link); setShowSocialModal(true); }}
                    >
                      Изменить
                    </button>
                    <button
                      className={`${styles.travelActionBtn} ${styles.travelActionBtnDanger}`}
                      onClick={() => setSocialLinks((prev) => prev.filter((l) => l.id !== link.id))}
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.settingsCard}>
              <h3 className={styles.settingsCardTitle}>SEO</h3>
              <div className={styles.settingsGrid}>
                <div className={styles.settingsField} style={{ gridColumn: '1 / -1' }}>
                  <label>Заголовок (Title)</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                  />
                </div>
                <div className={styles.settingsField} style={{ gridColumn: '1 / -1' }}>
                  <label>Описание (Description)</label>
                  <textarea
                    className={modalStyles.formTextarea}
                    value={seoDesc}
                    onChange={(e) => setSeoDesc(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className={styles.settingsField} style={{ gridColumn: '1 / -1' }}>
                  <label>Ключевые слова (Keywords)</label>
                  <input
                    type="text"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === BRANDING TAB === */}
        {activeTab === 'branding' && (
          <div className={styles.settingsSection}>
            <div className={styles.settingsCard}>
              <h3 className={styles.settingsCardTitle}>Внешний вид</h3>
              <div className={styles.settingsGrid}>
                <div className={styles.settingsField}>
                  <label>URL логотипа</label>
                  <input
                    type="text"
                    value={settings.logo_url}
                    onChange={(e) => handleChange('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className={styles.settingsField}>
                  <label>Предпросмотр логотипа</label>
                  <div className={styles.logoPreview}>
                    {settings.logo_url ? (
                      <img src={settings.logo_url} alt="logo" style={{ maxWidth: 120, maxHeight: 60 }} />
                    ) : (
                      <span style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {settings.site_name || 'Прибой'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.settingsCard}>
              <h3 className={styles.settingsCardTitle}>Цветовая схема</h3>
              <div className={styles.settingsColorGrid}>
                <div className={styles.settingsColorItem}>
                  <label>Акцентный цвет</label>
                  <div className={styles.settingsColorInput}>
                    <input type="color" value="#0ea5e9" />
                    <span>#0ea5e9</span>
                  </div>
                </div>
                <div className={styles.settingsColorItem}>
                  <label>Второстепенный</label>
                  <div className={styles.settingsColorInput}>
                    <input type="color" value="#06b6d4" />
                    <span>#06b6d4</span>
                  </div>
                </div>
                <div className={styles.settingsColorItem}>
                  <label>Успех (зелёный)</label>
                  <div className={styles.settingsColorInput}>
                    <input type="color" value="#059669" />
                    <span>#059669</span>
                  </div>
                </div>
                <div className={styles.settingsColorItem}>
                  <label>Ошибка (красный)</label>
                  <div className={styles.settingsColorInput}>
                    <input type="color" value="#dc2626" />
                    <span>#dc2626</span>
                  </div>
                </div>
              </div>
              <p className={styles.settingsHint}>Цветовая схема будет применена после обновления темы в коде.</p>
            </div>

            <div className={styles.settingsCard}>
              <h3 className={styles.settingsCardTitle}>Баннер на главной</h3>
              <div className={styles.settingsGrid}>
                <div className={styles.settingsField} style={{ gridColumn: '1 / -1' }}>
                  <label>Текст приветствия</label>
                  <input
                    type="text"
                    defaultValue="Аренда авто на море"
                  />
                </div>
                <div className={styles.settingsField} style={{ gridColumn: '1 / -1' }}>
                  <label>Подзаголовок</label>
                  <input
                    type="text"
                    defaultValue="Прилетел на море — получи машину. Свою оставь на хранении."
                  />
                </div>
                <div className={styles.settingsField} style={{ gridColumn: '1 / -1' }}>
                  <label>URL фонового изображения</label>
                  <input
                    type="text"
                    placeholder="https://example.com/bg.jpg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom save bar */}
        <div className={styles.settingsBottomBar}>
          <div className={styles.settingsBottomInfo}>
            {saved && <span className={styles.travelSavedBadge}>✓ Все настройки сохранены</span>}
            <span className={styles.settingsBottomHint}>Данные сохраняются в локальном хранилище</span>
          </div>
          <button className={styles.travelSaveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>

      {/* Social Link Edit Modal */}
      <TravelModal
        isOpen={showSocialModal}
        onClose={() => setShowSocialModal(false)}
        title={editSocial ? 'Редактировать соцсеть' : 'Добавить соцсеть'}
        icon="🔗"
        size="default"
        footer={
          <div style={{ display: 'flex', gap: 12 }}>
            {ModalButtons.cancel(() => setShowSocialModal(false))}
            {ModalButtons.save(() => {
              if (editSocial) {
                setSocialLinks((prev) => prev.map((l) => l.id === editSocial.id ? editSocial : l));
              }
              setShowSocialModal(false);
            })}
          </div>
        }
      >
        <div className={modalStyles.formGrid}>
          <div className={modalStyles.formGroup}>
            <label className={modalStyles.formLabel}>Название</label>
            <input
              className={modalStyles.formInput}
              type="text"
              value={editSocial?.label || ''}
              onChange={(e) => setEditSocial((prev) => prev ? { ...prev, label: e.target.value } : { id: Date.now().toString(), label: e.target.value, url: '', icon: '🔗' })}
              placeholder="Telegram"
            />
          </div>
          <div className={modalStyles.formGroup}>
            <label className={modalStyles.formLabel}>URL</label>
            <input
              className={modalStyles.formInput}
              type="text"
              value={editSocial?.url || ''}
              onChange={(e) => setEditSocial((prev) => prev ? { ...prev, url: e.target.value } : { id: Date.now().toString(), label: '', url: e.target.value, icon: '🔗' })}
              placeholder="https://t.me/priboi"
            />
          </div>
          <div className={modalStyles.formGroup}>
            <label className={modalStyles.formLabel}>Иконка (эмодзи)</label>
            <input
              className={modalStyles.formInput}
              type="text"
              value={editSocial?.icon || '🔗'}
              onChange={(e) => setEditSocial((prev) => prev ? { ...prev, icon: e.target.value } : null)}
              placeholder="✈️"
            />
          </div>
        </div>
      </TravelModal>
    </AdminLayout>
  );
}

export default AdminSettings;
