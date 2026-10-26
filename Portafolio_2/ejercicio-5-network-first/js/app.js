// =====================================================================
// Prosales Campo · Ejercicio 5 · NETWORK-FIRST CON FALLBACK A INDEXEDDB
//
//   1. Siempre se intenta la RED primero (fetch a la API REST).
//   2. Si responde → se muestra y se guarda una copia del JSON en IndexedDB.
//   3. Si falla (sin señal, timeout o error del servidor) → se lee la última
//      copia de IndexedDB y se muestra con un aviso de "datos guardados".
//   4. Los eventos online/offline repiten el proceso solos: la interfaz
//      cambia de fuente sin que el usuario recargue la página.
// =====================================================================

const { $, toast, esc, fmtFecha } = UI;

const API = 'https://dummyjson.com/products?limit=24&select=title,brand,category,price,stock,rating,thumbnail';
const TIEMPO_LIMITE = 8000;   // con señal débil, no esperar para siempre

const usd = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' });
const SIN_IMAGEN = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="#EFEFE8"/><path d="M58 78l18-20 12 13 8-9 16 16z" fill="#C9C7BC"/><circle cx="100" cy="44" r="8" fill="#C9C7BC"/></svg>');

/** Cada paso de la estrategia queda en la consola (DevTools) */
const traza = (texto) => console.info('[Catálogo]', texto);

let productos = [];
let categoria = '';
let cargando = false;

// ---------------------------------------------------------------------
// IndexedDB: almacén de respuestas de la API (clave → JSON + fecha)
// Base distinta a la del Ejercicio 4 para que no compartan versión.
// ---------------------------------------------------------------------
const CacheDB = (() => {
  let db;
  function abrir() {
    if (db) return Promise.resolve(db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('prosales-campo-api', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('respuestas', { keyPath: 'clave' });
      req.onsuccess = () => {
        db = req.result;
        db.onversionchange = () => { db.close(); db = null; };
        resolve(db);
      };
      req.onerror = () => reject(req.error);
    });
  }
  async function guardar(clave, datos) {
    const tx = (await abrir()).transaction('respuestas', 'readwrite');
    tx.objectStore('respuestas').put({ clave, datos, fecha: Date.now() });
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }
  async function leer(clave) {
    const req = (await abrir()).transaction('respuestas').objectStore('respuestas').get(clave);
    return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  }
  return { guardar, leer };
})();

// ---------------------------------------------------------------------
// 1) NETWORK-FIRST
// ---------------------------------------------------------------------
async function desdeLaRed() {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), TIEMPO_LIMITE);
  try {
    const res = await fetch(API, { signal: control.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`La API respondió ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function cargarCatalogo() {
  if (cargando) return;
  cargando = true;
  $('#btnActualizar').setAttribute('aria-busy', 'true');
  if (!productos.length) pintarEsqueleto();

  try {
    // Sin red, ni siquiera se intenta: se va directo a la copia local
    if (!navigator.onLine) throw new Error('El dispositivo no tiene conexión');

    pintarFuente('cargando', 'Actualizando catálogo…', 'Buscando precios actualizados');
    traza(`fetch → ${new URL(API).host}`);
    const inicio = performance.now();
    const json = await desdeLaRed();
    const ms = Math.round(performance.now() - inicio);
    traza(`Red OK en ${ms} ms · ${json.products.length} productos`);

    // 2) Copia local del JSON para cuando no haya red
    await CacheDB.guardar('catalogo', json.products);
    traza('Copia guardada en IndexedDB (prosales-campo-api)');

    productos = json.products;
    pintarFuente('red', 'En vivo', `Precios actualizados · ${fmtFecha.format(Date.now())}`);
  } catch (err) {
    // 3) FALLBACK: la red falló → IndexedDB
    const motivo = err.name === 'AbortError' ? `La red tardó más de ${TIEMPO_LIMITE / 1000} s`
      : err instanceof TypeError ? 'No hubo respuesta de la red'   // fetch() lanza TypeError cuando no hay conexión
      : err.message;
    traza(`Red falló: ${motivo}`);
    await usarCopiaLocal(motivo);
  } finally {
    cargando = false;
    $('#btnActualizar').removeAttribute('aria-busy');
    pintarCategorias();
    pintarProductos();
    pintarInfoLocal();
  }
}

async function usarCopiaLocal(motivo) {
  try {
    const copia = await CacheDB.leer('catalogo');
    if (copia) {
      productos = copia.datos;
      traza(`Fallback → IndexedDB · ${copia.datos.length} productos del ${fmtFecha.format(copia.fecha)}`);
      pintarFuente('local', 'Sin conexión: mostrando datos guardados', `Última actualización: ${fmtFecha.format(copia.fecha)} · ${motivo}`);
      return;
    }
  } catch (err) {
    traza(`No se pudo leer IndexedDB: ${err.message}`);
  }
  // Ni red ni copia: se explica qué pasa, nunca una pantalla en blanco
  productos = [];
  traza('Sin copia local disponible');
  pintarFuente('vacio', 'Sin conexión y sin datos guardados', motivo);
}

// ---------------------------------------------------------------------
// 4) Cambios de conexión: la interfaz se actualiza sola
// ---------------------------------------------------------------------
window.addEventListener('offline', async () => {
  traza('Evento "offline": se cambia a la copia local');
  toast('Te quedaste sin conexión. Mostrando el catálogo guardado.');
  await usarCopiaLocal('El dispositivo perdió la conexión');
  pintarCategorias();
  pintarProductos();
});

window.addEventListener('online', () => {
  traza('Evento "online": se vuelve a consultar la red');
  toast('Conexión recuperada. Actualizando catálogo…');
  cargarCatalogo();
});

// ---------------------------------------------------------------------
// Renderizado
// ---------------------------------------------------------------------
function pintarFuente(origen, titulo, texto) {
  const iconos = { red: '#i-wifi', local: '#i-wifi-off', vacio: '#i-alert', cargando: '#i-wifi' };
  $('#fuente').dataset.origen = origen;
  $('#fuenteIco').setAttribute('href', iconos[origen]);
  $('#fuenteTitulo').textContent = titulo;
  $('#fuenteTexto').textContent = texto;
}

function pintarEsqueleto() {
  $('#productos').innerHTML = '<li class="producto esqueleto"></li>'.repeat(8);
}

function pintarCategorias() {
  const cats = [...new Set(productos.map((p) => p.category))];
  if (categoria && !cats.includes(categoria)) categoria = '';
  $('#categorias').innerHTML = ['', ...cats].map((c) =>
    `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${c === categoria}">${c ? esc(c.replace(/-/g, ' ')) : 'Todos'}</button>`).join('');
}

function pintarProductos() {
  const texto = $('#buscar').value.trim().toLowerCase();
  const visibles = productos.filter((p) =>
    (!categoria || p.category === categoria) &&
    (!texto || `${p.title} ${p.brand ?? ''}`.toLowerCase().includes(texto)));

  $('#productos').setAttribute('aria-busy', 'false');
  $('#sinDatos').hidden = productos.length > 0;
  $('#productos').innerHTML = visibles.map((p) => `
    <li class="producto">
      <img src="${esc(p.thumbnail)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${SIN_IMAGEN}'">
      <div class="producto-info">
        <span class="producto-cat">${esc(p.category.replace(/-/g, ' '))}</span>
        <h3>${esc(p.title)}</h3>
        ${p.brand ? `<small class="muted">${esc(p.brand)}</small>` : ''}
        <div class="producto-pie">
          <span class="precio">${usd.format(p.price)}</span>
          <span class="stock${p.stock < 10 ? ' bajo' : ''}">${p.stock} en existencia</span>
        </div>
      </div>
    </li>`).join('') || (productos.length ? '<li class="empty">Ningún producto coincide con la búsqueda.</li>' : '');
}

async function pintarInfoLocal() {
  try {
    const copia = await CacheDB.leer('catalogo');
    $('#idbTotal').textContent = copia ? copia.datos.length : '0';
    $('#idbFecha').textContent = copia ? fmtFecha.format(copia.fecha) : 'Nunca';
  } catch {
    $('#idbTotal').textContent = 'No disponible';
  }
}

$('#categorias').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-cat]');
  if (!chip) return;
  categoria = chip.dataset.cat;
  $('#categorias').querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === chip));
  pintarProductos();
});
$('#buscar').addEventListener('input', pintarProductos);
$('#btnActualizar').addEventListener('click', cargarCatalogo);

// El SW guarda los archivos de la página y las imágenes, para que también abra sin internet
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

cargarCatalogo();
