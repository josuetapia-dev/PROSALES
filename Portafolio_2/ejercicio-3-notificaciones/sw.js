// =====================================================================
// Prosales Campo · Ejercicio 3 · SERVICE WORKER DE NOTIFICACIONES
//
// La página NO crea las notificaciones: le manda un mensaje al SW y es
// el SW quien llama a self.registration.showNotification(). Así el aviso
// aparece aunque la pestaña esté en segundo plano o minimizada.
// =====================================================================

const VERSION = 'v1.1.0';
const ICONO = new URL('../comun/icons/icon-192.png', self.location).href;
const PAGINA = new URL('./', self.location).href;

const ACCIONES = {
  llamar: { emoji: '📞', titulo: 'Llamar a' },
  cotizacion: { emoji: '📄', titulo: 'Enviar cotización a' },
  visita: { emoji: '📍', titulo: 'Volver a visitar a' },
  cobro: { emoji: '💰', titulo: 'Cobrar a' },
};

let pendientes = 0;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Avisa a las pestañas abiertas para el registro de eventos de la página */
async function avisarPagina(evento, detalle, cliente = "") {
  const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientes.forEach((c) => c.postMessage({ tipo: 'sw-evento', evento, detalle, cliente, pendientes, version: VERSION }));
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// ---------------------------------------------------------------------
// Construye y muestra la notificación personalizada
// ---------------------------------------------------------------------
function mostrar(r) {
  const accion = ACCIONES[r.tipo] || ACCIONES.llamar;
  return self.registration.showNotification(`${accion.emoji} ${accion.titulo} ${r.cliente}`, {
    body: r.nota || 'Tienes un seguimiento pendiente en Prosales.',
    icon: ICONO,                          // imagen grande de la notificación
    vibrate: [200, 100, 200, 100, 300],   // patrón de vibración (Android)
    tag: `prosales-${r.id}`,              // misma etiqueta = reemplaza en lugar de apilar
    renotify: true,
    requireInteraction: false,
    timestamp: Date.now(),
    data: { ...r, url: `${PAGINA}?cliente=${encodeURIComponent(r.cliente)}` },
    actions: [
      { action: 'abrir', title: 'Ver cliente' },
      { action: 'posponer', title: 'Recordar en 1 min' },
    ],
  });
}

// ---------------------------------------------------------------------
// MESSAGE: la página pide programar un recordatorio
// ---------------------------------------------------------------------
self.addEventListener('message', (event) => {
  const { tipo, recordatorio } = event.data || {};
  if (tipo !== 'PROGRAMAR') return;

  pendientes++;
  // waitUntil mantiene vivo al SW durante la espera (los navegadores lo
  // permiten por algunos minutos, suficiente para recordatorios cortos)
  event.waitUntil((async () => {
    await avisarPagina('programado', `"${recordatorio.cliente}" en ${recordatorio.segundos} s`, recordatorio.cliente);
    await esperar(recordatorio.segundos * 1000);
    await mostrar(recordatorio);
    pendientes--;
    await avisarPagina('mostrada', `showNotification() → ${recordatorio.cliente}`, recordatorio.cliente);
  })());
});

// ---------------------------------------------------------------------
// NOTIFICATIONCLICK: qué pasa al tocar la notificación o sus botones
// ---------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  const n = event.notification;
  n.close();

  if (event.action === 'posponer') {
    pendientes++;
    event.waitUntil((async () => {
      await avisarPagina('pospuesta', `${n.data.cliente}: se recordará en 1 min`, n.data.cliente);
      await esperar(60 * 1000);
      await mostrar(n.data);
      pendientes--;
      await avisarPagina('mostrada', `showNotification() → ${n.data.cliente} (pospuesta)`, n.data.cliente);
    })());
    return;
  }

  // "Ver cliente" o tocar el cuerpo: enfocar la pestaña abierta o abrir una nueva
  event.waitUntil((async () => {
    const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const abierta = clientes.find((c) => c.url.startsWith(PAGINA));
    if (abierta) {
      await abierta.focus();
      abierta.postMessage({ tipo: 'abrir-cliente', cliente: n.data.cliente });
    } else {
      await self.clients.openWindow(n.data.url);
    }
    await avisarPagina('click', `Se tocó la notificación de ${n.data.cliente}`, n.data.cliente);
  })());
});

self.addEventListener('notificationclose', (event) => {
  event.waitUntil(avisarPagina('cerrada', `Se descartó la notificación de ${event.notification.data.cliente}`, event.notification.data.cliente));
});
