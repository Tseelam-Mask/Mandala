const CACHE = 'mandala-v1789338767';
const STATIC = [
  '/Mandala/',
  '/Mandala/index.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return c.addAll(STATIC).catch(()=>{});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Always go to network for API calls
  if (e.request.url.includes('railway.app') || e.request.url.includes('anthropic.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('offline')));
    return;
  }

  // Network-first for HTML navigation (so auth state always reflects server)
  const url = new URL(e.request.url);
  const isHtml = e.request.mode === 'navigate' ||
    url.pathname === '/Mandala/' ||
    url.pathname === '/Mandala/index.html';

  if (isHtml) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for other assets (fonts, icons, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || fresh;
    })
  );
});
