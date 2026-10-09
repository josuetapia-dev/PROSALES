// =====================================================================
// Prosales · Ejercicio 3 · SERVICE WORKER
//
// Un Service Worker es un script que el navegador ejecuta en segundo
// plano, separado de la página. No tiene acceso al DOM: se comunica con
// la app mediante mensajes y actúa como un PROXY entre la app y la red.
//
// Ciclo de vida:
//   register (app.js) → install → (waiting) → activate → fetch / message
//
// En este ejercicio el SW intercepta las peticiones pero todavía NO usa
// caché: deja pasar todo a la red. La caché llega en el Ejercicio 4.
// =====================================================================

// Cambiar la versión hace que el navegador detecte un SW "nuevo" y
// repita el ciclo install → waiting → activate.
const VERSION = 'v1.0.0';

let peticiones = 0;   // contador de peticiones interceptadas (se reinicia si el SW se duerme)

/**
 * Envía un evento del ciclo de vida a todas las pestañas abiertas
 * para mostrarlo en el panel "Estado de la app".
 */
async function notificar(evento, detalle = '') {
  console.log(`[SW ${VERSION}] ${evento}`, detalle);
  const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientes.forEach((cliente) => cliente.postMessage({ tipo: 'sw-evento', evento, detalle, version: VERSION, hora: Date.now() }));
}

// ---------------------------------------------------------------------
// 1) INSTALL
//    Se dispara UNA vez por versión, cuando el navegador descarga un
//    sw.js nuevo o distinto. Es el lugar para preparar lo que la app
//    necesitará (en el Ejercicio 4: guardar el App Shell en caché).
// ---------------------------------------------------------------------
self.addEventListener('install', (event) => {
  // waitUntil() mantiene la fase de instalación abierta hasta que la
  // promesa termine; si la promesa falla, la instalación se descarta.
  event.waitUntil(notificar('install', 'Service Worker instalado'));

  // No llamamos a skipWaiting() aquí a propósito: si ya hay una versión
  // activa, la nueva se queda en espera ("waiting") y la app le pregunta
  // al usuario si quiere actualizar (ver el mensaje SKIP_WAITING abajo).
});

// ---------------------------------------------------------------------
// 2) ACTIVATE
//    Se dispara cuando esta versión toma el control. Aquí se limpian los
//    recursos de versiones anteriores (Ejercicio 4) y se reclama el
//    control de las pestañas abiertas.
// ---------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // clients.claim(): controla de inmediato las pestañas ya abiertas,
    // sin esperar a que el usuario recargue la página.
    await self.clients.claim();
    await notificar('activate', 'Service Worker activo y controlando la app');
  })());
});

// ---------------------------------------------------------------------
// 3) FETCH
//    Se dispara por CADA petición que hace la app dentro del scope:
//    HTML, CSS, JS, imágenes, el JSON de leads… El SW decide qué
//    responder. Por ahora: siempre la red ("network only").
// ---------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo intervenimos en peticiones GET de nuestro propio origen;
  // las demás (POST, Google Fonts, etc.) siguen su camino normal.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  const numero = ++peticiones;   // se guarda antes del await para que no se mezclen
  const ruta = new URL(request.url).pathname.split('/').slice(-2).join('/');

  // respondWith() le dice al navegador: "yo me encargo de esta respuesta".
  event.respondWith((async () => {
    const respuesta = await fetch(request);   // passthrough a la red
    notificar('fetch', `#${numero} ${request.destination || 'recurso'} → ${ruta} (${respuesta.status})`);
    return respuesta;
  })());
});

// ---------------------------------------------------------------------
// 4) MESSAGE
//    Canal de comunicación página → Service Worker.
// ---------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data?.tipo === 'SKIP_WAITING') {
    // El usuario aceptó actualizar: la versión en espera se activa ya.
    self.skipWaiting();
  }
  if (event.data?.tipo === 'VERSION') {
    event.source.postMessage({ tipo: 'sw-version', version: VERSION, peticiones });
  }
});
