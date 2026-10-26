// =====================================================================
// Prosales Campo · Ejercicio 4 · CAPA DE DATOS CON INDEXEDDB
//
// IndexedDB usa eventos (onsuccess / onerror). Aquí se envuelven en
// promesas para usarlas con async/await desde app.js, sin librerías.
//
//   Base de datos:  prosales-campo   (versión 1)
//   Object store:   visitas          (keyPath: id, autoIncrement)
//   Índices:        fecha, cliente, resultado
// =====================================================================

const VisitasDB = (() => {
  const NOMBRE = 'prosales-campo';
  const VERSION = 1;
  const STORE = 'visitas';
  let conexion = null;

  /** Convierte un IDBRequest en promesa */
  const promesa = (req) => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  /** Espera a que la transacción se confirme en disco */
  const terminar = (tx) => new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción cancelada'));
  });

  // -------------------------------------------------------------------
  // APERTURA y creación del Object Store
  // -------------------------------------------------------------------
  function abrir() {
    if (conexion) return Promise.resolve(conexion);
    if (!('indexedDB' in window)) return Promise.reject(new Error('Este navegador no soporta IndexedDB'));

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(NOMBRE, VERSION);

      // Solo corre la primera vez o cuando sube VERSION: aquí se define la estructura
      req.onupgradeneeded = (e) => {
        const db = req.result;
        if (e.oldVersion < 1) {
          const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('fecha', 'fecha');
          store.createIndex('cliente', 'cliente');
          store.createIndex('resultado', 'resultado');
        }
      };

      req.onsuccess = () => {
        conexion = req.result;
        // Si otra pestaña abre una versión más nueva, se cierra esta conexión
        // para no bloquearla (evita los "errores de versión")
        conexion.onversionchange = () => {
          conexion.close();
          conexion = null;
          UI.toast('Hay una versión nueva de la base de datos. Recarga la página.', 6000);
        };
        resolve(conexion);
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Cierra las otras pestañas de Prosales Campo para actualizar la base de datos'));
    });
  }

  async function store(modo) {
    const db = await abrir();
    const tx = db.transaction(STORE, modo);
    return { tx, store: tx.objectStore(STORE) };
  }

  // -------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------

  /** CREATE: inserta y devuelve el id generado */
  async function agregar(visita) {
    const { tx, store: s } = await store('readwrite');
    const id = await promesa(s.add({ ...visita, fecha: visita.fecha ?? Date.now() }));
    await terminar(tx);
    return id;
  }

  /** READ: todas las visitas, de la más reciente a la más antigua (índice fecha) */
  async function listar() {
    const { store: s } = await store('readonly');
    const visitas = await promesa(s.index('fecha').getAll());
    return visitas.reverse();
  }

  /** READ: una visita por id */
  async function obtener(id) {
    const { store: s } = await store('readonly');
    return promesa(s.get(id));
  }

  /** UPDATE: put() reemplaza el registro que tenga el mismo id */
  async function actualizar(visita) {
    const { tx, store: s } = await store('readwrite');
    s.put({ ...visita, editado: Date.now() });
    await terminar(tx);
  }

  /** DELETE: elimina por id */
  async function eliminar(id) {
    const { tx, store: s } = await store('readwrite');
    s.delete(id);
    await terminar(tx);
  }

  /** DELETE: vacía el Object Store */
  async function vaciar() {
    const { tx, store: s } = await store('readwrite');
    s.clear();
    await terminar(tx);
  }

  /** Inserta varios registros en UNA sola transacción */
  async function agregarVarios(visitas) {
    const { tx, store: s } = await store('readwrite');
    visitas.forEach((v) => s.add(v));
    await terminar(tx);
  }

  return { abrir, agregar, listar, obtener, actualizar, eliminar, vaciar, agregarVarios, NOMBRE, VERSION, STORE };
})();
