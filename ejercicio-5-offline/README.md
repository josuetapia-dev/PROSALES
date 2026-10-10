# Ejercicio 5 · Interceptor de peticiones y manejo de estado offline

Última capa de Prosales: el Service Worker ya no solo sirve desde caché (Ejercicio 4), ahora
también **sabe qué responder cuando la red falla y el recurso no está guardado**. En lugar del
error nativo del navegador (el dinosaurio de Chrome), la app muestra una **página propia de
"Modo sin conexión"** y avisa al usuario de su estado en todo momento.

Esta carpeta es la **versión completa** de Prosales.

## Objetivos

- [x] Programar una **respuesta alternativa (fallback)** en el evento `fetch` para detectar la pérdida de conexión.
- [x] Renderizar una **plantilla HTML personalizada de "Modo sin conexión"** cuando la red falla y el recurso no existe en caché.

### Extras

- **Fallbacks por tipo de recurso:** página → `offline.html`, imagen → SVG de reemplazo, datos → JSON `503 { offline: true }`.
- **Detección real de la conexión.** `navigator.onLine` solo sabe si hay Wi-Fi o datos, no si el servidor responde. La app combina tres señales:
  1. Eventos `online` / `offline` del navegador.
  2. Un *ping* real al servidor (`manifest.json?ping=…`) que el SW **nunca** responde desde caché.
  3. Avisos del Service Worker cuando una petición a la red falla.
- **Aviso "Sin conexión"** dentro del App Shell con botón *Reintentar*, indicador del header en rojo y avisos al perder o recuperar la red. Sin conexión se reintenta cada 10 s; con conexión, cada minuto.
- `offline.html` es **autocontenida** (CSS y logo SVG en línea): se muestra aunque no haya nada más en caché. Se recarga sola al volver la conexión.
- **Centro de ayuda** (`ayuda.html`), que **no** se precachea a propósito: con internet se guarda al visitarla, y sin internet (sin haberla visitado) muestra el fallback. Es la forma más clara de probar este ejercicio.
- **Botón "Instalar app"** en el header, que solo aparece cuando el navegador permite instalar y se oculta si la app ya está instalada.

## Flujo del interceptor (`fetch`)

```
                    ┌────────────────────┐
  petición ───────► │ ¿Está en caché?    │── sí ──► respuesta desde caché
                    └─────────┬──────────┘
                              │ no
                    ┌─────────▼──────────┐
                    │ ¿Responde la red?  │── sí ──► respuesta de red (+ copia en caché)
                    └─────────┬──────────┘
                              │ no  ← pérdida de conexión detectada
                    ┌─────────▼──────────────────────────────┐
                    │ RESPUESTA ALTERNATIVA según el recurso │
                    │  · página  → offline.html              │
                    │  · imagen  → SVG "no disponible"       │
                    │  · datos   → JSON 503 { offline: true }│
                    └────────────────────────────────────────┘
```

`fetch()` **solo lanza un error cuando no hay red**: un 404 o un 500 sí resuelven. Por eso el
`catch` de cada estrategia es el punto exacto donde se detecta la pérdida de conexión:

```js
async function paginas(request) {
  const enCache = await caches.match(request, { ignoreSearch: true });
  if (enCache) return enCache;                 // App Shell o página ya visitada

  try {
    const res = await fetch(request);          // intentar la red
    (await caches.open(CACHE_RUNTIME)).put(request, res.clone());
    return res;
  } catch {
    return caches.match('./offline.html');     // FALLBACK: plantilla "Modo sin conexión"
  }
}
```

`offline.html` se guarda en la precaché durante `install`, así el fallback **siempre** está disponible.

## Cómo comprobarlo

1. Inicia Apache y abre `http://localhost/prosales/ejercicio-5-offline/`. Espera a que el SW
   se active (el header muestra **"En línea · SW"**). **No abras todavía la Ayuda.**
2. **F12 → Network → Offline** (o detén Apache).
3. **Recarga la app:** carga completa desde caché, el indicador cambia a **"Sin conexión"** y
   aparece el aviso amarillo dentro del App Shell.
4. **Abre "Ayuda"** en el menú: como esa página nunca se guardó, el SW responde con la
   **página de "Estás sin conexión"** (la URL sigue siendo `ayuda.html`).
5. Vuelve a **No throttling** (o inicia Apache) y pulsa **Reintentar**: se abre el Centro de ayuda.
6. Repite el paso 2 y abre otra vez la Ayuda: ahora **sí** carga, porque se guardó en la caché
   en tiempo de ejecución durante el paso 5.
7. En el panel **"Estado de la app"** (indicador del header) el registro marca en amarillo los
   eventos `offline` y `fallback`.

> Para volver a probar el fallback desde cero: *Application → Storage → Clear site data* y
> repite desde el paso 1.

## Splash Screen e instalación

Esta es la versión recomendada para instalar Prosales y verificar la **Splash Screen** del
Ejercicio 2: usa el botón **Instalar app** del header (o el ícono de instalar de la barra de
direcciones) y abre la app desde el escritorio o la pantalla de inicio.

## Estructura

```
ejercicio-5-offline/
├── index.html          ← + aviso "Sin conexión", botón "Instalar app" y enlace a Ayuda
├── offline.html        ← NUEVO: plantilla "Modo sin conexión" (autocontenida)
├── ayuda.html          ← NUEVO: Centro de ayuda (no precacheado, para probar el fallback)
├── sw.js               ← + fallbacks por tipo de recurso y avisos de conexión
├── manifest.json
├── css/styles.css      ← + estilos del aviso offline
├── js/app.js           ← + detección de conexión e instalación
├── data/leads.json
├── icons/
└── screenshots/
```

## Capturas de verificación

> Agrega aquí tus capturas de la app sin conexión y de la página "Estás sin conexión".
