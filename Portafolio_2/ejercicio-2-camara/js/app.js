// =====================================================================
// Prosales Campo · Ejercicio 2 · CAPTURA DE MEDIOS CON LA CÁMARA
//
// 1. getUserMedia() pide permiso y devuelve una PROMESA con un MediaStream.
// 2. El stream se conecta a <video> con srcObject (video en tiempo real).
// 3. Al tomar la foto, el cuadro actual del video se dibuja en un <canvas>
//    con drawImage() y se le agrega un sello de fecha, hora y cliente.
// =====================================================================

const { $, toast, esc, fmtFecha } = UI;

const video = $('#video');
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');

let stream = null;
let camara = 'environment';     // 'environment' = trasera, 'user' = frontal
const fotos = [];               // capturas de esta visita (dataURL)

const ERRORES_CAMARA = {
  NotAllowedError: ['Permiso denegado', 'Permite la cámara desde el candado de la barra de direcciones y vuelve a intentarlo.'],
  NotFoundError: ['No hay cámara', 'No se encontró ninguna cámara conectada a este dispositivo.'],
  NotReadableError: ['La cámara está ocupada', 'Otra aplicación (Zoom, Meet, la app de cámara…) la está usando. Ciérrala e intenta de nuevo.'],
  OverconstrainedError: ['Cámara no compatible', 'No se encontró una cámara con esa configuración. Prueba con la otra cámara.'],
  SecurityError: ['Sitio no seguro', 'La cámara solo funciona en https:// o en localhost.'],
  AbortError: ['Se interrumpió el acceso', 'El navegador canceló la solicitud. Intenta de nuevo.'],
};

function pintarEstado(estado, texto) {
  const pill = $('#camPill');
  pill.dataset.state = estado;
  pill.textContent = texto;
}

function mostrarError(err) {
  const [titulo, texto] = ERRORES_CAMARA[err.name] || ['No se pudo abrir la cámara', err.message || 'Error desconocido.'];
  $('#camErrorTitulo').textContent = titulo;
  $('#camErrorTexto').textContent = texto;
  $('#camError').hidden = false;
  pintarEstado(err.name === 'NotAllowedError' ? 'denied' : 'unknown', err.name === 'NotAllowedError' ? 'Bloqueada' : 'Error');
}

// ---------------------------------------------------------------------
// Estado previo del permiso (si el navegador lo permite consultar)
// ---------------------------------------------------------------------
async function consultarPermiso() {
  try {
    const status = await navigator.permissions.query({ name: 'camera' });
    const textos = { granted: 'Permitida', prompt: 'Sin decidir', denied: 'Bloqueada' };
    const pintar = () => { if (!stream) pintarEstado(status.state, textos[status.state]); };
    pintar();
    status.addEventListener('change', pintar);
  } catch {
    // Firefox y Safari antiguos no aceptan 'camera' en la Permissions API: no pasa nada
  }
}

// ---------------------------------------------------------------------
// 1) ENCENDER: getUserMedia → <video>
// ---------------------------------------------------------------------
async function encender() {
  $('#camError').hidden = true;

  if (!navigator.mediaDevices?.getUserMedia) {
    // En http:// desde el celular, mediaDevices ni siquiera existe
    mostrarError({ name: window.isSecureContext ? 'NotFoundError' : 'SecurityError' });
    return;
  }

  const btn = $('#btnEncender');
  btn.setAttribute('aria-busy', 'true');
  btn.disabled = true;
  apagar(false);

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: camara },   // "ideal": si no hay cámara trasera (laptop), usa la que haya
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
    });
    video.srcObject = stream;
    await video.play();

    const ajustes = stream.getVideoTracks()[0].getSettings();
    const frontal = ajustes.facingMode ? ajustes.facingMode === 'user' : camara === 'user';
    $('#visor').classList.toggle('espejo', frontal);
    $('#visorVacio').hidden = true;
    $('#camInfo').textContent = `${frontal ? 'Cámara frontal' : 'Cámara trasera'} · ${ajustes.width}×${ajustes.height}`;
    pintarEstado('live', 'Transmitiendo');

    $('#btnCapturar').disabled = false;
    $('#btnApagar').hidden = false;
    btn.hidden = true;

    // El botón de girar solo aparece si hay más de una cámara
    const dispositivos = await navigator.mediaDevices.enumerateDevices();
    $('#btnGirar').hidden = dispositivos.filter((d) => d.kind === 'videoinput').length < 2;
  } catch (err) {
    mostrarError(err);
  } finally {
    btn.removeAttribute('aria-busy');
    btn.disabled = false;
  }
}

/** Detiene TODAS las pistas: así se apaga el foco de la cámara */
function apagar(reiniciarUI = true) {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  video.srcObject = null;
  if (!reiniciarUI) return;
  $('#visorVacio').hidden = false;
  $('#btnCapturar').disabled = true;
  $('#btnApagar').hidden = true;
  $('#btnGirar').hidden = true;
  $('#btnEncender').hidden = false;
  $('#camInfo').textContent = '';
  pintarEstado('unknown', 'Apagada');
}

function girar() {
  camara = camara === 'environment' ? 'user' : 'environment';
  encender();
}

// ---------------------------------------------------------------------
// 2) CAPTURAR: cuadro del <video> → <canvas>
// ---------------------------------------------------------------------
function capturar() {
  if (!stream || !video.videoWidth) return;

  // El canvas toma la resolución REAL del video, no el tamaño en pantalla
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  dibujarSello();

  canvas.classList.remove('vacio');
  $('#canvasVacio').hidden = true;
  $('#btnDescargar').disabled = false;

  $('#flash').classList.remove('on');
  void $('#flash').offsetWidth;               // reinicia la animación
  $('#flash').classList.add('on');
  navigator.vibrate?.(40);

  fotos.unshift({ url: canvas.toDataURL('image/jpeg', 0.85), cliente: $('#cliente').value.trim(), hora: Date.now() });
  pintarGaleria(0);
  toast('Foto capturada');
}

/** Sello de evidencia: franja inferior con marca, cliente y fecha */
function dibujarSello() {
  const w = canvas.width;
  const h = canvas.height;
  const alto = Math.round(h * 0.11);
  const fuente = Math.round(alto * 0.34);

  const degradado = ctx.createLinearGradient(0, h - alto * 1.6, 0, h);
  degradado.addColorStop(0, 'rgba(31, 26, 61, 0)');
  degradado.addColorStop(1, 'rgba(31, 26, 61, .88)');
  ctx.fillStyle = degradado;
  ctx.fillRect(0, h - alto * 1.6, w, alto * 1.6);

  const margen = Math.round(w * 0.03);
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${fuente}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillStyle = '#A3E635';
  ctx.fillText('PROSALES CAMPO', margen, h - alto * 0.62);

  const cliente = $('#cliente').value.trim() || 'Visita sin cliente';
  ctx.font = `600 ${Math.round(fuente * 0.9)}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.fillText(`${cliente} · ${fmtFecha.format(new Date())}`, w - margen, h - alto * 0.62);
  ctx.textAlign = 'left';
}

function pintarGaleria(activa) {
  $('#contador').textContent = fotos.length ? `(${fotos.length})` : '';
  $('#btnBorrar').hidden = fotos.length === 0;
  $('#galeria').innerHTML = fotos.map((f, i) => `
    <li><button type="button" data-foto="${i}" aria-current="${i === activa}" aria-label="Ver foto ${fotos.length - i}">
      <img src="${f.url}" alt="${esc(f.cliente || 'Foto de evidencia')}">
    </button></li>`).join('');
}

/** Al tocar una miniatura, se vuelve a dibujar en el canvas */
$('#galeria').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-foto]');
  if (!btn) return;
  const img = btn.querySelector('img');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);
  pintarGaleria(Number(btn.dataset.foto));
});

function descargar() {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `evidencia-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/jpeg', 0.9);
}

$('#btnBorrar').addEventListener('click', () => {
  fotos.length = 0;
  pintarGaleria();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.classList.add('vacio');
  $('#canvasVacio').hidden = false;
  $('#btnDescargar').disabled = true;
});

$('#btnEncender').addEventListener('click', encender);
$('#btnApagar').addEventListener('click', () => apagar());
$('#btnGirar').addEventListener('click', girar);
$('#btnCapturar').addEventListener('click', capturar);
$('#btnDescargar').addEventListener('click', descargar);

// Liberar la cámara al salir de la página (si no, el foco queda encendido)
window.addEventListener('pagehide', () => apagar(false));

canvas.classList.add('vacio');
consultarPermiso();
