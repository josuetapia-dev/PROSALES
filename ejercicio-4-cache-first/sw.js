// =====================================================================
// Prosales · Ejercicio 4 · CACHE API Y ESTRATEGIA CACHE FIRST
//
// Sobre el ciclo de vida del Ejercicio 3, este Service Worker:
//   1. INSTALL  → crea una caché con la Cache API y guarda el App Shell
//                 (HTML, CSS, JS e imágenes base) + las tipografías.
//   2. ACTIVATE → borra las cachés de versiones anteriores.
//   3. FETCH    → CACHE FIRST: busca primero en la caché y solo si el
//                 recurso no está, va a la red (y lo guarda para después).
// =====================================================================

// Al cambiar la versión cambian los nombres de las cachés: en "activate"
// se eliminan las viejas y el App Shell se descarga de nuevo.
const VERSION = 'v2.0.2';
const PREFIJO = 'prosales-ej4-';               // cada ejercicio comparte localhost: el prefijo evita borrar cachés ajenas
const CACHE_SHELL = `${PREFIJO}shell-${VERSION}`;      // App Shell precacheado
const CACHE_RUNTIME = `${PREFIJO}runtime-${VERSION}`;  // recursos que se guardan al vuelo
const CACHE_FUENTES = `${PREFIJO}fuentes-${VERSION}`;  // Google Fonts
const CACHES_VIGENTES = [CACHE_SHELL, CACHE_RUNTIME, CACHE_FUENTES];

// Recursos estáticos del App Shell: todo lo necesario para pintar la app sin red
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './data/leads.json',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './screenshots/escritorio.png',   // Chrome las pide para el instalador enriquecido del manifest
  './screenshots/movil.png',
];

// Debe coincidir EXACTAMENTE con el <link> de index.html
const FUENTES_CSS = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';

let peticiones = 0;

async function notificar(evento, detalle = '', extra = {}) {
  console.log(`[SW ${VERSION}] ${evento}`, detalle);
  const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientes.forEach((c) => c.postMessage({ tipo: 'sw-evento', evento, detalle, version: VERSION, hora: Date.now(), ...extra }));
}

/**
 * Precachea Google Fonts: descarga la hoja de estilos, extrae las URL de
 * los archivos .woff2 que contiene y los guarda también. Así la tipografía
 * funciona sin conexión desde la primera visita.
 * Si falla (por ejemplo, sin internet), NO bloquea la instalación.
 */
async function precachearFuentes() {
  try {
    const cache = await caches.open(CACHE_FUENTES);
    const res = await fetch(FUENTES_CSS, { mode: 'cors' });
    if (!res.ok) return 0;
    const css = await res.clone().text();
    await cache.put(FUENTES_CSS, res);
    // Set: la fuente es variable y el mismo .woff2 se repite en cada peso;
    // addAll() falla si recibe URLs duplicadas.
    const archivos = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map((m) => m[1]))];
    await cache.addAll(archivos);
    return archivos.length;
  } catch (err) {
    console.warn('[SW] No se pudieron precachear las fuentes:', err);
    return 0;
  }
}

// ---------------------------------------------------------------------
// 1) INSTALL: creación de la caché y almacenamiento del App Shell
// ---------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // caches.open() crea la caché si no existe
    const cache = await caches.open(CACHE_SHELL);

    // addAll() descarga y guarda TODOS los recursos. Es atómico: si uno
    // solo falla, la instalación falla y no queda un App Shell a medias.
    await cache.addAll(APP_SHELL);
    const fuentes = await precachearFuentes();

    await notificar('install', `App Shell en caché: ${APP_SHELL.length} archivos + ${fuentes} fuentes`);
  })());
});

// ---------------------------------------------------------------------
// 2) ACTIVATE: limpieza de cachés de versiones anteriores
// ---------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const nombres = await caches.keys();
    const viejas = nombres.filter((n) => n.startsWith(PREFIJO) && !CACHES_VIGENTES.includes(n));
    await Promise.all(viejas.map((n) => caches.delete(n)));

    await self.clients.claim();
    await notificar('activate', viejas.length
      ? `Activo. Se borraron ${viejas.length} cachés viejas`
      : 'Activo y controlando la app');
  })());
});

// ---------------------------------------------------------------------
// 3) FETCH: elegir estrategia según el tipo de recurso
// ---------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Tipografías de Google: Cache First (sus archivos nunca cambian)
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, CACHE_FUENTES));
    return;
  }

  // Cualquier otro origen externo: no se toca
  if (url.origin !== self.location.origin) return;

  // Datos de leads: Stale-While-Revalidate (rápido desde caché y se actualiza en segundo plano)
  if (url.pathname.includes('/data/')) {
    event.respondWith(staleWhileRevalidate(request, event));
    return;
  }

  // Recursos estáticos del App Shell: CACHE FIRST
  event.respondWith(cacheFirst(request, CACHE_RUNTIME));
});

/**
 * CACHE FIRST
 * 1. Busca la petición en la caché.
 * 2. Si está → responde con la copia guardada (sin tocar la red).
 * 3. Si no está → la pide a la red, guarda una copia y la devuelve.
 */
async function cacheFirst(request, cacheDestino) {
  const numero = ++peticiones;
  // En navegaciones se ignora el ?query (ej. ?source=pwa) para encontrar index.html
  const enCache = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
  if (enCache) {
    reportar(numero, request, 'cache');
    return enCache;
  }

  const respuesta = await fetch(request);
  // Solo se guardan respuestas válidas (las "opaque" son de otros orígenes sin CORS)
  if (respuesta.ok || respuesta.type === 'opaque') {
    const cache = await caches.open(cacheDestino);
    cache.put(request, respuesta.clone());   // clone(): un Response solo se puede leer una vez
  }
  reportar(numero, request, 'red');
  return respuesta;
}

/**
 * STALE-WHILE-REVALIDATE (para los datos)
 * Responde al instante con la caché y, en paralelo, pide la versión
 * nueva a la red para la próxima vez.
 */
async function staleWhileRevalidate(request, event) {
  const numero = ++peticiones;
  const cache = await caches.open(CACHE_SHELL);
  const enCache = await cache.match(request);

  const actualizacion = fetch(request)
    .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
    .catch(() => null);
  event.waitUntil(actualizacion);   // el SW sigue vivo hasta terminar la actualización

  if (enCache) {
    reportar(numero, request, 'cache');
    return enCache;
  }
  const res = await actualizacion;
  reportar(numero, request, 'red');
  return res || Response.error();
}

function reportar(numero, request, origen) {
  const ruta = new URL(request.url).pathname.split('/').slice(-2).join('/');
  notificar('fetch', `#${numero} ${ruta} · ${origen === 'cache' ? 'desde caché' : 'desde la red'}`, { origen });
}

// ---------------------------------------------------------------------
// 4) MESSAGE
// ---------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data?.tipo === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.tipo === 'VERSION') {
    event.source.postMessage({ tipo: 'sw-version', version: VERSION, peticiones });
  }
});
