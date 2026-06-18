import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import './AdminLayout.css';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Обзор',
    items: [
      { path: '/admin', label: 'Дашборд', icon: '📊' },
      { path: '/admin/analytics', label: 'Аналитика', icon: '📈' },
    ],
  },
  {
    title: 'Каталог',
    items: [
      { path: '/admin/destinations', label: 'Направления', icon: '🗺️' },
      { path: '/admin/partners', label: 'Партнёры', icon: '🏢' },
      { path: '/admin/locations', label: 'Локации', icon: '📍' },
      { path: '/admin/cars', label: 'Автомобили', icon: '🚗' },
    ],
  },
  {
    title: 'Операции',
    items: [
      { path: '/admin/bookings', label: 'Бронирования', icon: '📅' },
      { path: '/admin/storage', label: 'Хранение', icon: '🔒' },
    ],
  },
  {
    title: 'Маркетинг',
    items: [
      { path: '/admin/promotions', label: 'Промокоды', icon: '🎁' },
    ],
  },
  {
    title: 'Система',
    items: [
      { path: '/admin/users', label: 'Пользователи', icon: '👤' },
      { path: '/admin/settings', label: 'Настройки', icon: '⚙️' },
    ],
  },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Дашборд',
  '/admin/analytics': 'Аналитика',
  '/admin/destinations': 'Направления',
  '/admin/partners': 'Партнёры',
  '/admin/locations': 'Локации',
  '/admin/cars': 'Автомобили',
  '/admin/bookings': 'Бронирования',
  '/admin/storage': 'Хранение',
  '/admin/promotions': 'Промокоды и скидки',
  '/admin/users': 'Пользователи',
  '/admin/settings': 'Настройки',
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout, hasAdminAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!hasAdminAccess) {
    return (
      <div className="admin-unauthorized">
        <h1>Доступ запрещен</h1>
        <p>У вас нет прав для просмотра этой страницы.</p>
        <button onClick={() => navigate('/')}>На главную</button>
      </div>
    );
  }

  const pageTitle = pageTitles[location.pathname] || 'Панель управления';

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <span className="admin-brand-name">Прибой</span>
            <span className="admin-badge">Admin</span>
          </div>
        </div>

        <nav className="admin-nav">
          {navSections.map((section) => (
            <div key={section.title} className="admin-nav-section">
              <div className="admin-nav-section-title">{section.title}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                  end={item.path === '/admin'}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  <span className="admin-nav-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-user-name">{user?.name}</span>
            <span className="admin-user-email">{user?.email}</span>
          </div>
          <button type="button" onClick={handleLogout} className="admin-logout-btn">
            Выйти
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="admin-header-breadcrumb">Админ-панель</p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="admin-header-actions">
            <button type="button" onClick={() => navigate('/')} className="admin-back-btn">
              ← На сайт
            </button>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
