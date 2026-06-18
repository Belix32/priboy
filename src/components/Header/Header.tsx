import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../Button/Button';
import { Logo } from '../Logo/Logo';
import styles from './Header.module.css';

const PRIMARY_NAV = [
  { to: '/search?mode=storage', label: 'Парковка', mode: 'storage' as const },
  { to: '/search?mode=rental', label: 'Аренда', mode: 'rental' as const },
];

const SECONDARY_NAV = [
  { to: '/guide', label: 'Как работает', hash: '' },
  { to: '/map', label: 'Локации', hash: '' },
  { to: '/about', label: 'О нас', hash: '' },
  { to: '/help', label: 'Помощь', hash: '' },
];

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHome = location.pathname === '/' || location.pathname === '/travel';
  const isHeroHeader = isHome && !scrolled;

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

  useEffect(() => {
    if (!isHome) {
      setScrolled(true);
      return;
    }

    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleHashNav = (hash: string) => {
    if (hash && location.pathname === '/') {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    } else if (hash) {
      navigate(`/#${hash}`);
    }
    setMobileOpen(false);
  };

  const searchMode = searchParams.get('mode');
  const isSearchActive = location.pathname === '/search' || location.pathname === '/travel/search';

  const userName = user?.name || user?.email?.split('@')[0] || 'Пользователь';
  const avatarLetter = (userName[0] || 'П').toUpperCase();

  const headerClassName = [
    styles.header,
    isHeroHeader ? styles.headerHero : styles.headerSolid,
    scrolled && isHome ? styles.headerScrolled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={headerClassName}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo} aria-label="Прибой — на главную">
          <Logo variant={isHeroHeader ? 'hero' : 'default'} />
        </Link>

        <nav
          className={`${styles.nav} ${mobileOpen ? styles.navOpen : ''}`}
          aria-label="Основная навигация"
        >
          <div className={styles.navPrimary}>
            {PRIMARY_NAV.map((link) => {
              const isActive = isSearchActive && searchMode === link.mode;
              return (
                <button
                  key={link.label}
                  type="button"
                  className={`${styles.navPill} ${isActive ? styles.navPillActive : ''}`}
                  onClick={() => {
                    navigate(link.to);
                    setMobileOpen(false);
                  }}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          <div className={styles.navDivider} aria-hidden="true" />

          <div className={styles.navSecondary}>
            {SECONDARY_NAV.map((link) => (
              <button
                key={link.label}
                type="button"
                className={styles.navLink}
                onClick={() => {
                  if (link.hash) {
                    handleHashNav(link.hash);
                  } else {
                    navigate(link.to);
                    setMobileOpen(false);
                  }
                }}
              >
                {link.label}
              </button>
            ))}
          </div>
        </nav>

        <div className={styles.actions}>
          <a href="tel:88001234567" className={styles.phone}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>8 800 123-45-67</span>
          </a>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleTheme}
            aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
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
                aria-expanded={dropdownOpen}
              >
                {avatarLetter}
              </button>
              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownMeta}>{user?.email}</div>
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
                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant={isHeroHeader ? 'ghost' : 'primary'}
              size="small"
              className={isHeroHeader ? styles.loginHero : styles.loginBtn}
              onClick={() => navigate('/login')}
            >
              Войти
            </Button>
          )}

          <button
            type="button"
            className={`${styles.burger} ${mobileOpen ? styles.burgerOpen : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={mobileOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Закрыть меню"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </header>
  );
}
