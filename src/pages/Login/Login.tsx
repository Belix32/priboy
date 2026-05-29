import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button/Button';
import styles from './Login.module.css';

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const role = user?.role || 'user';
      switch (role) {
        case 'admin':
        case 'moderator':
          navigate('/admin');
          break;
        case 'partner':
          navigate('/partner');
          break;
        default:
          navigate('/');
      }
    }
  }, [isAuthenticated, navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Введите email и пароль');
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      switch (result.role) {
        case 'admin':
        case 'moderator':
          navigate('/admin');
          break;
        case 'partner':
          navigate('/partner');
          break;
        default:
          navigate('/');
      }
    } else {
      setError(result.error || 'Ошибка входа');
    }
  };

  if (isAuthenticated) return null;

  return (
    <div className={styles.page}>
      <svg className={styles.waveBg} viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path d="M0,60 C360,120 1080,0 1440,60 L1440,120 L0,120 Z" fill="var(--ocean-deep)" />
      </svg>
      <div className={styles.container}>
        <div className={styles.decorative}>
          <div className={styles.decorativeContent}>
            <div className={styles.carIllustration}>
              <svg width="160" height="100" viewBox="0 0 160 100" fill="none">
                <path d="M20 65H140L130 40H105L95 25H50L40 40H15L5 55L20 65Z" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                <circle cx="40" cy="72" r="10" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                <circle cx="40" cy="72" r="4" fill="rgba(255,255,255,0.5)" />
                <circle cx="120" cy="72" r="10" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                <circle cx="120" cy="72" r="4" fill="rgba(255,255,255,0.5)" />
                <rect x="55" y="30" width="35" height="8" rx="2" fill="rgba(255,255,255,0.25)" />
                <path d="M30 65L20 55L10 60" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
                <path d="M130 65L140 55L150 60" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className={styles.decorativeTitle}>С возвращением!</h2>
            <p className={styles.decorativeText}>
              Войдите в аккаунт и продолжайте<br />
              управлять своими поездками
            </p>
            <div className={styles.features}>
              <div className={styles.featureBadge}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 3.5L6 11L2.5 7.5" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Мгновенный вход
              </div>
              <div className={styles.featureBadge}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 3.5L6 11L2.5 7.5" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Личный кабинет
              </div>
              <div className={styles.featureBadge}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 3.5L6 11L2.5 7.5" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Мои поездки
              </div>
            </div>
          </div>
          <svg className={styles.waveDecoration} viewBox="0 0 400 120" preserveAspectRatio="none">
            <path d="M0,40 C100,100 200,0 400,60 L400,120 L0,120 Z" fill="white" opacity="0.3" />
            <path d="M0,60 C120,110 250,20 400,70 L400,120 L0,120 Z" fill="white" opacity="0.15" />
          </svg>
        </div>

        <div className={styles.card}>
          <div className={styles.brand}>Прибой</div>
          <h1 className={styles.title}>Вход в аккаунт</h1>
          <p className={styles.subtitle}>Войдите, чтобы управлять бронированиями</p>

          <form onSubmit={handleSubmit}>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1.5" y="3.5" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M2 4l6 5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <input
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.ru"
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Пароль</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="5" width="10" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5.5 5V3.5a2.5 2.5 0 015 0V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M1.5 9s3-5 7.5-5 7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5z" stroke="currentColor" strokeWidth="1.3" />
                        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M3 3l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M1.5 9s3-5 7.5-5 7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5z" stroke="currentColor" strokeWidth="1.3" />
                        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className={styles.formError} style={{ marginTop: 16 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="8" cy="11" r="0.7" fill="currentColor" />
                </svg>
                {error}
              </div>
            )}

            <Button
              variant="primary"
              size="large"
              fullWidth
              type="submit"
              disabled={loading}
              style={{ marginTop: 20 }}
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>

          <div className={styles.registerLink}>
            Нет аккаунта?
            <Link to="/register">Зарегистрироваться</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
