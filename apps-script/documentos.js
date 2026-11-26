/* ═══ DOCUMENTOS COMPARTIDOS CON EL PROPIETARIO (issue «Documentos en el portal del propietario») ═══
   26-nov-2026: Grow marcaba «Enviado» documentos que el propietario nunca vio. La lista de qué se comparte vivía solo en el
   navegador de quien la armó y el portal no tenía dónde mostrarla. Ahora:
   · La hoja 41_DOCUMENTOS guarda, por proyecto, qué archivo se comparte (una fila por proyecto y archivo). No viaja en
     getAll: solo se lee por estas acciones, que revisan quién pregunta.
   · El equipo (sesión de administración o la llave del robot) comparte, quita y avisa (docsProyecto, docsCompartir,
     docsQuitar, docsAvisar).
   · El propietario, con su sesión, ve SOLO los documentos de SUS proyectos (misDocumentos) y los abre sin descarga
     (verDocumento): nunca recibe el id ni el enlace de Drive.
   · docsAvisar es la única puerta del correo de aviso: el servidor elige el destinatario (el propietario vinculado al
     proyecto, con correo), revisa que cada documento esté compartido en la nube, manda el correo y solo entonces marca
     avisado_en. Si falta algo, dice qué y no marca nada. */
var DOCS_HOJA_ = '41_DOCUMENTOS';
var DOCS_COLS_ = ['doc_id', 'proyecto_id', 'archivo_id', 'nombre', 'tipo', 'mime', 'peso', 'file_id', 'compartido_por', 'compartido_en', 'avisado_en', 'aviso_previo'];
var DOCS_MAX_BYTES_ = 15 * 1024 * 1024;

/* Acciones de documentos: null si la acción no es de aquí. ses = perfil de la sesión (sesionDe_) o null. */
function documentosApi_(p, ses) {
  var a = String((p && p.action) || '');
  if (['docsProyecto', 'docsCompartir', 'docsQuitar', 'docsAvisar', 'misDocumentos', 'verDocumento'].indexOf(a) < 0) return null;
  var quien = docsQuien_(p, ses);
  /* Sin sesión válida no se devuelve «session» (sa-sesion.js recargaría la página, también en los perfiles de prueba). */
  if (!quien.rol) return { ok: false, error: 'sin_sesion' };
  if (a === 'misDocumentos') return docsMios_(quien);
  if (a === 'verDocumento') return docsVer_(quien, String(p.doc_id || ''));
  if (quien.rol !== 'equipo') return { ok: false, error: 'Solo el equipo de Spacio AM puede compartir documentos.' };
  if (a === 'docsProyecto') return { ok: true, documentos: docsDe_(p.proyecto_id ? [String(p.proyecto_id)] : null) };
  if (a === 'docsCompartir') return docsCompartir_(String(p.proyecto_id || ''), p.archivos || [], quien.email);
  if (a === 'docsQuitar') return docsQuitar_(String(p.proyecto_id || ''), String(p.archivo_id || ''));
  return docsAvisar_(p, quien.email);
}

/* Quién pregunta: «equipo» (administración o robot), «dueno» (propietario con sesión) o nadie. */
function docsQuien_(p, ses) {
  if (esRobot_(p)) return { rol: 'equipo', email: 'robot' };
  if (!ses || !ses.email) return { rol: '' };
  var r = String((ses.apps && ses.apps.grow) || '').toLowerCase(), email = String(ses.email).trim().toLowerCase();
  if (/propiet|dueno|dueño|owner|socio/.test(r)) return { rol: 'dueno', email: email };
  if (/admin/.test(r)) return { rol: 'equipo', email: email };
  return { rol: '', email: email };   // técnicos, recepción o sin permiso en Grow: nada de esto
}

function docsHoja_() {
  var ss = ss_(), sh = ss.getSheetByName(DOCS_HOJA_);
  if (!sh) { sh = ss.insertSheet(DOCS_HOJA_); sh.getRange(1, 1, 1, DOCS_COLS_.length).setValues([DOCS_COLS_]); sh.setFrozenRows(1); }
  return sh;
}
function docsFilas_() {
  var sh = docsHoja_(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, DOCS_COLS_.length).getValues().map(function (r, i) {
    var o = { _fila: i + 2 };
    DOCS_COLS_.forEach(function (c, j) { o[c] = r[j] instanceof Date ? r[j].toISOString() : String(r[j] == null ? '' : r[j]); });
    return o;
  }).filter(function (o) { return o.doc_id; });
}
function docsDe_(pids) {
  return docsFilas_().filter(function (d) { return !pids || pids.indexOf(d.proyecto_id) >= 0; })
    .map(function (d) { var o = {}; DOCS_COLS_.forEach(function (c) { o[c] = d[c]; }); return o; });
}

/* Comparte (o actualiza) archivos con un proyecto. Cada archivo tiene que estar en Drive (file_id): lo que vive solo en
   un navegador no se puede compartir. aviso_previo conserva la fecha de un aviso viejo (la migración desde el navegador). */
function docsCompartir_(pid, archivos, por) {
  if (!pid) return { ok: false, error: 'Falta el proyecto.' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = docsHoja_(), filas = docsFilas_(), hechos = [], rechazados = [];
    (archivos || []).forEach(function (a) {
      var aid = String((a && (a.archivo_id || a.id)) || '').trim(), fid = String((a && (a.file_id || a.fileId)) || '').replace(/[^A-Za-z0-9_-]/g, '');
      if (!aid || aid === 'machote') return;
      if (!fid) { rechazados.push({ archivo_id: aid, nombre: String(a.nombre || ''), por: 'no está en Drive' }); return; }
      var id = pid + '|' + aid, ya = filas.filter(function (f) { return f.doc_id === id; })[0];
      var fila = { doc_id: id, proyecto_id: pid, archivo_id: aid, nombre: String(a.nombre || '').slice(0, 200), tipo: String(a.tipo || 'archivo'),
        mime: String(a.mime || ''), peso: String(a.peso || ''), file_id: fid, compartido_por: ya ? ya.compartido_por : por,
        compartido_en: ya ? ya.compartido_en : new Date().toISOString(), avisado_en: ya ? ya.avisado_en : '',
        aviso_previo: (ya && ya.aviso_previo) || String(a.aviso_previo || '') };
      var fila_ = DOCS_COLS_.map(function (c) { return fila[c]; });
      if (ya) sh.getRange(ya._fila, 1, 1, DOCS_COLS_.length).setValues([fila_]);
      else { sh.appendRow(fila_); filas.push(Object.assign({ _fila: sh.getLastRow() }, fila)); }
      hechos.push(id);
    });
    return { ok: true, compartidos: hechos, rechazados: rechazados, documentos: docsDe_([pid]) };
  } finally { lock.releaseLock(); }
}
function docsQuitar_(pid, aid) {
  if (!pid || !aid) return { ok: false, error: 'Falta el proyecto o el archivo.' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var f = docsFilas_().filter(function (x) { return x.doc_id === pid + '|' + aid; })[0];
    if (f) docsHoja_().deleteRow(f._fila);
    return { ok: true, quitado: !!f, documentos: docsDe_([pid]) };
  } finally { lock.releaseLock(); }
}

/* Proyectos de un propietario: los de 01_PROYECTOS con su dueno_id y los del estado compartido con su duenoId. */
function docsDuenoIds_(email) {
  return readAll_('02_DUENOS').filter(function (d) { return String(d.email || '').trim().toLowerCase() === email; })
    .map(function (d) { return String(d.dueno_id); });
}
function docsProyectosDe_(ids) {
  var out = {};
  if (!ids.length) return [];
  readAll_('01_PROYECTOS').forEach(function (r) { if (ids.indexOf(String(r.dueno_id || '')) >= 0) out[String(r.proyecto_id)] = 1; });
  (getStates('', null).estados || []).forEach(function (e) {
    var j = null; try { j = JSON.parse(String(e.json || 'null').replace(/^~/, '')); } catch (x) {}
    if (j && j.duenoId && ids.indexOf(String(j.duenoId)) >= 0) out[String(e.proyecto_id)] = 1;
  });
  return Object.keys(out);
}
/* El propietario de un proyecto, si está vinculado y tiene correo (si no, no tiene acceso al portal). */
function docsDuenoDe_(pid) {
  var did = '';
  var est = (getStates('', [pid]).estados || [])[0];
  if (est) { try { var j = JSON.parse(String(est.json || 'null').replace(/^~/, '')); did = String((j && j.duenoId) || ''); } catch (x) {} }
  if (!did) { var r = apiGet('01_PROYECTOS', pid); did = String((r && r.dueno_id) || ''); }
  if (!did) return null;
  var d = readAll_('02_DUENOS').filter(function (x) { return String(x.dueno_id) === did; })[0];
  return d && String(d.email || '').indexOf('@') > 0 ? { id: did, nombre: String(d.nombre || ''), email: String(d.email).trim().toLowerCase() } : null;
}

function docsMios_(quien) {
  if (quien.rol !== 'dueno') return { ok: true, documentos: [], machote: false };
  var pids = docsProyectosDe_(docsDuenoIds_(quien.email));
  return { ok: true, machote: pids.length > 0, proyectos: pids,
    documentos: docsDe_(pids).filter(function (d) { return d.archivo_id !== 'machote'; }).map(function (d) { return { doc_id: d.doc_id, proyecto_id: d.proyecto_id, nombre: d.nombre, tipo: d.tipo, mime: d.mime, peso: d.peso, compartido_en: d.compartido_en }; }) };
}
function docsVer_(quien, docId) {
  var d = docsFilas_().filter(function (x) { return x.doc_id === docId; })[0];
  if (!d || d.archivo_id === 'machote' || !d.file_id) return { ok: false, error: 'Ese documento ya no está compartido.' };
  if (quien.rol === 'dueno' && docsProyectosDe_(docsDuenoIds_(quien.email)).indexOf(d.proyecto_id) < 0) return { ok: false, error: 'Ese documento no es de tus proyectos.' };
  var blob = DriveApp.getFileById(d.file_id).getBlob();
  if (blob.getBytes().length > DOCS_MAX_BYTES_) return { ok: false, error: 'El documento es demasiado grande para verlo aquí.' };
  return { ok: true, nombre: d.nombre, mime: blob.getContentType() || d.mime || 'application/octet-stream', b64: Utilities.base64Encode(blob.getBytes()) };
}

/* El aviso por correo: el servidor decide si puede salir y a quién. */
function docsAvisar_(p, por) {
  var pid = String(p.proyecto_id || ''), ids = (p.archivo_ids || []).map(String);
  if (!pid || !ids.length) return { ok: false, falta: 'datos', error: 'Falta el proyecto o los documentos.' };
  var dn = docsDuenoDe_(pid);
  if (!dn) return { ok: false, falta: 'acceso', error: 'el propietario todavía no tiene acceso al portal: vincúlalo en la ficha del proyecto.' };
  var filas = docsFilas_().filter(function (f) { return f.proyecto_id === pid; });
  var faltan = ids.filter(function (id) { return id !== 'machote' && !filas.some(function (f) { return f.archivo_id === id; }); });
  if (faltan.length) return { ok: false, falta: 'nube', faltan: faltan, error: 'hay documentos que no están guardados en la nube: súbelos otra vez.' };
  var html = String(p.html || '');
  if (!html) return { ok: false, falta: 'datos', error: 'Falta el texto del correo.' };
  var r = notify({ to: dn.email, subject: String(p.asunto || 'Documentos de Spacio AM'), body: html });
  if (!r || !r.sent) return { ok: false, falta: 'correo', error: 'el correo no salió (' + ((r && r.error) || 'sin respuesta') + ').' };
  var ahora = new Date().toISOString(), sh = docsHoja_(), ca = DOCS_COLS_.indexOf('avisado_en') + 1;
  filas.forEach(function (f) { if (ids.indexOf(f.archivo_id) >= 0) sh.getRange(f._fila, ca).setValue(ahora); });
  /* El contrato modelo no es un archivo de Drive: su fila solo guarda cuándo se avisó. */
  if (ids.indexOf('machote') >= 0 && !filas.some(function (f) { return f.archivo_id === 'machote'; })) {
    var m = { doc_id: pid + '|machote', proyecto_id: pid, archivo_id: 'machote', nombre: 'Contrato modelo', tipo: 'machote', compartido_por: por, compartido_en: ahora, avisado_en: ahora };
    sh.appendRow(DOCS_COLS_.map(function (c) { return m[c] || ''; }));
  }
  try { apiCreate('24_CORREOS', { fecha_hora: ahora, tipo: 'documentos', para: dn.email, asunto: String(p.asunto || ''), proyecto_id: pid, estado: 'Enviado' }); cacheDrop_(); } catch (e) {}
  return { ok: true, sent: r.sent, para: dn.email, avisado_en: ahora, documentos: docsDe_([pid]) };
}
