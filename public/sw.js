const CACHE = 'c10k-v5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['/', '/tienda']).catch(() => {})
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/') || event.request.url.includes('/_next/')) return;
  // Nunca interceptar navegaciones de página (HTML): cachear estas por URL ignora
  // el estado de sesión y, si el fetch sigue un redirect (ej. a /login por falta de
  // auth) o la red falla en móvil, el SW puede servir después una página vieja o
  // equivocada (ej. mandar a un usuario ya logueado de vuelta a /login). Dejar que
  // el navegador maneje las páginas siempre por red; el SW solo cachea assets.
  if (event.request.mode === 'navigate') return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
