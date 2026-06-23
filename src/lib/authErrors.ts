import type { AuthError } from '@supabase/supabase-js';

export type AuthErrorContext = 'login' | 'register';

export function mapAuthError(
  error: AuthError | Error | null | undefined,
  context: AuthErrorContext = 'login',
): string {
  if (!error) return 'Неизвестная ошибка';

  const message = (error.message || '').toLowerCase();
  const status = 'status' in error ? (error as AuthError).status : undefined;
  const name = (error.name || '').toLowerCase();

  if (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed') ||
    message.includes('abort') ||
    name.includes('aborterror') ||
    name.includes('authretryablefetcherror')
  ) {
    return context === 'register'
      ? 'Не удалось завершить регистрацию. Проверьте интернет и попробуйте снова'
      : 'Ошибка сети. Проверьте подключение';
  }

  if (message.includes('504') || message.includes('gateway timeout')) {
    return 'Сервер отвечает слишком долго. Попробуйте ещё раз через минуту';
  }

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return context === 'register'
      ? 'Не удалось войти после регистрации. Если включено подтверждение email — подтвердите почту и войдите вручную'
      : 'Неверный email или пароль';
  }

  if (message.includes('email not confirmed') || message.includes('not confirmed')) {
    return 'Подтвердите email по ссылке из письма, затем войдите';
  }

  if (message.includes('user already registered') || message.includes('already been registered')) {
    return 'Пользователь с таким email уже зарегистрирован';
  }

  if (
    message.includes('database error') ||
    message.includes('unexpected_failure') ||
    message.includes('saving new user')
  ) {
    return 'Ошибка на сервере при создании аккаунта. Попробуйте снова через минуту';
  }

  if (message.includes('password') && message.includes('weak')) {
    return 'Пароль слишком простой — используйте минимум 8 символов';
  }

  if (message.includes('rate limit') || message.includes('too many') || status === 429) {
    return 'Слишком много попыток. Подождите минуту и попробуйте снова';
  }

  if (message.includes('invalid jwt') || message.includes('api key') || message.includes('invalid apikey')) {
    return 'Ошибка конфигурации Supabase. Проверьте VITE_SUPABASE_ANON_KEY на Vercel';
  }

  if (
    message.includes('signups not allowed') ||
    message.includes('email signups are disabled') ||
    (message.includes('signup') && message.includes('disabled')) ||
    message.includes('email_provider_disabled') ||
    message.includes('email logins are disabled')
  ) {
    return 'Email-провайдер отключён в Supabase. Включите: Authentication → Sign In / Providers → Email → Enable Email provider. Confirm email — OFF.';
  }

  if (import.meta.env.DEV) {
    return error.message || 'Ошибка авторизации';
  }

  return context === 'register'
    ? 'Ошибка регистрации. Попробуйте снова или войдите, если аккаунт уже создан'
    : 'Ошибка входа. Проверьте email и пароль';
}

export function isDuplicateSignup(
  user: { identities?: unknown[] | null } | null | undefined,
): boolean {
  return !!user && Array.isArray(user.identities) && user.identities.length === 0;
}

export function needsEmailConfirmation(
  user: { email_confirmed_at?: string | null; confirmed_at?: string | null } | null | undefined,
): boolean {
  return !!user && !user.email_confirmed_at && !user.confirmed_at;
}
