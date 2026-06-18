import type { AuthError } from '@supabase/supabase-js';

export function mapAuthError(error: AuthError | Error | null | undefined): string {
  if (!error) return 'Неизвестная ошибка';

  const message = (error.message || '').toLowerCase();
  const status = 'status' in error ? (error as AuthError).status : undefined;

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'Неверный email или пароль';
  }

  if (message.includes('email not confirmed') || message.includes('not confirmed')) {
    return 'Подтвердите email по ссылке из письма или отключите подтверждение в Supabase';
  }

  if (message.includes('user already registered') || message.includes('already been registered')) {
    return 'Пользователь с таким email уже зарегистрирован';
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

  return 'Ошибка входа. Проверьте email и пароль';
}

export function isDuplicateSignup(
  user: { identities?: unknown[] | null } | null | undefined,
): boolean {
  return !!user && Array.isArray(user.identities) && user.identities.length === 0;
}
