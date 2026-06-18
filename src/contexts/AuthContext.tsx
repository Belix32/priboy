import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import type { Profile } from '../lib/travel/types';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at?: string;
  role?: 'user' | 'moderator' | 'admin' | 'partner';
  partnerId?: string | null;
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
  register: (name: string, email: string, phone: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const data = {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role || 'user',
    partnerId: user.partnerId,
    token,
  };
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
      name: data.name || '',
      phone: data.phone || '',
      role: data.role || 'user',
      partnerId: data.partnerId || null,
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

function getAdminEmail(): string {
  return import.meta.env.VITE_ADMIN_EMAIL || '';
}

function isAdminEmail(email: string): boolean {
  const adminEmail = getAdminEmail();
  return adminEmail !== '' && email.toLowerCase().trim() === adminEmail.toLowerCase().trim();
}

async function syncAdminRole(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = getSupabaseClient();
    await supabase.rpc('sync_admin_role');
  } catch {
    /* RPC may not exist until migration 002 is applied */
  }
}

async function fetchProfile(authId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_id', authId)
      .single();
    if (error) return null;
    return data as Profile;
  } catch {
    return null;
  }
}

async function loadUserFromSession(email: string, authId: string): Promise<User> {
  await syncAdminRole();
  const profile = await fetchProfile(authId);
  if (profile) {
    return profileToUser(profile, email);
  }
  return {
    id: authId,
    name: email.split('@')[0],
    email,
    phone: '',
    role: isAdminEmail(email) ? 'admin' : 'user',
  };
}

function profileToUser(profile: Profile, email: string): User {
  return {
    id: profile.auth_id,
    name: profile.name || email.split('@')[0],
    email,
    phone: profile.phone || '',
    role: profile.role,
    partnerId: profile.partner_id,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user) return;

      const email = session.user.email || '';
      const userObj = await loadUserFromSession(email, session.user.id);
      setUser(userObj);
      saveUserSession(userObj);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    async function init() {
      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseClient();
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            const email = sessionData.session.user.email || '';
            const userObj = await loadUserFromSession(email, sessionData.session.user.id);
            setUser(userObj);
            saveUserSession(userObj);
          }

          supabase.auth.onAuthStateChange(async (_event: string, session: { user: { id: string; email?: string } } | null) => {
            if (session?.user) {
              const email = session.user.email || '';
              const userObj = await loadUserFromSession(email, session.user.id);
              setUser(userObj);
              saveUserSession(userObj);
            } else {
              setUser(null);
              clearSession();
            }
          });
        } catch {
          const localUser = loadUserSession();
          if (localUser) setUser(localUser);
        }
      } else {
        const localUser = loadUserSession();
        if (localUser) setUser(localUser);
      }
      setIsLoading(false);
    }
    init();
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
        const userObj = await loadUserFromSession(data.user.email || email, data.user.id);
        setUser(userObj);
        saveUserSession(userObj);
        return { success: true, role: userObj.role };
      }

      return { success: false, error: 'Ошибка входа' };
    } catch {
      return { success: false, error: 'Ошибка сети. Проверьте подключение.' };
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string,
  ): Promise<{ success: boolean; error?: string; role?: string }> => {
    if (!name || name.trim().length < 2) {
      return { success: false, error: 'Имя должно быть не менее 2 символов' };
    }
    if (password.length < 8) {
      return { success: false, error: 'Пароль должен быть не менее 8 символов' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!isSupabaseConfigured()) {
      const mockUser: User = {
        id: generateSecureToken().substring(0, 16),
        name: trimmedName,
        email: normalizedEmail,
        phone: trimmedPhone,
        role: isAdminEmail(normalizedEmail) ? 'admin' : 'user',
      };
      setUser(mockUser);
      saveUserSession(mockUser);
      return { success: true, role: mockUser.role };
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { name: trimmedName, phone: trimmedPhone } },
      });

      if (error) {
        if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
          return { success: false, error: 'Пользователь с таким email уже существует' };
        }
        return { success: false, error: 'Ошибка регистрации. Попробуйте позже.' };
      }

      let authUser = data.user;
      let session = data.session;

      // Supabase often returns user without session — sign in immediately
      if (!session && authUser) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          if (signInError.message.toLowerCase().includes('email not confirmed')) {
            return {
              success: false,
              error: 'Подтвердите email по ссылке из письма, затем войдите',
            };
          }
          return { success: false, error: 'Аккаунт создан, но не удалось войти. Попробуйте войти вручную.' };
        }

        authUser = signInData.user;
        session = signInData.session;
      }

      if (!authUser) {
        return { success: false, error: 'Ошибка регистрации' };
      }

      // Ensure profile has name/phone (trigger may have created it already)
      await supabase
        .from('profiles')
        .update({ name: trimmedName, phone: trimmedPhone })
        .eq('auth_id', authUser.id);

      const userObj = await loadUserFromSession(authUser.email || normalizedEmail, authUser.id);
      const fullUser: User = { ...userObj, name: trimmedName, phone: trimmedPhone };
      setUser(fullUser);
      saveUserSession(fullUser);

      return { success: true, role: fullUser.role };
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
        partnerId: user?.partnerId || null,
        hasAdminAccess: user?.role === 'admin' || user?.role === 'moderator',
        login,
        register,
        logout,
        refreshProfile,
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
