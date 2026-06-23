import { APP_BUILD_ID } from './appVersion';

function reloadOnControllerChange(registration: ServiceWorkerRegistration): void {
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated' && navigator.serviceWorker.controller) {
        window.location.reload();
      }
    });
  });
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  const swUrl = APP_BUILD_ID ? `/sw.js?v=${encodeURIComponent(APP_BUILD_ID)}` : '/sw.js';

  const register = () => {
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        reloadOnControllerChange(registration);
        void registration.update();
      })
      .catch(() => {
        // SW optional — ignore registration errors
      });
  };

  window.addEventListener('load', register);

  // Safari restores pages from bfcache with stale assets.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      void navigator.serviceWorker.ready.then((registration) => registration.update());
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void navigator.serviceWorker.ready.then((registration) => registration.update());
    }
  });
}
