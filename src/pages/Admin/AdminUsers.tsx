import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import { TravelModal, ModalButtons } from './components/TravelModal';
import modalStyles from './components/TravelModal.module.css';
import styles from './AdminTravel.module.css';

interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'moderator' | 'admin' | 'partner';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

// Key for registered users collection
const USERS_REGISTRY_KEY = 'priboi_users';

// Mock initial users
const MOCK_USERS: AppUser[] = [
  { id: 'u1', name: 'Анна Петрова', email: 'anna@example.ru', phone: '+7 (912) 345-67-89', role: 'user', is_active: true, created_at: '2025-01-15T10:00:00Z', last_login: '2025-05-28T14:30:00Z' },
  { id: 'u2', name: 'Иван Сидоров', email: 'ivan@example.ru', phone: '+7 (923) 456-78-90', role: 'user', is_active: true, created_at: '2025-02-01T09:00:00Z', last_login: '2025-05-27T11:15:00Z' },
  { id: 'u3', name: 'Мария Иванова', email: 'maria@example.ru', phone: '+7 (934) 567-89-01', role: 'user', is_active: true, created_at: '2025-02-20T15:30:00Z', last_login: '2025-05-25T09:45:00Z' },
  { id: 'u4', name: 'Дмитрий Козлов', email: 'dmitry@example.ru', phone: '+7 (945) 678-90-12', role: 'user', is_active: true, created_at: '2025-03-05T11:00:00Z', last_login: '2025-05-20T16:00:00Z' },
  { id: 'u5', name: 'Елена Соколова', email: 'elena@example.ru', phone: '+7 (956) 789-01-23', role: 'user', is_active: false, created_at: '2025-03-10T08:00:00Z', last_login: '2025-04-15T12:30:00Z' },
  { id: 'u6', name: 'Александр Морозов', email: 'alex@example.ru', phone: '+7 (967) 890-12-34', role: 'moderator', is_active: true, created_at: '2025-01-10T12:00:00Z', last_login: '2025-05-29T08:00:00Z' },
  { id: 'u7', name: 'Ольга Новикова', email: 'olga@admin.ru', phone: '+7 (978) 901-23-45', role: 'admin', is_active: true, created_at: '2024-12-01T09:00:00Z', last_login: '2025-05-29T10:00:00Z' },
  { id: 'u8', name: 'Сергей Волков', email: 'sergey@partner.ru', phone: '+7 (989) 012-34-56', role: 'partner', is_active: true, created_at: '2025-01-20T14:00:00Z', last_login: '2025-05-26T15:30:00Z' },
  { id: 'u9', name: 'Татьяна Белова', email: 'tanya@example.ru', phone: '+7 (900) 123-45-67', role: 'user', is_active: true, created_at: '2025-04-01T10:30:00Z', last_login: '2025-05-22T13:00:00Z' },
  { id: 'u10', name: 'Павел Григорьев', email: 'pavel@example.ru', phone: '+7 (911) 234-56-78', role: 'user', is_active: true, created_at: '2025-04-10T16:00:00Z' },
  { id: 'u11', name: 'Наталья Кузнецова', email: 'natalia@example.ru', phone: '+7 (922) 345-67-89', role: 'user', is_active: true, created_at: '2025-04-15T11:00:00Z' },
  { id: 'u12', name: 'Михаил Фёдоров', email: 'mikhail@example.ru', phone: '+7 (933) 456-78-90', role: 'user', is_active: true, created_at: '2025-05-01T09:00:00Z', last_login: '2025-05-28T17:00:00Z' },
];

function loadUsers(): AppUser[] {
  try {
    const stored = localStorage.getItem(USERS_REGISTRY_KEY);
    if (stored) {
      const savedUsers: AppUser[] = JSON.parse(stored);
      // Merge mock users with saved, preferring saved for same ID
      const merged = [...MOCK_USERS];
      for (const su of savedUsers) {
        const idx = merged.findIndex(m => m.id === su.id);
        if (idx !== -1) {
          merged[idx] = su;
        } else {
          merged.push(su);
        }
      }
      return merged;
    }
  } catch { /* ignore */ }
  return [...MOCK_USERS];
}

function saveUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users:', e);
  }
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const ROLE_OPTIONS: { value: AppUser['role']; label: string }[] = [
  { value: 'user', label: 'Пользователь' },
  { value: 'moderator', label: 'Модератор' },
  { value: 'admin', label: 'Администратор' },
  { value: 'partner', label: 'Партнёр' },
];

function getRoleLabel(role: string): string {
  const found = ROLE_OPTIONS.find(r => r.value === role);
  return found ? found.label : role;
}

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'admin': return styles.travelBadgeConfirmed;
    case 'moderator': return styles.travelBadgeActive;
    case 'partner': return styles.travelBadgePending;
    default: return styles.travelBadgeCompleted;
  }
}

export function AdminUsers() {
  const { hasAdminAccess } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setUsers(loadUsers());
  }, []);

  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q)
      );
    }
    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter(u => u.is_active === (statusFilter === 'active'));
    }
    return result;
  }, [users, search, roleFilter, statusFilter]);

  const handleRoleChange = (userId: string, newRole: AppUser['role']) => {
    const updated = users.map(u =>
      u.id === userId ? { ...u, role: newRole } : u
    );
    setUsers(updated);
    saveUsers(updated);
  };

  const handleToggleActive = (userId: string) => {
    const updated = users.map(u =>
      u.id === userId ? { ...u, is_active: !u.is_active } : u
    );
    setUsers(updated);
    saveUsers(updated);
  };

  const handleDeleteUser = (userId: string) => {
    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    saveUsers(updated);
    setConfirmDelete(null);
  };

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  const selectedUser = confirmDelete ? users.find(u => u.id === confirmDelete) : null;

  if (!hasAdminAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <AdminLayout>
      <div className={styles.travelDashboard}>
        <div className={styles.travelPageHeader}>
          <h1>Управление пользователями</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className={styles.travelStatValue} style={{ fontSize: '1rem' }}>
              Всего: {users.length}
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className={styles.travelFilterBar}>
          <div className={styles.travelFilterRow}>
            <div className={styles.travelFilterGroup}>
              <label>Поиск</label>
              <input
                type="text"
                placeholder="Имя, email или телефон..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className={styles.travelFilterGroup}>
              <label>Роль</label>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="all">Все роли</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.travelFilterGroup}>
              <label>Статус</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">Все</option>
                <option value="active">Активные</option>
                <option value="inactive">Заблокированные</option>
              </select>
            </div>
            <button className={styles.travelFilterReset} onClick={handleResetFilters}>
              Сбросить
            </button>
          </div>
        </div>

        {/* Users table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border, #e5e7eb)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary, #6b7280)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Пользователь</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary, #6b7280)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Email</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary, #6b7280)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Телефон</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary, #6b7280)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Роль</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary, #6b7280)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Статус</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary, #6b7280)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Дата рег.</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary, #6b7280)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Последний вход</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary, #6b7280)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border, #e5e7eb)', transition: 'background 0.15s' }}
                    className={styles.travelTableRow}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: u.is_active
                          ? 'linear-gradient(135deg, #667eea, #764ba2)'
                          : '#9ca3af',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 600, fontSize: '0.85rem',
                        flexShrink: 0,
                      }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary, #1a1a2e)' }}>
                        {u.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #6b7280)' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #6b7280)' }}>
                    {u.phone}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      className={styles.travelStatusSelect}
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value as AppUser['role'])}
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <span className={`${styles.travelBadge} ${getRoleBadgeClass(u.role)}`} style={{ marginLeft: 6, verticalAlign: 'middle' }}>
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      className={styles.travelBadge}
                      style={{
                        background: u.is_active ? '#d1fae5' : '#fee2e2',
                        color: u.is_active ? '#059669' : '#dc2626',
                      }}
                    >
                      {u.is_active ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #6b7280)', fontSize: '0.85rem' }}>
                    {formatDate(u.created_at)}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #6b7280)', fontSize: '0.85rem' }}>
                    {formatDate(u.last_login)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div className={styles.travelActions}>
                      <button
                        className={`${styles.travelActionBtn} ${u.is_active ? styles.travelActionBtnDanger : styles.travelActionBtnSuccess}`}
                        onClick={() => handleToggleActive(u.id)}
                        title={u.is_active ? 'Заблокировать' : 'Разблокировать'}
                      >
                        {u.is_active ? 'Заблокировать' : 'Разблокировать'}
                      </button>
                      <button
                        className={`${styles.travelActionBtn} ${styles.travelActionBtnDanger}`}
                        onClick={() => setConfirmDelete(u.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #6b7280)' }}>
                    Пользователи не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <TravelModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Удаление пользователя"
        icon="⚠️"
        size="default"
        footer={
          <div className={styles.travelActions} style={{ justifyContent: 'flex-end' }}>
            {ModalButtons.dangerAction(() => confirmDelete && handleDeleteUser(confirmDelete), 'Удалить')}
            {ModalButtons.close(() => setConfirmDelete(null))}
          </div>
        }
      >
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          {selectedUser && (
            <p style={{ color: 'var(--text-secondary, #6b7280)', margin: 0 }}>
              Вы уверены, что хотите удалить пользователя <strong>{selectedUser.name}</strong> ({selectedUser.email})?
              Это действие невозможно отменить.
            </p>
          )}
        </div>
      </TravelModal>
    </AdminLayout>
  );
}

export default AdminUsers;
