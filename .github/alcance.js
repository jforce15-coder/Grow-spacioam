/* Prueba de «qué ve cada sesión» (apps-script/alcance.js), pasando por route() de Código.js con dobles: sin Sheets ni red.
   26-nov-2026: getAll, getStates, list y get devolvían todos los proyectos a cualquier sesión, también a la de un
   propietario (en la red veía los datos de los demás). Lo que tiene que cumplirse siempre:
   1. Un propietario con 1 proyecto recibe solo ese, en getAll, getStates, list y get; nada de contactos, proveedores,
      equipo, catálogo ni plantillas; ni los datos del cliente (DATOS-…) de nadie.
   2. Sin sesión (o con una sesión sin permiso en Grow) no recibe nada.
   3. El administrador, un técnico y la llave del robot reciben todo, como antes.
   4. El propietario solo escribe en lo suyo: su estado, su contrato y su firma, y el aviso a hola@. Nada de importSheet,
      verDoc ni diag. El formulario público de «datos del cliente» sigue pasando.
   node .github/alcance.js [carpeta apps-script] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = process.argv[2] || path.join(__dirname, '..', 'apps-script');
let fallo = 0; const ok = (c, m) => { if (c) console.log('✓ ' + m); else { console.log('::error::' + m); fallo = 1; } };
const ROBOT = 'llave-del-robot';
const crypto = require('crypto');

const SESIONES = {
  admin: { email: 'admin@spacioam.com', apps: { grow: 'admin_principal' } },
  tecnico: { email: 'tec@spacioam.com', apps: { grow: 'tecnico' } },
  uno: { email: 'uno@ejemplo.com', apps: { grow: 'dueno' } },
  sinGrow: { email: 'otro@ejemplo.com', apps: { hub: 'admin' } },
};
function datos() {
  return {
    '01_PROYECTOS': [{ proyecto_id: 'pA', nombre: 'A', dueno_id: 'D-1' }, { proyecto_id: 'pB', nombre: 'B', dueno_id: 'D-2' }, { proyecto_id: 'pC', nombre: 'C', dueno_id: '' }],
    '02_DUENOS': [{ dueno_id: 'D-1', nombre: 'Uno', email: 'uno@ejemplo.com' }, { dueno_id: 'D-2', nombre: 'Dos', email: 'dos@ejemplo.com' }],
    '05_VISITAS': [{ visita_id: 'V-1', proyecto_id: 'pA' }, { visita_id: 'V-2', proyecto_id: 'pB' }],
    '07_CATALOGO_ITEMS': [{ item: 'Sofá', precio_max: 100 }],
    '08_PRESUPUESTOS': [{ presupuesto_id: 'P-1', proyecto_id: 'pA' }, { presupuesto_id: 'P-2', proyecto_id: 'pB' }],
    '09_PRESUPUESTO_ITEMS': [{ pres_item_id: 'PI-1', presupuesto_id: 'P-1' }, { pres_item_id: 'PI-2', presupuesto_id: 'P-2' }],
    '10_FACTURAS': [{ factura_id: 'F-1' }, { factura_id: 'F-2' }],
    '11_FACTURA_ASIGNACIONES': [{ asignacion_id: 'FA-1', factura_id: 'F-1', proyecto_id: 'pA' }, { asignacion_id: 'FA-2', factura_id: 'F-2', proyecto_id: 'pB' }],
    '12_PROVEEDORES': [{ nombre_factura: 'Proveedor' }],
    '13_CONTRATOS': [{ contrato_id: 'C-1', proyecto_id: 'pA' }, { contrato_id: 'C-2', proyecto_id: 'pB' }],
    '14_FIRMAS': [{ firma_id: 'SG-1', contrato_id: 'C-1' }, { firma_id: 'SG-2', contrato_id: 'C-2' }],
    '17_USUARIOS': [{ usuario_id: 'U1', nombre: 'Equipo', email: 'equipo@spacioam.com' }],
    '18_TAREAS': [{ tarea_id: 'T-1', proyecto_id: 'pA' }, { tarea_id: 'T-2', proyecto_id: 'pC' }],
    '19_SUBTAREAS': [{ subtarea_id: 'ST-1', tarea_id: 'T-1' }, { subtarea_id: 'ST-2', tarea_id: 'T-2' }],
    '22_CONTACTOS': [{ contacto_id: 'CT-1', nombre: 'Prospecto' }],
    '24_CORREOS': [{ correo_id: 'CO-1', proyecto_id: 'pA' }, { correo_id: 'CO-2', proyecto_id: 'pB' }],
    '25_CORREO_TEMPLATES': [{ template_id: 't1' }],
    '31_ESTADO_PROYECTO': [{ proyecto_id: 'pA' }, { proyecto_id: 'pB' }, { proyecto_id: 'pD' }, { proyecto_id: 'DATOS-pA' }, { proyecto_id: 'DATOS-pB' }],
  };
}
/* pD: vinculado a la propietaria Uno solo en el estado del proyecto (no en 01_PROYECTOS). */
const ESTADOS = [
  { proyecto_id: 'pA', json: JSON.stringify({ id: 'pA', duenoId: 'D-1' }) },
  { proyecto_id: 'pB', json: JSON.stringify({ id: 'pB', duenoId: 'D-2' }) },
  { proyecto_id: 'pD', json: JSON.stringify({ id: 'pD', duenoId: 'D-1' }) },
  { proyecto_id: 'DATOS-pA', json: JSON.stringify({ k: 'x', datos: { dpi: '...' } }) },
  { proyecto_id: 'DATOS-pB', json: JSON.stringify({ k: 'y', datos: { dpi: '...' } }) },
];

function caja(o) {
  o = o || {};
  const D = datos(), hechos = [];
  const props = { SESION_EXIGIR: o.exigir === false ? null : '1' };
  const out = s => ({ s, setMimeType() { return this; }, getContent() { return s; } });
  const ctx = { console, JSON, Date, Math, String, Number, Object, Array, RegExp, Error, Buffer,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty() {} }) },
    Session: { getScriptTimeZone: () => 'America/Guatemala', getEffectiveUser: () => ({ getEmail: () => 'alma@spacioam.com' }) },
    CacheService: { getScriptCache: () => ({ remove() {}, get() { return null; }, put() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }), getUserLock: () => ({ hasLock: () => false, tryLock: () => true, releaseLock() {} }) },
    ContentService: { createTextOutput: out, MimeType: { JSON: 'json', TEXT: 'text' } },
    Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, t) => Array.from(crypto.createHash(alg).update(String(t)).digest()) },
    SpreadsheetApp: {}, DriveApp: { getFolderById: () => ({ getName: () => 'Grow' }) } };
  vm.createContext(ctx);
  ['Código.js', 'sesion.js', 'alcance.js', 'documentos.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), ctx, { filename: f }));
  ctx.SES_ROBOT_HASH_ = crypto.createHash('sha256').update(ROBOT).digest('hex');
  ctx.cupoDiag_ = ctx.duenosDiag_ = ctx.secretariaApi_ = ctx.accesosDiag_ = ctx.loginSecretoDiag_ = () => null;
  ctx.registrarAcceso_ = () => {};
  ctx.sesionDe_ = b => SESIONES[b && b.session] || null;
  ctx.readAll_ = n => (D[n] || []).map(r => Object.assign({}, r));
  ctx.apiGetAll = () => JSON.parse(JSON.stringify(D));
  ctx.apiList = n => ({ sheet: n, rows: ctx.readAll_(n) });
  ctx.apiGet = (n, id) => ctx.readAll_(n).filter(r => String(r[Object.keys(r)[0]]) === String(id))[0] || null;
  ctx.getStates = (s, ids) => ({ estados: ESTADOS.filter(e => !ids || !ids.length || ids.indexOf(e.proyecto_id) >= 0).map(e => Object.assign({}, e)), ahora: 'x' });
  ctx.cerrarDocsUnaVez_ = () => {};
  ctx.cacheDrop_ = () => {};
  ['apiCreate', 'apiUpdate', 'apiDelete', 'saveState', 'notify', 'importSheet', 'verDocCliente_', 'uploadFile'].forEach(f => { ctx[f] = (...a) => { hechos.push(f); return { ok: 1, sent: 1 }; }; });
  ctx.loginDuenoDespuesDe_ = () => {};
  const api = body => JSON.parse(ctx.route({ postData: { contents: JSON.stringify(body) } }).getContent());
  return { api, hechos };
}
const ids = (rows, k) => (rows || []).map(r => r[k]).sort().join(',');

{
  const c = caja();
  const r = c.api({ action: 'getAll', session: 'uno' }).data;
  ok(ids(r['01_PROYECTOS'], 'proyecto_id') === 'pA', '1. getAll: la propietaria recibe solo su proyecto de 01_PROYECTOS');
  ok(ids(r['31_ESTADO_PROYECTO'], 'proyecto_id') === 'pA,pD', '1. getAll: solo sus estados (también el vinculado solo en el estado), sin DATOS- de nadie');
  ok(ids(r['02_DUENOS'], 'dueno_id') === 'D-1', '1. getAll: de 02_DUENOS solo su ficha (no los correos de los demás)');
  ok(ids(r['09_PRESUPUESTO_ITEMS'], 'pres_item_id') === 'PI-1' && ids(r['10_FACTURAS'], 'factura_id') === 'F-1' && ids(r['14_FIRMAS'], 'firma_id') === 'SG-1' && ids(r['19_SUBTAREAS'], 'subtarea_id') === 'ST-1', '1. getAll: ítems, facturas, firmas y subtareas solo de lo suyo');
  ok(['07_CATALOGO_ITEMS', '12_PROVEEDORES', '17_USUARIOS', '22_CONTACTOS', '25_CORREO_TEMPLATES'].every(n => (r[n] || []).length === 0), '1. getAll: nada de catálogo, proveedores, equipo, contactos ni plantillas');
  ok(ids(r['24_CORREOS'], 'correo_id') === 'CO-1' && ids(r['05_VISITAS'], 'visita_id') === 'V-1', '1. getAll: correos y visitas solo de su proyecto');
  const st = c.api({ action: 'getStates', session: 'uno' }).data;
  ok(ids(st.estados, 'proyecto_id') === 'pA,pD', '1. getStates sin ids: solo los suyos');
  ok(c.api({ action: 'getStates', session: 'uno', ids: ['pB', 'DATOS-pA'] }).data.estados.length === 0, '1. getStates pidiendo otro proyecto o los datos del cliente: nada');
  ok(ids(c.api({ action: 'list', sheet: '13_CONTRATOS', session: 'uno' }).data.rows, 'contrato_id') === 'C-1', '1. list: solo su contrato');
  ok(c.api({ action: 'list', sheet: '22_CONTACTOS', session: 'uno' }).data.rows.length === 0, '1. list de contactos: vacío');
  ok(c.api({ action: 'get', sheet: '01_PROYECTOS', id: 'pB', session: 'uno' }).data === null && c.api({ action: 'get', sheet: '01_PROYECTOS', id: 'pA', session: 'uno' }).data.proyecto_id === 'pA', '1. get: el suyo sí, el de otro no');
}
{
  const c = caja();
  ok(c.api({ action: 'getAll' }).error === 'session', '2. sin sesión (con SESION_EXIGIR) no pasa');
  const c2 = caja({ exigir: false });
  const r = c2.api({ action: 'getAll' }).data;
  ok(Object.keys(r).every(n => r[n].length === 0), '2. sin sesión y sin SESION_EXIGIR: todas las hojas vacías');
  ok(c2.api({ action: 'getStates' }).data.estados.length === 0, '2. sin sesión: getStates vacío');
  const s = c.api({ action: 'getAll', session: 'sinGrow' }).data;
  ok(Object.keys(s).every(n => s[n].length === 0), '2. una sesión sin permiso en Grow: nada');
}
{
  const c = caja();
  const total = datos();
  for (const quien of [{ session: 'admin' }, { session: 'tecnico' }, { robot: ROBOT }]) {
    const r = c.api(Object.assign({ action: 'getAll' }, quien)).data;
    ok(Object.keys(total).every(n => (r[n] || []).length === total[n].length), '3. ' + (quien.session || 'robot') + ' recibe todo en getAll');
    ok(c.api(Object.assign({ action: 'getStates' }, quien)).data.estados.length === ESTADOS.length, '3. ' + (quien.session || 'robot') + ' recibe todos los estados');
  }
}
{
  const c = caja();
  const e = (b) => c.api(Object.assign({ session: 'uno' }, b));
  ok(e({ action: 'saveState', proyecto_id: 'pA', version: 1, json: '{}' }).ok && !e({ action: 'saveState', proyecto_id: 'pB', version: 1, json: '{}' }).ok, '4. guarda el estado de su proyecto, no el de otro');
  ok(!e({ action: 'saveState', proyecto_id: 'DATOS-pB', version: 1, json: '{}' }).ok, '4. no escribe los datos del cliente de otro');
  ok(e({ action: 'update', sheet: '01_PROYECTOS', id: 'pA', data: { etapa: 'contrato' } }).ok && !e({ action: 'update', sheet: '01_PROYECTOS', id: 'pB', data: {} }).ok, '4. actualiza su fila de 01_PROYECTOS, no la de otro');
  ok(e({ action: 'create', sheet: '13_CONTRATOS', data: { proyecto_id: 'pA' } }).ok && !e({ action: 'create', sheet: '13_CONTRATOS', data: { proyecto_id: 'pB' } }).ok, '4. crea su contrato, no el de otro');
  ok(e({ action: 'create', sheet: '14_FIRMAS', data: { contrato_id: 'C-1' } }).ok && !e({ action: 'create', sheet: '14_FIRMAS', data: { contrato_id: 'C-2' } }).ok, '4. firma su contrato, no el de otro');
  ok(!e({ action: 'create', sheet: '22_CONTACTOS', data: {} }).ok && !e({ action: 'delete', sheet: '01_PROYECTOS', id: 'pA' }).ok, '4. no crea contactos ni borra proyectos');
  ok(e({ action: 'notify', to: 'hola@spacioam.com', subject: 'Brief', body: 'x' }).ok && !e({ action: 'notify', to: 'alguien@ejemplo.com', subject: 'x', body: 'x' }).ok, '4. solo le escribe a hola@spacioam.com');
  ok(['importSheet', 'verDoc', 'diag'].every(a => !e({ action: a, id: 'x', fileId: 'x' }).ok), '4. importSheet, verDoc y diag son solo del equipo');
  ok(c.api({ action: 'importSheet', id: 'x', session: 'admin' }).ok && c.api({ action: 'verDoc', fileId: 'x', session: 'admin' }).ok, '3. el equipo sí usa importSheet y verDoc');
  ok(c.api({ action: 'notify', to: 'hola@spacioam.com', subject: 'Datos recibidos', body: 'x' }).ok, '4. el formulario público de datos del cliente sigue avisando a hola@ sin sesión');
}
{
  const cod = fs.readFileSync(path.join(DIR, 'Código.js'), 'utf8');
  ok(/alcTodo_\(__alc, apiGetAll/.test(cod) && /alcEstados_\(__alc, getStates/.test(cod) && /alcFilas_\(__alc, p\.sheet/.test(cod), '   getAll, getStates, list y get pasan por alcance.js');
}
process.exit(fallo);
