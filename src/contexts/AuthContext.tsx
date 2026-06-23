import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { mapAuthError, isDuplicateSignup, needsEmailConfirmation } from '../lib/authErrors';
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
  register: (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; role?: string; emailConfirmationRequired?: boolean }>;
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

async function ensureUserProfile(
  authId: string,
  email: string,
  name: string,
  phone: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = getSupabaseClient();
    const { data: existing, error: selectError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_id', authId)
      .maybeSingle();

    if (selectError) return;

    if (!existing) {
      const { error: insertError } = await supabase.from('profiles').insert({
        auth_id: authId,
        name: name || email.split('@')[0],
        phone: phone || '',
        role: isAdminEmail(email) ? 'admin' : 'user',
      });
      if (insertError && insertError.code !== '23505') {
        console.error('ensureUserProfile insert failed', insertError.message);
      }
      return;
    }

    if (name || phone) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
        })
        .eq('auth_id', authId);
      if (updateError) {
        console.error('ensureUserProfile update failed', updateError.message);
      }
    }
  } catch {
    /* Profile is also created by DB trigger — registration must not fail here */
  }
}

function buildFallbackUser(authId: string, email: string, name: string, phone: string): User {
  return {
    id: authId,
    name: name || email.split('@')[0],
    email,
    phone,
    role: isAdminEmail(email) ? 'admin' : 'user',
  };
}

async function completeRegistration(
  authId: string,
  email: string,
  name: string,
  phone: string,
  setUser: (user: User | null) => void,
): Promise<{ success: true; role: string }> {
  await ensureUserProfile(authId, email, name, phone);

  let userObj: User;
  try {
    userObj = await loadUserFromSession(email, authId);
  } catch {
    userObj = buildFallbackUser(authId, email, name, phone);
  }

  const fullUser: User = { ...userObj, name, phone };
  setUser(fullUser);
  saveUserSession(fullUser);
  return { success: true, role: fullUser.role || 'user' };
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

async function loadUserFromSession(
  email: string,
  authId: string,
  options?: { awaitAdminSync?: boolean },
): Promise<User> {
  const adminSync = syncAdminRole().catch(() => {});
  const profile = await fetchProfile(authId);
  if (options?.awaitAdminSync) await adminSync;
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

const AUTH_SESSION_TIMEOUT_MS = 5_000;

async function getSessionWithTimeout(): Promise<{ data: { session: Session | null } }> {
  const supabase = getSupabaseClient();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('auth_timeout')), AUTH_SESSION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([supabase.auth.getSession(), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadUserSession());
  const [isLoading, setIsLoading] = useState(() => loadUserSession() === null);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data: sessionData } = await getSessionWithTimeout();
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
    let cancelled = false;

    async function refreshSession() {
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: sessionData } = await getSessionWithTimeout();
        if (cancelled) return;

        if (sessionData?.session?.user) {
          const email = sessionData.session.user.email || '';
          const userObj = await loadUserFromSession(email, sessionData.session.user.id);
          if (!cancelled) {
            setUser(userObj);
            saveUserSession(userObj);
          }
        } else if (!loadUserSession()) {
          setUser(null);
          clearSession();
        }
      } catch {
        /* keep cached user on network timeouts */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            clearSession();
            return;
          }

          if (!session?.user) return;

          const email = session.user.email || '';
          void loadUserFromSession(email, session.user.id).then((userObj) => {
            setUser(userObj);
            saveUserSession(userObj);
          });
        },
      );

      void refreshSession();

      return () => {
        cancelled = true;
        subscription.unsubscribe();
      };
    }

    setIsLoading(false);
    return () => {
      cancelled = true;
    };
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
        return { success: false, error: mapAuthError(error) };
      }

      if (data?.user) {
        await ensureUserProfile(
          data.user.id,
          data.user.email || email.toLowerCase().trim(),
          data.user.user_metadata?.name || '',
          data.user.user_metadata?.phone || '',
        );
        const userObj = await loadUserFromSession(data.user.email || email, data.user.id, { awaitAdminSync: true });
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
  ): Promise<{ success: boolean; error?: string; role?: string; emailConfirmationRequired?: boolean }> => {
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
        options: {
          data: { name: trimmedName, phone: trimmedPhone },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        return { success: false, error: mapAuthError(error, 'register') };
      }

      if (isDuplicateSignup(data.user)) {
        return {
          success: false,
          error: 'Этот email уже зарегистрирован. Войдите с вашим паролем',
        };
      }

      if (!data.user) {
        return { success: false, error: 'Ошибка регистрации. Попробуйте снова' };
      }

      if (!data.session) {
        if (needsEmailConfirmation(data.user)) {
          try {
            await ensureUserProfile(data.user.id, normalizedEmail, trimmedName, trimmedPhone);
          } catch {
            /* account exists in auth even if profile setup is delayed */
          }
          return {
            success: false,
            emailConfirmationRequired: true,
            error: 'Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите.',
          };
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          return { success: false, error: mapAuthError(signInError, 'register') };
        }

        if (!signInData.user) {
          return { success: false, error: 'Ошибка регистрации. Попробуйте войти вручную' };
        }

        return completeRegistration(
          signInData.user.id,
          signInData.user.email || normalizedEmail,
          trimmedName,
          trimmedPhone,
          setUser,
        );
      }

      return completeRegistration(
        data.user.id,
        data.user.email || normalizedEmail,
        trimmedName,
        trimmedPhone,
        setUser,
      );
    } catch (error) {
      console.error('register failed', error);
      return { success: false, error: mapAuthError(error as Error, 'register') };
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
