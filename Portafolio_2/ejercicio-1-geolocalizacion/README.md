# Ejercicio 1 · Consulta de permisos y geolocalización

**Registro de llegada:** cuando el vendedor llega con un cliente, Prosales Campo guarda en qué
lugar y a qué hora ocurrió la visita.

## Objetivos

- [x] Verificar el estado del permiso con la **Permissions API** (`navigator.permissions.query`).
- [x] Solicitar el GPS con `navigator.geolocation.getCurrentPosition`.
- [x] Mostrar latitud y longitud en texto y en un **mapa interactivo**.

## Cómo funciona

1. Al abrir la página se consulta `navigator.permissions.query({ name: 'geolocation' })`, que
   responde **sin molestar al usuario**:

   | Estado | Qué muestra la app |
   |---|---|
   | `granted` | Permiso concedido: la ubicación se obtiene sin volver a preguntar |
   | `prompt` | Pendiente: el navegador preguntará al registrar la llegada |
   | `denied` | Bloqueado: se desactiva el botón y se explica cómo volver a activarlo |

   El evento `change` del permiso actualiza la interfaz si el usuario lo cambia desde el candado del navegador.

2. **Registrar mi ubicación** llama a `getCurrentPosition` envuelto en una promesa, con
   `enableHighAccuracy`, `timeout: 15000` y `maximumAge: 0`. Como la API es asíncrona, **la
   interfaz no se bloquea**: el botón muestra un indicador de carga y la página sigue respondiendo.
3. Las coordenadas se muestran en texto (latitud, longitud, precisión y hora) y en un mapa de
   [Leaflet](https://leafletjs.com/) con OpenStreetMap, con un círculo que representa el margen de precisión.
4. Cada llegada se agrega al historial del día.

### Errores controlados

| Código | Causa | Mensaje |
|---|---|---|
| `1` PERMISSION_DENIED | El usuario negó el permiso | Cómo activarlo desde el candado |
| `2` POSITION_UNAVAILABLE | GPS apagado o sin señal | Revisar la ubicación del sistema |
| `3` TIMEOUT | Pasaron 15 s sin respuesta | Reintentar o desactivar alta precisión |

Además: navegador sin Permissions API, sitio sin HTTPS y mapa sin conexión (las coordenadas se siguen mostrando en texto).

## Cómo probarlo

1. Abre `http://localhost/PROSALES/Portafolio_2/ejercicio-1-geolocalizacion/`.
2. Revisa el estado del permiso, escribe un cliente y toca **Registrar mi ubicación**.
3. **Prueba el rechazo:** candado → *Ubicación* → *Bloquear*. El indicador cambia a *Bloqueado* sin recargar.
4. **Simular otra ubicación:** DevTools → `⋮` → *More tools* → *Sensors* → *Location*.
