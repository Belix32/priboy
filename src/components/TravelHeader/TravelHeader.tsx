import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../Button/Button';
import styles from './TravelHeader.module.css';

export function TravelHeader() {
  const { user, isAuthenticated, logout } = useAuth();
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

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const userName = user?.name || user?.email?.split('@')[0] || 'Пользователь';
  const userEmail = user?.email || '';
  const avatarLetter = (userName[0] || 'П').toUpperCase();

  const navLinks = [
    { to: '/travel', label: 'Главная' },
    { to: '/travel/search', label: 'Поиск' },
    { to: '/travel/my-trips', label: 'Мои поездки' },
    ...(isAuthenticated ? [{ to: '/travel/profile', label: 'Профиль' }] : []),
  ];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo} onClick={() => navigate('/travel')}>
          <svg className={styles.logoIcon} width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10" stroke="url(#waveGrad)" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 12c0 5.52 4.48 10 10 10s10-4.48 10-10" stroke="url(#waveGrad)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            <path d="M2 12h20" stroke="url(#waveGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
            <path d="M4 16c2-4 6-4 8 0s6 4 8 0" stroke="url(#waveGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            <defs>
              <linearGradient id="waveGrad" x1="2" y1="2" x2="22" y2="22">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <span className={styles.logoText}>Прибой</span>
        </div>

        <nav className={`${styles.nav} ${mobileOpen ? styles.navOpen : ''}`}>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`${styles.navLink} ${isActive(link.to) ? styles.navLinkActive : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <div className={styles.userMenu} ref={dropdownRef}>
              <button
                className={styles.userButton}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="Пользовательское меню"
              >
                <span className={styles.avatar}>{avatarLetter}</span>
                <span className={styles.userName}>{userName}</span>
                <svg
                  className={`${styles.chevron} ${dropdownOpen ? styles.chevronUp : ''}`}
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownName}>{userName}</div>
                    {userEmail && <div className={styles.dropdownEmail}>{userEmail}</div>}
                  </div>
                  <div className={styles.dropdownDivider} />
                  <Link to="/travel/profile" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Профиль
                  </Link>
                  <Link to="/travel/my-trips" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18" />
                      <path d="M9 21V9" />
                    </svg>
                    Мои поездки
                  </Link>
                  <div className={styles.dropdownDivider} />
                  <button className={styles.dropdownItem} onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authButtons}>
              <Button variant="outline" size="small" onClick={() => navigate('/login')}>
                Войти
              </Button>
              <Button variant="primary" size="small" onClick={() => navigate('/register')}>
                Регистрация
              </Button>
            </div>
          )}

          <button
            className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
