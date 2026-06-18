import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../Button/Button';
import styles from './Header.module.css';

const NAV_LINKS = [
  { to: '/search?mode=storage', label: 'Парковка', hash: '' },
  { to: '/search?mode=rental', label: 'Аренда авто', hash: '' },
  { to: '/#how-it-works', label: 'Как это работает', hash: 'how-it-works' },
  { to: '/map', label: 'Локации', hash: '' },
  { to: '/#about', label: 'О нас', hash: 'about' },
  { to: '/#help', label: 'Помощь', hash: 'help' },
];

function WaveLogo() {
  return (
    <svg className={styles.logoIcon} width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" fill="var(--accent-light)" />
      <path d="M6 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 22c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const handleNavClick = (link: typeof NAV_LINKS[0]) => {
    if (link.hash && location.pathname === '/') {
      document.getElementById(link.hash)?.scrollIntoView({ behavior: 'smooth' });
    } else if (link.hash) {
      navigate(`/#${link.hash}`);
    } else {
      navigate(link.to);
    }
    setMobileOpen(false);
  };

  const userName = user?.name || user?.email?.split('@')[0] || 'Пользователь';
  const avatarLetter = (userName[0] || 'П').toUpperCase();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo} aria-label="Прибой — на главную">
          <WaveLogo />
          <span className={styles.logoText}>Прибой</span>
        </Link>

        <nav className={`${styles.nav} ${mobileOpen ? styles.navOpen : ''}`} aria-label="Основная навигация">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              className={styles.navLink}
              onClick={() => handleNavClick(link)}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className={styles.actions}>
          <a href="tel:88001234567" className={styles.phone}>8 800 123-45-67</a>

          <button
            type="button"
            className={styles.themeBtn}
            onClick={toggleTheme}
            aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {isAuthenticated ? (
            <div className={styles.userMenu} ref={dropdownRef}>
              <button
                type="button"
                className={styles.avatar}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="Меню пользователя"
              >
                {avatarLetter}
              </button>
              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {user?.email}
                  </div>
                  <div className={styles.dropdownDivider} />
                  <Link to="/my-trips" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                    Мои поездки
                  </Link>
                  <Link to="/profile" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                    Профиль
                  </Link>
                  {user?.role === 'admin' && (
                    <Link to="/admin" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                      Админ-панель
                    </Link>
                  )}
                  {user?.role === 'partner' && (
                    <Link to="/partner" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                      Кабинет партнёра
                    </Link>
                  )}
                  <div className={styles.dropdownDivider} />
                  <button type="button" className={styles.dropdownItem} onClick={() => { logout(); navigate('/'); }}>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button variant="outline" size="small" onClick={() => navigate('/login')}>
              Войти
            </Button>
          )}

          <button
            type="button"
            className={styles.burger}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Меню"
            aria-expanded={mobileOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}
