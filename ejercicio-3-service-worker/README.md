# Ejercicio 3 · Registro y ciclo de vida del Service Worker

Tercera capa de Prosales: un **Service Worker** (`sw.js`), el script que el navegador ejecuta en
segundo plano, separado de la página, y que actúa como **proxy** entre la app y la red. Es la
pieza que en los siguientes ejercicios permite la caché y el modo sin conexión.

En este ejercicio el SW se **registra**, recorre su **ciclo de vida** completo e **intercepta**
todas las peticiones de la app, pero todavía las deja pasar a la red sin modificarlas.

## Objetivos

- [x] Crear el script `sw.js`.
- [x] Registrarlo de forma **asíncrona** desde el archivo principal de JavaScript (`js/app.js`).
- [x] Implementar los escuchadores de **`install`**, **`activate`** y **`fetch`**.

### Extras

- **Panel "Estado de la app"**: al tocar el indicador de conexión del header se abre una línea de tiempo del ciclo de vida (Registrado → Instalado → Activado → Controlando), la versión, el *scope* y un registro en vivo de los eventos que envía el SW.
- **Flujo de actualización controlado**: cuando cambia `sw.js`, la nueva versión queda *en espera* y la app muestra **"Hay una nueva versión · Actualizar"**. Al aceptar, la página le pide al SW que se active (`skipWaiting`) y se recarga sola.
- Comunicación **bidireccional** página ↔ SW con `postMessage`.
- Botón **"Buscar actualización"** que fuerza `registration.update()`.

## Ciclo de vida

```
 app.js                         sw.js
 ──────                         ─────
 register('./sw.js')  ───────►  install    ← se prepara (en el Ej. 4: precaché)
        │                          │
        │                       waiting    ← solo si ya había otra versión activa
        │                          │          (espera a que el usuario actualice)
        │                       activate   ← limpia y toma el control (clients.claim)
        │                          │
 fetch('data/leads.json') ─────►  fetch    ← intercepta cada petición del scope
                                   │
                              red ◄┘       ← por ahora: siempre a la red
```

## Código clave

**Registro asíncrono** (`js/app.js`):

```js
async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;            // detección de soporte
  const registro = await navigator.serviceWorker.register('./sw.js', { scope: './' });
  registro.addEventListener('updatefound', () => { /* nueva versión descargándose */ });
}
window.addEventListener('load', registrarServiceWorker);  // no compite con la carga inicial
```

**Escuchadores** (`sw.js`):

| Evento | Cuándo ocurre | Qué hace aquí |
|---|---|---|
| `install` | Una vez por versión, al descargar un `sw.js` nuevo o distinto | Avisa a la app con `event.waitUntil()`; **no** llama a `skipWaiting()` para permitir la actualización controlada |
| `activate` | Cuando la versión toma el control | `clients.claim()` para controlar las pestañas abiertas sin recargar |
| `fetch` | En cada petición GET del mismo origen dentro del *scope* | `event.respondWith(fetch(request))`: la intercepta y la deja pasar a la red |
| `message` | Cuando la página envía un mensaje | `SKIP_WAITING` activa la versión en espera; `VERSION` responde con la versión |

> ¿Por qué `fetch` no intercepta el primer `index.html`? Porque la primera vez que se abre la
> app todavía no hay un SW controlando. Desde la siguiente carga (o tras `clients.claim()`)
> todas las peticiones pasan por él.

## Cómo comprobarlo

1. Inicia Apache y abre `http://localhost/prosales/ejercicio-3-service-worker/`.
2. **F12 → Application → Service Workers**:
   - Debe aparecer `sw.js` con estado **"activated and is running"** y el *scope* de la carpeta.
3. **F12 → Console**: se ven los mensajes `[SW v1.0.0] install`, `activate` y un `fetch` por cada recurso.
4. **F12 → Network**: recarga; en la columna *Size* los recursos aparecen como **(ServiceWorker)**.
5. En la app, toca el indicador **"En línea · SW"** del header para abrir el panel del ciclo de vida.
6. **Probar una actualización:**
   1. Cambia `VERSION` en `sw.js` (por ejemplo, a `'v1.0.1'`) y guarda.
   2. Recarga la página: en *Application → Service Workers* aparece la nueva versión **"waiting to activate"** y la app muestra la barra **"Hay una nueva versión"**.
   3. Pulsa **Actualizar**: la versión nueva se activa y la página se recarga sola.

> Durante el desarrollo puedes marcar **"Update on reload"** en *Application → Service Workers*
> para que cada recarga instale la última versión sin pasar por *waiting*.

## Estructura

```
ejercicio-3-service-worker/
├── index.html          ← + panel "Estado de la app" y barra de actualización
├── sw.js               ← NUEVO: install, activate, fetch y message
├── manifest.json
├── css/styles.css      ← + estilos del panel del ciclo de vida
├── js/app.js           ← + registro asíncrono y seguimiento del ciclo de vida
├── data/leads.json
├── icons/
└── screenshots/
```

## Capturas de verificación

> Agrega aquí tus capturas de *Application → Service Workers* y de la consola.
