// =====================================================================
// Prosales Campo · Utilidades de interfaz compartidas
// Avisos (toast), indicador de conexión y formatos de fecha.
// Se carga antes del app.js de cada ejercicio.
// =====================================================================

const UI = (() => {
  const $ = (sel, raiz = document) => raiz.querySelector(sel);

  let timerToast;
  function toast(texto, ms = 3200) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = texto;
    el.classList.add('show');
    clearTimeout(timerToast);
    timerToast = setTimeout(() => el.classList.remove('show'), ms);
  }

  /** Indicador "En línea / Sin conexión" del header */
  function pintarConexion() {
    const el = $('#netStatus');
    if (!el) return;
    const enLinea = navigator.onLine;
    el.classList.toggle('offline', !enLinea);
    $('.net-text', el).textContent = enLinea ? 'En línea' : 'Sin conexión';
  }
  window.addEventListener('online', pintarConexion);
  window.addEventListener('offline', pintarConexion);
  document.addEventListener('DOMContentLoaded', pintarConexion);

  const fmtHora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fmtFecha = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  /** Agrega una línea al registro de eventos de la página */
  function log(lista, texto) {
    const li = document.createElement('li');
    const t = document.createElement('time');
    t.textContent = fmtHora.format(new Date());
    li.append(t, texto);
    lista.prepend(li);
  }

  /** Escapa texto del usuario antes de meterlo en innerHTML */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  return { $, toast, log, esc, fmtHora, fmtFecha };
})();
