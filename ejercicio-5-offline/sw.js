// =====================================================================
// Prosales · Ejercicio 5 · INTERCEPTOR DE PETICIONES Y MODO OFFLINE
//
// Sobre la caché del Ejercicio 4, este Service Worker agrega
// RESPUESTAS ALTERNATIVAS (fallbacks) en el evento fetch:
//
//   · Página que no está en caché + red caída → offline.html
//   · Imagen que no está en caché + red caída → imagen SVG de reemplazo
//   · Datos sin caché + red caída            → JSON 503 { offline: true }
//
// Además avisa a la app cuándo se pierde y cuándo vuelve la conexión.
// =====================================================================

const VERSION = 'v3.1.0';
const PREFIJO = 'prosales-ej5-';
const CACHE_SHELL = `${PREFIJO}shell-${VERSION}`;
const CACHE_RUNTIME = `${PREFIJO}runtime-${VERSION}`;
const CACHE_FUENTES = `${PREFIJO}fuentes-${VERSION}`;
const CACHES_VIGENTES = [CACHE_SHELL, CACHE_RUNTIME, CACHE_FUENTES];

// Plantilla que se muestra cuando una página no está disponible sin conexión
const OFFLINE_URL = './offline.html';

// App Shell precacheado. "ayuda.html" NO está aquí a propósito: se guarda
// solo si se visita con internet, y sirve para probar el fallback.
// Las imágenes promocionales del manifest tampoco (pesan ~1 MB y solo las usa
// el instalador): se guardan en la caché de runtime cuando Chrome las pide.
const APP_SHELL = [
  './',
  './index.html',
  OFFLINE_URL,
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './data/leads.json',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

const FUENTES_CSS = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';

// Imagen de reemplazo (SVG en línea, no necesita red ni caché)
const IMAGEN_OFFLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120">
  <rect width="160" height="120" rx="12" fill="#EFEFE8"/>
  <path d="M58 78l18-20 12 13 8-9 16 16z" fill="#C9C7BC"/><circle cx="100" cy="44" r="8" fill="#C9C7BC"/>
  <text x="80" y="104" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#5B5873">Imagen no disponible sin conexión</text>
</svg>`;

let peticiones = 0;
let conectado = true;   // último estado de red observado por el SW

async function notificar(evento, detalle = '', extra = {}) {
  console.log(`[SW ${VERSION}] ${evento}`, detalle);
  const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientes.forEach((c) => c.postMessage({ tipo: 'sw-evento', evento, detalle, version: VERSION, hora: Date.now(), ...extra }));
}

/** Avisa a la app SOLO cuando el estado de la red cambia */
function cambiarConexion(estado) {
  if (estado === conectado) return;
  conectado = estado;
  notificar(estado ? 'online' : 'offline', estado ? 'La red respondió de nuevo' : 'La red no responde', { conexion: estado });
}

/** fetch() a la red que además registra si hubo conexión */
async function desdeRed(request) {
  try {
    const res = await fetch(request);
    cambiarConexion(true);
    return res;
  } catch (err) {
    cambiarConexion(false);   // fetch() solo lanza error cuando NO hay red (un 404 sí resuelve)
    throw err;
  }
}

async function precachearFuentes() {
  try {
    const cache = await caches.open(CACHE_FUENTES);
    const res = await fetch(FUENTES_CSS, { mode: 'cors' });
    if (!res.ok) return 0;
    const css = await res.clone().text();
    await cache.put(FUENTES_CSS, res);
    const archivos = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map((m) => m[1]))];
    await cache.addAll(archivos);
    return archivos.length;
  } catch (err) {
    console.warn('[SW] No se pudieron precachear las fuentes:', err);
    return 0;
  }
}

// ---------------------------------------------------------------------
// INSTALL: precaché del App Shell + la plantilla offline
// ---------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_SHELL);
    await cache.addAll(APP_SHELL);   // incluye offline.html: el fallback siempre está disponible
    const fuentes = await precachearFuentes();
    await notificar('install', `App Shell en caché: ${APP_SHELL.length} archivos + ${fuentes} fuentes`);
  })());
});

// ---------------------------------------------------------------------
// ACTIVATE: limpieza de cachés viejas de este ejercicio
// ---------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const viejas = (await caches.keys()).filter((n) => n.startsWith(PREFIJO) && !CACHES_VIGENTES.includes(n));
    await Promise.all(viejas.map((n) => caches.delete(n)));
    await self.clients.claim();
    await notificar('activate', viejas.length ? `Activo. Se borraron ${viejas.length} cachés viejas` : 'Activo y controlando la app');
  })());
});

// ---------------------------------------------------------------------
// FETCH: estrategia por tipo de recurso + respuestas alternativas
// ---------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, CACHE_FUENTES));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Comprobación de conexión de la app (?ping): siempre a la red, nunca a la caché
  if (url.searchParams.has('ping')) {
    event.respondWith(desdeRed(request).catch(() => new Response(null, { status: 503, statusText: 'Sin conexión' })));
    return;
  }

  // Navegación entre páginas (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(paginas(request));
    return;
  }

  if (url.pathname.includes('/data/')) {
    event.respondWith(staleWhileRevalidate(request, event));
    return;
  }

  event.respondWith(cacheFirst(request, CACHE_RUNTIME));
});

/**
 * PÁGINAS (navegación)
 * 1. ¿Está en caché? (App Shell o una página ya visitada) → se responde.
 * 2. Si no, se intenta la red y se guarda una copia.
 * 3. Si la red FALLA → FALLBACK: plantilla offline.html.
 */
async function paginas(request) {
  const numero = ++peticiones;
  const enCache = await caches.match(request, { ignoreSearch: true });
  if (enCache) {
    reportar(numero, request, 'cache');
    return enCache;
  }

  try {
    const res = await desdeRed(request);
    if (res.ok) (await caches.open(CACHE_RUNTIME)).put(request, res.clone());
    reportar(numero, request, 'red');
    return res;
  } catch {
    reportar(numero, request, 'fallback');
    notificar('fallback', `Sin red: se mostró offline.html en lugar de ${rutaCorta(request)}`);
    return caches.match(OFFLINE_URL);
  }
}

/**
 * CACHE FIRST con respuesta alternativa
 * Si el recurso no está en caché y la red falla, se responde algo útil
 * en lugar del error nativo del navegador.
 */
async function cacheFirst(request, cacheDestino) {
  const numero = ++peticiones;
  const enCache = await caches.match(request);
  if (enCache) {
    reportar(numero, request, 'cache');
    return enCache;
  }

  try {
    const res = await desdeRed(request);
    if (res.ok || res.type === 'opaque') (await caches.open(cacheDestino)).put(request, res.clone());
    reportar(numero, request, 'red');
    return res;
  } catch {
    reportar(numero, request, 'fallback');
    if (request.destination === 'image') {
      return new Response(IMAGEN_OFFLINE, { headers: { 'Content-Type': 'image/svg+xml' } });
    }
    return Response.error();
  }
}

/**
 * STALE-WHILE-REVALIDATE para los datos, con respuesta JSON de respaldo
 */
async function staleWhileRevalidate(request, event) {
  const numero = ++peticiones;
  const cache = await caches.open(CACHE_SHELL);
  const enCache = await cache.match(request);

  const actualizacion = desdeRed(request)
    .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
    .catch(() => null);
  event.waitUntil(actualizacion);

  if (enCache) {
    reportar(numero, request, 'cache');
    return enCache;
  }
  const res = await actualizacion;
  if (res) {
    reportar(numero, request, 'red');
    return res;
  }
  reportar(numero, request, 'fallback');
  return new Response(JSON.stringify({ offline: true, mensaje: 'Sin conexión y sin datos guardados' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

const rutaCorta = (request) => new URL(request.url).pathname.split('/').slice(-2).join('/');

function reportar(numero, request, origen) {
  const textos = { cache: 'desde caché', red: 'desde la red', fallback: 'respuesta alternativa (sin red)' };
  notificar('fetch', `#${numero} ${rutaCorta(request)} · ${textos[origen]}`, { origen });
}

// ---------------------------------------------------------------------
// MESSAGE
// ---------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data?.tipo === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.tipo === 'VERSION') {
    event.source.postMessage({ tipo: 'sw-version', version: VERSION, peticiones, conexion: conectado });
  }
});
