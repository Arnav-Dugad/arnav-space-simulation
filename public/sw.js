const CACHE = 'arnav-space-simulation-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (event.request.mode === 'navigate') {
        try {
          const r = await fetch(event.request);
          if (r.ok) await cache.put('/', r.clone());
          return r;
        } catch {
          return (await cache.match('/')) || Response.error();
        }
      }
      const cached = await cache.match(event.request, { ignoreVary: true });
      if (cached) return cached;
      const r = await fetch(event.request);
      if (r.ok && /\/(assets|textures|data)\//.test(url.pathname))
        await cache.put(event.request, r.clone());
      return r;
    })(),
  );
});
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_PACK') return;
  event.waitUntil(
    (async () => {
      const port = event.ports[0],
        cache = await caches.open(CACHE);
      try {
        const manifest = await fetch('/offline-manifest.json', { cache: 'reload' }).then((r) =>
          r.json(),
        );
        let completed = 0;
        for (const file of manifest.files) {
          const r = await fetch(file, { cache: 'reload' });
          if (!r.ok) throw new Error(file);
          await cache.put(file, r);
          completed++;
          port?.postMessage({ completed, total: manifest.files.length, done: false });
        }
        port?.postMessage({ done: true });
      } catch {
        port?.postMessage({
          done: false,
          completed: 0,
          total: 0,
          error: 'Storage or download failed.',
        });
      }
    })(),
  );
});
