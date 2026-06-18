import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button/Button';
import styles from './Register.module.css';

function getPasswordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Слабый' };
  if (score <= 3) return { score, label: 'Средний' };
  return { score, label: 'Надёжный' };
}

interface FieldErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export function Register() {
  const navigate = useNavigate();
  const { register, isAuthenticated, user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);
  const strengthClass =
    strength.score <= 1 ? styles.strengthBarActive : strength.score <= 3 ? styles.strengthBarMedium : styles.strengthBarStrong;

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Введите имя (не менее 2 символов)';
    if (!email.trim()) e.email = 'Введите email';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Некорректный email';
    if (!phone.trim()) e.phone = 'Введите номер телефона';
    if (!password) e.password = 'Введите пароль';
    else if (password.length < 8) e.password = 'Пароль должен быть не менее 8 символов';
    if (!confirmPassword) e.confirmPassword = 'Подтвердите пароль';
    else if (password !== confirmPassword) e.confirmPassword = 'Пароли не совпадают';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    const result = await register(name.trim(), email.trim().toLowerCase(), phone.trim(), password);
    setLoading(false);
    if (result.success) {
      const role = result.role || 'user';
      if (role === 'admin' || role === 'moderator') {
        navigate('/admin');
      } else if (role === 'partner') {
        navigate('/partner');
      } else {
        navigate('/profile');
      }
    } else {
      setServerError(result.error || 'Ошибка регистрации');
    }
  };

  if (isAuthenticated) {
    const role = user?.role || 'user';
    if (role === 'admin' || role === 'moderator') {
      navigate('/admin');
    } else if (role === 'partner') {
      navigate('/partner');
    } else {
      navigate('/profile');
    }
    return null;
  }

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
            <h2 className={styles.decorativeTitle}>Добро пожаловать в Прибой!</h2>
            <p className={styles.decorativeText}>
              Зарегистрируйтесь и откройте мир комфортных<br />
              путешествий на арендованных автомобилях
            </p>
            <div className={styles.features}>
              <div className={styles.featureBadge}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 3.5L6 11L2.5 7.5" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Большой выбор авто
              </div>
              <div className={styles.featureBadge}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 3.5L6 11L2.5 7.5" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Лучшие цены
              </div>
              <div className={styles.featureBadge}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 3.5L6 11L2.5 7.5" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                24/7 поддержка
              </div>
              <div className={styles.featureBadge}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 3.5L6 11L2.5 7.5" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Страховка включена
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
          <h1 className={styles.title}>Создать аккаунт</h1>
          <p className={styles.subtitle}>Заполните форму для регистрации</p>

          <form onSubmit={handleSubmit}>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.label}>Имя</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Иван Петров"
                  />
                </div>
                {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
              </div>

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
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.ru"
                  />
                </div>
                {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Телефон</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 1.5h10a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1v-11a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5.5 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
                {errors.phone && <span className={styles.fieldError}>{errors.phone}</span>}
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
                    className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 8 символов"
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
                {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
                {password.length > 0 && (
                  <>
                    <div className={styles.passwordStrength}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`${styles.strengthBar} ${i <= strength.score ? strengthClass : ''}`}
                        />
                      ))}
                    </div>
                    <span className={styles.strengthLabel}>Надёжность: {strength.label}</span>
                  </>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Подтверждение пароля</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="5" width="10" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5.5 5V3.5a2.5 2.5 0 015 0V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите пароль"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                  >
                    {showConfirm ? (
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
                {errors.confirmPassword && <span className={styles.fieldError}>{errors.confirmPassword}</span>}
              </div>
            </div>

            {serverError && (
              <div className={styles.formError} style={{ marginTop: 16 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="8" cy="11" r="0.7" fill="currentColor" />
                </svg>
                {serverError}
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
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
          </form>

          <div className={styles.loginLink}>
            Уже есть аккаунт?
            <Link to="/login">Войти</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
