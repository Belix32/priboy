import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import styles from './AdminTravel.module.css';
import type { AdminProfile, RentalPartner } from '../../lib/travel/types';
import { getAllProfilesAdmin, updateProfileAdmin, getAllPartnersAdmin } from '../../lib/travel/api';

const ROLE_OPTIONS: { value: AdminProfile['role']; label: string }[] = [
  { value: 'user', label: 'Пользователь' },
  { value: 'moderator', label: 'Модератор' },
  { value: 'admin', label: 'Администратор' },
  { value: 'partner', label: 'Партнёр' },
];

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
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
  const { hasAdminAccess, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [partners, setPartners] = useState<RentalPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getAllProfilesAdmin(), getAllPartnersAdmin()]).then(([profiles, partnerList]) => {
      setUsers(profiles);
      setPartners(partnerList);
      setLoading(false);
    });
  }, []);

  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((u) =>
        (u.name || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone || '').includes(q),
      );
    }
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [users, search, roleFilter]);

  const handleRoleChange = async (profileId: string, newRole: AdminProfile['role']) => {
    setSavingId(profileId);
    setSaveError(null);
    try {
      const partnerId = newRole === 'partner' ? users.find((u) => u.id === profileId)?.partner_id : null;
      await updateProfileAdmin(profileId, { role: newRole, partner_id: newRole === 'partner' ? partnerId : null });
      setUsers((prev) => prev.map((u) => (u.id === profileId ? { ...u, role: newRole } : u)));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingId(null);
    }
  };

  const handlePartnerChange = async (profileId: string, partnerId: string) => {
    setSavingId(profileId);
    setSaveError(null);
    try {
      await updateProfileAdmin(profileId, { partner_id: partnerId || null, role: 'partner' });
      setUsers((prev) =>
        prev.map((u) => (u.id === profileId ? { ...u, partner_id: partnerId || null, role: 'partner' } : u)),
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingId(null);
    }
  };

  if (!hasAdminAccess) return <Navigate to="/" replace />;

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
        <h2>Пользователи</h2>
        <span className={styles.travelStatValue} style={{ fontSize: '1rem' }}>
          Всего: {users.length}
        </span>
      </div>

      {saveError && (
        <div className="admin-card admin-error-banner">
          {saveError}
        </div>
      )}

      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-filters">
          <div className="admin-filters-row">
            <div className="admin-filter-group">
              <label>Поиск</label>
              <input type="text" placeholder="Имя, email, телефон..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="admin-filter-group">
              <label>Роль</label>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">Все роли</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
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
              <th>Пользователь</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Роль</th>
              <th>Партнёр</th>
              <th>Регистрация</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name || '—'}</strong>
                  {currentUser?.email === u.email && (
                    <span className={`${styles.travelBadge} ${styles.travelBadgeActive}`} style={{ marginLeft: 8 }}>Вы</span>
                  )}
                </td>
                <td>{u.email}</td>
                <td>{u.phone || '—'}</td>
                <td>
                  <select
                    className={styles.travelStatusSelect}
                    value={u.role}
                    disabled={savingId === u.id || currentUser?.email === u.email}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as AdminProfile['role'])}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <span className={`${styles.travelBadge} ${getRoleBadgeClass(u.role)}`} style={{ marginLeft: 6 }}>
                    {ROLE_OPTIONS.find((r) => r.value === u.role)?.label}
                  </span>
                </td>
                <td>
                  {u.role === 'partner' ? (
                    <select
                      className={styles.travelStatusSelect}
                      value={u.partner_id || ''}
                      disabled={savingId === u.id}
                      onChange={(e) => handlePartnerChange(u.id, e.target.value)}
                    >
                      <option value="">Не привязан</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <p style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
            Пользователи не найдены. Убедитесь, что выполнен SQL из <code>003_admin_promos.sql</code>.
          </p>
        )}
      </div>

      <div className="admin-card admin-hint">
        Чтобы дать партнёру доступ: зарегистрируйте его на сайте → выберите роль «Партнёр» → привяжите компанию.
      </div>
    </AdminLayout>
  );
}
