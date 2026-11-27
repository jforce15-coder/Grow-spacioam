/* ══════════════════════════════════════════════════════════════
   Permisos · Spacio AM Contratos
   El administrador principal (jovalle@spacioam.com) es el único
   que puede otorgar o quitar permisos. Sin permisos, un usuario
   con sesión solo ve sus propios documentos.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var OWNER = "jovalle@spacioam.com";
  var KEY = "spacio_perms_v1";
  var CAPS = [
    ["generar", "Generar documentos", "Crear contratos y enviarlos a firma"],
    ["firmar", "Firmar por Spacio AM", "Estampar la firma de la empresa"],
    ["admin", "Administrar el registro", "Cancelar, anular, eliminar y ver la base de datos"],
  ];

  function norm(e) { return String(e || "").trim().toLowerCase(); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  function isOwner(email) { return norm(email) === OWNER; }

  function of(email) {
    if (isOwner(email)) return { generar: true, firmar: true, admin: true };
    var m = load()[norm(email)];
    return { generar: !!(m && m.generar), firmar: !!(m && m.firmar), admin: !!(m && m.admin) };
  }
  function can(email, cap) { return !!of(email)[cap]; }
  /* Alguien con cualquier permiso ve el panel completo. */
  function isStaff(email) { var p = of(email); return p.generar || p.firmar || p.admin; }

  function list() {
    var m = load();
    return Object.keys(m).sort().map(function (e) { return { email: e, perms: of(e) }; });
  }
  function set(email, perms) {
    var m = load();
    var e = norm(email);
    if (!e || isOwner(e)) return;
    if (!perms.generar && !perms.firmar && !perms.admin) delete m[e];
    else m[e] = { generar: !!perms.generar, firmar: !!perms.firmar, admin: !!perms.admin };
    save(m);
  }
  function remove(email) { var m = load(); delete m[norm(email)]; save(m); }

  window.SpacioPerms = { OWNER: OWNER, CAPS: CAPS, isOwner: isOwner, of: of, can: can, isStaff: isStaff, list: list, set: set, remove: remove, norm: norm };
})();
