/* Prueba con dobles: el formulario «datos del cliente» pasa sin sesión solo con la llave del enlace (datosClientePasa_ en
   apps-script/Código.js). 10-nov-2026 · Amalfi 808 no tenía la llave guardada: la del primer envío queda como la del
   proyecto (proyectos de los últimos 30 días y sin datos recibidos).
   node .github/datos-llave.js [carpeta apps-script] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = process.argv[2] || path.join(__dirname, '..', 'apps-script');
let fallo = 0; const ok = (c, m) => { if (c) console.log('✓ ' + m); else { console.log('::error::' + m); fallo = 1; } };
const hoy = new Date().toISOString().slice(0, 10), viejo = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);

function caja(filas) {
  const est = {}; Object.keys(filas).forEach(id => { est[id] = { v: 1, json: JSON.stringify(filas[id]) }; });
  const guardados = [];
  const ctx = { console, JSON, Date, Math, String, Number, Object, Array, RegExp, Error,
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    Session: { getScriptTimeZone: () => 'America/Guatemala' }, CacheService: { getScriptCache: () => ({ remove() {}, get() { return null; }, put() {} }) },
    SpreadsheetApp: {}, LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(DIR, 'Código.js'), 'utf8'), ctx, { filename: 'Código.js' });
  ctx.getStates = (since, ids) => ({ estados: (ids || []).filter(id => est[id]).map(id => ({ proyecto_id: id, version: est[id].v, actualizado: hoy + 'T10:00:00Z', json: est[id].json })) });
  ctx.saveState = (id, v, json, por) => { if (!est[id]) { est[id] = { v: 1, json }; return { saved: true, version: 1 }; } if (+v !== est[id].v) return { conflict: true, version: est[id].v }; est[id] = { v: est[id].v + 1, json }; guardados.push({ id, por }); return { saved: true, version: est[id].v }; };
  ctx.cacheDrop_ = () => {};
  const pasa = (pid, k) => ctx.datosClientePasa_({ action: 'saveState', proyecto_id: 'DATOS-' + pid, json: JSON.stringify({ k, datos: { nombre: 'X' } }) });
  return { ctx, est, guardados, pasa, J: id => JSON.parse(est[id].json) };
}

{ const c = caja({ p1: { nombre: 'Monterrico', creado: viejo, datosToken: 'acqik7qpi55z' } });
  ok(c.pasa('p1', 'acqik7qpi55z') === true, 'con llave guardada: pasa la correcta');
  ok(c.pasa('p1', 'otrallave123') === false, 'con llave guardada: otra llave no pasa'); }
{ const c = caja({ p808: { nombre: 'Amalfi 808', creado: hoy } });
  ok(c.pasa('p808', 'llaveprimera1') === true && c.J('p808').datosToken === 'llaveprimera1' && c.guardados.length === 1, 'Amalfi 808 sin llave: el primer envío pasa y su llave queda guardada en el proyecto');
  ok(c.J('p808').nombre === 'Amalfi 808', 'el resto del proyecto no cambia');
  ok(c.pasa('p808', 'llaveprimera1') === true && c.guardados.length === 1, 'el mismo enlace sigue sirviendo (sin volver a guardar)');
  ok(c.pasa('p808', 'otrallave999') === false, 'otra llave ya no pasa'); }
{ const c = caja({ pv: { nombre: 'Viejo', creado: viejo } });
  ok(c.pasa('pv', 'llaveprimera1') === false && !c.J('pv').datosToken, 'proyecto de hace 60 días sin llave: no se adopta'); }
{ const c = caja({ pd: { nombre: 'Con datos', creado: hoy }, 'DATOS-pd': { k: 'x', datos: {} } });
  ok(c.pasa('pd', 'llaveprimera1') === false, 'si ya hay datos recibidos: no se adopta'); }
{ const c = caja({ pr: { nombre: 'Raro', creado: hoy } });
  ok(c.pasa('pr', 'a b<script>') === false && c.pasa('pr', '') === false, 'una llave con forma rara o vacía no pasa'); }
{ const c = caja({ p808: { nombre: 'Amalfi 808', creado: hoy } });
  ok(c.ctx.datosClientePasa_({ action: 'saveState', proyecto_id: 'p808', json: JSON.stringify({ k: 'llaveprimera1' }) }) === false, 'sin el prefijo DATOS- no pasa (no toca el proyecto)'); }
process.exit(fallo);
