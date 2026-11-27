# Deploy — Grow (grow.spacioam.com)

## Qué subir

```
index.html          ← el cargador (unos 30 KB): muestra el esqueleto y arma el app
assets/app/         ← las piezas del app: plantilla, scripts, fuentes y fotos (una por archivo)
.nojekyll           ← vacío; evita que GitHub Pages procese el sitio
```

Desde el 27-nov-2026 el app ya no va todo dentro de `index.html` (eran 15 MB en base64: 11 s en blanco en 4G).
`node tools/aligerar.js` saca cada pieza a `assets/app/` con su sello `?v=` y el navegador baja cada una cuando
la necesita.

- **Cambiar una pieza:** edita su archivo en `assets/app/` y corre `node tools/aligerar.js` (pone el sello nuevo).
- **Exportación nueva de Claude Design:** pega el `index.html` exportado y corre `node tools/aligerar.js`.
- El check «Revisar index» falla si `index.html` pasa de 1 MB, si trae piezas en base64 o si falta un sello.

## Qué cambió en este release

- **Login sin scroll.** El panel de ingreso escala con la altura de la ventana
  (logo, título, campos y botón). Entra completo en pantallas cortas sin barra
  de desplazamiento.
- **Los datos de ejemplo quedaron aislados a los perfiles de demostración.**
  `datos.js` ya no se carga al estado al abrir la app: solo entra al elegir un
  perfil demo (menú de la cuadrícula en el login). Cubre proyectos, contactos,
  recepciones y correos. Al cerrar sesión desde un perfil demo se limpian.
- **Las cuentas reales arrancan con el Google Sheet y solo el Sheet.** Si
  `01_PROYECTOS` está vacía, el panel muestra 0 proyectos, embudo vacío y KPIs
  en cero — sin proyectos de ejemplo mezclados.
- **Botón «Crear proyecto»** en el panel *Hoy* del administrador principal
  (acción principal, en peach). Abre un formulario con propietario, correo,
  edificio, apto, zona, tipo, habitaciones y baños; crea el proyecto en la etapa
  *Desconocido*, lo persiste en `01_PROYECTOS` y abre su ficha. Desde ahí se
  agenda reunión o visita para moverlo de etapa. El administrador secundario no
  tiene esta acción.

## Release anterior

- La sección de contrato de Grow se reemplazó por el módulo real de la app de
  Docs: mismo generador (panel + hoja con membrete + edición por cláusula),
  mismo proceso de firma y mismo registro. Solo co-hosting: individual y
  jurídica, corto y largo plazo.
- **Contratos** (admin) es la pantalla "Documentos" de Docs filtrada a
  co-hosting, con columnas Proyecto y Generado en. El admin secundario no ve
  esa sección ni la pestaña Contrato del proyecto.
- **Documentos** ya no crea contratos.
- El propietario firma en su portal con la misma pantalla de firma; el enlace
  público `?firmar=<id>` de contratos.spacioam.com sigue funcionando.
- Base de datos y carpeta únicas con la app de Docs; correos idénticos, enviados
  por el mismo Web App desde `hola@spacioam.com`.
- Peso: 15.3 MB → 12.0 MB (el membrete pasó de 2.9 MB a 145 KB, a 1632×2112,
  la resolución exacta que usa el PDF).

## Backend

Web App de Contratos ya conectado (endpoint y token en `sheets-sync.js`).
Hoja `1r__zfIA…RDVU`, carpeta `1GzxF5El…yqSa`. Pendiente de una sola vez:
en la pestaña **CONTRATOS**, fila 1, después de *Notas*, escribir los
encabezados **Proyecto**, **Propiedad** y **Generado en**.

## La otra app

`docs-app/` no es parte de este deploy: son los 4 archivos que hay que copiar al
repo `Docs-spacioam` para que las dos apps queden idénticas. Ver `docs-app/LEEME.md`.
