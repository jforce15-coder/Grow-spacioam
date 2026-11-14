/* ═══ ENLACES CORTOS (Hub #488 · T1) ═══════════════════════════════════════════════════════════════════════
   grow.spacioam.com/k7q2m en vez del enlace largo del formulario de datos (unos 250 caracteres).
   · Hoja 40_ENLACES: codigo · url · app · creado · por · clics · ultimo. Si no existe, se crea sola al acortar.
   · «acortar» (con sesión o con la llave del robot): recibe el enlace largo y devuelve el código. El mismo enlace da
     siempre el mismo código. Solo enlaces de grow.spacioam.com y de Google Drive / Docs.
   · «enlace» (PÚBLICA, sin sesión): recibe el código y devuelve solo el enlace largo; suma un clic. La usa 404.html,
     la página que GitHub Pages muestra para cualquier dirección que no existe.
   · El código: 5 caracteres al azar de 23456789abcdefghjkmnpqrstuvwxyz (sin 0/o ni 1/l/i). Si choca, se sortea otro.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
var ENLACES_HOJA_ = '40_ENLACES';
var ENLACES_ABC_ = '23456789abcdefghjkmnpqrstuvwxyz';
var ENLACES_RX_ = /^[23456789abcdefghjkmnpqrstuvwxyz]{5}$/;
var ENLACES_RESERVADOS_ = ['cname'];   // archivos del sitio: esa dirección nunca llega a 404.html
var ENLACES_HOSTS_ = ['grow.spacioam.com', 'drive.google.com', 'docs.google.com'];
var ENLACES_BASE_ = 'https://grow.spacioam.com/';

function enlacesHoja_() {
  var ss = ss_(), sh = ss.getSheetByName(ENLACES_HOJA_), cols = SCHEMA[ENLACES_HOJA_];
  if (!sh) {
    sh = ss.insertSheet(ENLACES_HOJA_);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#3E3F3F').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* El enlace largo, limpio, o "" si no se puede acortar (otro dominio, sin https, con espacios o demasiado largo). */
function enlaceUrlValida_(url) {
  url = String(url == null ? '' : url).trim();
  if (!url || url.length > 2000 || /\s/.test(url)) return '';
  var m = url.match(/^https:\/\/([^\/?#:@]+)(?:[\/?#]|$)/i);
  if (!m || ENLACES_HOSTS_.indexOf(m[1].toLowerCase()) < 0) return '';
  return url;
}

function enlaceCodigoNuevo_(usados) {
  for (var intento = 0; intento < 20; intento++) {
    var c = '';
    for (var i = 0; i < 5; i++) c += ENLACES_ABC_.charAt(Math.floor(Math.random() * ENLACES_ABC_.length));
    if (!usados[c] && ENLACES_RESERVADOS_.indexOf(c) < 0) return c;
  }
  throw new Error('No pude crear un código nuevo. Intenta otra vez.');
}

/* Op «acortar»: { url } → { codigo, corto }. */
function acortarEnlace_(url, ses, body) {
  if (!ses && !esRobot_(body)) throw new Error('Para acortar un enlace hace falta iniciar sesión.');
  return enlaceGuardar_(url, ses ? String(ses.email || ses.nombre || 'sesión') : 'robot');
}

/* El acortador en sí (lo usan la op «acortar» y la puerta de la secretaria, secretaria.js): mismo enlace, mismo código. */
function enlaceGuardar_(url, por) {
  var u = enlaceUrlValida_(url);
  if (!u) throw new Error('Ese enlace no se puede acortar: solo los de grow.spacioam.com o de Google Drive.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = enlacesHoja_(), v = sh.getDataRange().getValues(), usados = {};
    for (var i = 1; i < v.length; i++) {
      var c = String(v[i][0] == null ? '' : v[i][0]).trim().toLowerCase();
      if (!c) continue;
      if (String(v[i][1]) === u && ENLACES_RX_.test(c)) return { codigo: c, corto: ENLACES_BASE_ + c };
      usados[c] = true;
    }
    var codigo = enlaceCodigoNuevo_(usados), fila = sh.getLastRow() + 1;
    por = String(por || 'robot').slice(0, 80);
    if (/^[=+\-@]/.test(por)) por = "'" + por;   // lo que viene de afuera nunca se guarda como fórmula
    sh.getRange(fila, 1).setNumberFormat('@');   // el código como texto: «22345» o «3e222» no se vuelven número
    sh.getRange(fila, 1, 1, 7).setValues([[codigo, u, 'grow', new Date().toISOString(), por, 0, '']]);
    return { codigo: codigo, corto: ENLACES_BASE_ + codigo };
  } finally { lock.releaseLock(); }
}

/* Op «enlace» (pública): { codigo } → { url }. Solo ese dato; nunca crea la hoja ni filas. */
function abrirEnlace_(codigo) {
  var c = String(codigo == null ? '' : codigo).trim().toLowerCase();
  var NO = 'Este enlace no existe.';
  if (!ENLACES_RX_.test(c)) throw new Error(NO);
  var sh = ss_().getSheetByName(ENLACES_HOJA_);
  if (!sh) throw new Error(NO);
  var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0] == null ? '' : v[i][0]).trim().toLowerCase() !== c) continue;
    var url = enlaceUrlValida_(v[i][1]);   // por si alguien editó la hoja a mano: nunca redirige a otro dominio
    if (!url) throw new Error(NO);
    var lock = LockService.getScriptLock();
    if (lock.tryLock(3000)) {   // contar el clic nunca frena la apertura
      try {
        var celdas = sh.getRange(i + 1, 6, 1, 2), act = celdas.getValues()[0];
        celdas.setValues([[(Number(act[0]) || 0) + 1, new Date().toISOString()]]);
      } catch (e) { console.warn('abrirEnlace_ clic: ' + e); }
      finally { lock.releaseLock(); }
    }
    return { url: url };
  }
  throw new Error(NO);
}
