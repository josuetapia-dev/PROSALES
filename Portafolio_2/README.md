# Prosales Campo · Portafolio de Ejercicios 2

**Web APIs, permisos y persistencia de datos**

Módulo de Prosales para vendedores que visitan clientes en la calle. Cada ejercicio resuelve una
parte real de la visita: registrar la llegada, tomar evidencia, programar el seguimiento, guardar
la bitácora y cotizar con el catálogo, **aunque no haya señal**.

Abre [`index.html`](index.html) para ver el menú de los cinco módulos.

## Ejercicios

| Carpeta | Módulo | Web APIs |
|---|---|---|
| [`ejercicio-1-geolocalizacion`](ejercicio-1-geolocalizacion) | Registro de llegada con mapa | Permissions API, Geolocation API, Leaflet |
| [`ejercicio-2-camara`](ejercicio-2-camara) | Foto de evidencia con sello de fecha y cliente | `getUserMedia`, `<video>`, `<canvas>` |
| [`ejercicio-3-notificaciones`](ejercicio-3-notificaciones) | Recordatorios de seguimiento | Notifications API, Service Worker `showNotification` |
| [`ejercicio-4-indexeddb`](ejercicio-4-indexeddb) | Bitácora de visitas (CRUD) | IndexedDB nativo, Storage API |
| [`ejercicio-5-network-first`](ejercicio-5-network-first) | Catálogo de productos sin conexión | `fetch`, Network-First, IndexedDB, eventos `online`/`offline` |

Cada carpeta tiene su propio `README.md` con la explicación y los pasos para probarla.
La carpeta [`comun`](comun) contiene los estilos, las utilidades de interfaz y los íconos que
comparten los cinco ejercicios.

## Cómo ejecutarlo

Las APIs de este portafolio solo funcionan en un **contexto seguro**: `https://` o `localhost`.

- **XAMPP:** inicia Apache y abre `http://localhost/PROSALES/Portafolio_2/`.
- **Celular:** publica el repositorio con HTTPS (por ejemplo GitHub Pages). Con `http://` y la IP de la
  computadora, el navegador bloquea la cámara, el GPS y las notificaciones.

## Tecnologías

HTML5, CSS3 y JavaScript (ES2022) sin frameworks, con Permissions, Geolocation, Media Capture,
Notifications, Service Worker, IndexedDB, Cache y Storage API. Mapa con
[Leaflet](https://leafletjs.com/) y OpenStreetMap; catálogo con la API pública de
[DummyJSON](https://dummyjson.com/).
