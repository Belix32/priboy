import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';
import { Button } from '../../components/Button/Button';
import { Logo } from '../../components/Logo/Logo';
import styles from '../Login/Login.module.css';

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('Сброс пароля недоступен без подключённого Supabase');
      return;
    }

    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <Logo variant="large" align="center" />
          </div>
          <h1 className={styles.title}>Новый пароль</h1>
          <p className={styles.subtitle}>
            {done
              ? 'Пароль обновлён. Перенаправляем на страницу входа...'
              : ready
                ? 'Придумайте новый пароль для вашего аккаунта'
                : 'Откройте ссылку из письма для сброса пароля'}
          </p>

          {ready && !done && (
            <form onSubmit={handleSubmit}>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label className={styles.label}>Новый пароль</label>
                  <div className={styles.inputWrapper}>
                    <input
                      className={`${styles.input} ${error ? styles.inputError : ''}`}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Повторите пароль</label>
                  <input
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && <div className={styles.formError}>{error}</div>}

              <Button
                variant="primary"
                size="large"
                fullWidth
                type="submit"
                disabled={loading}
                style={{ marginTop: 20 }}
              >
                {loading ? 'Сохранение...' : 'Сохранить пароль'}
              </Button>
            </form>
          )}

          {!ready && !done && error && <div className={styles.formError}>{error}</div>}

          <button
            type="button"
            className={styles.forgotLink}
            onClick={() => navigate('/login')}
            style={{ marginTop: 16 }}
          >
            ← На страницу входа
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
