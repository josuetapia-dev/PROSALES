# Imágenes promocionales del instalador

Chrome muestra un **instalador enriquecido** (como la ficha de una tienda de apps) cuando el
`manifest.json` incluye `screenshots`. En lugar de capturas crudas, Prosales usa un carrusel de
imágenes promocionales: titular de marketing + la **app real** dentro de un marco de laptop o
celular.

| Diapositiva | Titular | Vista de la app |
|---|---|---|
| 1 | Tu embudo de ventas, en tu bolsillo | Embudo |
| 2 | Nunca olvides un seguimiento | Seguimientos |
| 3 | Aunque te quedes sin señal | Embudo en modo sin conexión |

Cada una se exporta en dos formatos, que Chrome elige según el dispositivo:

| `form_factor` | Tamaño | Archivo |
|---|---|---|
| `wide` (escritorio) | 1920 × 1080 | `promo-escritorio-N.png` |
| `narrow` (celular) | 810 × 1440 | `promo-movil-N.png` |

## Cómo funciona

`promo.html` carga `ejercicio-5-offline/index.html` dentro de un `<iframe>` escalado, así que las
imágenes siempre reflejan la app actual. Para la diapositiva 3 fuerza el estado sin conexión
llamando a `aplicarConexion(false)` dentro del iframe.

Vista previa en el navegador:

```
http://localhost/prosales/docs/promo/promo.html?slide=1&formato=wide
http://localhost/prosales/docs/promo/promo.html?slide=3&formato=narrow
```

## Regenerarlas

Con Apache encendido, desde la raíz del repositorio:

```
powershell -ExecutionPolicy Bypass -File docs\promo\exportar.ps1
```

El script usa Microsoft Edge en modo *headless* y guarda los PNG en
`ejercicio-5-offline/screenshots/`.
