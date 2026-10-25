// =====================================================================
// Prosales Campo · Ejercicio 5 · SERVICE WORKER
//
//   · Archivos de la página → Cache First (abre sin internet)
//   · Imágenes de productos → Cache First + imagen de reemplazo
//   · JSON de la API        → NO se intercepta: lo maneja app.js con
//                             Network-First y la copia en IndexedDB
// =====================================================================

const VERSION = 'v1.0.0';
const PREFIJO = 'prosales-campo-ej5-';
const CACHE_SHELL = `${PREFIJO}shell-${VERSION}`;
const CACHE_IMAGENES = `${PREFIJO}imagenes-${VERSION}`;

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './css/ejercicio.css',
  './js/app.js',
  '../comun/styles.css',
  '../comun/ui.js',
  '../comun/icons/favicon.svg',
  '../comun/icons/icon-192.png',
];

const IMAGEN_OFFLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120">
  <rect width="160" height="120" fill="#EFEFE8"/>
  <path d="M58 72l18-20 12 13 8-9 16 16z" fill="#C9C7BC"/><circle cx="100" cy="40" r="8" fill="#C9C7BC"/>
  <text x="80" y="100" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#5B5873">Sin conexión</text>
</svg>`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_SHELL).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const vigentes = [CACHE_SHELL, CACHE_IMAGENES];
    const viejas = (await caches.keys()).filter((n) => n.startsWith(PREFIJO) && !vigentes.includes(n));
    await Promise.all(viejas.map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Imágenes de productos (cdn.dummyjson.com)
  if (request.destination === 'image' && url.origin !== self.location.origin) {
    event.respondWith(cacheFirst(request, CACHE_IMAGENES, true));
    return;
  }

  const esFuente = url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com';
  if (url.origin === self.location.origin || esFuente) {
    event.respondWith(cacheFirst(request, CACHE_SHELL, false));
  }
  // Cualquier otra petición (la API) pasa directo a la red
});

async function cacheFirst(request, nombreCache, esImagen) {
  const enCache = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
  if (enCache) return enCache;
  try {
    const res = await fetch(request);
    if (res.ok || res.type === 'opaque') (await caches.open(nombreCache)).put(request, res.clone());
    return res;
  } catch {
    if (esImagen) return new Response(IMAGEN_OFFLINE, { headers: { 'Content-Type': 'image/svg+xml' } });
    if (request.mode === 'navigate') return caches.match('./index.html');
    return Response.error();
  }
}
