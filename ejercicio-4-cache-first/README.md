# Ejercicio 4 · Cache API y estrategia de caché estática (Cache First)

Cuarta capa de Prosales: el Service Worker del Ejercicio 3 ahora **guarda el App Shell** con la
**Cache API** durante la instalación y **responde primero desde la caché**. Resultado: la app
abre al instante y funciona completa sin conexión (interfaz, datos y tipografía).

## Objetivos

- [x] Crear una memoria caché con la **Cache API** durante el evento `install`.
- [x] Almacenar los recursos estáticos del App Shell: **HTML, CSS, JS e imágenes base**.
- [x] Interceptar `fetch` para **servir primero desde la caché** antes de consultar la red.

### Extras

- **Tipografías offline desde la primera visita:** durante `install` el SW descarga la hoja de Google Fonts, extrae las URL de los archivos `.woff2` y también los guarda.
- **Limpieza por versión** en `activate`: solo borra las cachés de este ejercicio (`prosales-ej4-*`), sin tocar las de otras apps del mismo `localhost`.
- **Caché en tiempo de ejecución:** cualquier recurso que no estaba precacheado se guarda la primera vez que se pide.
- **Stale-While-Revalidate** para `data/leads.json`: los datos salen al instante de la caché y se actualizan en segundo plano para la siguiente visita.
- El panel **"Estado de la app"** muestra las cachés creadas, cuántos archivos tiene cada una, el espacio usado y el **porcentaje de peticiones respondidas desde caché**.

## Cachés

| Caché | Contenido | Cuándo se llena |
|---|---|---|
| `prosales-ej4-shell-v2.0.1` | `index.html`, `manifest.json`, `styles.css`, `app.js`, `leads.json`, íconos y capturas del manifest | En `install` (precaché) |
| `prosales-ej4-fuentes-v2.0.1` | Hoja de Google Fonts y sus archivos `.woff2` | En `install` (precaché) |
| `prosales-ej4-runtime-v2.0.1` | Cualquier otro recurso propio que se pida después | En `fetch`, al vuelo |

## Estrategias en `fetch`

| Recurso | Estrategia | Por qué |
|---|---|---|
| App Shell (HTML, CSS, JS, imágenes) | **Cache First** | Cambia poco; se renueva al publicar una nueva `VERSION` del SW |
| Google Fonts | **Cache First** | Las URL de los `.woff2` son únicas e inmutables |
| `data/leads.json` | Stale-While-Revalidate | Respuesta inmediata, pero con datos frescos en la siguiente carga |
| Otros orígenes | Sin intervenir | No son parte de la app |

### Cache First paso a paso

```js
async function cacheFirst(request, cacheDestino) {
  const enCache = await caches.match(request);      // 1. ¿Está en caché?
  if (enCache) return enCache;                       // 2. Sí → responder sin tocar la red

  const respuesta = await fetch(request);            // 3. No → pedirlo a la red
  if (respuesta.ok) {
    const cache = await caches.open(cacheDestino);
    cache.put(request, respuesta.clone());           // 4. Guardar copia para la próxima vez
  }
  return respuesta;
}
```

`cache.addAll(APP_SHELL)` en `install` es **atómico**: si un solo archivo falla, la instalación
falla y el navegador conserva la versión anterior, así nunca queda un App Shell incompleto.

## Cómo comprobarlo

1. Inicia Apache y abre `http://localhost/prosales/ejercicio-4-cache-first/`.
2. **F12 → Application → Cache Storage**: aparecen `prosales-ej4-shell-v2.0.1` y
   `prosales-ej4-fuentes-v2.0.1`; al abrirlas se ven los archivos guardados.
3. **F12 → Network** y recarga: los recursos muestran **(ServiceWorker)** en la columna *Size*.
4. **Modo sin conexión:**
   - En **Network**, cambia *No throttling* por **Offline** (o en *Application → Service Workers* marca **Offline**) y recarga.
   - La app carga completa: embudo, leads, reportes y la tipografía Plus Jakarta Sans.
   - También puedes **detener Apache** y recargar: sigue funcionando.
5. En la app, toca **"En línea · SW"** en el header: la sección *Cache API* muestra las cachés y el
   porcentaje de peticiones servidas desde caché (100% en la segunda carga).
6. **Actualización de caché:** cambia `VERSION` en `sw.js` y recarga → pulsa **Actualizar** → en
   *Cache Storage* las cachés `v2.0.1` desaparecen y quedan las de la nueva versión.

> ¿Qué pasa si se navega a una página que **no** está en caché y no hay red? Hoy el navegador
> muestra su error genérico. Eso es lo que resuelve el **Ejercicio 5** con una página de
> "Modo sin conexión".

## Estructura

```
ejercicio-4-cache-first/
├── index.html          ← + sección "Cache API" en el panel
├── sw.js               ← + precaché, limpieza por versión y Cache First
├── manifest.json
├── css/styles.css      ← + estilos de la sección de caché
├── js/app.js           ← + lectura de Cache Storage y tasa de aciertos
├── data/leads.json
├── icons/
└── screenshots/
```

## Capturas de verificación

> Agrega aquí tus capturas de *Cache Storage*, de *Network* con (ServiceWorker) y de la app en modo Offline.
