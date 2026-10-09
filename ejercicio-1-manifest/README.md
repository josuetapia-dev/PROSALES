# Ejercicio 1 · Web App Manifest y metadatos de instalación

Primera capa de Prosales: convertir una página web común en una **aplicación instalable**.
Para eso el navegador necesita un archivo `manifest.json` que describa la app (nombre, colores,
íconos y cómo debe abrirse) y que esté enlazado desde el HTML.

## Objetivos

- [x] Crear `manifest.json` y enlazarlo al HTML base.
- [x] Configurar las propiedades clave: `name`, `short_name`, `start_url`, `display: standalone`, `theme_color` y `background_color`.
- [x] Generar e integrar el paquete de íconos PNG de 192 × 192 y 512 × 512 px.

### Extras

- Ícono **maskable** (512 px) con zona de seguridad para los íconos adaptativos de Android, separado de los íconos `any` (Chrome desaconseja `"purpose": "any maskable"`).
- Metadatos para **iOS/Safari** (`apple-touch-icon` de 180 px, `apple-mobile-web-app-*`), que no lee los íconos del manifest.
- **Favicon SVG** vectorial con respaldo PNG.
- **Botón de instalación propio** usando el evento `beforeinstallprompt`, con mensajes para iPhone y navegadores sin soporte.
- La página **lee su propio manifest** con `fetch()` y muestra la ficha de instalación, los íconos y una vista previa de la Splash Screen con los valores reales.
- Modo oscuro automático y diseño responsivo.

## Estructura

```
ejercicio-1-manifest/
├── index.html            ← HTML base con <link rel="manifest"> y metadatos
├── manifest.json         ← configuración de instalación
├── css/styles.css
├── js/app.js             ← lee el manifest y gestiona la instalación
└── icons/
    ├── icon-192.png          (purpose: any)
    ├── icon-512.png          (purpose: any)
    ├── icon-maskable-512.png (purpose: maskable)
    ├── apple-touch-icon.png  (iOS, 180 px)
    └── favicon.svg
```

## Propiedades del manifest

| Propiedad | Valor | Para qué sirve |
|---|---|---|
| `name` | `Prosales CRM` | Nombre completo; aparece en el instalador y en la Splash Screen |
| `short_name` | `Prosales` | Nombre corto bajo el ícono de la pantalla de inicio |
| `start_url` | `./index.html` | Página que abre la app instalada |
| `scope` | `./` | Rutas que pertenecen a la app |
| `display` | `standalone` | Abre en ventana propia, sin barra del navegador |
| `theme_color` | `#1F1A3D` | Color de la barra de título / barra de estado |
| `background_color` | `#1F1A3D` | Fondo de la Splash Screen (igual al del ícono para una transición limpia) |
| `icons` | 192, 512 y 512 maskable | Íconos de la app y de la Splash Screen |
| `id`, `lang`, `categories` | — | Identidad estable de la app, idioma y categorías para las tiendas |

## Cómo comprobarlo

1. Sirve la carpeta con un servidor local (por ejemplo, Apache de XAMPP) y abre
   `http://localhost/prosales/ejercicio-1-manifest/`.
2. Abre **Chrome DevTools → Application → Manifest**:
   - La sección *Identity* y *Presentation* muestra el nombre, `start_url`, `display` y colores.
   - La sección *Icons* muestra los tres íconos. Marca **"Show only the minimum safe area for
     maskable icons"** para ver que el logo cabe completo dentro del círculo.
   - No deben aparecer advertencias en la sección *Installability*.
3. El ícono de **instalar** aparece en la barra de direcciones, y el botón *Instalar Prosales* en la página.

## Capturas

> Agrega aquí tus capturas de DevTools (guárdalas en `docs/capturas/`).
