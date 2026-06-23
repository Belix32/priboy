const VERSION_KEY = 'priboi_build_id';

export const APP_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID as string;

async function purgeClientCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

export async function ensureFreshClient(): Promise<void> {
  if (!APP_BUILD_ID) return;

  const stored = localStorage.getItem(VERSION_KEY);
  if (!stored) {
    localStorage.setItem(VERSION_KEY, APP_BUILD_ID);
    return;
  }

  if (stored === APP_BUILD_ID) return;

  localStorage.setItem(VERSION_KEY, APP_BUILD_ID);
  await purgeClientCaches();
  window.location.reload();
}
