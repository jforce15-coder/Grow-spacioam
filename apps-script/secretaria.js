/* ═══ SECRETARIA (ALMA desde el Hub) ═══════════════════════════════════════════════════════════════
   Puerta de servidor a servidor para que la secretaria operativa del Hub consulte y mueva proyectos de Grow
   sin abrir la app. Escribe en las hojas Y en el estado compartido (31_ESTADO_PROYECTO), porque en la app el
   JSON del proyecto manda sobre la fila de 01_PROYECTOS: si solo se tocara la hoja, el cambio no se vería.
   Body: { action:'__secretaria', token, op, ... }   op = resumen | equipo | crear | etapa | visita | dato | fotos | presupuesto_pdf
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
        : op === 'dato' ? secDato_(body)
        : op === 'fotos' ? secFotos_(body)
        : op === 'presupuesto_pdf' ? secPresupuestoPdf_(body)
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
      dueno_id: dId,
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

/* Dato de hecho (Alma lo anota sola y le avisa a Juan después): apartamento, edificio o zona de un proyecto; nombre,
   teléfono o correo de su dueño. Nada de dinero, etapas, contratos ni accesos: esos campos no están en esta lista.
   Devuelve el valor de antes para que el Hub diga «antes decía…» y lo guarde en su historial (ALMA_DATOS_HECHO).
   El correo nuevo de un dueño NO le da acceso aquí: eso sigue su propio camino (loginSincronizarDuenos_). */
var SEC_DATOS_ = { proyecto: { apto: ['apartamento', 'apto'], edificio: ['edificio', 'edificio'], zona: ['zona', 'zona'] },
  dueno: { nombre: ['nombre', 'dueno'], telefono: ['telefono', 'telefono'], email: ['email', 'email'] } };
function secDato_(b) {
  var tipo = b.tipo === 'dueno' ? 'dueno' : 'proyecto', campo = String(b.campo || ''), col = SEC_DATOS_[tipo][campo];
  if (!col) throw new Error('Ese campo no se cambia por aquí: ' + campo + '. Solo ' + Object.keys(SEC_DATOS_[tipo]).join(', ') + '.');
  var valor = String(b.valor == null ? '' : b.valor).trim().slice(0, 120); if (!valor) throw new Error('Falta el valor.');
  if (campo === 'email') valor = valor.toLowerCase();
  var por = 'ALMA · ' + String(b.por || 'dato de hecho') + (b.fuente ? ' · ' + String(b.fuente).slice(0, 80) : '');
  var limpio = function (x) { x = String(x == null ? '' : x).trim(); return x === '—' ? '' : x; };
  var igual = function (a, c) { return campo === 'telefono' ? secTel_(a) === secTel_(c) : secNorm_(a) === secNorm_(c); };
  if (tipo === 'proyecto') {
    var p = secBuscarProyecto_(b.id), antes = limpio(p[campo]);
    if (igual(antes, valor) || (b.solo_si_vacio && antes)) return { ok: true, sin_cambio: true, registro: p.nombre, id: p.id, campo: campo, antes: antes, ahora: antes || valor };
    var d1 = {}; d1[col[0]] = valor;
    try { apiUpdate('01_PROYECTOS', p.id, d1); } catch (e) { /* proyecto que solo vive en el JSON */ }
    secTocarEstado_(p.id, function (j) { j[col[1]] = valor; return j; }, por);
    cacheDrop_();
    return { ok: true, registro: p.nombre, id: p.id, campo: campo, antes: antes, ahora: valor };
  }
  /* Dueño: por su id (D…) o por el de su proyecto (p…). */
  var did = String(b.id || ''), nombreP = '';
  if (/^p/.test(did)) { var pr = secBuscarProyecto_(did); nombreP = pr.nombre; did = pr.dueno_id; if (!did) throw new Error('El proyecto ' + pr.nombre + ' no tiene dueño registrado.'); }
  var dn = readAll_('02_DUENOS').filter(function (x) { return String(x.dueno_id) === String(did); })[0];
  if (!dn) throw new Error('No existe el dueño ' + did + '.');
  var antesD = limpio(dn[col[0]]);
  if (igual(antesD, valor) || (b.solo_si_vacio && antesD)) return { ok: true, sin_cambio: true, registro: String(dn.nombre || did), id: did, proyecto: nombreP, campo: campo, antes: antesD, ahora: antesD || valor };
  var d2 = {}; d2[col[0]] = valor;
  apiUpdate('02_DUENOS', did, d2);
  var est = secEstados_();   // solo los proyectos de este dueño: tocar los demás les subiría la versión sin cambio
  Object.keys(est).filter(function (pid) { return est[pid].json && String(est[pid].json.duenoId || '') === String(did); }).forEach(function (pid) {
    secTocarEstado_(pid, function (j) { j[col[1]] = valor; return j; }, por);
  });
  cacheDrop_();
  return { ok: true, registro: String(dn.nombre || did), id: did, proyecto: nombreP, campo: campo, antes: antesD, ahora: valor };
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

/* ═══ FOTOS DE LA VISITA (Alma las mira para recomendar) ═══
   Junta las fotos del levantamiento: las filas de 30_FOTOS (cada foto que ya subió a Drive) y las que solo están en el
   JSON del proyecto (fotos por zona, fotos libres y fotos de cada problema de mantenimiento, también por unidad). Las
   que siguen en el teléfono (data:) no se cuentan: todavía no llegaron. Devuelve de a 6 (desde) en base64, porque los
   archivos son de esta cuenta y el Hub no siempre puede abrirlos. Con las fotos van los problemas y comentarios de la
   visita, para que Alma recomiende con contexto. */
var SEC_FOTOS_MAX_ = 6;
function secFotoId_(u) { var m = String(u || '').match(/[?&]id=([\w-]{10,})|\/d\/([\w-]{10,})/); return m ? (m[1] || m[2]) : ''; }
function secFotos_(b) {
  var p = secBuscarProyecto_(b.proyecto_id), j = (secEstados_()[p.id] || {}).json || {}, lista = [], vistos = {};
  var na = secNorm_(b.apto), nz = secNorm_(b.zona);
  var poner = function (id, zona, apto, fecha) {
    if (!id || vistos[id]) return; vistos[id] = 1;
    lista.push({ id: id, zona: String(zona || 'Sin zona'), apto: String(apto || ''), fecha: fecha instanceof Date ? Utilities.formatDate(fecha, 'America/Guatemala', 'yyyy-MM-dd') : String(fecha || '').slice(0, 10) });
  };
  readAll_('30_FOTOS').filter(function (f) { return String(f.proyecto_id) === p.id; })
    .forEach(function (f) { poner(String(f.file_id || '') || secFotoId_(f.url), f.zona, f.apartamento, f.fecha); });
  var problemas = [], comentarios = [];
  var deVisita = function (v, apto) {
    if (!v) return;
    Object.keys(v.fotosZona || {}).forEach(function (z) { (v.fotosZona[z] || []).forEach(function (u) { poner(secFotoId_(u), z, apto, v.fecha); }); });
    (v.fotosLibres || []).forEach(function (u) { poner(secFotoId_(u), 'Sin zona', apto, v.fecha); });
    (v.mant || v.mantenimiento || []).forEach(function (m) {
      problemas.push((apto ? 'Apto ' + apto + ' · ' : '') + String(m.titulo || 'Problema') + (m.comentario ? ': ' + String(m.comentario).slice(0, 300) : ''));
      (m.fotos || []).forEach(function (u) { poner(secFotoId_(u), 'Mantenimiento · ' + String(m.titulo || ''), apto, v.fecha); });
    });
    (v.inv || v.inventarioComentarios || []).forEach(function (c) { if (c && c.texto) comentarios.push((apto ? 'Apto ' + apto + ' · ' : '') + String(c.texto).slice(0, 300)); });
    if (v.detalles) comentarios.push((apto ? 'Apto ' + apto + ' · ' : '') + 'Detalles: ' + String(v.detalles).slice(0, 300));
  };
  deVisita(j.visitaData, '');
  (j.unidades || []).forEach(function (u) { deVisita(u.visitaData, u.apto); });
  if (!j.visitaData && j.visita) deVisita(j.visita, '');
  var zonas = {}; lista.forEach(function (f) { zonas[f.zona] = (zonas[f.zona] || 0) + 1; });
  var filtradas = lista.filter(function (f) { return (!na || secNorm_(f.apto) === na) && (!nz || secNorm_(f.zona).indexOf(nz) >= 0); });
  var desde = Math.max(0, Number(b.desde) || 0), max = Math.max(1, Math.min(SEC_FOTOS_MAX_, Number(b.max) || SEC_FOTOS_MAX_));
  var fotos = [];
  filtradas.slice(desde, desde + max).forEach(function (f, i) {
    try {
      var bl = DriveApp.getFileById(f.id).getBlob(), mt = String(bl.getContentType() || 'image/jpeg'), by = bl.getBytes();
      if (!/^image\/(jpeg|png|gif|webp)$/.test(mt) || by.length > 4.5 * 1024 * 1024) return;
      fotos.push({ n: desde + i + 1, zona: f.zona, apto: f.apto, fecha: f.fecha, data: 'data:' + mt + ';base64,' + Utilities.base64Encode(by) });
    } catch (e) { /* foto borrada o sin permiso: se salta */ }
  });
  return { ok: true, proyecto: p.nombre, id: p.id, etapa: p.etapa, visita: p.visita, total: lista.length, encontradas: filtradas.length, desde: desde,
    siguen: Math.max(0, filtradas.length - desde - max), zonas: zonas, problemas: problemas.slice(0, 10), comentarios: comentarios.slice(0, 10), fotos: fotos };
}

/* ═══ PRESUPUESTO EN PDF (Alma lo manda desde la conversación) ═══
   El mismo documento que la app imprime (Presupuesto · Spacio AM: ítems por categoría, resumen y total), con las
   mismas cuentas: mobiliario, fee, diseño de interiores y fotos pro. Sin las fotos del anteproyecto (en la app aún son
   de muestra) ni las cuentas bancarias (los números de datos.js son de ejemplo): pide el depósito por hola@spacioam.com.
   Se guarda en «Propiedades/<edificio>/<apto>/03 Presupuesto» con enlace de solo lectura (como las fotos) y vuelve en
   base64 para que el Hub lo mande por WhatsApp. Solo el presupuesto de un apartamento; el de fases todavía no. */
function secQ_(n) { return 'Q ' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function secEsc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function secPresCuentas_(j) {
  var pr = j.presupuesto || {}, hab = Number(j.hab) || 1, items = pr.items || [];
  var mob = items.reduce(function (a, it) { return a + (Number(it.precio) || 0) * (Number(it.cant) || 0); }, 0);
  var cobraMob = pr.cobraMobiliario !== false, pct = pr.feePct != null ? Number(pr.feePct) : 10, fee = cobraMob ? mob * pct / 100 : 0;
  var cobraDis = pr.cobraDiseno !== false && !!j.conAnteproyecto;
  var disQ = cobraDis ? (pr.disenoQ != null ? Number(pr.disenoQ) : (hab >= 3 ? 2500 : hab === 2 ? 2000 : 1500)) : 0;
  var fotosUsd = pr.fotosProUsd != null ? Number(pr.fotosProUsd) : (hab >= 3 ? 250 : hab === 2 ? 200 : 150), fotosQ = fotosUsd * 7.75;
  var resumen = [];
  if (cobraMob) resumen.push({ k: 'Mobiliario', v: mob });
  if (cobraMob && fee) resumen.push({ k: 'Fee mobiliario ' + Math.round(pct) + '%', v: fee });
  if (cobraDis) resumen.push({ k: 'Diseño de interiores', v: disQ });
  resumen.push({ k: 'Fotos pro ($' + fotosUsd + ')', v: fotosQ });
  return { resumen: resumen, total: (cobraMob ? mob + fee : 0) + disQ + fotosQ,
    estado: pr.estado === 'aprobado' ? 'Aprobado por el propietario' : pr.estado === 'enviado' ? 'Enviado · esperando al propietario' : 'Borrador' };
}
function secPresupuestoPdf_(b) {
  var p = secBuscarProyecto_(b.proyecto_id), j = (secEstados_()[p.id] || {}).json || {};
  var pr = j.presupuesto;
  if (!pr || !(pr.items || []).length) {
    var fases = (j.fases || []).some(function (f) { return (f.presupuestos || []).length; });
    throw new Error(fases ? p.nombre + ' tiene presupuesto por fases; ese todavía no sale en PDF desde Alma (ábrelo en Grow).' : p.nombre + ' todavía no tiene presupuesto en Grow.');
  }
  var c = secPresCuentas_(j), cats = {}, orden = [], e = secEsc_;
  pr.items.forEach(function (it) { var k = String(it.cat || 'General'); if (!cats[k]) { cats[k] = []; orden.push(k); } cats[k].push(it); });
  var hoy = Utilities.formatDate(new Date(), 'America/Guatemala', 'yyyy-MM-dd');
  var gris = '#6F6867', tinta = '#3E3F3F', eb = 'font-size:8.5px;letter-spacing:2.5px;text-transform:uppercase;color:' + gris + ';';
  var td = 'font-size:10.5px;padding:5px 8px;border-bottom:1px solid #EEEBE6;vertical-align:top;';
  /* Tablas en vez de flex o grid: el conversor de HTML a PDF de Google solo respeta lo básico. */
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;color:' + tinta + ';margin:0">' +
    '<table style="width:100%;border-collapse:collapse;border-bottom:1px solid ' + tinta + ';margin-bottom:20px"><tr>' +
    '<td style="padding:0 0 12px;vertical-align:bottom"><div style="' + eb + 'margin-bottom:6px">Presupuesto · Spacio AM</div>' +
    '<div style="font-family:Georgia,serif;font-size:28px;line-height:1.05">' + e(p.nombre) + '</div></td>' +
    '<td style="padding:0 0 12px;text-align:right;vertical-align:bottom;font-size:9.5px;color:' + gris + ';line-height:1.6">' +
    '<b style="color:' + tinta + ';font-size:10.5px">' + e(p.edificio) + (p.apto && p.apto !== '—' ? ' · Apto ' + e(p.apto) : '') + '</b><br>' +
    (p.dueno && p.dueno !== 'Propietario' ? e(p.dueno) + '<br>' : '') + e(hoy) + '</td></tr></table>';
  orden.forEach(function (k) {
    var sub = cats[k].reduce(function (a, it) { return a + (Number(it.precio) || 0) * (Number(it.cant) || 0); }, 0);
    html += '<div style="page-break-inside:avoid;margin:0 0 16px"><div style="font-family:Georgia,serif;font-size:16px;margin:0 0 4px">' + e(k) +
      ' <span style="' + eb + '">' + cats[k].length + (cats[k].length === 1 ? ' ítem' : ' ítems') + '</span></div>' +
      '<table style="width:100%;border-collapse:collapse"><tr>' +
      ['Ítem', 'Precio', 'Cant.', 'Total'].map(function (h, i) { return '<td style="' + eb + 'padding:4px 8px;border-bottom:1px solid ' + tinta + ';' + (i ? 'text-align:right;width:' + (i === 2 ? 12 : 18) + '%' : '') + '">' + h + '</td>'; }).join('') + '</tr>' +
      cats[k].map(function (it) {
        var pz = Number(it.precio) || 0, ct = Number(it.cant) || 0;
        return '<tr><td style="' + td + '">' + e(it.item) + '</td><td style="' + td + 'text-align:right">' + secQ_(pz) + '</td><td style="' + td + 'text-align:right">' + ct + '</td><td style="' + td + 'text-align:right">' + secQ_(pz * ct) + '</td></tr>';
      }).join('') +
      '<tr><td colspan="3" style="padding:7px 8px 0;' + eb + '">Subtotal ' + e(k) + '</td><td style="font-size:10.5px;padding:7px 8px 0;text-align:right;font-weight:bold">' + secQ_(sub) + '</td></tr></table></div>';
  });
  html += '<table style="width:100%;border-collapse:collapse;margin-top:8px;page-break-inside:avoid"><tr>' +
    '<td style="vertical-align:top;padding-right:20px;font-size:9.5px;color:' + gris + ';line-height:1.6"><div style="' + eb + 'margin-bottom:6px">Condiciones</div>' +
    '<p style="margin:0 0 6px">Precios en quetzales, referenciales al día de emisión; pueden variar según disponibilidad del proveedor.</p>' +
    '<p style="margin:0 0 6px">El mobiliario se compra con el depósito del propietario; cada factura queda registrada en tu portal.</p>' +
    '<p style="margin:0 0 6px">Estado: ' + e(c.estado) + '.</p>' +
    '<p style="margin:0">Para los datos de depósito escribe a hola@spacioam.com indicando «' + e(p.nombre) + '».</p></td>' +
    '<td style="width:44%;vertical-align:top;background:' + tinta + ';color:#FFFFFF;padding:16px 18px"><div style="' + eb + 'color:#D8D4CE;margin-bottom:8px">Resumen</div>' +
    '<table style="width:100%;border-collapse:collapse;color:#FFFFFF">' +
    c.resumen.map(function (r) { return '<tr><td style="font-size:10.5px;padding:3px 0">' + e(r.k) + '</td><td style="font-size:10.5px;padding:3px 0;text-align:right">' + secQ_(r.v) + '</td></tr>'; }).join('') +
    '<tr><td style="padding:10px 0 0;border-top:1px solid #8A8A8A;font-size:9px;letter-spacing:2.5px;text-transform:uppercase">Total</td>' +
    '<td style="padding:10px 0 0;border-top:1px solid #8A8A8A;text-align:right;font-size:16px">' + secQ_(c.total) + '</td></tr></table></td></tr></table>' +
    '<div style="margin-top:18px;' + eb + '">Spacio AM · spacioam.com · ' + e(p.nombre) + ' · ' + e(hoy) + '</div></body></html>';
  var nombre = ('Presupuesto ' + p.nombre + ' ' + hoy).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.pdf';
  var pdf = Utilities.newBlob(html, 'text/html', 'presupuesto.html').getAs('application/pdf').setName(nombre);
  var url = '', compartido = false;
  try {
    var r = uploadFile(Utilities.base64Encode(pdf.getBytes()), nombre, 'application/pdf',
      'Propiedades/' + String(p.edificio || p.nombre).replace(/\//g, '-') + '/' + String(p.apto || 'unico').replace(/\//g, '-') + '/03 Presupuesto');
    url = r.verUrl; compartido = !!r.compartido;
  } catch (eD) { /* sin Drive el PDF igual vuelve al Hub */ }
  return { ok: true, proyecto: p.nombre, id: p.id, items: pr.items.length, total: secQ_(c.total), estado: c.estado, resumen: c.resumen.map(function (r) { return r.k + ': ' + secQ_(r.v); }),
    nombre: nombre, url: url, compartido: compartido, pdf_b64: Utilities.base64Encode(pdf.getBytes()) };
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
