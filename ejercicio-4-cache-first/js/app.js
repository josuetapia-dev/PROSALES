// =====================================================================
// Prosales · Ejercicio 4
// Archivo principal de JavaScript: pinta el App Shell y su contenido
// (Ej. 2), registra el Service Worker (Ej. 3) y muestra en el panel
// "Estado de la app" lo que el SW guarda con la Cache API (Ej. 4).
// =====================================================================

// ---------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------
const ETAPAS = {
  frio:        { nombre: 'Frío',        abierta: true },
  contactado:  { nombre: 'Contactado',  abierta: true },
  propuesta:   { nombre: 'Propuesta',   abierta: true },
  negociacion: { nombre: 'Negociación', abierta: true },
  ganado:      { nombre: 'Ganado',      abierta: false, icono: 'i-check' },
  perdido:     { nombre: 'Perdido',     abierta: false, icono: 'i-x' },
};
const VISTAS = ['embudo', 'leads', 'seguimientos', 'reportes'];
const DIA = 24 * 60 * 60 * 1000;

const state = {
  leads: [],
  vendedor: null,
  filtroEtapa: 'todas',
  busqueda: '',
};

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const relTime = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const diasHasta = (fecha) => Math.round((fecha - hoy()) / DIA);
const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Crea un elemento: h('div', { class: 'x' }, hijo1, 'texto', ...) */
function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    // setProperty también acepta variables CSS (--st); Object.assign no
    else if (k === 'style') Object.entries(v).forEach(([p, val]) => node.style.setProperty(p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), val));
    else node.setAttribute(k, v === true ? '' : v);
  }
  node.append(...children.flat().filter((c) => c != null && c !== false));
  return node;   // textContent/append evitan inyección de HTML
}

/** Ícono del sprite SVG */
function icon(id, cls = 'ico') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#' + id);
  svg.append(use);
  return svg;
}

const stColor = (etapa) => ({ '--st': `var(--st-${etapa})` });
const iniciales = (nombre) => nombre.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();

function stageTag(etapa) {
  const e = ETAPAS[etapa];
  return h('span', { class: 'stage', style: stColor(etapa) }, e.icono ? icon(e.icono) : null, e.nombre);
}

function dueTag(lead) {
  const d = diasHasta(lead.seguimiento);
  if (!ETAPAS[lead.etapa].abierta) return null;
  const cls = d < 0 ? 'due late' : d === 0 ? 'due today' : 'due';
  const texto = d < 0 ? 'Vencido ' + relTime.format(d, 'day') : relTime.format(d, 'day');
  return h('span', { class: cls }, icon(d < 0 ? 'i-alert' : 'i-clock'), texto.charAt(0).toUpperCase() + texto.slice(1));
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ---------------------------------------------------------------------
// Datos: se cargan desde data/leads.json (contenido dinámico)
// ---------------------------------------------------------------------
async function cargarDatos() {
  const res = await fetch('data/leads.json');
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const base = hoy().getTime();
  state.vendedor = data.vendedor;
  // Las fechas vienen como días relativos a hoy para que la demo nunca "envejezca"
  state.leads = data.leads.map((l) => ({
    ...l,
    seguimiento: new Date(base + l.seguimiento * DIA),
    creado: new Date(base + l.creado * DIA),
  }));
}

// ---------------------------------------------------------------------
// Componentes compartidos
// ---------------------------------------------------------------------
function leadCard(lead) {
  return h('button', { class: 'card', type: 'button', style: stColor(lead.etapa), onclick: () => abrirDetalle(lead.id) },
    h('span', { class: 'card-company' }, lead.empresa),
    h('span', { class: 'card-person' }, lead.contacto + ' · ' + lead.servicio),
    h('span', { class: 'card-foot' },
      h('span', { class: 'money' }, money.format(lead.valor)),
      dueTag(lead) || stageTag(lead.etapa)));
}

function contactLinks(lead, conTexto = false) {
  const tel = lead.telefono.replace(/\D/g, '');
  const links = [
    { href: 'tel:+52' + tel, ico: 'i-phone', txt: 'Llamar' },
    { href: `https://wa.me/52${tel}?text=${encodeURIComponent('Hola ' + lead.contacto.split(' ')[0] + ', te escribo de parte de Prosales.')}`, ico: 'i-chat', txt: 'WhatsApp', ext: true },
    { href: 'mailto:' + lead.email, ico: 'i-mail', txt: 'Correo' },
  ];
  return links.map((l) => h('a', {
    href: l.href,
    class: conTexto ? 'btn btn-ghost' : 'icon-btn',
    'aria-label': conTexto ? null : `${l.txt} a ${lead.contacto}`,
    target: l.ext ? '_blank' : null, rel: l.ext ? 'noopener' : null,
  }, icon(l.ico), conTexto ? l.txt : null));
}

function vacio(titulo, texto) {
  return h('div', { class: 'empty' }, h('strong', {}, titulo), texto);
}

// ---------------------------------------------------------------------
// Vista: Embudo (kanban por etapa)
// ---------------------------------------------------------------------
function renderEmbudo() {
  const abiertos = state.leads.filter((l) => ETAPAS[l.etapa].abierta);
  $('#sub-embudo').textContent =
    `${abiertos.length} oportunidades abiertas · ${money.format(abiertos.reduce((s, l) => s + l.valor, 0))} en juego`;

  const board = $('#board');
  board.removeAttribute('aria-busy');
  board.replaceChildren(...Object.entries(ETAPAS).map(([clave, etapa]) => {
    const leads = state.leads.filter((l) => l.etapa === clave).sort((a, b) => a.seguimiento - b.seguimiento);
    const total = leads.reduce((s, l) => s + l.valor, 0);
    return h('section', { class: 'column', style: stColor(clave), 'aria-label': `${etapa.nombre}: ${leads.length} leads` },
      h('header', { class: 'column-head' },
        h('h2', {}, etapa.nombre),
        h('span', { class: 'count' }, String(leads.length))),
      h('p', { class: 'column-total' }, 'Total ', h('strong', {}, money.format(total))),
      leads.length ? leads.map(leadCard) : h('p', { class: 'column-empty' }, 'Sin leads en esta etapa'));
  }));
}

// ---------------------------------------------------------------------
// Vista: Leads (lista con filtros y búsqueda)
// ---------------------------------------------------------------------
function renderLeads() {
  // Chips de filtro por etapa
  const conteo = (k) => k === 'todas' ? state.leads.length : state.leads.filter((l) => l.etapa === k).length;
  $('#stageFilters').replaceChildren(...['todas', ...Object.keys(ETAPAS)].map((k) =>
    h('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(state.filtroEtapa === k),
      onclick: () => { state.filtroEtapa = k; renderLeads(); },
    }, k === 'todas' ? 'Todas' : ETAPAS[k].nombre, h('small', {}, String(conteo(k))))));

  const q = normalizar(state.busqueda);
  const lista = state.leads
    .filter((l) => state.filtroEtapa === 'todas' || l.etapa === state.filtroEtapa)
    .filter((l) => !q || normalizar(`${l.contacto} ${l.empresa} ${l.servicio}`).includes(q))
    .sort((a, b) => b.creado - a.creado);

  $('#sub-leads').textContent = state.busqueda
    ? `${lista.length} resultado${lista.length === 1 ? '' : 's'} para “${state.busqueda}”`
    : `${state.leads.length} contactos en tu cartera`;

  $('#leadList').replaceChildren(...(lista.length ? lista.map((lead) =>
    h('li', { class: 'lead-row', style: stColor(lead.etapa) },
      h('span', { class: 'initials', 'aria-hidden': 'true' }, iniciales(lead.contacto)),
      h('button', { class: 'lead-main', type: 'button', onclick: () => abrirDetalle(lead.id) },
        h('strong', {}, lead.empresa),
        h('span', {}, `${lead.contacto} · ${lead.servicio}`)),
      stageTag(lead.etapa),
      h('span', { class: 'money' }, money.format(lead.valor)),
      h('span', { class: 'lead-actions' }, contactLinks(lead))))
    : [h('li', {}, vacio('Sin coincidencias', 'Prueba con otro nombre o cambia el filtro de etapa.'))]));
}

// ---------------------------------------------------------------------
// Vista: Seguimientos (vencidos, hoy y próximos 7 días)
// ---------------------------------------------------------------------
function renderSeguimientos() {
  const abiertos = state.leads.filter((l) => ETAPAS[l.etapa].abierta).sort((a, b) => a.seguimiento - b.seguimiento);
  const grupos = [
    { titulo: 'Vencidos', cls: 'late', ico: 'i-alert', items: abiertos.filter((l) => diasHasta(l.seguimiento) < 0) },
    { titulo: 'Hoy', cls: 'today', ico: 'i-clock', items: abiertos.filter((l) => diasHasta(l.seguimiento) === 0) },
    { titulo: 'Próximos 7 días', cls: '', ico: 'i-calendar', items: abiertos.filter((l) => { const d = diasHasta(l.seguimiento); return d > 0 && d <= 7; }) },
  ];
  const pendientes = grupos[0].items.length + grupos[1].items.length;
  $('#sub-seg').textContent = pendientes ? `Tienes ${pendientes} contactos pendientes para hoy` : 'Estás al día. Buen trabajo';

  $('#followups').replaceChildren(...grupos.filter((g) => g.items.length).map((g) =>
    h('section', { class: 'fu-group ' + g.cls },
      h('h2', {}, icon(g.ico), g.titulo, h('span', { class: 'count' }, String(g.items.length))),
      g.items.map((lead) => h('article', { class: 'fu-item', style: stColor(lead.etapa) },
        h('div', {},
          h('button', { class: 'lead-main', type: 'button', onclick: () => abrirDetalle(lead.id) },
            h('strong', {}, `${lead.contacto} · ${lead.empresa}`)),
          h('p', {}, stageTag(lead.etapa), ' ', dueTag(lead)),
          lead.nota ? h('p', { class: 'fu-note' }, lead.nota) : null),
        h('span', { class: 'lead-actions' }, contactLinks(lead)))))));

  if (!pendientes && !grupos[2].items.length) {
    $('#followups').replaceChildren(vacio('Sin pendientes', 'No tienes seguimientos programados esta semana.'));
  }
}

// ---------------------------------------------------------------------
// Vista: Reportes (KPIs y barras de una sola serie)
// ---------------------------------------------------------------------
function barras(filas, formato) {
  const max = Math.max(...filas.map((f) => f.valor), 1);
  return h('ul', { class: 'bars' }, filas.map((f) =>
    h('li', { class: 'bar-row', title: `${f.etiqueta}: ${formato(f.valor)}` },
      h('span', { class: 'bar-label' }, f.etiqueta),
      h('span', { class: 'bar-track', 'aria-hidden': 'true' },
        h('span', { class: 'bar-fill', style: { width: (f.valor / max * 100) + '%' } })),
      h('span', { class: 'bar-value' }, formato(f.valor)))));
}

function renderReportes() {
  const L = state.leads;
  const suma = (arr) => arr.reduce((s, l) => s + l.valor, 0);
  const ganados = L.filter((l) => l.etapa === 'ganado');
  const perdidos = L.filter((l) => l.etapa === 'perdido');
  const abiertos = L.filter((l) => ETAPAS[l.etapa].abierta);
  const cerrados = ganados.length + perdidos.length;
  const tasa = cerrados ? Math.round(ganados.length / cerrados * 100) : 0;
  const meta = state.vendedor.meta;
  const avance = Math.min(100, Math.round(suma(ganados) / meta * 100));

  const kpi = (ico, label, valor, pie, extra) =>
    h('article', { class: 'kpi' }, h('p', { class: 'kpi-label' }, icon(ico), label), h('p', { class: 'kpi-value' }, valor), h('p', { class: 'kpi-foot' }, pie), extra);

  const porOrigen = {};
  L.forEach((l) => { porOrigen[l.origen] = (porOrigen[l.origen] || 0) + 1; });

  $('#reports').replaceChildren(
    h('div', { class: 'kpis' },
      kpi('i-money', 'Ventas cerradas', money.format(suma(ganados)), `${avance}% de la meta de ${money.format(meta)}`,
        h('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': avance, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Avance de la meta' },
          h('span', { style: { width: avance + '%' } }))),
      kpi('i-funnel', 'Embudo abierto', money.format(suma(abiertos)), `${abiertos.length} oportunidades`),
      kpi('i-target', 'Tasa de cierre', tasa + '%', `${ganados.length} ganados de ${cerrados} cerrados`),
      kpi('i-trend', 'Ticket promedio', money.format(ganados.length ? suma(ganados) / ganados.length : 0), 'En ventas ganadas')),
    h('div', { class: 'charts' },
      h('section', { class: 'chart' },
        h('h2', {}, 'Valor por etapa'),
        h('p', {}, 'Monto total de los leads en cada etapa del embudo'),
        barras(Object.entries(ETAPAS).map(([k, e]) => ({ etiqueta: e.nombre, valor: suma(L.filter((l) => l.etapa === k)) })), money.format)),
      h('section', { class: 'chart' },
        h('h2', {}, 'Leads por origen'),
        h('p', {}, '¿De dónde llegan tus clientes potenciales?'),
        barras(Object.entries(porOrigen).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ etiqueta: k, valor: v })), (v) => `${v} lead${v === 1 ? '' : 's'}`))));
}

// ---------------------------------------------------------------------
// Detalle del lead (diálogo)
// ---------------------------------------------------------------------
function abrirDetalle(id) {
  const lead = state.leads.find((l) => l.id === id);
  if (!lead) return;
  const dlg = $('#leadDialog');
  const fecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' });

  const selectEtapa = h('select', { id: 'd-etapa' }, Object.entries(ETAPAS).map(([k, e]) =>
    h('option', { value: k, selected: k === lead.etapa }, e.nombre)));
  selectEtapa.addEventListener('change', () => {
    lead.etapa = selectEtapa.value;
    renderTodo();
    toast(`${lead.empresa} pasó a ${ETAPAS[lead.etapa].nombre}`);
  });

  $('#leadDetail').replaceChildren(
    h('header', { class: 'sheet-head' },
      h('div', {}, h('h2', { id: 'ld-title' }, lead.empresa), h('p', {}, `${lead.contacto} · ${lead.servicio}`)),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Cerrar', onclick: () => dlg.close() }, icon('i-x'))),
    h('div', { class: 'contact-actions' }, contactLinks(lead, true)),
    h('dl', { class: 'detail-grid' },
      h('div', {}, h('dt', {}, 'Valor estimado'), h('dd', { class: 'money' }, money.format(lead.valor))),
      h('div', {}, h('dt', {}, 'Origen'), h('dd', {}, lead.origen)),
      h('div', {}, h('dt', {}, 'Próximo seguimiento'), h('dd', {}, fecha.format(lead.seguimiento))),
      h('div', {}, h('dt', {}, 'Alta en el CRM'), h('dd', {}, fecha.format(lead.creado)))),
    lead.nota ? h('p', { class: 'detail-note' }, lead.nota) : null,
    h('div', { class: 'field' }, h('label', { for: 'd-etapa' }, 'Etapa del embudo'), selectEtapa));

  dlg.showModal();
}

// ---------------------------------------------------------------------
// Nuevo lead (formulario con validación junto al campo)
// ---------------------------------------------------------------------
function abrirNuevo() {
  const dlg = $('#newDialog');
  $('#newForm').reset();
  $('#newForm').querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
  $('#newForm').querySelectorAll('.field-error').forEach((e) => { e.hidden = true; });
  dlg.showModal();
}

$('#newForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  let primero = null;
  form.querySelectorAll('input[required]').forEach((input) => {
    const ok = input.checkValidity() && input.value.trim() !== '';
    input.toggleAttribute('aria-invalid', !ok);
    if (!ok) input.setAttribute('aria-invalid', 'true');
    input.parentElement.querySelector('.field-error').hidden = ok;
    if (!ok && !primero) primero = input;
  });
  if (primero) { primero.focus(); return; }

  const datos = Object.fromEntries(new FormData(form));
  state.leads.push({
    id: Math.max(0, ...state.leads.map((l) => l.id)) + 1,
    contacto: datos.contacto.trim(),
    empresa: datos.empresa.trim(),
    servicio: datos.servicio.trim(),
    valor: Number(datos.valor),
    etapa: 'frio',
    origen: datos.origen,
    telefono: datos.telefono.replace(/\D/g, ''),
    email: '',
    seguimiento: new Date(hoy().getTime() + Number(datos.seguimiento) * DIA),
    creado: new Date(),
    nota: '',
  });
  $('#newDialog').close();
  renderTodo();
  toast(`${datos.empresa.trim()} se agregó al embudo`);
});

// Cerrar diálogos: botón [data-close] o clic fuera de la hoja
document.querySelectorAll('dialog').forEach((dlg) => {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });
});
document.querySelectorAll('[data-action="nuevo"]').forEach((b) => b.addEventListener('click', abrirNuevo));

// ---------------------------------------------------------------------
// Router del App Shell: cambia la vista según el #hash
// El header y el menú NO se vuelven a pintar; solo cambia el contenido.
// ---------------------------------------------------------------------
function mostrarVista() {
  let vista = location.hash.slice(1);

  // Atajo del manifest: #nuevo abre el formulario sobre el embudo
  if (vista === 'nuevo') {
    history.replaceState(null, '', '#embudo');
    vista = 'embudo';
    if (state.leads.length) abrirNuevo(); else state.abrirNuevoAlCargar = true;
  }
  if (!VISTAS.includes(vista)) vista = 'embudo';

  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + vista));
  document.querySelectorAll('.nav-link').forEach((a) => {
    if (a.dataset.view === vista) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `${$('#view-' + vista + ' h1').textContent} · Prosales`;
}

window.addEventListener('hashchange', () => {
  mostrarVista();
  window.scrollTo({ top: 0 });
  $('#main').focus({ preventScroll: true });
});

// Búsqueda global del header: filtra y lleva a la vista Leads
const searchInput = $('#searchInput');
searchInput.addEventListener('input', () => {
  state.busqueda = searchInput.value.trim();
  if (state.busqueda && location.hash !== '#leads') location.hash = 'leads';
  renderLeads();
});
$('#searchForm').addEventListener('submit', (e) => e.preventDefault());

// ---------------------------------------------------------------------
// Indicador de conexión en el header
// ---------------------------------------------------------------------
function actualizarRed() {
  const net = $('#netStatus');
  net.classList.toggle('offline', !navigator.onLine);
  $('.net-text', net).textContent = navigator.onLine ? 'En línea' : 'Sin conexión';
}
window.addEventListener('online', actualizarRed);
window.addEventListener('offline', actualizarRed);

// ---------------------------------------------------------------------
// Partes del shell que dependen de los datos (badge y meta)
// ---------------------------------------------------------------------
function renderShell() {
  const pendientes = state.leads.filter((l) => ETAPAS[l.etapa].abierta && diasHasta(l.seguimiento) <= 0).length;
  const badge = $('#badgeHoy');
  badge.hidden = !pendientes;
  badge.textContent = pendientes;
  badge.setAttribute('aria-label', `${pendientes} pendientes`);

  const ganado = state.leads.filter((l) => l.etapa === 'ganado').reduce((s, l) => s + l.valor, 0);
  const avance = Math.min(100, Math.round(ganado / state.vendedor.meta * 100));
  $('#navGoal').replaceChildren(
    h('p', {}, 'Meta del mes'),
    h('strong', {}, `${money.format(ganado)}`),
    h('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': avance, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': `${avance}% de la meta` },
      h('span', { style: { width: avance + '%' } })),
    h('p', { style: { marginTop: '8px' } }, `${avance}% de ${money.format(state.vendedor.meta)}`));
  $('#avatar').textContent = iniciales(state.vendedor.nombre);
}

function renderTodo() {
  renderShell();
  renderEmbudo();
  renderLeads();
  renderSeguimientos();
  renderReportes();
}

function renderEsqueleto() {
  $('#board').replaceChildren(...Array.from({ length: 4 }, () =>
    h('div', { class: 'column' }, [1, 2, 3].map(() => h('div', { class: 'skeleton', style: { height: '110px' } })))));
}

// =====================================================================
// EJERCICIO 3 · REGISTRO Y CICLO DE VIDA DEL SERVICE WORKER
// =====================================================================
const sw = {
  registro: null,
  pasos: new Set(),
  peticiones: 0,
  desdeCache: 0,
  actualizando: false,   // true solo cuando el usuario pidió actualizar
};
const PASOS = ['registrado', 'instalado', 'activado', 'controlando'];

/** Agrega una línea al registro de eventos del panel */
function logSW(evento, texto, hora = Date.now(), origen = '') {
  const reloj = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(hora);
  const log = $('#swLog');
  const etiqueta = origen === 'cache' ? 'caché' : origen === 'red' ? 'red' : evento;
  log.prepend(h('li', {}, h('time', {}, reloj), h('span', { class: `ev ev-${evento} ${origen === 'cache' ? 'desde-cache' : ''}` }, etiqueta), h('span', { class: 'txt', title: texto }, texto)));
  while (log.children.length > 40) log.lastElementChild.remove();
}

/** Marca un paso de la línea de tiempo como completado */
function marcarPaso(paso) {
  sw.pasos.add(paso);
  const siguiente = PASOS.find((p) => !sw.pasos.has(p));
  document.querySelectorAll('#swSteps li').forEach((li) => {
    li.classList.toggle('done', sw.pasos.has(li.dataset.step));
    li.classList.toggle('current', li.dataset.step === siguiente);
  });
  $('#swChip').hidden = !sw.pasos.has('controlando');
}

/** Sigue los cambios de estado de un SW: installing → installed → activating → activated */
function seguirEstado(worker) {
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') {
      marcarPaso('instalado');
      // Si ya hay un SW controlando, este es una ACTUALIZACIÓN que queda en espera
      if (navigator.serviceWorker.controller) mostrarActualizacion(worker);
    }
    if (worker.state === 'activated') marcarPaso('activado');
    if (worker.state === 'redundant') logSW('app', 'Una versión del Service Worker fue descartada');
  });
}

function mostrarActualizacion(worker) {
  logSW('app', 'Nueva versión instalada y en espera (waiting)');
  $('#updateBar').hidden = false;
  $('#updateBtn').onclick = () => {
    sw.actualizando = true;
    worker.postMessage({ tipo: 'SKIP_WAITING' });   // el SW en espera llama a skipWaiting()
  };
}

/**
 * Escucha al Service Worker desde que arranca el script (no en "load"):
 * así no se pierden los mensajes de las primeras peticiones.
 */
function escucharServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Mensajes que envía el SW (install, activate, fetch…)
  navigator.serviceWorker.addEventListener('message', ({ data }) => {
    if (data?.tipo === 'sw-evento') {
      logSW(data.evento, data.detalle, data.hora, data.origen);
      $('#swVersion').textContent = data.version;
      if (data.evento === 'fetch') {
        $('#swCount').textContent = ++sw.peticiones;
        if (data.origen === 'cache') sw.desdeCache += 1;
        const pct = Math.round(sw.desdeCache / sw.peticiones * 100);
        $('#hitRate').textContent = `${pct}% desde caché (${sw.desdeCache} de ${sw.peticiones})`;
        $('#hitBar').style.width = pct + '%';
      }
      if (data.evento === 'install' || data.evento === 'activate') mostrarCaches();
    }
    if (data?.tipo === 'sw-version') $('#swVersion').textContent = data.version;
  });

  // Cambio de controlador: el SW activo tomó el control de esta pestaña
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    marcarPaso('controlando');
    logSW('app', 'La página ahora está controlada por el Service Worker');
    if (sw.actualizando) location.reload();   // recargar solo si el usuario aceptó actualizar
  });
}

/**
 * REGISTRO ASÍNCRONO del Service Worker.
 * Se llama después del evento "load" para no competir con la carga
 * inicial del App Shell y sus datos.
 */
async function registrarServiceWorker() {
  // 1) Detección de soporte (progressive enhancement: sin SW la app sigue funcionando)
  if (!('serviceWorker' in navigator)) {
    logSW('app', 'Este navegador no soporta Service Workers');
    return;
  }

  try {
    // 2) register() devuelve una promesa: descarga sw.js y arranca su ciclo de vida
    const registro = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    sw.registro = registro;
    marcarPaso('registrado');
    $('#swScope').textContent = registro.scope;
    logSW('app', 'register() resuelto · scope ' + new URL(registro.scope).pathname);

    // 3) Estado actual: puede que el SW ya estuviera instalado de una visita anterior
    if (registro.active) { marcarPaso('instalado'); marcarPaso('activado'); }
    if (navigator.serviceWorker.controller) {
      marcarPaso('controlando');
      navigator.serviceWorker.controller.postMessage({ tipo: 'VERSION' });
    }
    seguirEstado(registro.installing);
    if (registro.waiting && navigator.serviceWorker.controller) mostrarActualizacion(registro.waiting);

    // 4) updatefound: el navegador encontró un sw.js distinto al instalado
    registro.addEventListener('updatefound', () => {
      logSW('app', 'updatefound: descargando una versión de sw.js');
      seguirEstado(registro.installing);
    });
  } catch (err) {
    console.error('[Prosales] Error al registrar el Service Worker:', err);
    logSW('app', 'Error al registrar: ' + err.message);
  }
}

/**
 * Ejercicio 4: lee desde la página lo que guardó el SW con la Cache API.
 * (La Cache API también está disponible en window, no solo en el SW.)
 */
async function mostrarCaches() {
  if (!('caches' in window)) return;
  const nombres = (await caches.keys()).filter((n) => n.startsWith('prosales-ej4-'));
  const filas = await Promise.all(nombres.map(async (nombre) => {
    const entradas = await (await caches.open(nombre)).keys();
    return h('li', {}, h('span', { class: 'mono' }, nombre), h('strong', {}, `${entradas.length} archivo${entradas.length === 1 ? '' : 's'}`));
  }));
  $('#cacheList').replaceChildren(...(filas.length ? filas : [h('li', { class: 'muted' }, 'Sin cachés todavía')]));

  if (navigator.storage?.estimate) {
    const { usage } = await navigator.storage.estimate();
    $('#cacheUsage').textContent = `Espacio usado por este sitio: ${(usage / 1024 / 1024).toFixed(2)} MB`;
  }
}

// Botón "Buscar actualización": vuelve a descargar sw.js y lo compara
$('#swUpdateBtn').addEventListener('click', async () => {
  if (!sw.registro) return;
  await sw.registro.update();
  if (!sw.registro.installing && !sw.registro.waiting) toast('Ya tienes la versión más reciente');
});

// El indicador de conexión del header abre el panel
$('#netStatus').addEventListener('click', () => { mostrarCaches(); $('#swDialog').showModal(); });

escucharServiceWorker();
window.addEventListener('load', registrarServiceWorker);

// ---------------------------------------------------------------------
// Arranque: 1) se muestra el shell  2) se cargan los datos  3) se pinta el contenido
// ---------------------------------------------------------------------
async function iniciar() {
  actualizarRed();
  mostrarVista();
  renderEsqueleto();
  try {
    await cargarDatos();
    renderTodo();
    if (state.abrirNuevoAlCargar) abrirNuevo();
  } catch (err) {
    console.error('[Prosales] No se pudieron cargar los datos:', err);
    $('#sub-embudo').textContent = 'No se pudieron cargar los datos';
    $('#board').replaceChildren(vacio('No se pudieron cargar tus leads',
      'Abre la app desde un servidor (http://localhost/...) e inténtalo de nuevo.'));
  }
}

iniciar();
