/* Prueba de los documentos del portal del propietario (apps-script/documentos.js) con dobles: sin Sheets, Drive, Gmail ni red.
   26-nov-2026: Grow marcó «Enviado» 3 documentos y el propietario no recibió ninguno (la lista vivía solo en un navegador
   y el portal no los mostraba). Lo que tiene que cumplirse siempre:
   1. El propietario ve SOLO los documentos de sus proyectos, y nunca el id ni el enlace de Drive.
   2. No abre un documento de otro proyecto; sin sesión, o con un permiso que no es de administración ni de propietario,
      no ve nada; el propietario no puede compartir, quitar ni avisar.
   3. No se comparte un archivo que no está en Drive.
   4. El aviso por correo sale solo si el propietario está vinculado y cada documento está en la nube; el destinatario lo
      elige el servidor (no el navegador). Si no sale, no se marca nada.
   5. La hoja 41_DOCUMENTOS no viaja en getAll.
   node .github/documentos-portal.js [carpeta apps-script] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = process.argv[2] || path.join(__dirname, '..', 'apps-script');
let fallo = 0; const ok = (c, m) => { if (c) console.log('✓ ' + m); else { console.log('::error::' + m); fallo = 1; } };
const ROBOT = 'llave-del-robot';

function hoja(nombre, filas) {
  const d = filas.map(r => r.slice());
  const sh = {
    getName: () => nombre,
    getLastRow: () => d.length,
    getDataRange: () => ({ getValues: () => d.map(r => r.slice()) }),
    getRange: (r, c, nr, nc) => ({
      getValues: () => d.slice(r - 1, r - 1 + (nr || 1)).map(x => { const o = x.slice(c - 1, c - 1 + (nc || 1)); while (o.length < (nc || 1)) o.push(''); return o; }),
      setValues: (v) => { v.forEach((row, i) => { const t = d[r - 1 + i] || (d[r - 1 + i] = []); row.forEach((x, j) => { t[c - 1 + j] = x; }); }); return sh; },
      setValue: (x) => { const t = d[r - 1] || (d[r - 1] = []); t[c - 1] = x; },
    }),
    appendRow: (row) => { d.push(row.slice()); },
    deleteRow: (i) => { d.splice(i - 1, 1); },
    setFrozenRows: () => {},
    _d: d,
  };
  return sh;
}

function caja(o) {
  o = o || {};
  const hojas = {}, correos = [], creados = [];
  const ss = {
    getSheetByName: n => hojas[n] || null,
    insertSheet: n => (hojas[n] = hoja(n, [])),
    getSheets: () => Object.values(hojas),
  };
  const DUENOS = [{ dueno_id: 'D-1', nombre: 'Propietaria Uno', email: 'uno@ejemplo.com' }, { dueno_id: 'D-2', nombre: 'Propietario Dos', email: 'dos@ejemplo.com' }];
  const PROY = [{ proyecto_id: 'pA', dueno_id: 'D-1' }, { proyecto_id: 'pB', dueno_id: '' }, { proyecto_id: 'pC', dueno_id: '' }];
  const ESTADOS = [{ proyecto_id: 'pA', json: JSON.stringify({ id: 'pA', duenoId: 'D-1' }) },
    { proyecto_id: 'pB', json: JSON.stringify({ id: 'pB', duenoId: 'D-2' }) },
    { proyecto_id: 'pC', json: JSON.stringify({ id: 'pC', duenoId: null, dueno: 'Sin vincular', email: 'sinvincular@ejemplo.com' }) }];
  const ctx = {
    console, JSON, Date, Math, String, Number, Object, Array, RegExp, Error,
    ss_: () => ss,
    readAll_: n => n === '02_DUENOS' ? DUENOS : n === '01_PROYECTOS' ? PROY : [],
    apiGet: (n, id) => PROY.filter(p => p.proyecto_id === id)[0] || null,
    getStates: (s, ids) => ({ estados: ESTADOS.filter(e => !ids || ids.indexOf(e.proyecto_id) >= 0) }),
    apiCreate: (n, data) => { creados.push({ n, data }); return { created: true }; },
    cacheDrop_: () => {},
    notify: (p) => { correos.push(p); return o.gmailFalla ? { sent: 0, error: 'cuota' } : { sent: 1, error: '' }; },
    esRobot_: (b) => String((b && b.robot) || '') === ROBOT,
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    DriveApp: { getFileById: id => ({ getBlob: () => ({ getBytes: () => [37, 80, 68, 70], getContentType: () => 'application/pdf' }) }) },
    Utilities: { base64Encode: b => Buffer.from(b).toString('base64') },
  };
  vm.createContext(ctx);
  ['alcance.js', 'documentos.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), ctx, { filename: f }));
  const api = (body, ses) => ctx.documentosApi_(body, ses || null);
  return { ctx, api, correos, creados, hojas };
}
const ADMIN = { email: 'admin@spacioam.com', apps: { grow: 'admin_principal' } };
const UNO = { email: 'uno@ejemplo.com', apps: { grow: 'dueno' } };
const DOS = { email: 'dos@ejemplo.com', apps: { grow: 'dueno' } };
const TECNICO = { email: 'tec@spacioam.com', apps: { grow: 'tecnico' } };
const PDF = { id: 'f1', nombre: 'Reglamento.pdf', mime: 'application/pdf', peso: '240 KB', fileId: 'DRIVE_ID_1' };

{
  const c = caja();
  let r = c.api({ action: 'docsCompartir', proyecto_id: 'pA', archivos: [PDF, { id: 'f2', nombre: 'Solo navegador.pdf', dataUrl: 'data:' }] }, ADMIN);
  ok(r.ok && r.compartidos.length === 1 && r.rechazados.length === 1 && r.rechazados[0].por === 'no está en Drive', '3. comparte lo que está en Drive y rechaza lo que vive solo en el navegador');
  c.api({ action: 'docsCompartir', proyecto_id: 'pB', archivos: [{ id: 'f9', nombre: 'Plano de otro.pdf', mime: 'application/pdf', fileId: 'DRIVE_ID_9' }] }, ADMIN);
  r = c.api({ action: 'docsCompartir', proyecto_id: 'pA', archivos: [PDF] }, ADMIN);
  ok(r.documentos.length === 1, '   compartir dos veces el mismo archivo no lo duplica');

  r = c.api({ action: 'misDocumentos' }, UNO);
  ok(r.ok && r.documentos.length === 1 && r.documentos[0].proyecto_id === 'pA' && r.machote === true, '1. la propietaria ve solo los documentos de su proyecto (y el contrato modelo)');
  ok(!JSON.stringify(r).includes('DRIVE_ID'), '1. nunca recibe el id ni el enlace de Drive');
  r = c.api({ action: 'misDocumentos' }, DOS);
  ok(r.documentos.length === 1 && r.documentos[0].proyecto_id === 'pB', '1. el otro propietario (vinculado solo en el estado del proyecto) ve solo el suyo');

  r = c.api({ action: 'verDocumento', doc_id: 'pB|f9' }, UNO);
  ok(r.ok === false && /no es de tus proyectos/.test(r.error), '2. no abre el documento de otro proyecto');
  r = c.api({ action: 'verDocumento', doc_id: 'pA|f1' }, UNO);
  ok(r.ok && r.b64 && r.mime === 'application/pdf', '2. abre el suyo (contenido, sin enlace)');
  ok(c.api({ action: 'misDocumentos' }, null).error === 'sin_sesion', '2. sin sesión no ve nada (y no responde «session», que recargaría la página)');
  ok(c.api({ action: 'docsProyecto', proyecto_id: 'pA' }, TECNICO).error === 'sin_sesion', '2. un permiso de técnico no ve documentos');
  ok(c.api({ action: 'docsCompartir', proyecto_id: 'pB', archivos: [PDF] }, UNO).ok === false, '2. la propietaria no puede compartir');
  ok(c.api({ action: 'docsAvisar', proyecto_id: 'pA', archivo_ids: ['f1'], html: 'x' }, UNO).ok === false && c.correos.length === 0, '2. la propietaria no puede mandar avisos');
  ok(c.api({ action: 'docsProyecto', proyecto_id: 'pA', robot: ROBOT }, null).ok, '   el robot del Hub sí puede consultar');

  r = c.api({ action: 'docsAvisar', proyecto_id: 'pC', archivo_ids: ['machote'], asunto: 'Documentos', html: '<p>x</p>', to: 'sinvincular@ejemplo.com' }, ADMIN);
  ok(r.ok === false && r.falta === 'acceso' && c.correos.length === 0, '4. propietario sin vincular: no sale el correo y dice qué falta');
  r = c.api({ action: 'docsAvisar', proyecto_id: 'pA', archivo_ids: ['f1', 'f7'], asunto: 'Documentos', html: '<p>x</p>' }, ADMIN);
  ok(r.ok === false && r.falta === 'nube' && r.faltan.join() === 'f7' && c.correos.length === 0, '4. documento que no está en la nube: no sale nada');
  r = c.api({ action: 'docsAvisar', proyecto_id: 'pA', archivo_ids: ['machote', 'f1'], asunto: 'Documentos de A', html: '<p>x</p>', to: 'otro@ejemplo.com' }, ADMIN);
  ok(r.ok && c.correos.length === 1 && c.correos[0].to === 'uno@ejemplo.com', '4. sale al correo del propietario vinculado, no al que mande el navegador');
  const filas = c.api({ action: 'docsProyecto', proyecto_id: 'pA' }, ADMIN).documentos;
  ok(filas.every(f => !!f.avisado_en) && filas.some(f => f.archivo_id === 'machote') && c.creados.some(x => x.n === '24_CORREOS' && x.data.estado === 'Enviado'), '4. y solo entonces queda marcado, el contrato modelo incluido (y en 24_CORREOS)');
  ok(c.api({ action: 'misDocumentos' }, UNO).documentos.every(d => d.proyecto_id === 'pA' && d.doc_id !== 'pA|machote'), '   la fila del contrato modelo no aparece como archivo en el portal');
  ok(c.api({ action: 'verDocumento', doc_id: 'pA|machote' }, UNO).ok === false, '   ni se abre como archivo de Drive');

  r = c.api({ action: 'docsQuitar', proyecto_id: 'pA', archivo_id: 'f1' }, ADMIN);
  ok(r.ok && r.quitado && c.api({ action: 'misDocumentos' }, UNO).documentos.length === 0, '   quitar lo deja de mostrar en el portal');
}
{
  const c = caja({ gmailFalla: true });
  c.api({ action: 'docsCompartir', proyecto_id: 'pA', archivos: [PDF] }, ADMIN);
  const r = c.api({ action: 'docsAvisar', proyecto_id: 'pA', archivo_ids: ['f1'], asunto: 'x', html: '<p>x</p>' }, ADMIN);
  ok(r.ok === false && r.falta === 'correo' && !c.api({ action: 'docsProyecto', proyecto_id: 'pA' }, ADMIN).documentos[0].avisado_en, '4. si Gmail no lo manda, no se marca nada');
}
{
  const cod = fs.readFileSync(path.join(DIR, 'Código.js'), 'utf8');
  ok(!/"41_DOCUMENTOS"\s*:/.test(cod), '5. 41_DOCUMENTOS no está en SCHEMA: no viaja en getAll ni se lee con list/get');
  ok(/documentosApi_\(p, __ses\)/.test(cod), '   el router pasa por documentosApi_ con la sesión');
}
process.exit(fallo);
