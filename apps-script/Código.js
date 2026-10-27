/* ═══════════════════════════════════════════════════════════════════════════
   Spacio AM · Gestión (Grow) — Backend Google Apps Script
   ─────────────────────────────────────────────────────────────────────────
   Una sola hoja de cálculo = la base de datos. Una pestaña por entidad (25).
   Este script hace tres cosas:
     1) setup()  — crea/asegura las 25 hojas con sus encabezados, congela la
        fila 1, aplica bandas y siembra las tablas de referencia.
     2) API REST genérica (doGet/doPost) — list · get · create · update ·
        delete sobre cualquier hoja, más getAll para el arranque de la app.
     3) uploadFile (Drive) y notify (correo), en el mismo estilo que la EPI App.

   ── PUESTA EN MARCHA ──────────────────────────────────────────────────────
   1. Crea la hoja de cálculo (o usa la de la carpeta madre) y copia su ID.
   2. Extensiones → Apps Script. Pega este archivo como Code.gs.
   3. ⚙️ Configuración del proyecto → Propiedades del script → agrega:
        SPREADSHEET_ID = <id de tu hoja>
        FOLDER_ID      = <id de la carpeta madre en Drive>   (para uploadFile)
   4. Ejecuta setup() una vez (▶) y autoriza los permisos.
   5. Implementar → Nueva implementación → App web:
        Ejecutar como: Yo · Con acceso: Cualquiera.
      Copia la URL /exec y ponla en la app como API_URL.
   Zona horaria del proyecto: GMT-6 (Guatemala).
   ═══════════════════════════════════════════════════════════════════════════ */

var SP = PropertiesService.getScriptProperties();
var SPREADSHEET_ID = SP.getProperty("SPREADSHEET_ID") || "";
var FOLDER_ID      = SP.getProperty("FOLDER_ID") || "";

/* ── ESQUEMA: nombre de hoja → columnas (la 1ª columna es la llave primaria) ──
   Los campos compuestos del documento de esquema se expanden a columnas reales
   (habitaciones/banos, render_1..4, etc.). No hay celdas combinadas. */
var SCHEMA = {
  "01_PROYECTOS": ["proyecto_id","nombre","edificio","apartamento","zona","habitaciones","banos","tipo","equipado","linea_blanca","dueno_id","etapa","farol","amueblado_por_nosotros","con_anteproyecto","motivo_descarte","fecha_ingreso","carpeta_drive","es_edificio","num_unidades","amenidades_fotos"],
  "02_DUENOS": ["dueno_id","nombre","email","telefono","nit","sujeto_retencion","regimen","dpi_url","representante","acta_url"],
  "03_EMBUDO_EVENTOS": ["evento_id","proyecto_id","fecha_hora","de_etapa","a_etapa","usuario","nota"],
  "04_REUNIONES": ["reunion_id","proyecto_id","fecha_hora","enlace_meet","correo_enviado","transcripcion","resumen_ia"],
  "05_VISITAS": ["visita_id","proyecto_id","asignado_a","fecha","completa","parqueo","chapa_digital","proceso_ingreso","restricciones","tarjeta_acceso","entrega_tarjeta","equipado","detalles_faltantes","equip_electrodomesticos","torre_lavado","lavado","amenidades","reglas_admin","parqueo_pago","num_fotos","carpeta_fotos"],
  "06_ANTEPROYECTO": ["ante_id","proyecto_id","espacio","render_1","render_2","render_3","render_4","visible_dueno","favorita","comentario_dueno","respuesta_spacio"],
  "07_CATALOGO_ITEMS": ["item","categoria","precio_max","proveedor_sugerido"],
  "08_PRESUPUESTOS": ["presupuesto_id","proyecto_id","estado","mobiliario_total","fee_pct","fee_monto","anteproyecto_q","fotos_pro_usd","total","deposito_fecha","deposito_monto","comprobante_url","recordatorios_enviados"],
  "09_PRESUPUESTO_ITEMS": ["pres_item_id","presupuesto_id","categoria","item","precio_unitario","cantidad","subtotal","status","proveedor","encargado"],
  "10_FACTURAS": ["factura_id","numero_factura","fecha","monto","descripcion","proveedor","formato","entrega","es_global","sin_factura_aun","archivo_url"],
  "11_FACTURA_ASIGNACIONES": ["asignacion_id","factura_id","proyecto_id","monto_asignado","items_presupuesto"],
  "12_PROVEEDORES": ["nombre_factura","alias","descripcion","contacto","correo","notas"],
  "13_CONTRATOS": ["contrato_id","proyecto_id","estado","fecha_envio","fecha_firma","pdf_url","certificado_url","previo_a_plataforma"],
  "14_FIRMAS": ["firma_id","contrato_id","nombre","rol","correo","metodo","firma_url","fecha_hora","ip"],
  "15_CHECKLIST": ["checklist_id","proyecto_id","item","hecho","fecha","responsable"],
  "16_REVISION_POSTLANZAMIENTO": ["revision_id","proyecto_id","hito","item","hecho","fecha","responsable"],
  "17_USUARIOS": ["usuario_id","nombre","inicial","rol","email"],
  "18_TAREAS": ["tarea_id","proyecto_id","etapa","nombre","responsable_id","es_equipo","estado","fecha_inicio","fecha_fin","dias_duracion","depende_de","item_presupuesto"],
  "19_SUBTAREAS": ["subtarea_id","tarea_id","nombre","hecha"],
  "20_TAREA_COMENTARIOS": ["comentario_id","tarea_id","autor","texto","fecha_hora"],
  "21_MILESTONES": ["milestone_id","proyecto_id","nombre","fecha","estado"],
  "22_CONTACTOS": ["contacto_id","nombre","contacto","info","estado","fecha_creado"],
  "23_RECEPCIONES": ["recepcion_id","proyecto_id","fecha","numero_doc","llego_doc","completo","buen_estado","cuadra","num_fotos","fotos_url","comentario","estado"],
  "24_CORREOS": ["correo_id","fecha_hora","tipo","para","asunto","proyecto_id","estado"],
  "25_CORREO_TEMPLATES": ["template_id","nombre","asunto","cuerpo","cta"],
  /* Proyectos de varios apartamentos: unidades, fases, presupuestos por fase
     y el levantamiento de visita de cada unidad (una visita por apartamento,
     en su propia fecha). */
  "26_UNIDADES": ["unidad_id","proyecto_id","apartamento","fase","etapa","habitaciones","banos","visita_fecha","visita_asignado_a","visita_completa","fotos_pro","link_anuncio"],
  "27_FASES": ["fase_id","proyecto_id","nombre","cerrada","num_unidades"],
  "28_PRESUPUESTOS_FASE": ["pres_fase_id","proyecto_id","fase","nombre","estado","por_unidad","total"],
  "29_VISITA_UNIDAD": ["vu_id","proyecto_id","apartamento","fecha","asignado_a","completa","inventario_cats","mantenimiento","accesos","equipado","detalles","lavado","num_fotos","resumen"],
  /* Cada foto de la visita, ya subida a Drive. */
  "30_FOTOS": ["foto_id","proyecto_id","apartamento","zona","url","file_id","subida_por","fecha"],
  /* Estado completo del proyecto (autoguardado colaborativo). El JSON se parte
     en trozos de 45 000 caracteres porque una celda admite 50 000. Cada trozo
     lleva el prefijo "~" para que rowToObj_ no intente parsearlo. */
  "31_ESTADO_PROYECTO": ["proyecto_id","version","actualizado","actualizado_por","json_1","json_2","json_3","json_4","json_5","json_6","json_7","json_8"]
};
var ESTADO_SHEET = "31_ESTADO_PROYECTO", ESTADO_CHUNK = 45000, ESTADO_CHUNKS = 8;

/* Prefijo del ID autogenerado por hoja. Las hojas cuya llave la fija el negocio
   (proyecto_id, dueno_id, usuario_id, item, nombre_factura, template_id) NO
   llevan prefijo: se toma el id que envía la app. */
var ID_PREFIX = {
  "03_EMBUDO_EVENTOS":"E-", "04_REUNIONES":"R-", "05_VISITAS":"V-",
  "06_ANTEPROYECTO":"A-", "08_PRESUPUESTOS":"P-", "09_PRESUPUESTO_ITEMS":"PI-",
  "10_FACTURAS":"F-", "11_FACTURA_ASIGNACIONES":"FA-", "13_CONTRATOS":"C-",
  "14_FIRMAS":"SG-", "15_CHECKLIST":"CK-", "16_REVISION_POSTLANZAMIENTO":"RV-",
  "18_TAREAS":"T-", "19_SUBTAREAS":"ST-", "20_TAREA_COMENTARIOS":"TC-",
  "21_MILESTONES":"M-", "22_CONTACTOS":"CT-", "23_RECEPCIONES":"RC-", "24_CORREOS":"CO-",
  "26_UNIDADES":"U-", "27_FASES":"FS-", "28_PRESUPUESTOS_FASE":"PF-", "29_VISITA_UNIDAD":"VU-", "30_FOTOS":"FT-"
};

/* Validación por lista en columnas de estado (dropdown en el Sheet). */
var VALIDACIONES = {
  "01_PROYECTOS": { farol:["success","attention","warning","error","info","pending"] },
  "08_PRESUPUESTOS": { estado:["Borrador","Enviado","Cambios solicitados","Aprobado"] },
  "09_PRESUPUESTO_ITEMS": { status:["Pendiente","Comprado","Entrega programada"] },
  "10_FACTURAS": { formato:["PDF","Foto"] },
  "13_CONTRATOS": { estado:["Sin iniciar","Datos pendientes","Enviado a firma","Firmado"] },
  "18_TAREAS": { estado:["Por hacer","En progreso","Completada"] },
  "22_CONTACTOS": { estado:["Por llamar","Llamado"] },
  "23_RECEPCIONES": { estado:["Entregado","Pendiente"] },
  "24_CORREOS": { estado:["Enviado","Programado","Frenado"] },
  "28_PRESUPUESTOS_FASE": { estado:["Borrador","Enviado","Aprobado","Cerrado"] }
};

/* ═══ SETUP — crea/asegura las hojas ═══ */
function setup() {
  if (!SPREADSHEET_ID) throw new Error("Falta SPREADSHEET_ID en Propiedades del script.");
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(SCHEMA).forEach(function(name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var cols = SCHEMA[name];
    // Encabezados en fila 1 (solo si faltan o cambiaron)
    var head = sh.getRange(1, 1, 1, cols.length);
    head.setValues([cols]).setFontWeight("bold").setBackground("#3E3F3F").setFontColor("#FFFFFF");
    sh.setFrozenRows(1);
    // Bandas alternas
    try { sh.getBandings().forEach(function(b){ b.remove(); }); } catch(e){}
    try { sh.getRange(1, 1, Math.max(sh.getMaxRows(),2), cols.length)
            .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY); } catch(e){}
    // Validación por lista
    var vs = VALIDACIONES[name];
    if (vs) Object.keys(vs).forEach(function(col){
      var ci = cols.indexOf(col); if (ci < 0) return;
      var rule = SpreadsheetApp.newDataValidation().requireValueInList(vs[col], true).setAllowInvalid(true).build();
      sh.getRange(2, ci + 1, sh.getMaxRows() - 1, 1).setDataValidation(rule);
    });
    sh.autoResizeColumns(1, Math.min(cols.length, 8));
  });
  // Quita la hoja por defecto "Hoja 1"/"Sheet1" si sigue vacía
  ["Hoja 1","Sheet1","Hoja1"].forEach(function(n){
    var s = ss.getSheetByName(n);
    if (s && ss.getSheets().length > 1 && s.getLastRow() === 0) ss.deleteSheet(s);
  });
  seed_(ss);
  return "Listo: " + Object.keys(SCHEMA).length + " hojas.";
}

/* Equipo real. Edita esta lista y corre limpiarUsuarios() para reemplazar 17_USUARIOS. */
var USUARIOS_REALES = [
  ["jovalle","Juan Ovalle","JO","Administrador principal","jovalle@spacioam.com"],
  ["gasturias","Gabriel Asturias","GA","Administrador secundario","gasturias@spacioam.com"]
  /* Técnicos: agrega una fila con rol "Técnico" (p. ej. ["mperez","María Pérez","MP","Técnico","mperez@…"]).
     Solo ven el formulario de visita y las tareas de los proyectos donde son miembros o tienen la visita asignada. */
];

/* Borra los usuarios de ejemplo y deja solo el equipo real. Corre esto una vez. */
function limpiarUsuarios() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName("17_USUARIOS");
  if (!sh) throw new Error("Corre setup() primero.");
  var cols = SCHEMA["17_USUARIOS"].length;
  if (sh.getMaxRows() > 1) sh.getRange(2, 1, sh.getMaxRows() - 1, cols).clearContent();
  sh.getRange(2, 1, USUARIOS_REALES.length, cols).setValues(USUARIOS_REALES);
  return USUARIOS_REALES.length + " usuarios reales escritos.";
}

/* Siembra tablas de referencia solo si están vacías (no pisa datos). */
function seed_(ss) {
  var USUARIOS = USUARIOS_REALES;
  var PROVEEDORES = [
    ["CEMACO","Cemaco","Menaje, línea blanca y decoración general","2410-0000","ventas@cemaco.com","Crédito a 30 días; entregas a domicilio."],
    ["KALEA","Kalea","Mobiliario de sala y comedor","2386-5500","hola@kalea.gt","Tiempo de entrega 2-3 semanas."],
    ["SUO","Suo","Sofás y colchones a medida","4753-3419","suo.muebles@gmail.com","A medida; anticipo del 50%."],
    ["TU CASA BONITA","Tu casa bonita","Mesas y mobiliario de madera","4210-5639","tucasabonitagt@gmail.com","Madera sólida; pedidos por WhatsApp."],
    ["PRICESMART","Pricesmart","Toallas y ropa de cama por volumen","2379-6868","servicio@pricesmart.com","Requiere membresía."],
    ["DOMOTEK","Domotek","Chapas inteligentes","2222-1010","info@domotek.gt","Incluye instalación."]
  ];
  var TEMPLATES = [
    ["seguimiento","Seguimiento (captación)","¿Agendamos tu reunión?","Hola {nombre}, nos encantaría conocer más de {propiedad}. ¿Agendamos una reunión corta esta semana?","Agendar reunión"],
    ["recordatorio","Recordatorio de presupuesto","Tu propuesta te espera","Hola {nombre}, dejamos lista la propuesta para {propiedad}. Cuando gustes la revisamos juntos.","Revisar presupuesto"],
    ["reunion","Invitación a reunión","Nos vemos pronto","Hola {nombre}, te esperamos en la reunión de {propiedad}. Aquí está el enlace de Google Meet.","Unirme a la reunión"],
    ["deposito","Datos fiscales / depósito","Últimos datos para arrancar","Hola {nombre}, recibimos tu depósito para {propiedad}. Para tu factura necesitamos tus datos fiscales.","Enviar mis datos"],
    ["lanzamiento","Lanzamiento","{propiedad} ya recibe huéspedes","¡{nombre}, lo logramos! {propiedad} ya está publicada y lista para recibir huéspedes.","Ver el anuncio"]
  ];
  var CATALOGO = [
    ["Jaboneras","Baños",75,""],["Toallas de cuerpo","Baños",75,""],["Toallas de mano","Baños",60,""],
    ["Basurero baño","Baños",200,""],["Alfombra","Baños",80,""],["Espejo","Baños",550,""],
    ["Comedor 4 plazas","Sala / Comedor",2500,""],["Sillas de comedor","Sala / Comedor",620,""],
    ["Sofá","Sala / Comedor",6000,"SUO"],["Coffee table","Sala / Comedor",1800,""],["TV","Sala / Comedor",4300,"CEMACO"],
    ["Mueble TV","Sala / Comedor",2200,""],["Chapa inteligente para entrada","Sala / Comedor",1745,"DOMOTEK"],
    ["Colchón","Habitaciones",2400,"SUO"],["Cabecera","Habitaciones",900,""],["Mesas de noche","Habitaciones",1300,""],
    ["Sábanas","Habitaciones",250,"PRICESMART"],["Duvet cover","Habitaciones",600,""],["Cortina roller blackout","Habitaciones",1400,""],
    ["Estufa","Cocina",3500,"CEMACO"],["Refrigeradora","Cocina",3600,"CEMACO"],["Microondas","Cocina",800,""],
    ["Vajilla (platos, vasos, cubiertos)","Cocina",484,""],["Ecofiltro","Cocina",850,""],["Torre de lavado","Cocina",7000,""]
  ];
  seedIfEmpty_(ss, "17_USUARIOS", USUARIOS);
  seedIfEmpty_(ss, "12_PROVEEDORES", PROVEEDORES);
  seedIfEmpty_(ss, "25_CORREO_TEMPLATES", TEMPLATES);
  seedIfEmpty_(ss, "07_CATALOGO_ITEMS", CATALOGO);
}
function seedIfEmpty_(ss, name, rows) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() > 1) return; // ya tiene datos
  if (rows.length) sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

/* ═══ API REST ═══ */
function doGet(e)  { return route(e); }
function doPost(e) { return route(e); }
function doOptions(e) { return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT); }

function route(e) {
  try {
    var p = (e && e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : (e ? e.parameter : {});
    var __diag = accesosDiag_(p) || duenosDiag_(p) || secretariaApi_(p); if (__diag) return __diag;   // fase 1b: resumen de accesos (robot)
    var __ses = sesionDe_(p); registrarAcceso_(p.action, __ses ? true : esRobot_(p) ? 'r' : false);
    var __bloq = datosClientePasa_(p) ? null : exigirSesion_(p.action, !!__ses, p, ['ping']); if (__bloq) return __bloq;   // fase 1c: solo bloquea con SESION_EXIGIR = 1
    var a = p.action, r;
    switch (a) {
      case "getAll":     r = apiGetAll(p.fresh === true || p.fresh === "true"); break;
      /* Diagnóstico: con qué identidad corre esta implementación y si ve Drive.
         Si `usuario` viene vacío, la implementación corre anónima → Drive se niega. */
      case "diag": {
        var u = ""; try { u = Session.getEffectiveUser().getEmail(); } catch (e0) {}
        var drive = "ok", carpeta = "", escribe = "ok";
        try { carpeta = DriveApp.getFolderById(FOLDER_ID).getName(); } catch (e1) { drive = String(e1.message || e1); }
        if (drive === "ok") {
          try { var tf = DriveApp.getFolderById(FOLDER_ID).createFile(Utilities.newBlob("x", "text/plain", "grow-diag.txt")); tf.setTrashed(true); }
          catch (e2) { escribe = String(e2.message || e2); }
        }
        r = { usuario: u, folderId: FOLDER_ID || "", drive: drive, carpeta: carpeta, escribe: escribe };
        break;
      }
      case "list":       r = apiList(p.sheet); break;
      case "get":        r = apiGet(p.sheet, p.id); break;
      case "create":     r = apiCreate(p.sheet, p.data); cacheDrop_(); try { loginDuenoDespuesDe_(p.sheet, r && (r.id || r[SCHEMA[p.sheet] ? SCHEMA[p.sheet][0] : ""] || (p.data || {})[SCHEMA[p.sheet] ? SCHEMA[p.sheet][0] : ""])); } catch (eL) {} break;
      case "update":     r = apiUpdate(p.sheet, p.id, p.data); cacheDrop_(); try { loginDuenoDespuesDe_(p.sheet, p.id); } catch (eL) {} break;
      case "delete":     r = apiDelete(p.sheet, p.id); cacheDrop_(); break;
      case "uploadFile": r = uploadFile(p.b64, p.name, p.mime, p.subfolder); cacheDrop_(); break;
      /* Autoguardado colaborativo: el estado completo de un proyecto, con versión. */
      case "saveState": r = saveState(p.proyecto_id, p.version, p.json, p.por); cacheDrop_(); break;
      case "getStates": r = getStates(p.since, p.ids); break;
      case "notify":     r = notify(p); break;
      case "enviarCorreo": r = notify(p); break;
      case "importSheet": r = importSheet(p.id, p.gid); break;
      default: return out({ ok:false, error:"Acción desconocida: " + a });
    }
    return out({ ok:true, data:r });
  } catch (err) {
    return out({ ok:false, error:err.toString() });
  }
}
/* Fase 1c · formulario «datos del cliente» (grow.spacioam.com/?datos=<proyecto>&k=<llave>): lo llena el
   propietario SIN sesión, así que solo esto pasa sin ella:
   · saveState de SU fila DATOS-<proyecto>, si trae la llave del enlace (= datosToken del proyecto);
   · uploadFile a «Propiedades/<…>/00 Datos del cliente» (las fotos del DPI);
   · notify a hola@spacioam.com (el aviso de «datos recibidos»).
   Leer (getStates) sigue pidiendo sesión: el formulario solo pierde el «volver con lo que ya mandó». */
function datosClientePasa_(p) {
  var a = String((p && p.action) || '');
  if (a === 'saveState') {
    var pid = String(p.proyecto_id || '');
    if (pid.indexOf('DATOS-') !== 0) return false;
    var k = ''; try { k = String((JSON.parse(p.json || '{}') || {}).k || ''); } catch (e) {}
    if (!k) return false;
    var est = (getStates('', [pid.slice(6)]).estados || [])[0], j = {};
    try { j = JSON.parse((est && est.json) || '{}') || {}; } catch (e) {}
    return !!j.datosToken && String(j.datosToken) === k;
  }
  if (a === 'uploadFile') return /^Propiedades\/[^\/]+(\/[^\/]+)?\/00 Datos del cliente$/.test(String(p.subfolder || '')) && String(p.b64 || '').length < 12000000;
  if (a === 'notify') {
    var to = Array.isArray(p.to) ? p.to : [p.to];
    return to.length === 1 && String(to[0] || '').trim().toLowerCase() === 'hola@spacioam.com';
  }
  return false;
}
function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss_() {
  if (!SPREADSHEET_ID) throw new Error("Falta SPREADSHEET_ID en Propiedades del script.");
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}
function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error("No existe la hoja: " + name + ". Corre setup().");
  return sh;
}
var TZ = Session.getScriptTimeZone();

/* fila → objeto, con parseo de JSON y fechas a texto ISO corto. */
function rowToObj_(cols, row) {
  var o = {};
  for (var j = 0; j < cols.length; j++) {
    var v = row[j];
    if (v instanceof Date) v = Utilities.formatDate(v, TZ, "yyyy-MM-dd");
    else if (v === "" || v === null || v === undefined) v = null;
    else if (typeof v === "string" && (v.charAt(0) === "[" || v.charAt(0) === "{")) { try { v = JSON.parse(v); } catch(_){} }
    o[cols[j]] = v;
  }
  return o;
}
/* objeto → fila, respetando el orden de columnas y serializando objetos. */
function objToRow_(cols, obj) {
  return cols.map(function(c) {
    var v = obj[c];
    if (v === undefined || v === null) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return v;
  });
}
function readAll_(name) {
  var sh = sheet_(name), cols = SCHEMA[name];
  var data = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === "") continue;
    out.push(rowToObj_(cols, data[i]));
  }
  return out;
}
function apiList(name)  { return { sheet:name, rows: readAll_(name) }; }
function apiGet(name, id) {
  var cols = SCHEMA[name], data = sheet_(name).getDataRange().getValues();
  for (var i = 1; i < data.length; i++) if (String(data[i][0]) === String(id)) return rowToObj_(cols, data[i]);
  return null;
}
/* getAll es lo que hace lento el arranque: 29 hojas leídas una por una.
   Ahora se leen en un solo recorrido y el resultado queda en caché del script
   (6 h), que se invalida sola en cada create/update/delete. */
var CACHE_KEY = "GETALL_V2";
function cacheDrop_() { try { CacheService.getScriptCache().remove(CACHE_KEY); } catch (e) {} }
function apiGetAll(fresh) {
  var c = CacheService.getScriptCache();
  if (!fresh) {
    var hit = c.get(CACHE_KEY);
    if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  }
  var out = {};
  ss_().getSheets().forEach(function (sh) {
    var name = sh.getName();
    var cols = SCHEMA[name];
    if (!cols) return;
    var last = sh.getLastRow();
    if (last < 2) { out[name] = []; return; }
    var data = sh.getRange(2, 1, last - 1, cols.length).getValues();
    var rows = [];
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0] || "").length === 0) continue;
      rows.push(rowToObj_(cols, data[i]));
    }
    out[name] = rows;
  });
  Object.keys(SCHEMA).forEach(function (n) { if (!out[n]) out[n] = []; });
  try { c.put(CACHE_KEY, JSON.stringify(out), 21600); } catch (e) { /* payload > 100 KB: sin caché */ }
  return out;
}
/* Siguiente ID con prefijo (zero-pad 4). */
function nextId_(name) {
  var pref = ID_PREFIX[name]; if (!pref) return null;
  var data = sheet_(name).getDataRange().getValues(), max = 0;
  for (var i = 1; i < data.length; i++) {
    var m = String(data[i][0]).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return pref + ("000" + (max + 1)).slice(-Math.max(4, String(max + 1).length));
}
function apiCreate(name, data) {
  var sh = sheet_(name), cols = SCHEMA[name];
  data = data || {};
  var pk = cols[0];
  if (!data[pk]) { var nid = nextId_(name); if (nid) data[pk] = nid; }
  if (!data[pk]) throw new Error("Falta la llave '" + pk + "' (esta hoja no autogenera id).");
  // evita duplicados de PK
  var existing = sheet_(name).getDataRange().getValues();
  for (var i = 1; i < existing.length; i++) if (String(existing[i][0]) === String(data[pk]))
    throw new Error("Ya existe " + pk + " = " + data[pk]);
  sh.appendRow(objToRow_(cols, data));
  return { created:true, id:data[pk] };
}
function apiUpdate(name, id, data) {
  var sh = sheet_(name), cols = SCHEMA[name];
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      var merged = rowToObj_(cols, values[i]);
      Object.keys(data || {}).forEach(function(k){ merged[k] = data[k]; });
      merged[cols[0]] = id; // la PK no cambia
      sh.getRange(i + 1, 1, 1, cols.length).setValues([objToRow_(cols, merged)]);
      return { updated:true, id:id };
    }
  }
  throw new Error("No se encontró " + cols[0] + " = " + id);
}
function apiDelete(name, id) {
  var sh = sheet_(name), values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) { sh.deleteRow(i + 1); return { deleted:true, id:id }; }
  }
  return { deleted:false, id:id };
}

/* ═══ ESTADO COMPARTIDO DEL PROYECTO (31_ESTADO_PROYECTO) ═══
   Una fila por proyecto con el JSON completo del proyecto tal como lo maneja la
   app. Cada guardado sube `version` en 1; si el cliente manda una versión que
   ya no es la actual, se devuelve conflict:true con el estado vigente para que
   el cliente combine y reintente. Así dos personas pueden trabajar el mismo
   proyecto a la vez sin pisarse en silencio.                                  */
function estadoSheet_() {
  var ss = ss_(), sh = ss.getSheetByName(ESTADO_SHEET), cols = SCHEMA[ESTADO_SHEET];
  if (!sh) {
    sh = ss.insertSheet(ESTADO_SHEET);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold").setBackground("#3E3F3F").setFontColor("#FFFFFF");
    sh.setFrozenRows(1);
  }
  return sh;
}
function estadoJoin_(row) {
  var s = "";
  for (var i = 4; i < 4 + ESTADO_CHUNKS; i++) {
    var v = row[i]; if (v === "" || v == null) break;
    v = String(v); if (v.charAt(0) === "~") v = v.slice(1);
    s += v;
  }
  return s;
}
function estadoRow_(pid, version, por, json) {
  var row = [pid, version, new Date().toISOString(), por || ""];
  for (var i = 0; i < ESTADO_CHUNKS; i++) {
    var part = json.slice(i * ESTADO_CHUNK, (i + 1) * ESTADO_CHUNK);
    row.push(part ? "~" + part : "");
  }
  return row;
}
function saveState(pid, version, json, por) {
  if (!pid) throw new Error("Falta proyecto_id.");
  json = typeof json === "string" ? json : JSON.stringify(json || {});
  if (json.length > ESTADO_CHUNK * ESTADO_CHUNKS) throw new Error("El proyecto es demasiado grande para guardarse (" + json.length + " caracteres).");
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = estadoSheet_(), data = sh.getDataRange().getValues(), cols = SCHEMA[ESTADO_SHEET];
    var v = parseInt(version, 10) || 0;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) !== String(pid)) continue;
      var cur = parseInt(data[i][1], 10) || 0;
      if (cur !== v) return { conflict: true, version: cur, actualizado: String(data[i][2] || ""), por: String(data[i][3] || ""), json: estadoJoin_(data[i]) };
      var nv = cur + 1;
      sh.getRange(i + 1, 1, 1, cols.length).setValues([estadoRow_(pid, nv, por, json)]);
      return { saved: true, version: nv, actualizado: new Date().toISOString() };
    }
    sh.appendRow(estadoRow_(pid, 1, por, json));
    return { saved: true, version: 1, actualizado: new Date().toISOString() };
  } finally { lock.releaseLock(); }
}
/* Devuelve los estados cambiados después de `since` (ISO). Sin `since`: todos. */
function getStates(since, ids) {
  var sh = estadoSheet_(), data = sh.getDataRange().getValues(), out = [];
  var want = Array.isArray(ids) && ids.length ? ids.map(String) : null;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === "") continue;
    if (want && want.indexOf(String(data[i][0])) < 0) continue;
    var act = data[i][2] instanceof Date ? data[i][2].toISOString() : String(data[i][2] || "");
    if (since && act && act <= String(since)) continue;
    out.push({ proyecto_id: String(data[i][0]), version: parseInt(data[i][1], 10) || 0, actualizado: act, por: String(data[i][3] || ""), json: estadoJoin_(data[i]) });
  }
  return { estados: out, ahora: new Date().toISOString() };
}

/* ═══ DIAGNÓSTICO DE DRIVE ═══
   Corre probarDrive() desde el editor de Apps Script. Hace dos cosas:
     1) fuerza la pantalla de autorización con el permiso de Drive (el que
        falta cuando la app responde "Access denied: DriveApp");
     2) confirma que FOLDER_ID existe y que la cuenta puede escribir en él.
   Después de que pase, hay que volver a implementar: Implementar →
   Administrar implementaciones → editar → Versión: Nueva versión.        */
function probarDrive() {
  if (!FOLDER_ID) throw new Error("Falta FOLDER_ID en Propiedades del script.");
  var madre;
  try {
    madre = DriveApp.getFolderById(FOLDER_ID);
  } catch (e) {
    throw new Error("FOLDER_ID no es accesible con esta cuenta (" + FOLDER_ID + "): " + e.message);
  }
  var f = madre.createFile(Utilities.newBlob("prueba de escritura de Grow", "text/plain", "grow-prueba.txt"));
  var id = f.getId();
  f.setTrashed(true);
  return "OK · carpeta: " + madre.getName() + " · escritura confirmada (" + id + "). Ahora vuelve a implementar como NUEVA VERSIÓN.";
}

/* ═══ Drive — sube un archivo (base64) a una subcarpeta de la carpeta madre ═══
   subfolder acepta una ruta con "/": "Propiedades/Rue de la Paix/301/05 Facturas". */
function uploadFile(b64, name, mime, subfolder) {
  if (!FOLDER_ID) throw new Error("Falta FOLDER_ID en Propiedades del script.");
  var folder;
  try {
    folder = DriveApp.getFolderById(FOLDER_ID);
  } catch (e) {
    // "Access denied: DriveApp" = la implementación corre con una autorización
    // anterior a que el script tocara Drive.
    throw new Error("Sin permiso de Drive. Corre probarDrive() en Apps Script, autoriza, y vuelve a implementar como nueva versión. (" + e.message + ")");
  }
  if (subfolder && String(subfolder).trim() !== "") {
    String(subfolder).split("/").forEach(function(part){
      part = part.trim(); if (!part) return;
      var it = folder.getFoldersByName(part);
      folder = it.hasNext() ? it.next() : folder.createFolder(part);
    });
  }
  var raw = (b64.indexOf(",") > -1) ? b64.split(",")[1] : b64;
  var blob = Utilities.newBlob(Utilities.base64Decode(raw), mime, name);
  var file = folder.createFile(blob);
  // Compartir con enlace puede estar prohibido por la política del Workspace; si
  // falla, el archivo igual queda en Drive y la app lo muestra desde el thumbnail.
  var compartido = true;
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (eS) { compartido = false; try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (eD) {} }
  var id = file.getId();
  return { url: "https://drive.google.com/thumbnail?id=" + id + "&sz=w1600", fileId: id,
    verUrl: "https://drive.google.com/file/d/" + id + "/view", compartido: compartido };
}

/* ═══ Correo — mismo patrón que la EPI App (alias hola@spacioam.com) ═══ */
/* Lee una pestaña de otra hoja de cálculo para importar un presupuesto.
   Usa la cuenta del script: alcanza hojas privadas compartidas con ella. */
function importSheet(id, gid) {
  if (!id) throw new Error("Falta el id de la hoja.");
  var ss = SpreadsheetApp.openById(String(id));
  var hojas = ss.getSheets(), sh = hojas[0];
  for (var i = 0; i < hojas.length; i++) if (String(hojas[i].getSheetId()) === String(gid)) { sh = hojas[i]; break; }
  return { titulo: sh.getName(), rows: sh.getDataRange().getDisplayValues() };
}

function notify(p) {
  var to = Array.isArray(p.to) ? p.to : [p.to], sent = 0, error = "";
  var asunto = p.subject || p.asunto || "Spacio AM · Gestión";
  var cuerpo = String(p.body || p.html || "");
  /* Si ya es HTML no se tocan los saltos: un <br> dentro de una etiqueta la rompe. */
  var html = /<(table|div|p|html|body)[\s>]/i.test(cuerpo) ? cuerpo : cuerpo.replace(/\n/g, "<br>");
  if (MailApp.getRemainingDailyQuota() < 1) return { sent:0, error:"se agotó la cuota diaria de correos" };
  to.filter(Boolean).forEach(function(t){
    try {
      GmailApp.sendEmail(String(t), asunto, "", { htmlBody:html, from:"hola@spacioam.com", name:"Spacio AM", replyTo:"hola@spacioam.com" });
      sent++;
    } catch(e) {
      /* Si el alias hola@ no está verificado en esta cuenta, sale desde la cuenta del script. */
      try { MailApp.sendEmail({ to:String(t), subject:asunto, htmlBody:html, name:"Spacio AM", replyTo:"hola@spacioam.com" }); sent++; }
      catch(e2){ error = String(e2 && e2.message || e && e.message || e2); Logger.log("notify " + t + ": " + error); }
    }
  });
  return { sent:sent, error:error };
}

/* Prueba manual: selecciona y ▶ Ejecutar. */
function testSetup()  { Logger.log(setup()); }
function testNotify() { Logger.log(notify({ to:"hola@spacioam.com", subject:"Prueba Grow", body:"Backend operativo ✓" })); }
