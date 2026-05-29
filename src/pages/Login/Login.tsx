import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button/Button';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    background: 'var(--ocean-gradient)',
    padding: 20,
  },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0c1a2e',
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center' as const,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  },
  field: {
    marginBottom: 20,
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center' as const,
  },
  brand: {
    textAlign: 'center' as const,
    marginBottom: 24,
    fontSize: 28,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  } as React.CSSProperties,
};

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      // Role-based redirect
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

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>Прибой</div>
        <h1 style={styles.title}>Вход в аккаунт</h1>
        <p style={styles.subtitle}>
          Войдите, чтобы управлять бронированиями
        </p>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.ru"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Пароль</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <Button
            variant="primary"
            size="large"
            fullWidth
            type="submit"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Login;
