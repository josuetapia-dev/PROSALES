# Ejercicio 4 · Persistencia de datos asíncrona con IndexedDB

**Bitácora de visitas:** cada visita a un cliente (tipo, resultado, monto y notas) se guarda en el
propio dispositivo y está disponible aunque no haya internet.

## Objetivos

- [x] Abrir la base de datos y crear un **Object Store** en IndexedDB con **JavaScript nativo**.
- [x] Interfaz para **insertar, consultar y eliminar** registros locales.
- [x] Funcionar **sin depender de una conexión a internet**.

## Estructura de la base de datos

| Elemento | Valor |
|---|---|
| Base de datos | `prosales-campo` (versión `1`) |
| Object Store | `visitas`, con `keyPath: 'id'` y `autoIncrement: true` |
| Índices | `fecha`, `cliente`, `resultado` |

```js
{ id: 3, cliente: 'Café La Esquina', tipo: 'Prospección', resultado: 'interesado',
  monto: 18500, notas: 'Quiere ver portafolio…', fecha: 1761412345678 }
```

## Cómo funciona

Toda la persistencia vive en [`js/db.js`](js/db.js): la API de IndexedDB se basa en eventos
(`onsuccess` / `onerror`), así que se envuelve en **promesas** para usarla con `async/await`.

| Operación | Método de IndexedDB | En la interfaz |
|---|---|---|
| **Create** | `store.add()` | Formulario *Nueva visita* |
| **Read** | `index('fecha').getAll()` y `store.get()` | Lista, búsqueda y filtros por resultado |
| **Update** | `store.put()` | Botón ✏️ (el formulario cambia a *Editar visita*) |
| **Delete** | `store.delete()` y `store.clear()` | Botón 🗑️ y *Borrar todo* |

- Las escrituras esperan a `transaction.oncomplete`, que confirma que el dato ya se guardó.
- **Sin errores de versión:** la estructura se crea en `onupgradeneeded` según `oldVersion`;
  `onversionchange` cierra la conexión si otra pestaña abre una versión más nueva y `onblocked`
  avisa al usuario en lugar de dejar la app congelada.
- *Cargar visitas de ejemplo* inserta 5 registros en **una sola transacción**.
- Resumen con total de visitas, ventas cerradas, monto vendido y espacio usado (`navigator.storage.estimate()`).
- `navigator.storage.persist()` le pide al navegador no borrar los datos aunque falte espacio.
- Un Service Worker sencillo guarda los archivos de la página para poder **abrirla sin internet**.

## Cómo probarlo

1. Abre `http://localhost/PROSALES/Portafolio_2/ejercicio-4-indexeddb/` y guarda algunas visitas.
2. DevTools → *Application* → *IndexedDB* → `prosales-campo` → `visitas`: ahí están los registros.
3. Edita y elimina una visita y refresca la vista de DevTools para ver el cambio.
4. **Sin conexión:** DevTools → *Network* → *Offline*. Recarga: la página abre y puedes seguir agregando y eliminando visitas.
