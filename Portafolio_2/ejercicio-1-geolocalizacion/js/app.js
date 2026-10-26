// =====================================================================
// Prosales Campo · Ejercicio 1 · PERMISOS Y GEOLOCALIZACIÓN
//
// 1. Permissions API: navigator.permissions.query({ name: 'geolocation' })
//    devuelve 'granted' | 'prompt' | 'denied' SIN mostrarle nada al usuario,
//    y avisa con el evento 'change' si el usuario cambia el permiso.
// 2. Geolocation API: getCurrentPosition() es ASÍNCRONA (callbacks), así que
//    la interfaz nunca se bloquea mientras el GPS busca señal.
// =====================================================================

const { $, toast, esc, fmtHora } = UI;

const TEXTOS_PERMISO = {
  granted: { pill: 'Concedido', texto: 'Ya diste permiso. La ubicación se obtiene directamente, sin volver a preguntar.' },
  prompt: { pill: 'Pendiente', texto: 'Aún no has decidido. Al registrar tu llegada, el navegador te pedirá permiso.' },
  denied: { pill: 'Bloqueado', texto: 'Bloqueaste la ubicación para este sitio. La app no puede pedirla de nuevo por su cuenta.' },
  unsupported: { pill: 'No disponible', texto: 'Tu navegador no permite consultar el permiso por adelantado; se pedirá al registrar tu llegada.' },
};

let estadoPermiso = 'unsupported';

function pintarPermiso(estado) {
  estadoPermiso = estado;
  const info = TEXTOS_PERMISO[estado];
  const pill = $('#permPill');
  pill.dataset.state = estado;
  pill.textContent = info.pill;
  $('#permText').textContent = info.texto;
  $('#permDenied').hidden = estado !== 'denied';
  $('#btnUbicar').disabled = estado === 'denied';
}

// ---------------------------------------------------------------------
// 1) PERMISSIONS API
// ---------------------------------------------------------------------
async function consultarPermiso() {
  if (!('geolocation' in navigator)) {
    pintarPermiso('unsupported');
    $('#permText').textContent = 'Este navegador no tiene acceso al GPS.';
    $('#btnUbicar').disabled = true;
    return;
  }
  if (!navigator.permissions?.query) {
    pintarPermiso('unsupported');
    return;
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    pintarPermiso(status.state);
    // Si el usuario cambia el permiso desde el candado del navegador, la interfaz se actualiza sola
    status.addEventListener('change', () => {
      pintarPermiso(status.state);
      toast(`Permiso de ubicación: ${TEXTOS_PERMISO[status.state].pill.toLowerCase()}`);
    });
  } catch {
    pintarPermiso('unsupported');
  }
}

// ---------------------------------------------------------------------
// 2) GEOLOCATION API (envuelta en una promesa para usar async/await)
// ---------------------------------------------------------------------
function obtenerPosicion(altaPrecision) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: altaPrecision, // true = GPS real en el celular
      timeout: 15000,                    // no esperar para siempre si no hay señal
      maximumAge: 0,                     // siempre una lectura nueva, no una guardada
    });
  });
}

const ERRORES_GPS = {
  1: 'Negaste el permiso de ubicación. Puedes activarlo desde el candado de la barra de direcciones.',
  2: 'No se pudo determinar la ubicación. Revisa que el GPS o la ubicación del sistema estén encendidos.',
  3: 'El GPS tardó demasiado. Intenta de nuevo cerca de una ventana o desactiva "Alta precisión".',
};

async function registrarLlegada(e) {
  e.preventDefault();
  if (!window.isSecureContext) {
    toast('El GPS solo funciona en https:// o en localhost');
    return;
  }
  const btn = $('#btnUbicar');
  const estado = $('#estadoGps');
  btn.setAttribute('aria-busy', 'true');
  btn.disabled = true;
  estado.textContent = 'Buscando señal… puedes seguir usando la página.';

  try {
    const pos = await obtenerPosicion($('#altaPrecision').checked);
    const registro = {
      cliente: $('#cliente').value.trim() || 'Visita sin cliente',
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      precision: Math.round(pos.coords.accuracy),
      hora: pos.timestamp,
    };
    mostrarUbicacion(registro);
    guardarEnHistorial(registro);
    estado.textContent = `Ubicación obtenida con ±${registro.precision} m de precisión.`;
    toast(`Llegada registrada: ${registro.cliente}`);
    $('#cliente').value = '';
  } catch (err) {
    // Errores controlados: el usuario siempre sabe qué pasó y qué hacer
    const msg = ERRORES_GPS[err.code] || 'Ocurrió un error inesperado al leer la ubicación.';
    estado.textContent = msg;
    toast(msg, 5000);
    if (err.code === 1) pintarPermiso('denied');
  } finally {
    btn.removeAttribute('aria-busy');
    btn.disabled = estadoPermiso === 'denied';
  }
}

// ---------------------------------------------------------------------
// Mapa interactivo (Leaflet + OpenStreetMap)
// ---------------------------------------------------------------------
let mapa, marcador, circulo;

function mostrarUbicacion(r) {
  $('#lat').textContent = r.lat.toFixed(6);
  $('#lng').textContent = r.lng.toFixed(6);
  $('#precision').textContent = `± ${r.precision} m`;
  $('#hora').textContent = fmtHora.format(r.hora);

  const link = $('#linkMaps');
  link.href = `https://www.google.com/maps?q=${r.lat},${r.lng}`;
  link.hidden = false;

  // Si Leaflet no cargó (sin internet), las coordenadas en texto siguen visibles
  if (!window.L) {
    $('#mapaVacio').textContent = 'El mapa no está disponible sin conexión, pero las coordenadas sí se registraron.';
    return;
  }
  $('#mapaVacio').hidden = true;
  const punto = [r.lat, r.lng];

  if (!mapa) {
    mapa = L.map('mapa').setView(punto, 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);
    marcador = L.marker(punto).addTo(mapa);
    circulo = L.circle(punto, { radius: r.precision, color: '#4D7C0F', fillColor: '#A3E635', fillOpacity: .2, weight: 1 }).addTo(mapa);
  } else {
    marcador.setLatLng(punto);
    circulo.setLatLng(punto).setRadius(r.precision);
    mapa.setView(punto, 17);
  }
  marcador.bindPopup(`<strong>${esc(r.cliente)}</strong><br>${fmtHora.format(r.hora)}`).openPopup();
}

// ---------------------------------------------------------------------
// Historial de la jornada (localStorage, solo como apoyo visual;
// la persistencia estructurada se trabaja en el Ejercicio 4)
// ---------------------------------------------------------------------
const CLAVE = 'prosales-campo-llegadas';

function leerHistorial() {
  try {
    const hoy = new Date().toDateString();
    return JSON.parse(localStorage.getItem(CLAVE) || '[]').filter((r) => new Date(r.hora).toDateString() === hoy);
  } catch {
    return [];
  }
}

function guardarEnHistorial(registro) {
  const lista = [registro, ...leerHistorial()].slice(0, 20);
  try { localStorage.setItem(CLAVE, JSON.stringify(lista)); } catch { /* almacenamiento lleno o bloqueado */ }
  pintarHistorial(lista);
}

function pintarHistorial(lista = leerHistorial()) {
  $('#historialVacio').hidden = lista.length > 0;
  $('#btnLimpiar').hidden = lista.length === 0;
  $('#historial').innerHTML = lista.map((r, i) => `
    <li class="list-item">
      <span class="num">${lista.length - i}</span>
      <div class="grow">
        <strong>${esc(r.cliente)}</strong>
        <small>${fmtHora.format(r.hora)} · ${r.lat.toFixed(5)}, ${r.lng.toFixed(5)} · ±${r.precision} m</small>
      </div>
      <button class="btn btn-ghost btn-sm" type="button" data-ver="${i}">Ver</button>
    </li>`).join('');
}

$('#historial').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ver]');
  if (!btn) return;
  mostrarUbicacion(leerHistorial()[btn.dataset.ver]);
  $('#t-mapa').scrollIntoView({ behavior: 'smooth' });
});

$('#btnLimpiar').addEventListener('click', () => {
  try { localStorage.removeItem(CLAVE); } catch { /* sin acceso */ }
  pintarHistorial([]);
});

$('#llegadaForm').addEventListener('submit', registrarLlegada);

consultarPermiso();
pintarHistorial();
