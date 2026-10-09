<div align="center">

<img src="docs/brand/icon.svg" alt="Logo de Prosales" width="96">

# Prosales CRM

**Del prospecto a la venta, desde tu bolsillo.**

Aplicación Web Progresiva (PWA) para gestionar el embudo de ventas de negocios de servicios:
leads, etapas, seguimientos y reportes, instalable y con soporte sin conexión.

![PWA](https://img.shields.io/badge/PWA-ready-1F1A3D?style=flat-square&logo=pwa)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Licencia MIT](https://img.shields.io/badge/licencia-MIT-A3E635?style=flat-square)

</div>

---

## Sobre el proyecto

Prosales nace de una necesidad real: los vendedores de servicios pasan buena parte del día
fuera de la oficina, con mala señal, y necesitan revisar a quién llamar, en qué etapa va cada
cliente y registrar avances desde el celular. Una PWA resuelve eso sin pasar por tiendas de
aplicaciones: se instala desde el navegador, abre al instante y sigue funcionando sin internet.

Este repositorio corresponde al **Portafolio de Ejercicios 1 – Configuración Base y Componentes PWA**.
Cada ejercicio vive en su propia carpeta y es **independiente y funcional**; cada uno toma el
anterior como base y le agrega una capa de la arquitectura PWA.

## Estructura del repositorio

| Carpeta | Ejercicio | Qué se construye |
|---|---|---|
| [`ejercicio-1-manifest`](ejercicio-1-manifest) | Web App Manifest y metadatos de instalación | `manifest.json`, paquete de íconos PNG (192, 512 y *maskable*), metadatos para iOS/Android |
| [`ejercicio-2-app-shell`](ejercicio-2-app-shell) | App Shell y Splash Screen nativa | Header, menú de navegación y contenedor principal responsivos; verificación de la Splash Screen en DevTools |
| [`ejercicio-3-service-worker`](ejercicio-3-service-worker) | Registro y ciclo de vida del Service Worker | `sw.js` registrado de forma asíncrona; eventos `install`, `activate` y `fetch` |
| [`ejercicio-4-cache-first`](ejercicio-4-cache-first) | Cache API y estrategia Cache First | Precaché del App Shell durante `install` y respuesta desde caché antes que la red |
| [`ejercicio-5-offline`](ejercicio-5-offline) | Interceptor de peticiones y modo offline | Respuesta *fallback* y página personalizada de "Modo sin conexión" |

Cada carpeta incluye su propio `README.md` con la explicación del ejercicio y cómo comprobarlo.

## Cómo ejecutarlo

Los Service Workers solo funcionan en `https://` o en `localhost`, así que **no basta con abrir el
`index.html` con doble clic**: hay que servir la carpeta con un servidor local.

**Opción A: XAMPP** (el proyecto vive en `htdocs`)

1. Inicia **Apache** desde el XAMPP Control Panel.
2. Abre `http://localhost/prosales/ejercicio-1-manifest/` (o la carpeta del ejercicio que quieras ver).

**Opción B: cualquier servidor estático**

```bash
npx serve .
```

## Identidad visual

| Token | Color | Uso |
|---|---|---|
| Tinta | `#1F1A3D` | Color de marca, botones principales, `theme_color` y Splash Screen |
| Lima | `#A3E635` | Exclusivo para "venta cerrada": éxito, metas y acentos |
| Papel | `#F7F7F2` | Fondo de la interfaz en modo claro |

- **Logo:** una palomita de "venta cerrada" cuyo trazo largo se convierte en la **S** de *Sales*. Versiones en [`docs/brand`](docs/brand): ícono de app, logo para fondo claro y logo para fondo oscuro (SVG).
- **Tipografía:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans).
- **Modo oscuro** automático según la preferencia del sistema.

## Tecnologías

- HTML5 semántico, CSS3 (Grid, Flexbox, custom properties) y JavaScript (ES2022) sin frameworks.
- Web App Manifest, Service Worker y Cache API.
- Chrome DevTools (paneles *Application* y *Lighthouse*) para la verificación.

## Progreso

- [ ] Ejercicio 1: Web App Manifest
- [ ] Ejercicio 2: App Shell y Splash Screen
- [ ] Ejercicio 3: Service Worker
- [ ] Ejercicio 4: Cache First
- [ ] Ejercicio 5: Modo sin conexión

## Autor

**Josué Pérez Tapia** · [@josuetapia-dev](https://github.com/josuetapia-dev)

## Licencia

Distribuido bajo la licencia MIT. Consulta [`LICENSE`](LICENSE).
