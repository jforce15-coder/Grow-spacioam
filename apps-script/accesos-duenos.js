/* ═══ ACCESO INMEDIATO PARA LOS DUEÑOS ═══════════════════════════════════════════════════════════
   Todo dueño que se crea o actualiza en Grow (02_DUENOS) con correo queda dado de alta en el Control de usuarios
   (login unificado) como «dueno» de Grow, sin contraseña: la primera vez que entra a Grow o al Portal de contratos
   se le pide crear la suya. Si ya existía, solo se le asegura el permiso (nunca se baja un rol de equipo).
   Se usa la acción addUser del login, a nombre del administrador principal (LOGIN_ADMIN_EMAIL). */
var LOGIN_URL_ = 'https://script.google.com/macros/s/AKfycbxfdwLzsA8bwgOxUTOtf3Hw1ptIm8Cy34tspmFndu3WtRrkVSSnGyBP7obRrm73mcUd/exec';

function loginAltaDueno_(email, nombre) {
  email = String(email || '').trim().toLowerCase(); if (email.indexOf('@') < 0) return { ok: false, error: 'sin correo' };
  var p = PropertiesService.getScriptProperties(), hechos = {};
  try { hechos = JSON.parse(p.getProperty('LOGIN_DUENOS') || '{}'); } catch (e) {}
  if (hechos[email]) return { ok: true, ya: true };
  var r = UrlFetchApp.fetch(LOGIN_URL_, { method: 'post', contentType: 'text/plain;charset=utf-8', muteHttpExceptions: true, followRedirects: true,
    payload: JSON.stringify({ action: 'addUser', token: p.getProperty('LOGIN_TOKEN') || 'SpacioAM2026!', by: p.getProperty('LOGIN_ADMIN_EMAIL') || 'jovalle@spacioam.com',
      email: email, nombre: String(nombre || '').trim() || email.split('@')[0], app: 'grow', rol: 'dueno' }) });
  var j = {}; try { j = JSON.parse(r.getContentText()); } catch (e) {}
  if (j && j.ok) { hechos[email] = new Date().toISOString().slice(0, 10); p.setProperty('LOGIN_DUENOS', JSON.stringify(hechos)); }
  else console.error('loginAltaDueno_ ' + email + ': ' + r.getContentText().slice(0, 200));
  return j && j.ok ? { ok: true, creado: !!j.created } : { ok: false, error: (j && j.error) || ('HTTP ' + r.getResponseCode()) };
}

/* Después de crear o editar un dueño: si ya tiene correo, se le da acceso. */
function loginDuenoDespuesDe_(name, id) {
  if (name !== '02_DUENOS') return;
  try {
    var sh = sheet_(name), v = sh.getDataRange().getValues(), cols = SCHEMA[name], ie = cols.indexOf('email'), inn = cols.indexOf('nombre');
    for (var i = 1; i < v.length; i++) if (String(v[i][0]) === String(id)) { if (v[i][ie]) loginAltaDueno_(v[i][ie], v[i][inn]); return; }
  } catch (e) { console.error('loginDuenoDespuesDe_: ' + e); }
}

/* Todos los dueños existentes (una vez, o cuando haga falta). Robot: { action:'__duenos', token:<robot> }. */
function loginSincronizarDuenos_() {
  var sh = sheet_('02_DUENOS'), v = sh.getDataRange().getValues(), cols = SCHEMA['02_DUENOS'], ie = cols.indexOf('email'), inn = cols.indexOf('nombre'), out = { revisados: 0, nuevos: 0, errores: [] };
  for (var i = 1; i < v.length; i++) {
    if (!v[i][ie]) continue; out.revisados++;
    var r = loginAltaDueno_(v[i][ie], v[i][inn]);
    if (r.ok && r.creado) out.nuevos++; if (!r.ok) out.errores.push(String(v[i][ie]).replace(/^(.{2}).*@/, '$1…@') + ': ' + r.error);
  }
  return out;
}
function duenosDiag_(body) {
  if (!body || body.action !== '__duenos') return null;
  var t = String(body.token || ''), h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t, Utilities.Charset.UTF_8).map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  var out = h === SES_ROBOT_HASH_ ? Object.assign({ ok: true }, loginSincronizarDuenos_()) : { ok: false, error: 'token' };
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
