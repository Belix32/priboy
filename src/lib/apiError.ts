/** Shared API error helper — throw instead of silent empty results */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function throwIfSupabaseError(
  error: { message: string; code?: string } | null,
  fallbackMessage: string,
): void {
  if (error) {
    throw new ApiError(error.message || fallbackMessage, error.code);
  }
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError || err instanceof Error) return err.message;
  return fallback;
}
