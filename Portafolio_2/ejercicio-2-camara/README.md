# Ejercicio 2 · Captura de medios con cámara web y móvil

**Foto de evidencia:** el vendedor fotografía el anaquel, la fachada o el ticket del cliente, y la
foto queda con un sello de fecha, hora y cliente.

## Objetivos

- [x] Acceder a la cámara con `navigator.mediaDevices.getUserMedia`.
- [x] Mostrar el video en tiempo real en un elemento `<video>`.
- [x] Capturar una fotografía y enviarla a un `<canvas>`.

## Cómo funciona

```
getUserMedia()  ──►  MediaStream  ──►  <video>.srcObject   (tiempo real)
                                            │
                              botón obturador
                                            ▼
                         canvas.drawImage(video)  +  sello  ──►  JPG
```

1. **Encender cámara** llama a `getUserMedia({ video: { facingMode: { ideal: 'environment' } } })`.
   Con `ideal`, en el celular se abre la **cámara trasera** y en la laptop la webcam, sin error.
2. El `MediaStream` se asigna a `video.srcObject`. El `<video>` lleva `autoplay playsinline muted`,
   necesarios para que **iOS** reproduzca el video dentro de la página.
3. El **obturador** fija el canvas a la resolución real del video (`videoWidth × videoHeight`),
   dibuja el cuadro con `drawImage()` y agrega una franja con *PROSALES CAMPO*, cliente, fecha y hora.
4. Cada foto se agrega a la galería de la visita y se puede **descargar** como JPG (`canvas.toBlob`).
5. **Apagar** detiene todas las pistas (`track.stop()`) para apagar el foco de la cámara. También se
   hace solo al salir de la página (`pagehide`).

### Extras

- **Cambiar cámara** (frontal / trasera): solo aparece si `enumerateDevices()` encuentra más de una.
- La cámara frontal se ve como espejo en el visor, como en cualquier app de cámara.
- Estado del permiso con `permissions.query({ name: 'camera' })` cuando el navegador lo soporta.

### Errores controlados

Todo el flujo usa `async/await` con `try/catch`, y cada error tiene un mensaje claro:

| Error | Causa |
|---|---|
| `NotAllowedError` | El usuario negó el permiso |
| `NotFoundError` | No hay cámara |
| `NotReadableError` | Otra app está usando la cámara |
| `OverconstrainedError` | No existe una cámara con esa configuración |
| `SecurityError` / sin `mediaDevices` | El sitio no está en HTTPS |

## Cómo probarlo

1. Abre `http://localhost/PROSALES/Portafolio_2/ejercicio-2-camara/` y toca **Encender cámara**.
2. Escribe un cliente y toca el **obturador** (botón verde).
3. **En el celular:** publica el sitio con HTTPS (por ejemplo GitHub Pages); con `http://` y la IP de tu PC, el navegador bloquea la cámara.
