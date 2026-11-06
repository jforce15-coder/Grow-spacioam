/* Prueba de las fotos de la visita (op «fotos» de la secretaria, apps-script/secretaria.js) con dobles: sin Sheets ni Drive.
   5-nov-2026: Juan le pidió a Alma mirar las fotos de la visita de Mónaco y Alma dijo «la hoja no existe»: 30_FOTOS está en el
   esquema pero no en la hoja de cálculo, y readAll_ tiraba el error antes de mirar el JSON, donde estaban las 272 fotos.
   1. Sin la hoja 30_FOTOS, las fotos salen del JSON (fotosZona y fotos de mantenimiento de cada unidad), de a 6 y en base64.
   2. En un edificio, aptos trae una línea por apartamento visitado: fotos, qué le falta por categoría y sus problemas.
   3. Con la hoja, sus filas se suman sin repetir la misma foto.
   4. El proyecto se encuentra por su id o por su nombre sin tildes («Mónaco» → MONACO); con apto, solo ese apartamento.
   node .github/fotos-visita.js [carpeta apps-script] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = process.argv[2] || path.join(__dirname, '..', 'apps-script');
let fallo = 0; const ok = (c, m) => { if (c) console.log('✓ ' + m); else { console.log('::error::' + m); fallo = 1; } };

const PID = 'p1788381685478', foto = id => 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600';
const fz = (apto, zonas) => { const o = {}; Object.keys(zonas).forEach(z => { o[z] = Array.from({ length: zonas[z] }, (_, i) => foto('F' + apto + z.replace(/\W/g, '') + i + 'xxxxxxxxxx')); }); return o; };
const cats = (o) => Object.assign({ 'Línea blanca': { estado: 'completo', faltan: {} }, 'Ropa de cama': { estado: 'completo', faltan: {} } }, o || {});
const MONACO = { id: PID, nombre: 'MONACO', edificio: 'MONACO', apto: null, etapa: 'ejecucion', esEdificio: true, fotos: [],
  visita: { fecha: '2026-09-11 15:38', asignadoA: 'Flor Samayoa', completa: false },
  unidades: [
    { id: 'U1', apto: 'A1', etapa: 'ejecucion', visitaData: { equipado: 'Solo detalles', cats: {}, mant: [], fotosZona: {}, fotosLibres: [], fecha: '' } },
    { id: 'U2', apto: 'A5', etapa: 'ejecucion', visitaData: { equipado: 'Solo detalles', detalles: 'Todo', fecha: '2026-09-12', fotosZona: fz('A5', { Sala: 3, Cocina: 3 }), fotosLibres: [],
      cats: cats({ 'Línea blanca': { estado: 'nada', faltan: {} } }), mant: [{ titulo: 'Humedad', comentario: '', fotos: [foto('MA5h1xxxxxxxxxx'), foto('MA5h2xxxxxxxxxx')] }] } },
    { id: 'U3', apto: 'D2', etapa: 'ejecucion', visitaData: { equipado: 'Solo detalles', detalles: 'Cosas de la cocina ', fecha: '2026-09-12', fotosZona: fz('D2', { Sala: 3, Cocina: 3, 'Baños': 2 }), fotosLibres: [],
      cats: cats({ 'Línea blanca': { estado: 'falta', faltan: { Microondas: true, Estufa: true, Refri: false } } }), mant: [] } },
    { id: 'U4', apto: 'C2', etapa: 'visita', visitaData: { equipado: 'Equipado completo', fecha: '', fotosZona: fz('C2', { Sala: 1 }), fotosLibres: [], cats: cats(), mant: [] } }
  ] };
const TOTAL = 6 + 2 + 8 + 1;   // A5 (6 por zona + 2 de humedad), D2 (8), C2 (1)

function caja(o) {
  o = o || {};
  const tabs = { '01_PROYECTOS': [{ proyecto_id: PID, nombre: 'MONACO', edificio: 'MONACO', etapa: 'visita' }], '02_DUENOS': [], '05_VISITAS': [] };
  if (o.hojaFotos) tabs['30_FOTOS'] = o.hojaFotos;
  const leidos = [];
  const ctx = {
    console, JSON, Date, Math, String, Number, Object, Array, RegExp,
    readAll_: n => { if (!tabs[n]) throw new Error('No existe la hoja: ' + n + '. Corre setup().'); return tabs[n]; },   // como Código.js
    ss_: () => ({ getSheetByName: n => (tabs[n] ? {} : null) }),
    getStates: () => ({ estados: [{ proyecto_id: PID, version: 819, json: JSON.stringify(MONACO) }] }),
    DriveApp: { getFileById: id => { leidos.push(id); return { getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => [255, 216, 255] }) }; } },
    Utilities: { base64Encode: b => Buffer.from(b).toString('base64'), formatDate: d => new Date(d).toISOString().slice(0, 10),
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, computeDigest: (alg, t) => Array.from(require('crypto').createHash(alg).update(t).digest()) },
    ContentService: { createTextOutput: t => ({ setMimeType: () => t }), MimeType: { JSON: 'json' } }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(DIR, 'secretaria.js'), 'utf8'), ctx, { filename: 'secretaria.js' });
  return { ctx, leidos, R: (f, ...a) => ctx[f](...a) };
}

/* ── 1 y 2. Sin la hoja 30_FOTOS ── */
{
  const c = caja(), r = c.R('secFotos_', { proyecto_id: PID });
  ok(r.ok && r.total === TOTAL && r.fotos.length === 6 && r.siguen === TOTAL - 6, 'sin la hoja 30_FOTOS: las ' + TOTAL + ' fotos salen del JSON, de a 6 (total ' + r.total + ')');
  ok(r.fotos.every(f => /^data:image\/jpeg;base64,/.test(f.data) && f.apto && f.zona), 'cada foto va en base64 con su apartamento y su zona');
  ok(c.leidos[0] === 'FA5Sala0xxxxxxxxxx', 'el id de Drive sale del enlace thumbnail?id=');
  ok(r.problemas.some(p => /Apto A5 · Humedad/.test(p)) && r.zonas['Mantenimiento · Humedad'] === 2, 'los problemas de mantenimiento y sus fotos, por apartamento');
  const a = {}; (r.aptos || []).forEach(x => { a[x.split(' · ')[0]] = x; });
  ok(r.aptos && !a.A1 && a.A5 && a.D2 && a.C2, 'aptos: una línea por apartamento visitado (sin los que no tienen visita)');
  ok(a.D2 === 'D2 · 8 fotos · falta Línea blanca: Microondas, Estufa · nota: Cosas de la cocina', 'aptos: D2 dice qué le falta, sin lo que ya tiene («' + a.D2 + '»)');
  ok(/falta Línea blanca: sin nada · PROBLEMAS: Humedad \(2 fotos\)/.test(a.A5) && a.C2 === 'C2 · 1 fotos · completo', 'aptos: A5 con humedad y C2 completo');
  ok(!c.R('secFotos_', { proyecto_id: PID, desde: 6 }).aptos, 'aptos solo en la primera página');
  const api = JSON.parse(c.R('secretariaApi_', { action: '__secretaria', token: 'x', op: 'fotos', proyecto_id: PID }));
  ok(api.ok === false && api.error === 'token', 'la puerta sigue pidiendo el token');
}
/* ── 3. Con la hoja ── */
{
  const c = caja({ hojaFotos: [{ foto_id: 'FT-1', proyecto_id: PID, apartamento: 'D2', zona: 'Sala', url: foto('FD2Sala0xxxxxxxxxx'), file_id: 'FD2Sala0xxxxxxxxxx' },
    { foto_id: 'FT-2', proyecto_id: PID, apartamento: 'B5', zona: 'Cocina', url: foto('NUEVAB5xxxxxxxxxx'), file_id: '' }, { foto_id: 'FT-3', proyecto_id: 'otro', file_id: 'OTROxxxxxxxxxx' }] });
  const r = c.R('secFotos_', { proyecto_id: PID, max: 1 });
  ok(r.ok && r.total === TOTAL + 1, 'con la hoja: sus filas se suman sin repetir la misma foto ni traer las de otro proyecto (total ' + r.total + ')');
}
/* ── 4. Por nombre y por apartamento ── */
{
  const c = caja(), r = c.R('secFotos_', { proyecto_id: 'Mónaco', apto: 'd2' });
  ok(r.ok && r.id === PID && r.encontradas === 8 && r.fotos.every(f => f.apto === 'D2') && !r.aptos, '«Mónaco» encuentra MONACO; con apto d2 solo sus fotos');
  let e = ''; try { c.R('secFotos_', { proyecto_id: 'Amalfi' }); } catch (x) { e = String(x.message); }
  ok(/No existe el proyecto Amalfi/.test(e), 'un nombre que no existe sigue diciendo que no existe');
}
process.exit(fallo);
