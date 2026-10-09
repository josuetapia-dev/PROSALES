// =====================================================================
// Prosales · Ejercicio 1
// Lee manifest.json y lo muestra en pantalla, y gestiona el botón de
// instalación personalizado.
// =====================================================================

const $ = (sel) => document.querySelector(sel);

// Descripción en español de cada propiedad clave del manifest
const PROPIEDADES = {
  name: 'Nombre completo: aparece en la Splash Screen y en el instalador',
  short_name: 'Nombre corto: debajo del ícono en la pantalla de inicio',
  start_url: 'Página que se abre al lanzar la app instalada',
  scope: 'Rutas que forman parte de la app',
  display: 'Modo de ventana: "standalone" oculta la barra del navegador',
  orientation: 'Orientación permitida',
  theme_color: 'Color de la barra de título y de estado',
  background_color: 'Fondo de la Splash Screen',
  lang: 'Idioma principal',
};

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (text != null) node.textContent = text;
  return node;
}

// ---------------------------------------------------------------------
// 1) Leer el manifest enlazado en el <head> y pintar la ficha
// ---------------------------------------------------------------------
async function cargarManifest() {
  const link = document.querySelector('link[rel="manifest"]');
  const props = $('#props');

  try {
    const res = await fetch(link.href);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const manifest = await res.json();
    const base = new URL(link.href);   // las rutas del manifest son relativas a él

    // Propiedades
    props.replaceChildren(...Object.keys(PROPIEDADES)
      .filter((k) => manifest[k] !== undefined)
      .map((k) => {
        const row = el('div');
        const dd = el('dd');
        if (k.endsWith('_color')) {
          const sw = el('span', { class: 'swatch' });
          sw.style.background = manifest[k];
          dd.append(sw);
        }
        dd.append(el('span', {}, manifest[k]), el('span', { class: 'hint' }, PROPIEDADES[k]));
        row.append(el('dt', {}, k), dd);
        return row;
      }));

    // Íconos
    $('#icons').replaceChildren(...manifest.icons.map((icon) => {
      const card = el('article', { class: 'icon-card' });
      const frame = el('div', { class: 'frame' + (icon.purpose === 'maskable' ? ' mask' : '') });
      frame.append(el('img', { src: new URL(icon.src, base).href, alt: 'Ícono ' + icon.sizes, width: 96, height: 96 }));
      const purpose = el('span', { class: 'tag' }, 'purpose: ' + (icon.purpose || 'any'));
      card.append(frame, el('h3', {}, icon.sizes + ' px'), purpose,
        el('p', {}, icon.purpose === 'maskable' ? 'Recortado en círculo, como lo haría Android' : icon.src));
      return card;
    }));

    // Vista previa de la Splash Screen con los valores reales
    $('#splashPreview').style.background = manifest.background_color;
    $('#splashName').textContent = manifest.name;
  } catch (err) {
    console.error('[Prosales] No se pudo leer el manifest:', err);
    props.replaceChildren(el('p', { class: 'hint' },
      'No se pudo leer manifest.json. Abre la página desde un servidor (http://localhost/...), no con doble clic.'));
  }
}

// ---------------------------------------------------------------------
// 2) Instalación personalizada
//    Chrome dispara "beforeinstallprompt" cuando el manifest cumple los
//    requisitos de instalabilidad. Lo guardamos y lo lanzamos con nuestro botón.
// ---------------------------------------------------------------------
let promptDiferido = null;
const btn = $('#installBtn');
const msg = $('#installMsg');

const yaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();          // evita el mini-banner automático
  promptDiferido = e;
  btn.hidden = false;
  msg.textContent = 'Lista para instalarse en este dispositivo.';
});

btn.addEventListener('click', async () => {
  if (!promptDiferido) return;
  promptDiferido.prompt();
  const { outcome } = await promptDiferido.userChoice;
  msg.textContent = outcome === 'accepted' ? 'Instalando…' : 'Instalación cancelada. Puedes intentarlo de nuevo.';
  promptDiferido = null;
  btn.hidden = true;
});

window.addEventListener('appinstalled', () => {
  btn.hidden = true;
  msg.textContent = 'Prosales quedó instalada. Búscala en tu escritorio o pantalla de inicio.';
});

function estadoInicialInstalacion() {
  if (yaInstalada()) {
    msg.textContent = 'Estás usando Prosales como app instalada.';
  } else if (!promptDiferido) {
    // Safari y Firefox no disparan beforeinstallprompt
    msg.textContent = /iPhone|iPad/.test(navigator.userAgent)
      ? 'En iPhone: toca Compartir y luego “Agregar a inicio”.'
      : 'Si no aparece el botón, usa el ícono de instalar en la barra de direcciones.';
  }
}

cargarManifest();
setTimeout(estadoInicialInstalacion, 1500);
