// =====================================================================
// Prosales Campo · Ejercicio 4 · SERVICE WORKER (apoyo)
// Los DATOS viven en IndexedDB; este SW solo guarda los ARCHIVOS de la
// página (Cache First) para poder abrir la bitácora sin internet.
// =====================================================================

const VERSION = 'v1.0.0';
const CACHE = `prosales-campo-ej4-${VERSION}`;

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './css/ejercicio.css',
  './js/db.js',
  './js/app.js',
  '../comun/styles.css',
  '../comun/ui.js',
  '../comun/icons/favicon.svg',
  '../comun/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const viejas = (await caches.keys()).filter((n) => n.startsWith('prosales-campo-ej4-') && n !== CACHE);
    await Promise.all(viejas.map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const esFuente = url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com';
  if (url.origin !== self.location.origin && !esFuente) return;

  event.respondWith((async () => {
    const enCache = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (enCache) return enCache;
    try {
      const res = await fetch(request);
      if (res.ok || res.type === 'opaque') (await caches.open(CACHE)).put(request, res.clone());
      return res;
    } catch {
      return request.mode === 'navigate' ? caches.match('./index.html') : Response.error();
    }
  })());
});
