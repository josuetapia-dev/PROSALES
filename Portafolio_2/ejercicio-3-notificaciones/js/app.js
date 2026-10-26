// =====================================================================
// Prosales Campo · Ejercicio 3 · NOTIFICACIONES LOCALES DESDE EL SW
//
// 1. Notification.requestPermission() pide el permiso (solo tras un clic).
// 2. Se valida el resultado: 'granted' | 'denied' | 'default'.
// 3. La página envía el recordatorio al Service Worker con postMessage y
//    el SW lo muestra con self.registration.showNotification().
// =====================================================================

const { $, toast, log } = UI;
const registro = $('#log');
let enviados = 0;

/** Actividad visible para el usuario; el detalle técnico va a la consola */
function actividad(texto, tecnico) {
  log(registro, texto);
  $('#logVacio').hidden = true;
  if (tecnico) console.info('[Recordatorios]', tecnico);
}

const ACTIVIDAD_SW = {
  programado: (c) => `Recordatorio para ${c} programado`,
  mostrada: (c) => `Se envió el recordatorio de ${c}`,
  pospuesta: (c) => `Pospusiste el recordatorio de ${c} 1 minuto`,
  click: (c) => `Abriste el recordatorio de ${c}`,
  cerrada: (c) => `Descartaste el recordatorio de ${c}`,
};

const TEXTOS = {
  granted: ['Permitidas', 'Listo: Prosales puede enviarte recordatorios.'],
  default: ['Sin decidir', 'Todavía no das permiso. Actívalo para recibir recordatorios.'],
  denied: ['Bloqueadas', 'Bloqueaste las notificaciones para este sitio.'],
};

const soportado = 'Notification' in window && 'serviceWorker' in navigator;
let registroSW = null;

function pintarPermiso() {
  if (!soportado) {
    $('#permPill').textContent = 'No soportado';
    $('#permText').textContent = 'Este navegador no puede mostrar recordatorios.';
    $('#btnProgramar').disabled = true;
    // iPhone/iPad en Safari: solo funcionan con la app instalada en la pantalla de inicio
    $('#iosAviso').hidden = !/iPhone|iPad|iPod/.test(navigator.userAgent);
    return;
  }
  const estado = Notification.permission;
  const [pill, texto] = TEXTOS[estado];
  $('#permPill').dataset.state = estado;
  $('#permPill').textContent = pill;
  $('#permText').textContent = texto;
  $('#btnPermiso').hidden = estado !== 'default';
  $('#permDenied').hidden = estado !== 'denied';
}

// ---------------------------------------------------------------------
// 1) SOLICITAR Y VALIDAR EL PERMISO
// ---------------------------------------------------------------------
async function pedirPermiso(bienvenida = true) {
  const resultado = await Notification.requestPermission();
  pintarPermiso();
  console.info('[Recordatorios] requestPermission() →', resultado);
  if (resultado === 'granted') {
    toast('Notificaciones activadas');
    // Notificación de bienvenida, también desde el SW
    if (bienvenida && registroSW?.active) {
      programar({ cliente: 'Prosales Campo', tipo: 'visita', nota: 'Así se verán tus recordatorios de seguimiento.', segundos: 0 }, true);
    }
  } else if (resultado === 'denied') {
    toast('Bloqueaste las notificaciones');
  }
  return resultado;
}

// ---------------------------------------------------------------------
// 2) REGISTRO DEL SERVICE WORKER
// ---------------------------------------------------------------------
async function registrarSW() {
  if (!('serviceWorker' in navigator)) {
    $('#swPill').textContent = 'No disponibles';
    return;
  }
  try {
    await navigator.serviceWorker.register('sw.js');
    registroSW = await navigator.serviceWorker.ready;   // espera a que esté ACTIVO
    $('#swPill').dataset.state = 'granted';
    $('#swPill').textContent = 'Listos';
    console.info('[Recordatorios] Service Worker activo · scope', registroSW.scope);
  } catch (err) {
    $('#swPill').dataset.state = 'denied';
    $('#swPill').textContent = 'No disponibles';
    console.error('[Recordatorios] No se pudo registrar el Service Worker:', err);
  }
}

// ---------------------------------------------------------------------
// 3) PROGRAMAR: la página → postMessage → SW → showNotification()
// ---------------------------------------------------------------------
function programar(datos, silencioso = false) {
  const recordatorio = { id: Date.now(), ...datos };
  registroSW.active.postMessage({ tipo: 'PROGRAMAR', recordatorio });
  if (!silencioso) {
    toast(datos.segundos ? `Recordatorio programado en ${datos.segundos} s` : 'Enviando notificación…');
  }
}

$('#recordatorioForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cliente = $('#cliente').value.trim();
  if (!cliente) {
    $('#cliente').focus();
    toast('Escribe el cliente');
    return;
  }

  // Validar el permiso ANTES de programar
  if (Notification.permission === 'denied') {
    toast('Las notificaciones están bloqueadas');
    return;
  }
  if (Notification.permission === 'default' && (await pedirPermiso(false)) !== 'granted') return;
  if (!registroSW?.active) {
    toast('Los recordatorios aún no están listos, intenta en un momento');
    return;
  }

  programar({
    cliente,
    tipo: $('#tipo').value,
    nota: $('#nota').value.trim(),
    segundos: Number($('#cuando').value),
  });
  e.target.reset();
  $('#cuando').value = '10';
});

// Mensajes que manda el SW (para el registro y el contador)
navigator.serviceWorker?.addEventListener('message', ({ data }) => {
  if (data?.tipo === 'sw-evento') {
    const texto = ACTIVIDAD_SW[data.evento];
    actividad(texto ? texto(data.cliente) : data.detalle, `[SW ${data.version}] ${data.evento}: ${data.detalle}`);
    $('#swPendientes').textContent = data.pendientes;
    if (data.evento === 'mostrada') $('#swEnviados').textContent = ++enviados;
  }
  if (data?.tipo === 'abrir-cliente') {
    toast(`Abriste el recordatorio de ${data.cliente}`);
    $('#cliente').value = data.cliente;
  }
});

// Si el usuario cambia el permiso desde el candado, la interfaz se actualiza sola
navigator.permissions?.query({ name: 'notifications' })
  .then((status) => status.addEventListener('change', () => {
    pintarPermiso();
    actividad(`Las notificaciones ahora están ${TEXTOS[Notification.permission][0].toLowerCase()}`);
  }))
  .catch(() => { /* navegador sin Permissions API */ });

// Si se abrió desde la notificación (?cliente=...), se precarga el cliente
const desdeNotificacion = new URLSearchParams(location.search).get('cliente');
if (desdeNotificacion) {
  $('#cliente').value = desdeNotificacion;
  actividad(`Abriste la app desde el recordatorio de ${desdeNotificacion}`);
}

$('#btnPermiso').addEventListener('click', () => pedirPermiso());
pintarPermiso();
if (soportado) registrarSW();
