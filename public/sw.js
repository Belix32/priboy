const CACHE_NAME = 'priboi-shell-v4';
const PRECACHE = ['/manifest.webmanifest', '/icons/icon-192.svg', '/icons/icon-512.svg'];

function isAssetPath(pathname) {
  return pathname.startsWith('/assets/');
}

function isValidAssetResponse(response) {
  if (!response.ok) return false;
  const type = response.headers.get('content-type') || '';
  return !type.includes('text/html');
}

async function bustCachesAndReloadClients() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  await Promise.all(clients.map((client) => client.navigate(client.url)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html')),
    );
    return;
  }

  if (isAssetPath(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (!isValidAssetResponse(response)) {
            await bustCachesAndReloadClients();
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        } catch {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          throw new Error('asset_fetch_failed');
        }
      })(),
    );
    return;
  }

  event.respondWith(fetch(event.request));
});
