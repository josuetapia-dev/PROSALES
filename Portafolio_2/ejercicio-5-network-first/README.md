# Ejercicio 5 · Caché dinámica Network-First con fallback a IndexedDB

**Catálogo de productos:** para cotizar durante la visita, el vendedor consulta precios y existencias
desde una API REST. Si se queda sin señal, sigue viendo el último catálogo descargado.

## Objetivos

- [x] Consumir una **API REST remota** con `fetch` ([DummyJSON](https://dummyjson.com/docs/products)).
- [x] Aplicar la estrategia **Network-First**.
- [x] Guardar una **copia local del JSON en IndexedDB** al recibir la respuesta.
- [x] Sin red, **recuperar y mostrar automáticamente** el último JSON guardado.

## Cómo funciona

```
cargarCatalogo()
  │
  ├─ ¿navigator.onLine? ── no ──────────────────────────────┐
  │        sí                                               │
  ▼                                                         │
fetch(API) con límite de 8 s (AbortController)              │
  │                                                         │
  ├─ OK  → IndexedDB.put({ clave: 'catalogo', datos, fecha })│
  │        pinta "En vivo" (verde)                          │
  │                                                         ▼
  └─ falla (sin red / timeout / 5xx) ──────► IndexedDB.get('catalogo')
                                              ├─ hay copia → pinta "Sin conexión: datos guardados" (ámbar)
                                              └─ no hay    → explica qué hacer (rojo), nunca pantalla en blanco
```

### Actualización automática

| Evento | Qué hace la app, sin recargar |
|---|---|
| `offline` | Cambia al instante a la copia de IndexedDB y muestra el aviso ámbar con la fecha de la copia |
| `online` | Vuelve a consultar la API y regresa a "En vivo" |

### Dónde se guarda cada cosa

| Recurso | Dónde | Estrategia |
|---|---|---|
| JSON de la API | **IndexedDB** `prosales-campo-api` → `respuestas` | Network-First (en `app.js`) |
| HTML, CSS, JS e íconos | Cache API | Cache First (en `sw.js`) |
| Imágenes de productos | Cache API | Cache First + imagen de reemplazo sin red |

> La base de datos es distinta a la del Ejercicio 4 (`prosales-campo`). Como los dos ejercicios
> comparten origen, así no compiten por el número de versión.

El panel *Estrategia paso a paso* muestra en vivo cada decisión: petición, tiempo de respuesta,
guardado en IndexedDB y uso del *fallback*.

## Cómo probarlo

1. Abre `http://localhost/PROSALES/Portafolio_2/ejercicio-5-network-first/` **con internet**: el aviso queda en verde (*En vivo*).
2. DevTools → *Network* → **Offline**. Sin recargar, el aviso cambia a ámbar y el catálogo sigue visible.
3. Con *Offline* activado, **recarga**: la página abre (Service Worker) y los datos salen de IndexedDB.
4. Quita *Offline*: la app vuelve a consultar la API sola.
5. DevTools → *Application* → *IndexedDB* → `prosales-campo-api` → `respuestas`: ahí está el JSON guardado.
