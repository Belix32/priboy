import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at?: string;
  role?: 'user' | 'moderator' | 'admin' | 'partner';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isPartner: boolean;
  partnerId: string | null;
  hasAdminAccess: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  register: (name: string, email: string, phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = 'priboi_user';
const AUTH_TOKEN_KEY = 'priboi_token';

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function saveUserSession(user: User): void {
  const token = generateSecureToken();
  const data = { id: user.id, email: user.email, role: user.role || 'user', token };
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, btoa(JSON.stringify(data)));
}

function loadUserSession(): User | null {
  try {
    const stored = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!stored || !token) return null;
    const data = JSON.parse(atob(stored));
    if (data.token !== token) return null;
    return {
      id: data.id,
      email: data.email,
      name: '',
      phone: '',
      role: data.role || 'user',
    };
  } catch {
    clearSession();
    return null;
  }
}

function clearSession(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

function saveUserToRegistry(user: User): void {
  try {
    const key = 'priboi_users';
    const raw = localStorage.getItem(key);
    const users: any[] = raw ? JSON.parse(raw) : [];
    const idx = users.findIndex((u: any) => u.id === user.id);
    const entry = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role || 'user',
      is_active: true,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...entry, last_login: new Date().toISOString() };
    } else {
      users.push(entry);
    }
    localStorage.setItem(key, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving user to registry:', e);
  }
}

function getAdminEmail(): string {
  return import.meta.env.VITE_ADMIN_EMAIL || '';
}

function isAdminEmail(email: string): boolean {
  return email.toLowerCase().trim() === getAdminEmail().toLowerCase().trim();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const localUser = loadUserSession();
    if (localUser) setUser(localUser);
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: string }> => {
    if (!email || !password) {
      return { success: false, error: 'Введите email и пароль' };
    }

    if (!isSupabaseConfigured()) {
      const mockUser: User = {
        id: generateSecureToken().substring(0, 16),
        name: email.toLowerCase().split('@')[0],
        email: email.toLowerCase().trim(),
        phone: '',
        role: isAdminEmail(email) ? 'admin' : 'user',
      };
      setUser(mockUser);
      saveUserSession(mockUser);
      saveUserToRegistry(mockUser);
      return { success: true, role: mockUser.role };
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Неверный email или пароль' };
        }
        return { success: false, error: 'Ошибка входа. Попробуйте позже.' };
      }

      if (data?.user) {
        const userObj: User = {
          id: data.user.id,
          name: data.user.email?.split('@')[0] || 'Пользователь',
          email: data.user.email || email,
          phone: '',
          role: isAdminEmail(email) ? 'admin' : 'user',
        };
        setUser(userObj);
        saveUserSession(userObj);
        return { success: true, role: userObj.role };
      }

      return { success: false, error: 'Ошибка входа' };
    } catch {
      return { success: false, error: 'Ошибка сети. Проверьте подключение.' };
    }
  };

  const register = async (name: string, email: string, phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!name || name.trim().length < 2) {
      return { success: false, error: 'Имя должно быть не менее 2 символов' };
    }
    if (password.length < 8) {
      return { success: false, error: 'Пароль должен быть не менее 8 символов' };
    }

    if (!isSupabaseConfigured()) {
      const mockUser: User = {
        id: generateSecureToken().substring(0, 16),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        role: isAdminEmail(email) ? 'admin' : 'user',
      };
      setUser(mockUser);
      saveUserSession(mockUser);
      // Save to users registry for admin panel
      saveUserToRegistry(mockUser);
      return { success: true };
    }

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: { name: name.trim(), phone: phone.trim() } },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          return { success: false, error: 'Пользователь с таким email уже существует' };
        }
        return { success: false, error: 'Ошибка регистрации. Попробуйте позже.' };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Ошибка сети. Проверьте подключение.' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
      } catch { /* ignore */ }
    }
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAdmin: user?.role === 'admin',
        isModerator: user?.role === 'admin' || user?.role === 'moderator',
        isPartner: user?.role === 'partner',
        partnerId: user?.role === 'partner' ? user.id : null,
        hasAdminAccess: user?.role === 'admin' || user?.role === 'moderator',
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
