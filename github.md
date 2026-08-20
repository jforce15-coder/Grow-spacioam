repo: jforce15-coder/mi-spacioam
branch: main
path: (login.jsx — referencia de login/loader)

## Last sync
date: 2026-08-20T14:35:00Z
### Referenciado en este proyecto
- Push: adoptado el hook oficial del módulo (useNotiPush) vía wrapper NotiPush montado por x-import. Marca "visto" SÍNCRONO + persistencia localStorage (sam:notiSeen), tope de 2 banners por sesión (el resto queda para el próximo login), primer arranque memoriza en silencio. Reemplaza el checkPush hecho a mano. Sigue anclado a ts estable (this._t0). Toast con translateZ(0)+willChange y vidrio .52; swipe-up para descartar.
- Login: quote de marca (“Hay espacios en donde sueñas con volver a despertar.”), eyebrow “PANEL DE GESTIÓN DE PROYECTOS”, pie “Guatemala · ¿Necesitas ayuda? hola@spacioam.com”, wordmark 172px (tamaño del splash de la EPI App, Epi-spacioam/index.html).
- Centro de notificaciones estilo iOS (Liquid Glass) portado del módulo noti-center: NotiBell (triángulo info + círculo peach) a la derecha del divisor de marca, NotiCenter con swipe/carrusel/ventana de 7 días, NotiToast push. Datos armados según el contrato del módulo.
- Login estilo mi-spacioam: aside con brushstroke + quote + logo circular; formulario con wordmark.
- Loader con logo rebotando (motion del design system).

## Screen map
| Pantalla | Fuente |
| --- | --- |
| Login (Spacio AM Gestión.dc.html) | mi-spacioam/login.jsx |

## Backend (Google Apps Script + Sheets)
- Base de datos: Google Sheet "Spacio AM · Gestión" en Drive/Spacio AM/Grow App, 25 pestañas (01_PROYECTOS…25_CORREO_TEMPLATES) creadas por setup() de apps-script/Code.gs.
- API Web App (POST/GET JSON): https://script.google.com/macros/s/AKfycbxPYwdz0Q8za7_wZzX37QeqODoqwxOeoXZpeEWp94HKtHMqru12VPD4xt0cOtWHZA1LDQ/exec
- Acciones: getAll · list · get · create · update · delete · uploadFile (Drive) · notify (correo). Ver apps-script/README.md.
- Pendiente: conectar el DC a la API (reemplazar import de datos.js por fetch a getAll) y fijar FOLDER_ID de "Grow App" para uploadFile.

## Notas
- Repos de contexto adicionales (solo lectura previa): jforce15-coder/Hola-spacioam (bento huésped), jforce15-coder/Epi-spacioam (login/splash + módulo de notificaciones), diseño de contratos en uploads. No sincronizados por commit.
- Módulo de notificaciones importado desde el zip adjunto por el usuario (uploads/EPI APP.../2-modulo-notificaciones).
