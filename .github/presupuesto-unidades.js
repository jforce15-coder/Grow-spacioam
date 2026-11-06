/* Prueba de «importar un presupuesto a varios apartamentos» y del PDF por presupuesto (ops «presupuesto_importar» y
   «presupuesto_pdf» de la secretaria, apps-script/secretaria.js) con dobles: sin Sheets, Drive ni red.
   6-nov-2026: Juan pidió el presupuesto de equipamiento de agosto de MONACO (hoja «Presupuesto edificio Mónaco Fase 2»,
   pestaña «Equipamiento apartamento monaco») como un presupuesto por apartamento para B5, A4, A1, B1, A3 y B3, y sus PDF.
   1. La hoja se lee como la lee la app: 4 categorías, 44 ítems, mobiliario Q18,256, fee 10 %, fotos Q500, sin diseño; y
      avisa que el subtotal de Baños de la hoja (Q2,040) no es la suma de sus ítems (Q2,110: falta el basurero).
   2. Importar en 6 apartamentos crea 6 presupuestos «Equipamiento <apto>» con alcance apto, Q20,581.63 cada uno, y no toca
      el «Presupuesto general» (alcance proyecto) ni cuál está activo. Guarda con la versión.
   3. Otra vez: no duplica (ya_existian) y no guarda nada.
   4. Si alguien guardó en medio (conflicto de versión), vuelve a leer y no pisa lo que se editó en la app.
   5. Un apartamento que no está en el proyecto no crea ninguno.
   6. PDF: uno por presupuesto (en la carpeta de su apartamento) y el consolidado de los 6; sin ids sale el activo, como antes.
   node .github/presupuesto-unidades.js [carpeta apps-script] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = process.argv[2] || path.join(__dirname, '..', 'apps-script');
let fallo = 0; const ok = (c, m) => { if (c) console.log('✓ ' + m); else { console.log('::error::' + m); fallo = 1; } };

/* La pestaña tal cual la exporta Sheets (valores como se ven), desde la fila de encabezados. */
const HOJA = `
DESCRIPCIÓN,Fase,Precio Unitario,Cantidad,Presupuesto,STATUS,Proveedor
Baños,,,,"Q2,040",,
Jaboneras,1,Q75,4,Q300,,
Planta decorativa pequeña,1,Q100,1,Q100,,
Toallas de cuerpo,1,Q65,4,Q260,,
Toallas de mano,1,Q45,2,Q90,,
Alfombra,1,Q80,2,Q160,,
Pintura y pintor,1,Q650,1,Q650,,
cortina,1,Q80,1,Q80,,
Espejo ,1,Q400,1,Q400,,
Basurero,1,Q70,1,Q70,,
Sala / Comedor,,,,"Q2,018",,
Cuadro decorativo mediano,1,Q500,1,Q500,,
decoración ,1,Q500,1,Q500,,
mueble de comedor,1,Q900,1,Q900,,
bandejas para cafe,1,Q118,1,Q118,,
Habitaciones,,,,"Q10,005",,
Planta decorativa con maceta grande,1,Q800,1,Q800,,
Decoración ,1,Q400,1,Q400,,
Cojines,1,Q150,2,Q300,,
Colchon,1,"Q2,400",1,"Q2,400",,
Sabanas ,1,Q120,2,Q240,,
cubrecama,1,Q350,2,Q700,,
lamparas,1,Q300,2,Q600,,
Almohadas,1,Q100,2,Q200,,
Protector de colchon,1,Q285,1,Q285,,
Arte,1,Q500,1,Q500,,
TV,1,"Q2,000",1,"Q2,000",,
luminaria,1,Q400,1,Q400,,
Cortina,1,Q500,1,Q500,,
Pie de cama,1,Q360,1,Q360,,
Planchador y plancha,1,Q320,1,Q320,,
Cocina,,,,"Q4,123",,
Trapos de cocina,1,Q35,1,Q35,,
Basurero ,1,Q100,1,Q100,,
estufa portatil,1,Q300,1,Q300,,
microondas,1,Q500,1,Q500,,
ecofiltro,1,Q500,1,Q500,,
Refrigerador,1,"Q1,500",1,"Q1,500",,
cuchillos,1,Q100,1,Q100,,
Cubiertos,1,Q100,1,Q100,,
Recipiente para cubiertos,1,Q50,1,Q50,,
Platos,1,Q300,1,Q300,,
Vasos,1,Q84,1,Q84,,
Salero y pimentero,1,Q45,1,Q45,,
Aceitero,1,Q100,1,Q100,,
Sartenes,1,Q200,1,Q200,,
Olla,1,Q59,1,Q59,,
Frenchpress,1,Q150,1,Q150,,
,,,,,,
,,,,,,
,,,PRESUPUESTO POR APARTAMENTO,,,
,,,RESUMEN,,,
,,,DISEÑO INTERIORES,Q0,,
,,,MOBILIARIO,"Q18,256",,
,,,FOTOS PRO,Q500,,
,,,FEE MOBILIARIO,"Q1,826",,
,,,,,,
,,,TOTAL,"Q20,582",,
,,,APTOS PENDIENTES,Q16,,
,,,GRAN TOTAL,"Q329,306",,`.trim().split('\n').map(l => { const o = []; let c = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(c); c = ''; } else c += ch; } o.push(c); return [''].concat(o); });
const ROWS = [['', '', '', 'Listado de artículos', '', '', '', ''], ['', '', '', '', '', '', '', '']].concat(HOJA);

const PID = 'p1788381685478', SEIS = ['B5', 'A4', 'A1', 'B1', 'A3', 'B3'];
const GENERAL = { id: 'pr1-gen', nombre: 'Presupuesto general', alcance: 'proyecto', apto: '', estado: 'borrador', confirmado: true, cobraMobiliario: true, feePct: 10,
  cobraDiseno: false, fotosProUsd: 0, items: [{ cat: 'Ductos de servicio', item: 'Pérgola para los ductos de servicio', precio: 9000, cant: 1 }] };
const monaco = () => ({ id: PID, nombre: 'MONACO', edificio: 'MONACO', apto: null, hab: 1, etapa: 'ejecucion', esEdificio: true, numUnidades: 30,
  fases: [{ nombre: 'Fase 1', cerrada: false, unidades: 14, presupuestos: [] }, { nombre: 'Fase 2', cerrada: false, unidades: 16, presupuestos: [] }],
  unidades: ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2'].map((a, i) => ({ id: 'U' + i, apto: a, fase: 'Fase 2', etapa: 'ejecucion' })),
  presupuesto: JSON.parse(JSON.stringify(GENERAL)) });   // como hoy: un solo presupuesto, sin la lista `presupuestos`

function caja(o) {
  o = o || {};
  const est = { v: 819, json: JSON.stringify(o.json || monaco()) }, guardados = [], subidos = [], abiertas = [];
  const ctx = {
    console, JSON, Date, Math, String, Number, Object, Array, RegExp, Error,
    readAll_: n => (n === '01_PROYECTOS' ? [{ proyecto_id: PID, nombre: 'MONACO', edificio: 'MONACO', etapa: 'ejecucion' }] : []),
    getStates: () => ({ estados: [{ proyecto_id: PID, version: est.v, json: est.json }] }),
    saveState: (pid, v, json, por) => {
      if (o.otroGuarda) { const j = JSON.parse(est.json); j.notaAlma = 'lo escribió Flor en la app'; est.json = JSON.stringify(j); est.v++; o.otroGuarda = false; }
      if (v !== est.v) return { conflict: true, version: est.v };
      est.v++; est.json = json; guardados.push({ pid, v, por }); return { saved: true, version: est.v };
    },
    cacheDrop_: () => {},
    uploadFile: (b64, nombre, mime, carpeta) => { subidos.push({ nombre, carpeta, html: Buffer.from(b64, 'base64').toString('utf8') }); return { verUrl: 'https://drive.google.com/file/d/ID' + subidos.length + '/view', fileId: 'ID' + subidos.length, compartido: true }; },
    SpreadsheetApp: { openById: id => { abiertas.push(id); return { getName: () => 'Presupuesto edificio Mónaco Fase 2', getSheets: () => [
      { getName: () => 'Facturas Y gastos Apto ', getDataRange: () => ({ getDisplayValues: () => [['', 'Fecha', 'Factura', 'Monto', 'Descripción']] }) },
      { getName: () => 'Equipamiento apartamento monaco', getDataRange: () => ({ getDisplayValues: () => ROWS }) }] }; } },
    DriveApp: { getFilesByName: () => ({ hasNext: () => true, next: () => ({ getId: () => '1CToxHOJAxxxxxxxxxxxxxxxxxxxxxxxx' }) }) },
    /* El «PDF» del doble es el mismo HTML: así se revisa qué lleva. */
    Utilities: { base64Encode: b => Buffer.from(typeof b === 'string' ? b : Buffer.from(b)).toString('base64'), formatDate: () => '2026-11-06',
      newBlob: (html) => { const bl = { getAs: () => bl, setName: () => bl, getBytes: () => Array.from(Buffer.from(html)) }; return bl; },
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, computeDigest: (alg, t) => Array.from(require('crypto').createHash(alg).update(t).digest()) },
    ContentService: { createTextOutput: t => ({ setMimeType: () => t }), MimeType: { JSON: 'json' } }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(DIR, 'secretaria.js'), 'utf8'), ctx, { filename: 'secretaria.js' });
  return { ctx, est, guardados, subidos, abiertas, J: () => JSON.parse(est.json), R: (f, ...a) => ctx[f](...a) };
}
const err = f => { try { f(); return ''; } catch (e) { return String(e.message); } };
const IMPORTAR = { proyecto_id: 'Mónaco', aptos: 'B5, A4, A1, B1, A3 y B3', hoja: 'https://docs.google.com/spreadsheets/d/1CToxHOJAxxxxxxxxxxxxxxxxxxxxxxxx/edit', pestana: 'Equipamiento apartamento monaco', por: 'Juan' };

/* ── 1. La hoja ── */
{
  const c = caja(), ps = c.R('secPresParse_', ROWS), cat = {};
  ps.cats.forEach(x => { cat[x.cat] = x.total; });
  ok(ps.items.length === 44 && cat['Baños'] === 2110 && cat['Sala / Comedor'] === 2018 && cat.Habitaciones === 10005 && cat.Cocina === 4123,
    'la hoja: 44 ítems; Baños 2,110 · Sala / Comedor 2,018 · Habitaciones 10,005 · Cocina 4,123 (' + JSON.stringify(cat) + ')');
  ok(ps.mob === 18256 && ps.feePct === 10 && ps.resumen.fotos === 500 && ps.resumen.diseno === 0 && ps.resumen.total === 20582, 'resumen: mobiliario 18,256, fee 10 %, fotos 500, sin diseño, total 20,582 (no el gran total)');
  ok(ps.avisos.length === 1 && /Baños: la hoja dice Q 2,040 y sus ítems suman Q 2,110/.test(ps.avisos[0]), 'avisa el subtotal de Baños de la hoja: «' + ps.avisos[0] + '»');
  ok(ps.items.some(it => it.item === 'Cortina' && it.cat === 'Baños' && it.precio === 80) && ps.items.some(it => it.item === 'Mueble de comedor' && it.precio === 900), 'los nombres entran con mayúscula, como en la app');
}
/* ── 2 y 3. Importar en 6 apartamentos y otra vez ── */
{
  const c = caja(), r = c.R('secPresupuestoImportar_', IMPORTAR), j = c.J();
  ok(r.ok && r.creados.length === 6 && r.ya_existian.length === 0 && r.creados.map(x => x.apto).join() === SEIS.join(), '6 presupuestos nuevos, uno por apartamento (' + r.creados.map(x => x.nombre).join(', ') + ')');
  ok(c.guardados.length === 1 && c.guardados[0].v === 819 && c.est.v === 820 && /^ALMA · Juan/.test(c.guardados[0].por), 'se guarda una vez, con la versión que leyó (819 → 820)');
  const lista = j.presupuestos || [];
  ok(lista.length === 7 && JSON.stringify(lista[0]) === JSON.stringify(Object.assign({}, GENERAL)) && j.presIdx === 0 && j.presupuesto.id === 'pr1-gen', 'el «Presupuesto general» queda igual y sigue activo');
  const b5 = lista.find(x => x.nombre === 'Equipamiento B5'), cu = c.R('secPresCuentas_', j, b5);
  ok(b5 && b5.alcance === 'apto' && b5.apto === 'B5' && b5.estado === 'borrador' && b5.items.length === 44 && b5.feePct === 10 && b5.cobraDiseno === false && b5.fotosProUsd === 64.52,
    'cada uno: alcance apto, borrador, 44 ítems, fee 10 %, sin diseño, fotos $64.52');
  ok(Math.abs(cu.mob - 18256) < 0.01 && Math.abs(cu.fee - 1825.6) < 0.01 && Math.abs(cu.fotos - 500.03) < 0.01 && Math.abs(cu.total - 20581.63) < 0.01 && r.por_apto === 'Q 20,582',
    'cuentas de la app: 18,256 + 1,825.60 + 500.03 = 20,581.63 (' + cu.total + ')');
  ok(r.total_creados === 'Q 123,490' && r.presupuesto_ids.length === 6 && /Baños/.test(r.avisos.join(' ')), 'los 6: Q 123,490 (123,489.78) y vuelve el aviso de Baños');
  ok(c.abiertas[0] === '1CToxHOJAxxxxxxxxxxxxxxxxxxxxxxxx', 'la hoja se abre por el id de su enlace');
  const r2 = c.R('secPresupuestoImportar_', IMPORTAR);
  ok(r2.ok && r2.creados.length === 0 && r2.ya_existian.length === 6 && c.guardados.length === 1 && (c.J().presupuestos || []).length === 7, 'otra vez: no duplica nada y no guarda (ya_existian 6)');
  const r3 = c.R('secPresupuestoImportar_', Object.assign({}, IMPORTAR, { aptos: 'b5, C1' }));
  ok(r3.creados.length === 1 && r3.creados[0].nombre === 'Equipamiento C1' && r3.ya_existian.length === 1, 'con uno nuevo y uno que ya estaba («b5»): crea solo C1');
}
/* ── 4. Alguien guardó en medio ── */
{
  const c = caja({ otroGuarda: true }), r = c.R('secPresupuestoImportar_', IMPORTAR), j = c.J();
  ok(r.ok && r.creados.length === 6 && j.notaAlma === 'lo escribió Flor en la app' && j.presupuestos.length === 7 && c.est.v === 821, 'con conflicto de versión vuelve a leer: queda lo de la app y los 6');
}
/* ── 5. Un apartamento que no existe ── */
{
  const c = caja(), e = err(() => c.R('secPresupuestoImportar_', Object.assign({}, IMPORTAR, { aptos: 'B5, B55' })));
  ok(/no están los apartamentos B55/.test(e) && c.guardados.length === 0, 'un apartamento que no está (B55) no crea ninguno: «' + e.slice(0, 80) + '…»');
  ok(/aptos/.test(err(() => c.R('secPresupuestoImportar_', { proyecto_id: PID, hoja: 'x' }))), 'sin aptos lo pide');
  const cp = c.R('secPresupuestoImportar_', { proyecto_id: PID, aptos: 'C2', desde: 'Presupuesto general', nombre: 'Pérgola' });
  ok(cp.creados[0].nombre === 'Pérgola C2' && c.J().presupuestos.find(x => x.nombre === 'Pérgola C2').items[0].precio === 9000, 'desde: copia otro presupuesto del proyecto');
}
/* ── 6. PDF ── */
{
  const c = caja(); c.R('secPresupuestoImportar_', IMPORTAR); const ids = c.J().presupuestos.slice(1).map(x => x.id);
  const r = c.R('secPresupuestoPdf_', { proyecto_id: PID, presupuesto_ids: ids, consolidado: true });
  ok(r.ok && r.pdfs.length === 6 && r.pdfs.every(p => p.pdf_b64 && p.url && p.file_id && p.total === 'Q 20,582'), '6 PDF, cada uno con su enlace, su id de Drive y Q 20,582');
  ok(r.pdfs[0].nombre === 'Presupuesto MONACO Equipamiento B5 2026-11-06.pdf' && c.subidos[0].carpeta === 'Propiedades/MONACO/B5/03 Presupuesto', 'el de B5 se llama por su presupuesto y va a la carpeta de B5');
  ok(/MONACO · Apto B5/.test(c.subidos[0].html) && /Subtotal Baños[\s\S]*Q 2,110/.test(c.subidos[0].html) && /Q 20,582/.test(c.subidos[0].html), 'el PDF de B5 dice «MONACO · Apto B5», Baños Q 2,110 y el total');
  const k = r.consolidado, html = c.subidos[6].html;
  ok(k && k.total === 'Q 123,490' && k.fase === 'Fase 2' && k.aptos.join() === SEIS.join() && /Apto A4/.test(html) && /Total de los 6/.test(html) && /Q 109,536/.test(html),
    'consolidado de la Fase 2: un renglón por apartamento, mobiliario Q 109,536 y total Q 123,490');
  const s = c.R('secPresupuestoPdf_', { proyecto_id: PID, aptos: 'A1', whatsapp: false });
  ok(s.pdfs.length === 1 && s.pdfs[0].apto === 'A1' && !s.consolidado, 'por apartamento (aptos A1): su PDF');
  const d = c.R('secPresupuestoPdf_', { proyecto_id: PID });
  ok(d.ok && !d.pdfs && d.presupuesto === 'Presupuesto general' && d.total === 'Q 9,900' && d.url && d.pdf_b64, 'sin ids: el activo (Presupuesto general, Q 9,900), con la misma respuesta de antes');
  ok(/No encuentro|no encuentro/.test(err(() => c.R('secPresupuestoPdf_', { proyecto_id: PID, aptos: 'D9' }))), 'un apartamento sin presupuesto lo dice');
  const api = JSON.parse(c.R('secretariaApi_', { action: '__secretaria', token: 'x', op: 'presupuesto_importar', proyecto_id: PID, aptos: 'B5' }));
  ok(api.ok === false && api.error === 'token', 'la puerta sigue pidiendo el token');
}
process.exit(fallo);
