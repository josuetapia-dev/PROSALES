// =====================================================================
// Prosales Campo · Ejercicio 4 · INTERFAZ DE LA BITÁCORA (CRUD)
// Toda la persistencia pasa por VisitasDB (js/db.js).
// =====================================================================

const { $, toast, esc, fmtFecha } = UI;

const RESULTADOS = { venta: 'Venta cerrada', interesado: 'Interesado', volver: 'Volver después', 'sin-interes': 'Sin interés' };
const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

let visitas = [];
let filtro = '';

// ---------------------------------------------------------------------
// READ
// ---------------------------------------------------------------------
async function cargar() {
  try {
    visitas = await VisitasDB.listar();
    pintar();
    pintarResumen();
  } catch (err) {
    mostrarErrorDB(err);
  }
}

function pintar() {
  const texto = $('#buscar').value.trim().toLowerCase();
  const visibles = visitas.filter((v) =>
    (!filtro || v.resultado === filtro) &&
    (!texto || `${v.cliente} ${v.notas}`.toLowerCase().includes(texto)));

  const idEditando = Number($('#visitaId').value);
  $('#lista').innerHTML = visibles.map((v) => `
    <li class="list-item${v.id === idEditando ? ' editando' : ''}">
      <div class="grow">
        <div class="visita-top">
          <strong>${esc(v.cliente)}</strong>
          <span class="tag ${v.resultado}">${RESULTADOS[v.resultado]}</span>
        </div>
        <small>${esc(v.tipo)} · ${fmtFecha.format(v.fecha)}${v.editado ? ' · editada' : ''}</small>
        ${v.notas ? `<p class="visita-notas">${esc(v.notas)}</p>` : ''}
        ${v.monto ? `<span class="monto">${pesos.format(v.monto)}</span>` : ''}
      </div>
      <div class="item-acciones">
        <button class="icon-btn" type="button" data-editar="${v.id}" aria-label="Editar visita a ${esc(v.cliente)}">
          <svg class="ico" aria-hidden="true"><use href="#i-edit"/></svg>
        </button>
        <button class="icon-btn danger" type="button" data-eliminar="${v.id}" aria-label="Eliminar visita a ${esc(v.cliente)}">
          <svg class="ico" aria-hidden="true"><use href="#i-trash"/></svg>
        </button>
      </div>
    </li>`).join('');

  const hayDatos = visitas.length > 0;
  $('#vacio').hidden = visibles.length > 0;
  $('#vacioTexto').textContent = hayDatos ? 'Ninguna visita coincide con la búsqueda.' : 'Aún no hay visitas guardadas.';
  $('#btnEjemplo').hidden = hayDatos;
  $('#btnVaciar').hidden = !hayDatos;
}

async function pintarResumen() {
  const ventas = visitas.filter((v) => v.resultado === 'venta');
  $('#totalVisitas').textContent = visitas.length;
  $('#totalVentas').textContent = ventas.length;
  $('#totalMonto').textContent = pesos.format(ventas.reduce((s, v) => s + (v.monto || 0), 0));

  if (navigator.storage?.estimate) {
    const { usage } = await navigator.storage.estimate();
    $('#espacio').textContent = usage < 1024 * 1024 ? `${(usage / 1024).toFixed(1)} KB` : `${(usage / 1024 / 1024).toFixed(2)} MB`;
  }
}

// ---------------------------------------------------------------------
// CREATE / UPDATE
// ---------------------------------------------------------------------
async function guardar(e) {
  e.preventDefault();
  const cliente = $('#cliente').value.trim();
  if (!cliente) {
    $('#cliente').focus();
    toast('Escribe el nombre del cliente');
    return;
  }

  const datos = {
    cliente,
    tipo: $('#tipo').value,
    resultado: $('#resultado').value,
    monto: Number($('#monto').value) || 0,
    notas: $('#notas').value.trim(),
  };

  try {
    const id = Number($('#visitaId').value);
    if (id) {
      const original = await VisitasDB.obtener(id);
      await VisitasDB.actualizar({ ...original, ...datos });
      toast(`Visita a ${cliente} actualizada`);
    } else {
      await VisitasDB.agregar(datos);
      toast(`Visita a ${cliente} guardada en el dispositivo`);
    }
    salirDeEdicion();
    await cargar();
  } catch (err) {
    toast(`No se pudo guardar: ${err.message}`, 5000);
  }
}

async function editar(id) {
  const v = await VisitasDB.obtener(id);
  if (!v) return;
  $('#visitaId').value = v.id;
  $('#cliente').value = v.cliente;
  $('#tipo').value = v.tipo;
  $('#resultado').value = v.resultado;
  $('#monto').value = v.monto || '';
  $('#notas').value = v.notas;
  $('#formTitulo').textContent = 'Editar visita';
  $('#btnGuardar span').textContent = 'Guardar cambios';
  $('#btnCancelar').hidden = false;
  pintar();
  $('#cliente').focus();
  $('#t-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function salirDeEdicion() {
  $('#visitaForm').reset();
  $('#visitaId').value = '';
  $('#formTitulo').textContent = 'Nueva visita';
  $('#btnGuardar span').textContent = 'Guardar visita';
  $('#btnCancelar').hidden = true;
  pintar();
}

// ---------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------
async function eliminar(id) {
  const v = visitas.find((x) => x.id === id);
  if (!v || !confirm(`¿Eliminar la visita a "${v.cliente}"?`)) return;
  try {
    await VisitasDB.eliminar(id);
    if (Number($('#visitaId').value) === id) salirDeEdicion();
    toast('Visita eliminada');
    await cargar();
  } catch (err) {
    toast(`No se pudo eliminar: ${err.message}`, 5000);
  }
}

async function vaciar() {
  if (!confirm(`¿Borrar las ${visitas.length} visitas guardadas? No se puede deshacer.`)) return;
  await VisitasDB.vaciar();
  salirDeEdicion();
  toast('Bitácora vacía');
  await cargar();
}

async function cargarEjemplo() {
  const hace = (horas) => Date.now() - horas * 3600 * 1000;
  await VisitasDB.agregarVarios([
    { cliente: 'Clínica Dental Sonríe', tipo: 'Presentación', resultado: 'venta', monto: 48000, notas: 'Firmó el plan de marketing a 6 meses.', fecha: hace(50) },
    { cliente: 'Constructora Ríos', tipo: 'Seguimiento', resultado: 'volver', monto: 0, notas: 'El gerente no estaba, regresar el jueves.', fecha: hace(28) },
    { cliente: 'Café La Esquina', tipo: 'Prospección', resultado: 'interesado', monto: 18500, notas: 'Quiere ver portafolio de restaurantes.', fecha: hace(6) },
    { cliente: 'Taller Mecánico Hernández', tipo: 'Prospección', resultado: 'sin-interes', monto: 0, notas: 'Ya tienen proveedor.', fecha: hace(3) },
    { cliente: 'Florería Pétalo', tipo: 'Cobranza', resultado: 'venta', monto: 12000, notas: 'Pagó el segundo anticipo en efectivo.', fecha: hace(1) },
  ]);
  toast('Se cargaron 5 visitas de ejemplo');
  await cargar();
}

function mostrarErrorDB(err) {
  $('#dbError').hidden = false;
  $('#dbErrorTexto').textContent = err.message;
  $('#visitaForm').querySelectorAll('input, select, textarea, button').forEach((el) => { el.disabled = true; });
}

// ---------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------
$('#visitaForm').addEventListener('submit', guardar);
$('#btnCancelar').addEventListener('click', salirDeEdicion);
$('#btnVaciar').addEventListener('click', vaciar);
$('#btnEjemplo').addEventListener('click', cargarEjemplo);
$('#buscar').addEventListener('input', pintar);

$('#lista').addEventListener('click', (e) => {
  const ed = e.target.closest('[data-editar]');
  const el = e.target.closest('[data-eliminar]');
  if (ed) editar(Number(ed.dataset.editar));
  if (el) eliminar(Number(el.dataset.eliminar));
});

$('#filtros').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-filtro]');
  if (!chip) return;
  filtro = chip.dataset.filtro;
  $('#filtros').querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === chip));
  pintar();
});

const pintarConexion = () => { $('#offlineAviso').hidden = navigator.onLine; };
window.addEventListener('online', pintarConexion);
window.addEventListener('offline', pintarConexion);
pintarConexion();

// Pide al navegador no borrar los datos aunque falte espacio (si lo permite)
navigator.storage?.persist?.();

// Service Worker: guarda la página para poder abrirla también sin internet
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

cargar();
