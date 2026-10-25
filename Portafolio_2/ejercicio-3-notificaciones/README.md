# Ejercicio 3 · Notificaciones locales desde el Service Worker

**Recordatorios de seguimiento:** después de una visita, el vendedor programa un aviso para
llamar, enviar la cotización, volver a visitar o cobrar.

## Objetivos

- [x] Solicitar el permiso con `Notification.requestPermission()` y validar el resultado.
- [x] Disparar una notificación personalizada (**título, cuerpo, ícono y vibración**).
- [x] Mostrarla **desde el Service Worker** con `self.registration.showNotification()`.

## Cómo funciona

```
 página (app.js)                         Service Worker (sw.js)
 ───────────────                         ──────────────────────
 requestPermission() → 'granted'
 postMessage({ PROGRAMAR, … })  ───────►  message
                                          event.waitUntil(espera N s)
                                          self.registration.showNotification()
                                                    │
 toast + registro        ◄──── postMessage ─────────┤
                                                    ▼
                                          notificationclick
                                          ├─ "Ver cliente" → focus() / openWindow()
                                          └─ "Recordar en 1 min" → la vuelve a mostrar
```

1. **Permiso:** el botón *Activar notificaciones* solo aparece si el estado es `default`. El
   resultado se valida (`granted` / `denied` / `default`) y, si está bloqueado, se explica cómo
   activarlo. El indicador se actualiza solo si el usuario cambia el permiso desde el candado.
2. **La página no crea la notificación.** Envía el recordatorio al SW con `postMessage`, y el SW lo
   muestra con `self.registration.showNotification()`. Por eso **llega aunque la pestaña esté en
   segundo plano o minimizada**.
3. `event.waitUntil()` mantiene vivo al Service Worker durante la espera del recordatorio.

### Notificación personalizada

| Opción | Valor |
|---|---|
| `title` | Emoji + acción + cliente, por ejemplo "📞 Llamar a Constructora Ríos" |
| `body` | La nota escrita por el vendedor |
| `icon` | Ícono de Prosales (192 px) |
| `vibrate` | `[200, 100, 200, 100, 300]` |
| `tag` + `renotify` | Evita duplicados del mismo recordatorio |
| `actions` | *Ver cliente* y *Recordar en 1 min* |
| `data` | Cliente y URL para abrir la app en el lugar correcto |

## Cómo probarlo

1. Abre `http://localhost/PROSALES/Portafolio_2/ejercicio-3-notificaciones/` y toca **Activar notificaciones**.
2. Programa un recordatorio *En 10 segundos* y **minimiza el navegador**: la notificación llega igual.
3. Toca la notificación: la app vuelve al frente con el cliente precargado.
4. En DevTools → *Application* → *Service Workers* puedes ver el `sw.js` activo.

> **Windows:** si no ves nada, revisa que el *modo No molestar* esté apagado y que Chrome tenga permiso en *Configuración → Sistema → Notificaciones*.
> **iPhone:** las notificaciones web solo funcionan con la app instalada en la pantalla de inicio (iOS 16.4 o superior).
