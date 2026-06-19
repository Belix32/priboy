/** Resolve post-login/register navigation path */

export function getPostAuthPath(
  role: string,
  options?: { from?: string | null; redirect?: string | null },
): string {
  if (role === 'admin' || role === 'moderator') return '/admin';
  if (role === 'partner') return '/partner';

  const target = options?.from || options?.redirect;
  if (target && target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }
  return '/profile';
}
