/* Prueba con dobles de los enlaces cortos (Hub #488 · T1): ops «acortar» y «enlace» de apps-script/enlaces.js, pasando
   por route() de Código.js y por la sesión de sesion.js, sin Sheets ni red.
   1. Acortar dos veces el mismo enlace da el mismo código; el código tiene 5 caracteres del alfabeto sin 0/o ni 1/l/i.
   2. Si el código sorteado ya existe, se sortea otro.
   3. «enlace» con un código válido devuelve solo el enlace y suma un clic; uno raro o que no existe da error y nada más.
   4. «acortar» sin sesión se rechaza (también con SESION_EXIGIR = 1); «enlace» sin sesión pasa.
   5. Un enlace de otro dominio no se acorta.
   node .github/enlaces.js [carpeta apps-script] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = process.argv[2] || path.join(__dirname, '..', 'apps-script');
let fallo = 0; const ok = (c, m) => { if (c) console.log('✓ ' + m); else { console.log('::error::' + m); fallo = 1; } };
const LARGO = 'https://grow.spacioam.com/?datos=p123&k=abcd1234efgh&c=eyJwIjoiUHJ1ZWJhIn0';
const ABC = /^[23456789abcdefghjkmnpqrstuvwxyz]{5}$/;

/* Una hoja de cálculo de mentira: filas en memoria, con lo que usan Código.js y enlaces.js. */
function hojaFalsa(nombre, filas) {
  const sh = { nombre, filas, formatos: [],
    getDataRange: () => ({ getValues: () => sh.filas.map(f => f.slice()) }),
    getLastRow: () => sh.filas.length,
    setFrozenRows() {},
    getRange(r, c, nr, nc) {
      nr = nr || 1; nc = nc || 1;
      const rango = {
        setValues(vals) { vals.forEach((fila, i) => { while (sh.filas.length < r + i) sh.filas.push([]); fila.forEach((v, j) => { sh.filas[r + i - 1][c + j - 1] = v; }); }); return rango; },
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => ((sh.filas[r + i - 1] || [])[c + j - 1]) ?? '')),
        setNumberFormat(f) { sh.formatos.push([r, c, f]); return rango; },
        setFontWeight() { return rango; }, setBackground() { return rango; }, setFontColor() { return rango; }
      };
      return rango;
    } };
  return sh;
}

function caja(o) {
  o = o || {};
  const hojas = {};
  if (o.filas) hojas['40_ENLACES'] = hojaFalsa('40_ENLACES', o.filas);
  const props = { SESION_EXIGIR: o.exigir ? '1' : null };
  const azar = (o.azar || []).slice();
  const M = Object.create(Math); M.random = () => (azar.length ? azar.shift() : Math.random());
  const out = s => ({ s, setMimeType() { return this; }, getContent() { return s; } });
  const ctx = { console, JSON, Date, Math: M, String, Number, Object, Array, RegExp, Error, Buffer,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty() {} }) },
    Session: { getScriptTimeZone: () => 'America/Guatemala' },
    CacheService: { getScriptCache: () => ({ remove() {}, get() { return null; }, put() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }),
                   getUserLock: () => ({ hasLock: () => false, tryLock: () => true, releaseLock() {} }) },
    ContentService: { createTextOutput: out, MimeType: { JSON: 'json', TEXT: 'text' } },
    Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, t) => Array.from(require('crypto').createHash(alg).update(String(t)).digest()),
      base64EncodeWebSafe: b => Buffer.from(b).toString('base64url'), formatDate: d => new Date(d).toISOString().slice(0, 10) },
    SpreadsheetApp: {} };
  vm.createContext(ctx);
  ['Código.js', 'sesion.js', 'enlaces.js'].forEach(f => {
    if (fs.existsSync(path.join(DIR, f))) vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), ctx, { filename: f });
  });
  // Lo que no es de esta prueba: los diagnósticos de otros archivos y la red del login.
  ctx.cupoDiag_ = ctx.duenosDiag_ = ctx.secretariaApi_ = () => null;
  ctx.uf_ = () => { throw new Error('la prueba no sale a internet'); };
  ctx.sesionDe_ = b => (b && b.session === 'firmada' ? { email: 'equipo@ejemplo.com', nombre: 'Equipo' } : null);
  ctx.ss_ = () => ({ getSheetByName: n => hojas[n] || null,
    insertSheet: n => (hojas[n] = hojaFalsa(n, [])) });
  const api = body => JSON.parse(ctx.route({ postData: { contents: JSON.stringify(body) } }).getContent());
  return { ctx, hojas, api, filas: () => (hojas['40_ENLACES'] ? hojas['40_ENLACES'].filas : null) };
}
const SES = 'firmada';

{ const c = caja();
  const r1 = c.api({ action: 'acortar', url: LARGO, session: SES });
  const r2 = c.api({ action: 'acortar', url: LARGO, session: SES });
  ok(r1.ok && r2.ok && r1.data.codigo === r2.data.codigo, 'acortar dos veces el mismo enlace da el mismo código (' + (r1.data && r1.data.codigo) + ')');
  ok(c.filas() && c.filas().length === 2, 'la hoja 40_ENLACES se crea sola: encabezado y una sola fila');
  ok(JSON.stringify(c.filas()[0]) === JSON.stringify(['codigo', 'url', 'app', 'creado', 'por', 'clics', 'ultimo']), 'encabezados: codigo · url · app · creado · por · clics · ultimo');
  ok(ABC.test(r1.data.codigo), 'el código tiene 5 caracteres sin 0/o ni 1/l/i');
  ok(r1.data.corto === 'https://grow.spacioam.com/' + r1.data.codigo, 'devuelve también el enlace corto completo');
  const f = c.filas()[1];
  ok(f[1] === LARGO && f[2] === 'grow' && f[4] === 'equipo@ejemplo.com' && f[5] === 0, 'la fila guarda el enlace, la app, quién y 0 clics');
  ok(c.hojas['40_ENLACES'].formatos.some(x => x[0] === 2 && x[1] === 1 && x[2] === '@'), 'la celda del código va como texto (no se vuelve número)');
  const otro = c.api({ action: 'acortar', url: LARGO + 'x', session: SES });
  ok(otro.ok && otro.data.codigo !== r1.data.codigo, 'otro enlace da otro código');
  // Muchos códigos: todos con el formato y sin repetirse.
  const vistos = new Set([r1.data.codigo, otro.data.codigo]); let bien = true;
  for (let i = 0; i < 200; i++) { const r = c.api({ action: 'acortar', url: LARGO + 'n' + i, session: SES }); if (!r.ok || !ABC.test(r.data.codigo) || vistos.has(r.data.codigo)) bien = false; vistos.add(r.data.codigo); }
  ok(bien, '200 enlaces más: todos con el formato y sin repetir código'); }

{ // El azar da primero «22222» (ya existe) y después «33333».
  const i2 = '23456789abcdefghjkmnpqrstuvwxyz'.indexOf('2') / 31 + 0.001, i3 = '23456789abcdefghjkmnpqrstuvwxyz'.indexOf('3') / 31 + 0.001;
  const c = caja({ filas: [['codigo', 'url', 'app', 'creado', 'por', 'clics', 'ultimo'], ['22222', 'https://grow.spacioam.com/?datos=otro', 'grow', '', '', 0, '']],
    azar: [i2, i2, i2, i2, i2, i3, i3, i3, i3, i3] });
  const r = c.api({ action: 'acortar', url: LARGO, session: SES });
  ok(r.ok && r.data.codigo === '33333' && c.filas().length === 3, 'si el código choca con uno que ya existe, se sortea otro');
  // Una celda que Sheets guardó como número (22222) igual se reconoce.
  c.filas()[1][0] = 22222;
  const a = c.api({ action: 'enlace', codigo: '22222' });
  ok(a.ok && a.data.url === 'https://grow.spacioam.com/?datos=otro', 'un código que la hoja guardó como número igual se abre'); }

{ const c = caja({ filas: [['codigo', 'url', 'app', 'creado', 'por', 'clics', 'ultimo'], ['k7q2m', LARGO, 'grow', '2026-11-12', 'equipo', 3, ''],
    ['zzzzz', 'https://evil.example.com/robo', 'grow', '', '', 0, '']] });
  const r = c.api({ action: 'enlace', codigo: 'k7q2m' });
  ok(r.ok && r.data.url === LARGO && Object.keys(r.data).join() === 'url', '«enlace» con un código válido devuelve solo el enlace');
  ok(c.filas()[1][5] === 4 && c.filas()[1][6], 'y suma un clic y apunta la hora (ultimo)');
  const may = c.api({ action: 'enlace', codigo: 'K7Q2M' });
  ok(may.ok && may.data.url === LARGO && c.filas()[1][5] === 5, 'el código sirve en mayúsculas también');
  const malos = ['k7q2', 'k7q2m1', 'k7q0m', 'k7qlm', 'k7q m', "' or 1", '', null, 'k7q2m/../x'].map(x => c.api({ action: 'enlace', codigo: x }));
  ok(malos.every(x => x.ok === false && !x.data), 'un código con forma rara da error y ningún dato');
  const no = c.api({ action: 'enlace', codigo: 'abcde' });
  ok(no.ok === false && !no.data && /no existe/.test(no.error), 'un código que no existe da «no existe» y ningún dato');
  const fuera = c.api({ action: 'enlace', codigo: 'zzzzz' });
  ok(fuera.ok === false && !fuera.data, 'si alguien escribe a mano otro dominio en la hoja, no se redirige allá');
  ok(c.filas()[2][5] === 0, '…y no cuenta clic'); }

{ const c = caja();
  const r = c.api({ action: 'enlace', codigo: 'k7q2m' });
  ok(r.ok === false && !c.hojas['40_ENLACES'], 'sin la hoja: «enlace» da error y no crea la hoja'); }

[false, true].forEach(exigir => {
  const c = caja({ exigir, filas: [['codigo', 'url', 'app', 'creado', 'por', 'clics', 'ultimo'], ['k7q2m', LARGO, 'grow', '', '', 0, '']] });
  const tag = exigir ? ' (SESION_EXIGIR = 1)' : ' (SESION_EXIGIR apagado)';
  const sin = c.api({ action: 'acortar', url: LARGO + 'nuevo' });
  ok(sin.ok === false && c.filas().length === 2, '«acortar» sin sesión se rechaza y no escribe nada' + tag);
  const pub = c.api({ action: 'enlace', codigo: 'k7q2m' });
  ok(pub.ok && pub.data.url === LARGO, '«enlace» sin sesión pasa' + tag);
  const con = c.api({ action: 'acortar', url: LARGO + 'nuevo', session: SES });
  ok(con.ok && ABC.test(con.data.codigo), '«acortar» con sesión pasa' + tag);
});

{ const c = caja();
  const malos = ['https://evil.example.com/?datos=1', 'http://grow.spacioam.com/?datos=1', 'https://grow.spacioam.com.evil.com/x',
    'https://evil.com@grow.spacioam.com/x', 'https://grow.spacioam.com:8443/x', 'javascript:alert(1)', 'https://grow.spacioam.com/ x', '',
    'https://grow.spacioam.com/' + 'a'.repeat(2100)];
  const rs = malos.map(u => c.api({ action: 'acortar', url: u, session: SES }));
  ok(rs.every(r => r.ok === false) && !c.hojas['40_ENLACES'], 'un enlace de otro dominio (o sin https, o raro) no se acorta');
  const drive = c.api({ action: 'acortar', url: 'https://drive.google.com/file/d/abc/view', session: SES });
  const docs = c.api({ action: 'acortar', url: 'https://docs.google.com/document/d/abc/edit', session: SES });
  ok(drive.ok && docs.ok, 'los de Google Drive y Docs sí se acortan'); }

{ // La hoja está en el esquema: setup() la crea como las demás.
  const c = caja();
  ok(c.ctx.SCHEMA['40_ENLACES'] && c.ctx.SCHEMA['40_ENLACES'].length === 7, '40_ENLACES está en el esquema (setup la crea)'); }

process.exit(fallo);
