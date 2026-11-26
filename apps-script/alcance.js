/* ═══ QUÉ VE CADA SESIÓN (alcance) ═══════════════════════════════════════════════════════════════
   26-nov-2026: getAll, getStates, list y get devolvían TODOS los proyectos a cualquier sesión, también a la de un
   propietario: quien entraba a su portal recibía en la red los datos de los demás propietarios. Ahora una sola función,
   alcance_, decide qué ve cada quien, y TODA acción que lee o escribe datos de proyectos pasa por ella (route en Código.js
   y documentos.js). Se filtra aquí, en el servidor, nunca solo en la página.
   · Equipo (cualquier permiso de Grow que no sea de propietario) y la llave del robot: todo, como antes.
   · Propietario: solo SUS proyectos (02_DUENOS por su correo → dueno_id; el proyecto lo dice 01_PROYECTOS o su estado) y
     solo las hojas que su portal usa, filtradas a esos proyectos. Lo que no está en ALC_REGLAS_ no le llega (negado por
     defecto). Escribe solo en su proyecto.
   · Sin sesión o sin permiso en Grow: nada. */
var ALC_DUENO_RE_ = /propiet|dueno|dueño|owner|socio/;

/* La única puerta: { todo, rol: 'robot' | 'equipo' | 'dueno' | '', admin, email, duenoIds, pids }. */
function alcance_(p, ses) {
  if (esRobot_(p)) return { todo: true, rol: 'robot', admin: true, email: 'robot', duenoIds: [], pids: [] };
  if (!ses || !ses.email) return { todo: false, rol: '', admin: false, email: '', duenoIds: [], pids: [] };
  var r = String((ses.apps && ses.apps.grow) || '').toLowerCase(), email = String(ses.email).trim().toLowerCase();
  if (ALC_DUENO_RE_.test(r)) {
    /* Sus proyectos, guardados 2 min por correo: el portal pregunta cada 12 s y no hace falta leer tres hojas cada vez. */
    var c = null, k = 'alc_' + email.replace(/[^a-z0-9]/g, '_').slice(0, 200), hit = null;
    try { c = CacheService.getScriptCache(); hit = c.get(k); } catch (e) {}
    if (hit) { try { var h = JSON.parse(hit); return { todo: false, rol: 'dueno', admin: false, email: email, duenoIds: h.ids, pids: h.pids }; } catch (e) {} }
    var ids = alcDuenoIds_(email), pids = alcProyectosDe_(ids);
    try { if (c) c.put(k, JSON.stringify({ ids: ids, pids: pids }), 120); } catch (e) {}
    return { todo: false, rol: 'dueno', admin: false, email: email, duenoIds: ids, pids: pids };
  }
  if (r) return { todo: true, rol: 'equipo', admin: /admin/.test(r), email: email, duenoIds: [], pids: [] };
  return { todo: false, rol: '', admin: false, email: email, duenoIds: [], pids: [] };
}
function alcDuenoIds_(email) {
  return readAll_('02_DUENOS').filter(function (d) { return String(d.email || '').trim().toLowerCase() === email; })
    .map(function (d) { return String(d.dueno_id); });
}
function alcProyectosDe_(ids) {
  var out = {};
  if (!ids.length) return [];
  readAll_('01_PROYECTOS').forEach(function (r) { if (ids.indexOf(String(r.dueno_id || '')) >= 0) out[String(r.proyecto_id)] = 1; });
  (getStates('', null).estados || []).forEach(function (e) {
    if (String(e.proyecto_id).indexOf('DATOS-') === 0) return;
    var j = null; try { j = JSON.parse(String(e.json || 'null').replace(/^~/, '')); } catch (x) {}
    if (j && j.duenoId && ids.indexOf(String(j.duenoId)) >= 0) out[String(e.proyecto_id)] = 1;
  });
  return Object.keys(out);
}

/* Hojas que ve un propietario y cómo se filtran. Cualquier otra hoja (contactos, proveedores, catálogo, plantillas,
   usuarios del equipo, enlaces…) le llega vacía. */
var ALC_REGLAS_ = {
  '01_PROYECTOS': 'proyecto', '03_EMBUDO_EVENTOS': 'proyecto', '04_REUNIONES': 'proyecto', '05_VISITAS': 'proyecto',
  '06_ANTEPROYECTO': 'proyecto', '08_PRESUPUESTOS': 'proyecto', '11_FACTURA_ASIGNACIONES': 'proyecto', '13_CONTRATOS': 'proyecto',
  '15_CHECKLIST': 'proyecto', '16_REVISION_POSTLANZAMIENTO': 'proyecto', '18_TAREAS': 'proyecto', '21_MILESTONES': 'proyecto',
  '23_RECEPCIONES': 'proyecto', '24_CORREOS': 'proyecto', '26_UNIDADES': 'proyecto', '27_FASES': 'proyecto',
  '28_PRESUPUESTOS_FASE': 'proyecto', '29_VISITA_UNIDAD': 'proyecto', '30_FOTOS': 'proyecto', '31_ESTADO_PROYECTO': 'proyecto',
  '02_DUENOS': ['dueno_id', null],
  '09_PRESUPUESTO_ITEMS': ['presupuesto_id', '08_PRESUPUESTOS', 'presupuesto_id'],
  '10_FACTURAS': ['factura_id', '11_FACTURA_ASIGNACIONES', 'factura_id'],
  '14_FIRMAS': ['contrato_id', '13_CONTRATOS', 'contrato_id'],
  '19_SUBTAREAS': ['tarea_id', '18_TAREAS', 'tarea_id'],
  '20_TAREA_COMENTARIOS': ['tarea_id', '18_TAREAS', 'tarea_id']
};
function alcEsSuyo_(alc, pid) { pid = String(pid || ''); return pid.indexOf('DATOS-') !== 0 && alc.pids.indexOf(pid) >= 0; }

/* Filas de una hoja que puede ver esta sesión. leer(nombre) da las filas de otra hoja (para las que dependen de otra). */
function alcFilas_(alc, nombre, filas, leer) {
  if (alc.todo) return filas;
  if (alc.rol !== 'dueno') return [];
  var regla = ALC_REGLAS_[nombre];
  if (!regla) return [];
  if (regla === 'proyecto') return (filas || []).filter(function (f) { return alcEsSuyo_(alc, f.proyecto_id); });
  if (regla[1] === null) return (filas || []).filter(function (f) { return alc.duenoIds.indexOf(String(f[regla[0]])) >= 0; });
  var ok = {};
  alcFilas_(alc, regla[1], leer(regla[1]) || [], leer).forEach(function (f) { ok[String(f[regla[2]])] = 1; });
  return (filas || []).filter(function (f) { return ok[String(f[regla[0]])]; });
}
/* getAll filtrado: cada hoja con su regla. */
function alcTodo_(alc, todo) {
  if (alc.todo) return todo;
  var out = {}, leer = function (n) { return todo[n] || []; };
  Object.keys(todo || {}).forEach(function (n) { out[n] = alcFilas_(alc, n, todo[n], leer); });
  return out;
}
/* getStates filtrado (31_ESTADO_PROYECTO). */
function alcEstados_(alc, r) {
  if (alc.todo) return r;
  return { estados: ((r && r.estados) || []).filter(function (e) { return alc.rol === 'dueno' && alcEsSuyo_(alc, e.proyecto_id); }), ahora: r && r.ahora };
}

/* Escrituras de un propietario: solo lo que su portal hace, y solo en su proyecto. null = puede; si no, el motivo. */
function alcPuedeEscribir_(alc, p) {
  if (alc.todo) return null;
  if (alc.rol !== 'dueno') return 'Sin permiso en Grow.';
  var a = String(p.action || ''), hoja = String(p.sheet || ''), d = p.data || {};
  var leer = function (n) { return readAll_(n); };
  if (a === 'saveState') return alcEsSuyo_(alc, p.proyecto_id) ? null : 'Ese proyecto no es tuyo.';
  if (a === 'notify' || a === 'enviarCorreo') {   // el aviso al equipo (por ejemplo, «cómo lo sueñas»)
    var to = Array.isArray(p.to) ? p.to : String(p.to || '').split(/[,;\s]+/);
    return to.filter(Boolean).every(function (t) { return String(t).trim().toLowerCase() === 'hola@spacioam.com'; }) ? null : 'Solo puedes escribirle a Spacio AM.';
  }
  if (a === 'uploadFile') return null;
  if (a === 'update' && hoja === '01_PROYECTOS') return alcEsSuyo_(alc, p.id) ? null : 'Ese proyecto no es tuyo.';
  if (a === 'create' && hoja === '13_CONTRATOS') return alcEsSuyo_(alc, d.proyecto_id) ? null : 'Ese proyecto no es tuyo.';
  if (a === 'update' && hoja === '13_CONTRATOS') {
    var c = alcFilas_(alc, hoja, readAll_(hoja), leer).filter(function (x) { return String(x.contrato_id) === String(p.id); })[0];
    return c && (d.proyecto_id == null || alcEsSuyo_(alc, d.proyecto_id)) ? null : 'Ese contrato no es tuyo.';
  }
  if (a === 'create' && hoja === '14_FIRMAS') {
    var mio = alcFilas_(alc, '13_CONTRATOS', readAll_('13_CONTRATOS'), leer).some(function (x) { return String(x.contrato_id) === String(d.contrato_id); });
    return mio ? null : 'Ese contrato no es tuyo.';
  }
  return 'Esa acción es solo para el equipo de Spacio AM.';
}
