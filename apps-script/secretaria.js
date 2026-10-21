/* ═══ SECRETARIA (ALMA desde el Hub) ═══════════════════════════════════════════════════════════════
   Puerta de servidor a servidor para que la secretaria operativa del Hub consulte y mueva proyectos de Grow
   sin abrir la app. Escribe en las hojas Y en el estado compartido (31_ESTADO_PROYECTO), porque en la app el
   JSON del proyecto manda sobre la fila de 01_PROYECTOS: si solo se tocara la hoja, el cambio no se vería.
   Body: { action:'__secretaria', token, op, ... }   op = resumen | equipo | crear | etapa | visita
   El token es propio de esta puerta (solo su huella vive aquí; el Hub guarda el texto en GROW_TOKEN). */
var SEC_HASH_ = '57dc1bec6bf523ae0c0039302d883f8a1efefda52eb90d1da8a733d92e99a56e';
var SEC_ETAPAS_ = ["desconocido", "reunion", "archivos", "visita", "decision", "anteproyecto", "presupuesto", "contrato", "ejecucion", "fotos", "lanzamiento", "revision", "descartado"];

function secretariaApi_(body) {
  if (!body || body.action !== '__secretaria') return null;
  var h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(body.token || ''), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  var out;
  if (h !== SEC_HASH_) out = { ok: false, error: 'token' };
  else {
    try {
      var op = String(body.op || '');
      out = op === 'resumen' ? secResumen_(body.q, body.etapa)
        : op === 'equipo' ? { ok: true, equipo: secEquipo_() }
        : op === 'crear' ? secCrear_(body)
        : op === 'etapa' ? secEtapa_(body)
        : op === 'visita' ? secVisita_(body)
        : { ok: false, error: 'op desconocida: ' + op };
    } catch (e) { out = { ok: false, error: String(e && e.message || e) }; }
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function secNorm_(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
function secTel_(s) { var d = String(s || '').replace(/\D/g, ''); return d.slice(-8); }

/* Estado JSON vigente de cada proyecto: { pid: { v, json } } */
function secEstados_() {
  var out = {};
  (getStates('', null).estados || []).forEach(function (e) {
    try { out[e.proyecto_id] = { v: e.version, json: JSON.parse(e.json || 'null') }; } catch (x) {}
  });
  return out;
}

/* Proyectos como los ve la app: la fila de 01_PROYECTOS con el JSON encima (y los que solo viven en el JSON). */
function secProyectos_() {
  var est = secEstados_(), duenos = readAll_('02_DUENOS'), visitas = readAll_('05_VISITAS'), vistos = {}, out = [];
  var duenoDe = function (id) { return duenos.filter(function (d) { return String(d.dueno_id) === String(id); })[0] || null; };
  var armar = function (pid, fila, j) {
    j = j || {};
    var v = j.visita || null;
    if (!v) { var vf = visitas.filter(function (x) { return String(x.proyecto_id) === String(pid); }).pop(); if (vf) v = { fecha: vf.fecha, asignadoA: vf.asignado_a, completa: vf.completa === true || vf.completa === 'TRUE' }; }
    var dId = j.duenoId || (fila && fila.dueno_id) || '', d = dId ? duenoDe(dId) : null;
    return {
      id: pid,
      nombre: j.nombre || (fila && fila.nombre) || '',
      edificio: j.edificio || (fila && fila.edificio) || '',
      apto: j.apto || (fila && fila.apartamento) || '',
      zona: j.zona || (fila && fila.zona) || '',
      etapa: j.etapa || (fila && fila.etapa) || 'desconocido',
      farol: j.farol || (fila && fila.farol) || 'pending',
      dueno: (d && d.nombre) || j.dueno || '',
      creado: j.creado || (fila && (fila.fecha_ingreso instanceof Date ? fila.fecha_ingreso.toISOString().slice(0, 10) : fila.fecha_ingreso)) || '',
      motivo: j.motivo || (fila && fila.motivo_descarte) || '',
      visita: v ? { fecha: v.fecha instanceof Date ? Utilities.formatDate(v.fecha, 'America/Guatemala', 'yyyy-MM-dd HH:mm') : String(v.fecha || ''), asignado: v.asignadoA || '', completa: !!v.completa } : null
    };
  };
  readAll_('01_PROYECTOS').forEach(function (f) { var pid = String(f.proyecto_id); vistos[pid] = 1; out.push(armar(pid, f, est[pid] && est[pid].json)); });
  Object.keys(est).forEach(function (pid) { if (!vistos[pid] && est[pid].json && est[pid].json.id) out.push(armar(pid, null, est[pid].json)); });
  return out;
}

function secResumen_(q, etapa) {
  var todos = secProyectos_(), nq = secNorm_(q), ne = secNorm_(etapa);
  var lista = todos.filter(function (p) {
    if (ne && secNorm_(p.etapa) !== ne) return false;
    return true;
  });
  /* Búsqueda flexible (Brunello/Brunelo, un dígito distinto): ordenada por parecido. */
  if (nq) lista = bqBuscar_(q, lista, function (p) { return [p.nombre, p.edificio, p.apto, p.zona, p.dueno, p.id].join(' '); }, 25)
    .map(function (x) { x.item.coincidencia = x.coincidencia; return x.item; });
  var porEtapa = {};
  todos.forEach(function (p) { porEtapa[p.etapa] = (porEtapa[p.etapa] || 0) + 1; });
  return { ok: true, total: todos.length, por_etapa: porEtapa, encontrados: lista.length, proyectos: lista.slice(0, 25) };
}

function secEquipo_() {
  return readAll_('17_USUARIOS').filter(function (u) { return u.nombre; }).map(function (u) { return { nombre: String(u.nombre), rol: String(u.rol || ''), email: String(u.email || '') }; });
}

/* Lee el JSON del proyecto, lo cambia con fn y lo guarda (reintenta una vez si alguien guardó en medio). */
function secTocarEstado_(pid, fn, por) {
  for (var intento = 0; intento < 2; intento++) {
    var e = secEstados_()[pid];
    if (!e || !e.json) return false;   // sin JSON la app usa las hojas, que ya se actualizan aparte
    var j = fn(e.json) || e.json;
    var r = saveState(pid, e.v, JSON.stringify(j), por);
    if (r && r.saved) return true;
  }
  return false;
}

function secBuscarProyecto_(id) {
  var pid = String(id || ''), p = secProyectos_().filter(function (x) { return x.id === pid; })[0];
  if (!p) throw new Error('No existe el proyecto ' + pid + '. Búscalo primero con el resumen.');
  return p;
}

function secCrear_(b) {
  var edificio = String(b.edificio || '').trim(), apto = String(b.apto || '').trim();
  if (!edificio) throw new Error('Falta el edificio.');
  var nombre = (edificio + ' ' + apto).trim(), nn = secNorm_(nombre);
  var ya = secProyectos_().filter(function (p) { return secNorm_((p.edificio + ' ' + p.apto).trim()) === nn || secNorm_(p.nombre) === nn; })[0];
  if (ya) return { ok: true, ya_existia: true, proyecto: ya };
  /* Dueño: se reutiliza si coincide correo, teléfono o nombre exacto; si no, se crea (y queda con acceso al login). */
  var dn = String(b.dueno_nombre || '').trim(), de = String(b.dueno_email || '').trim().toLowerCase(), dt = String(b.dueno_tel || '').trim(), duenoId = '';
  if (dn || de || dt) {
    var d = readAll_('02_DUENOS').filter(function (x) {
      return (de && String(x.email || '').trim().toLowerCase() === de) || (dt && secTel_(x.telefono) && secTel_(x.telefono) === secTel_(dt)) || (dn && secNorm_(x.nombre) === secNorm_(dn));
    })[0];
    if (d) duenoId = String(d.dueno_id);
    else {
      duenoId = 'D' + Date.now();
      apiCreate('02_DUENOS', { dueno_id: duenoId, nombre: dn || de || dt, email: de, telefono: dt });
      try { loginDuenoDespuesDe_('02_DUENOS', duenoId); } catch (eL) {}
    }
  }
  var pid = 'p' + Date.now(), etapa = SEC_ETAPAS_.indexOf(String(b.etapa || '')) >= 0 ? String(b.etapa) : 'desconocido';
  var hab = Number(b.hab) || 1, banos = Number(b.banos) || 1, hoy = Utilities.formatDate(new Date(), 'America/Guatemala', 'yyyy-MM-dd');
  apiCreate('01_PROYECTOS', { proyecto_id: pid, nombre: nombre, edificio: edificio, apartamento: apto, zona: String(b.zona || ''), habitaciones: hab, banos: banos,
    tipo: 'Edificio', equipado: 'Sin equipar', dueno_id: duenoId, etapa: etapa, farol: 'info', fecha_ingreso: hoy });
  var json = { id: pid, nombre: nombre, edificio: edificio || '—', apto: apto || '—', zona: String(b.zona || '') || '—', hab: hab, banos: banos, duenoId: duenoId || null,
    dueno: dn || 'Propietario', email: de, etapa: etapa, farol: 'info', creado: hoy, equipado: 'Sin equipar', lineaBlanca: false, tipo: 'Edificio',
    reunion: null, visita: null, anteproyecto: null, presupuesto: null, contrato: { estado: 'sin iniciar', firmantes: [] }, facturas: [], checklist: [], gantt: [],
    notaAlma: String(b.nota || '') };
  saveState(pid, 0, JSON.stringify(json), 'ALMA · ' + String(b.por || 'secretaria'));
  cacheDrop_();
  return { ok: true, creado: true, proyecto: { id: pid, nombre: nombre, etapa: etapa, dueno: dn, dueno_nuevo: !!duenoId } };
}

function secEtapa_(b) {
  var p = secBuscarProyecto_(b.proyecto_id), etapa = String(b.etapa || '');
  if (SEC_ETAPAS_.indexOf(etapa) < 0) throw new Error('Etapa no válida: ' + etapa + '. Usa una de: ' + SEC_ETAPAS_.join(', '));
  var farol = etapa === 'descartado' ? 'error' : String(b.farol || 'info'), motivo = String(b.motivo || '');
  var datos = { etapa: etapa, farol: farol }; if (etapa === 'descartado') datos.motivo_descarte = motivo || 'Sin motivo registrado';
  try { apiUpdate('01_PROYECTOS', p.id, datos); } catch (e) { /* proyecto que solo vive en el JSON */ }
  secTocarEstado_(p.id, function (j) { j.etapa = etapa; j.farol = farol; if (etapa === 'descartado') j.motivo = datos.motivo_descarte; return j; }, 'ALMA · ' + String(b.por || 'secretaria'));
  try { apiCreate('03_EMBUDO_EVENTOS', secFila_('03_EMBUDO_EVENTOS', { proyecto_id: p.id, fecha_hora: new Date().toISOString(), de_etapa: p.etapa, a_etapa: etapa, usuario: 'ALMA · ' + String(b.por || ''), nota: motivo })); } catch (e) {}
  cacheDrop_();
  return { ok: true, proyecto: p.nombre, de: p.etapa, a: etapa };
}

/* Solo las columnas que existen en la hoja (03_EMBUDO_EVENTOS cambia de forma entre versiones). */
function secFila_(hoja, datos) {
  var cols = SCHEMA[hoja] || [], o = {};
  cols.forEach(function (c) { if (datos[c] != null) o[c] = datos[c]; });
  return o;
}

function secVisita_(b) {
  var p = secBuscarProyecto_(b.proyecto_id), fecha = String(b.fecha || '').replace('T', ' ').trim();
  if (!/^\d{4}-\d{2}-\d{2}( \d{1,2}:\d{2})?$/.test(fecha)) throw new Error('Fecha inválida (usa AAAA-MM-DD HH:mm): ' + fecha);
  var eq = secEquipo_(), na = secNorm_(b.asignado);
  var u = eq.filter(function (x) { return secNorm_(x.nombre) === na; })[0] || eq.filter(function (x) { return na && secNorm_(x.nombre).indexOf(na) === 0; })[0];
  if (!u) throw new Error('No encuentro a «' + b.asignado + '» en el equipo de Grow. Equipo: ' + eq.map(function (x) { return x.nombre; }).join(', '));
  var mover = ['desconocido', 'reunion', 'archivos'].indexOf(p.etapa) >= 0;
  /* Una sola fila de visita por proyecto: si ya hay, se reprograma esa (la app lee la primera). */
  var vf = readAll_('05_VISITAS').filter(function (x) { return String(x.proyecto_id) === p.id; })[0];
  if (vf) apiUpdate('05_VISITAS', vf.visita_id, { asignado_a: u.nombre, fecha: fecha, completa: false });
  else apiCreate('05_VISITAS', { proyecto_id: p.id, asignado_a: u.nombre, fecha: fecha, completa: false });
  if (mover) { try { apiUpdate('01_PROYECTOS', p.id, { etapa: 'visita', farol: 'info' }); } catch (e) {} }
  secTocarEstado_(p.id, function (j) {
    j.visita = Object.assign({}, j.visita || {}, { fecha: fecha, asignadoA: u.nombre, asignadoEmail: u.email, completa: false });
    if (mover) { j.etapa = 'visita'; j.farol = 'info'; }
    return j;
  }, 'ALMA · ' + String(b.por || 'secretaria'));
  var correo = false;
  if (u.email && b.avisar !== false) {
    var cuerpo = 'Hola ' + u.nombre.split(' ')[0] + ',\n\nTe asignamos el levantamiento de ' + p.nombre + ' para el ' + fecha + '.' +
      (b.nota ? '\n\nNota: ' + String(b.nota) : '') +
      '\n\nEntra a Grow con tu correo, abre Visitas y llena el formulario en sitio: inventario por categoría, problemas de mantenimiento y fotos.\n\nhttps://grow.spacioam.com\n\nSpacio AM';
    var r = notify({ to: u.email, subject: 'Visita asignada · ' + p.nombre, body: cuerpo }); correo = !!(r && r.sent);
    try { apiCreate('24_CORREOS', { fecha_hora: new Date().toISOString(), tipo: 'visitaAsignada', para: u.email, asunto: 'Visita asignada · ' + p.nombre, proyecto_id: p.id, estado: correo ? 'Enviado' : 'Error' }); } catch (e) {}
  }
  cacheDrop_();
  return { ok: true, proyecto: p.nombre, fecha: fecha, asignado: u.nombre, reprogramada: !!vf, etapa: mover ? 'visita' : p.etapa, correo_enviado: correo };
}

/* ═══ Búsqueda flexible (copia de buscar.js del Hub) ═══ */

/* Texto → palabras normalizadas: sin acentos ni signos, «zona 10» → «z10». */
function bqPalabras_(s) {
  var t = String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\bzona\s*(\d+)/g, 'z$1').replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2');
  t = t.replace(/\bz (\d+)/g, 'z$1');
  return t.replace(/[^a-z0-9ñ]+/g, ' ').trim().split(' ').filter(function (w) { return w && ['de', 'del', 'la', 'el', 'los', 'las', 'y', 'apto', 'apartamento', 'edificio'].indexOf(w) < 0; });
}

/* Cómo suena una palabra en español: ck/qu/c dura → k, z/ce/ci → s, v → b, h muda, y/ll → i, sin letras dobles. */
function bqSonido_(w) {
  if (/^\d+$/.test(w) || /^z\d+$/.test(w)) return w;
  return w.replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/qu/g, 'k').replace(/c([ei])/g, 's$1').replace(/c/g, 'k').replace(/z/g, 's')
    .replace(/w/g, 'u').replace(/v/g, 'b').replace(/y/g, 'i').replace(/ñ/g, 'n').replace(/x/g, 'ks')
    .replace(/h/g, '').replace(/(.)\1+/g, '$1');
}

function bqLev_(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  var prev = [], i, j; for (j = 0; j <= b.length; j++) prev[j] = j;
  for (i = 1; i <= a.length; i++) {
    var cur = [i], minFila = i;
    for (j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      if (cur[j] < minFila) minFila = cur[j];
    }
    if (minFila > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/* Parecido entre una palabra buscada y una del registro (0 a 1). */
function bqPalabraSim_(q, t) {
  if (q === t) return 1;
  var dq = /^\d+$/.test(q), dt = /^\d+$/.test(t);
  if (dq || dt) {   // números de apartamento: exactos, o un dígito distinto con el mismo largo
    if (!(dq && dt)) return 0;
    return q.length >= 3 && q.length === t.length && bqLev_(q, t, 1) <= 1 ? 0.6 : 0;
  }
  var sq = bqSonido_(q), st = bqSonido_(t);
  if (sq === st) return 0.95;
  if (sq.length >= 3 && st.indexOf(sq) === 0) return 0.85;   // «brun» → «brunelo»
  var d = bqLev_(sq, st, 2);
  if (d <= 1 && sq.length >= 4) return 0.8;
  if (d <= 2 && sq.length >= 7) return 0.7;
  return 0;
}

/* Puntaje de un registro para una búsqueda: promedio del mejor parecido de cada palabra buscada.
   todas = cada palabra encontró pareja (≥ 0.6). */
function bqPuntaje_(busqueda, texto) {
  var qs = bqPalabras_(busqueda), ts = bqPalabras_(texto);
  if (!qs.length) return { puntaje: 0, todas: false, halladas: 0, total: 0 };
  var suma = 0, halladas = 0;
  qs.forEach(function (q) {
    var mejor = 0; ts.forEach(function (t) { var s = bqPalabraSim_(q, t); if (s > mejor) mejor = s; });
    suma += mejor; if (mejor >= 0.6) halladas++;
  });
  return { puntaje: suma / qs.length, todas: halladas === qs.length, halladas: halladas, total: qs.length };
}

/* Busca en una lista. Primero los que cumplen todas las palabras; si no hay, los que cumplen la mayoría.
   Devuelve [{ item, puntaje, coincidencia: 'exacta' | 'aproximada' }] ordenado de más a menos parecido. */
function bqBuscar_(busqueda, items, textoDe, max) {
  var res = items.map(function (it) { var tx = textoDe(it), p = bqPuntaje_(busqueda, tx); p.item = it; p.largo = String(tx || '').length; return p; });
  var todas = res.filter(function (r) { return r.todas; });
  var lista = todas.length ? todas : res.filter(function (r) { return r.total >= 2 && r.halladas / r.total >= 0.6 && r.puntaje >= 0.5; });
  lista.sort(function (a, b) { return (b.puntaje - a.puntaje) || (a.largo - b.largo); });
  return lista.slice(0, max || 12).map(function (r) { return { item: r.item, puntaje: Math.round(r.puntaje * 100) / 100, coincidencia: r.todas && r.puntaje >= 0.99 ? 'exacta' : 'aproximada' }; });
}

/* El nombre de la lista que más se parece (para personas, propiedades, técnicos). '' si nada se parece lo suficiente. */
function bqMejor_(busqueda, lista) {
  var r = bqBuscar_(busqueda, lista, function (x) { return x; }, 2);
  if (!r.length || r[0].puntaje < 0.7) return '';
  if (r.length > 1 && r[1].puntaje === r[0].puntaje && r[0].puntaje < 0.99) return '';   // empate: mejor no adivinar
  return r[0].item;
}
