/* ══════════════════════════════════════════════════════════════
   Spacio AM — Registro de documentos enviados a firma.
   Persistencia local (localStorage) con el mismo modelo que la
   hoja CONTRATOS/FIRMAS del ecosistema: un documento, uno o dos
   firmantes, historial y certificado.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var KEY = "spacio_docs_v1";
  var SEQ = "spacio_docs_seq_v1";

  var ESTADOS = {
    borrador:  { label: "Borrador",           cls: "borrador" },
    enviado:   { label: "Enviado a firma",    cls: "enviado" },
    visto:     { label: "Visto por firmante", cls: "visto" },
    parcial:   { label: "Firmado por 1 parte", cls: "parcial" },
    firmado:   { label: "Firmado",            cls: "firmado" },
    cancelado: { label: "Cancelado",          cls: "cancelado" },
    anulado:   { label: "Anulado",            cls: "anulado" },
  };

  var TIPO_LABEL = {
    limpieza: "Contrato de limpieza",
    mantenimiento: "Contrato de mantenimiento",
    personalizado: "Contrato personalizado",
    cohosting_individual: "Contrato de co-hosting · individual",
    cohosting_individual_lt: "Contrato de co-hosting · individual, largo plazo",
    cohosting_juridica: "Contrato de co-hosting · jurídica",
    cohosting_juridica_lt: "Contrato de co-hosting · jurídica, largo plazo",
    emp_promocion: "Carta de promoción",
    emp_contratacion: "Contrato laboral",
    emp_aumento: "Carta de aumento de salario",
    emp_goce: "Constancia de vacaciones",
    emp_bono_estrella: "Bono Estrella",
  };

  var CATEGORIA = function (tipo) {
    if (!tipo) return "—";
    if (tipo.indexOf("cohosting") === 0) return "Co-hosting";
    if (tipo.indexOf("emp_") === 0) return "Empleados";
    return "Servicios";
  };

  function read() {
    var list;
    try { list = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { list = []; }
    return repararParciales_(list);
  }
  /* Un documento con todas las firmas de la otra parte no puede quedarse en
     «Firmado por 1 parte»: la contrafirma de Spacio AM es automática (la copia
     ya salió a ambas partes). Aquí se completa lo que quedó a medias y se
     vuelve a publicar en el Sheet, una sola vez por documento. */
  var reparados_ = {};
  function repararParciales_(list) {
    var cambio = false;
    list = (list || []).map(function (d) {
      if (!d || d.estado !== "parcial" || faltanFirmas(d) > 0) return d;
      contrafirmar_(d);
      cambio = true;
      if (!reparados_[d.id] && typeof window !== "undefined" && window.SpacioSync && window.SpacioSync.push) {
        reparados_[d.id] = true;
        setTimeout(function () { try { window.SpacioSync.push("firmar", d); } catch (e) {} }, 0);
      }
      return d;
    });
    if (cambio) try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    return list;
  }
  function contrafirmar_(d, firma) {
    var ult = (d.firmantes || []).map(function (f) { return f.firma && f.firma.ts; }).filter(Boolean).sort().pop();
    d.firmaSpacio = { nombre: d.contraparteNombre, correo: d.contraparteEmail, img: (firma && firma.img) || null, metodo: (firma && firma.metodo) || "typed", ts: (firma && firma.ts) || ult || nowISO(), ip: "registrada al firmar" };
    d.estado = "firmado";
    d.certificado = d.certificado || ("SAM-FE-" + String(d.folio || "").replace("SAM-", "") + "-" + hash(String(d.folio) + String(d.firmanteEmail) + ((d.firmantes || [])[0] && (d.firmantes || [])[0].firma ? d.firmantes[0].firma.ts : "")).slice(0, 4));
    log(d, "Firmado por " + d.contraparteNombre + " (Spacio AM)");
    return log(d, "Copia firmada enviada a ambas partes");
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    return list;
  }
  function nextFolio() {
    var n = 0;
    try { n = parseInt(localStorage.getItem(SEQ) || "127", 10) + 1; localStorage.setItem(SEQ, String(n)); } catch (e) { n = Date.now() % 1000; }
    return "SAM-" + String(n).padStart(6, "0");
  }
  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return h.toString(16).toUpperCase().padStart(8, "0");
  }
  function nowISO() { return new Date().toISOString(); }

  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return d.getDate() + " " + MESES[d.getMonth()] + " " + d.getFullYear();
  }
  function fmtDateTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    var hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
    return fmtDate(iso) + ", " + hh + ":" + mm;
  }
  function relative(iso) {
    if (!iso) return "—";
    var diff = (Date.now() - new Date(iso).getTime()) / 86400000;
    if (diff < 1) return "hoy";
    if (diff < 2) return "ayer";
    return "hace " + Math.round(diff) + " días";
  }

  function all() {
    return read().sort(function (a, b) { return (b.creado || "").localeCompare(a.creado || ""); });
  }
  function get(id) { return read().filter(function (d) { return d.id === id; })[0] || null; }

  function log(doc, texto) {
    doc.historial = (doc.historial || []).concat([{ texto: texto, ts: nowISO() }]);
    return doc;
  }

  /* Crea el documento y lo deja "enviado a firma".
     payload.firmantes = [{nombre, email}] — 1 o 2 por la otra parte. */
  function create(payload) {
    var folio = nextFolio();
    var fs = (payload.firmantes && payload.firmantes.length
      ? payload.firmantes
      : [{ nombre: payload.firmanteNombre, email: payload.firmanteEmail }]
    ).filter(function (f) { return f && f.nombre && f.email; })
      .map(function (f, i) { return { id: "f" + (i + 1), nombre: f.nombre, email: String(f.email).toLowerCase(), firma: null }; });
    var doc = {
      id: "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      folio: folio,
      tipo: payload.tipo,
      tipoLabel: TIPO_LABEL[payload.tipo] || "Documento",
      categoria: CATEGORIA(payload.tipo),
      firmantes: fs,
      firmanteNombre: fs[0] ? fs[0].nombre : "",
      firmanteEmail: fs[0] ? fs[0].email : "",
      proyectoId: payload.proyectoId || "",
      proyectoNombre: payload.proyectoNombre || "",
      propiedad: payload.propiedad || "",
      origen: payload.origen || (window.SPACIO_DOCS_ORIGEN || "docs"),
      contraparteNombre: payload.contraparteNombre || "Juan Francisco Ovalle Lanuza",
      contraparteEmail: payload.contraparteEmail || "jovalle@spacioam.com",
      mensaje: payload.mensaje || "",
      data: payload.data || {},
      custom: payload.custom || null,
      edits: payload.edits || {},
      creado: nowISO(),
      enviado: nowISO(),
      visto: null,
      firmaSpacio: null,
      estado: "enviado",
      certificado: null,
      historial: [],
    };
    log(doc, "Documento generado por Administración");
    log(doc, "Solicitud de firma enviada a " + fs.map(function (f) { return f.email; }).join(" y "));
    write(read().concat([doc]));
    emit();
    return doc;
  }

  function update(id, fn) {
    var list = read();
    var out = null;
    list = list.map(function (d) {
      if (d.id !== id) return d;
      out = fn(Object.assign({}, d)) || d;
      return out;
    });
    write(list);
    emit();
    return out;
  }

  function markVisto(id) {
    return update(id, function (d) {
      if (d.estado !== "enviado") return d;
      d.visto = nowISO(); d.estado = "visto";
      return log(d, "El firmante abrió el documento");
    });
  }

  /* Firma de un firmante de la otra parte. */
  function signFirmante(id, firmanteId, firma) {
    return update(id, function (d) {
      var nombre = "";
      d.firmantes = (d.firmantes || []).map(function (f) {
        if (f.id !== firmanteId) return f;
        nombre = f.nombre;
        return Object.assign({}, f, {
          firma: { img: firma.img, metodo: firma.metodo, ts: nowISO(), ip: firma.ip || "registrada al firmar" },
        });
      });
      d.firmaFirmante = d.firmantes[0] && d.firmantes[0].firma
        ? Object.assign({ nombre: d.firmantes[0].nombre, correo: d.firmantes[0].email }, d.firmantes[0].firma)
        : null;
      d.estado = "parcial";
      log(d, "Firmado por " + (nombre || d.firmanteNombre));
      /* Última firma de la otra parte → Spacio AM contrafirma en el mismo paso. */
      if (faltanFirmas(d) === 0) contrafirmar_(d);
      return d;
    });
  }

  function faltanFirmas(d) {
    return (d.firmantes || []).filter(function (f) { return !f.firma; }).length;
  }

  /* Contrafirma de Spacio AM → documento completo + certificado. */
  function signSpacio(id, firma) {
    return update(id, function (d) {
      if (d.estado === "firmado" && d.firmaSpacio) {
        /* Ya se contrafirmó automáticamente; solo se conserva la imagen si llega una mejor. */
        if (firma && firma.img && !d.firmaSpacio.img) { d.firmaSpacio.img = firma.img; d.firmaSpacio.metodo = firma.metodo || d.firmaSpacio.metodo; }
        return d;
      }
      return contrafirmar_(d, Object.assign({}, firma || {}, { ts: nowISO() }));
    });
  }

  function cancel(id, motivo) {
    return update(id, function (d) {
      d.estado = "cancelado"; d.motivo = motivo || "";
      return log(d, "Envío cancelado" + (motivo ? " · " + motivo : ""));
    });
  }
  function voidDoc(id, motivo) {
    return update(id, function (d) {
      d.estado = "anulado"; d.motivo = motivo || "";
      return log(d, "Documento anulado" + (motivo ? " · " + motivo : ""));
    });
  }
  function remove(id) {
    write(read().filter(function (d) { return d.id !== id; }));
  }
  function resend(id) {
    return update(id, function (d) {
      d.enviado = nowISO();
      if (d.estado === "cancelado") d.estado = "enviado";
      return log(d, "Solicitud reenviada a " + d.firmanteEmail);
    });
  }

  /* ── Firmas guardadas por usuario ─────────────────────────
     Al firmar se pregunta si desea guardar la firma; si acepta,
     el siguiente contrato solo requiere presionar "Firmar".   */
  var FKEY = "spacio_firmas_v1";
  function firmasRead() { try { return JSON.parse(localStorage.getItem(FKEY) || "{}"); } catch (e) { return {}; } }
  var Firmas = {
    get: function (email) { return firmasRead()[String(email || "").toLowerCase()] || null; },
    save: function (email, firma) {
      var all = firmasRead();
      all[String(email || "").toLowerCase()] = { img: firma.img, metodo: firma.metodo, ts: nowISO() };
      try { localStorage.setItem(FKEY, JSON.stringify(all)); } catch (e) {}
      return all[String(email || "").toLowerCase()];
    },
    remove: function (email) {
      var all = firmasRead(); delete all[String(email || "").toLowerCase()];
      try { localStorage.setItem(FKEY, JSON.stringify(all)); } catch (e) {}
    },
    all: firmasRead,
  };
  window.Firmas = Firmas;

  /* ── Estado inicial coherente ─────────────────────────────
     Si el registro está vacío, se siembra UN ejemplo pendiente
     de firma (marcado como demo) para que el listado, los correos
     y la vista previa de firma tengan datos que leer. Si quedó el
     documento de prueba ya firmado, se devuelve a "enviado".      */
  (function seed() {
    if (window.SPACIO_DOCS_NO_SEED) return;
    var list = read();
    var demo = list.filter(function (d) { return d.demo || d.firmanteEmail === "gabriel@ejemplo.com"; })[0];
    if (demo && list.length === 1 && (!demo.firmantes || !demo.seedV2)) {
      demo.demo = true; demo.seedV2 = true; demo.estado = "enviado"; demo.visto = null;
      demo.firmantes = [{ id: "f1", nombre: demo.firmanteNombre, email: demo.firmanteEmail, firma: null }];
      demo.firmaFirmante = null; demo.firmaSpacio = null; demo.certificado = null; demo.motivo = "";
      demo.historial = (demo.historial || []).slice(0, 2);
      write(list);
      return;
    }
    if (list.length) return;
    var doc = create({
      tipo: "emp_contratacion",
      firmanteNombre: "GABRIEL ASTURIAS MOREIRA",
      firmanteEmail: "gabriel@ejemplo.com",
      data: {
        empNombre: "GABRIEL ASTURIAS MOREIRA", empDPI: "3057 90773 0301", empEdad: "24",
        empEstado: "Soltero(a)", empNacionalidad: "guatemalteco(a)", empProfesion: "Bachiller",
        empDomicilio: "Jocotenango, Sacatepéquez", empCargo: "Happiness Hero", empSalario: "3,124.42",
        empFechaInicio: "2026-08-01", empLugarTrabajo: "Km 77, RN-14, San Lorenzo El Cubo",
        contratanteNombre: "JUAN FRANCISCO OVALLE LANUZA", contratanteEdad: "37",
        contratanteEstado: "Casado", contratanteDPI: "1791 74304 0101",
        fecha: new Date().toISOString().slice(0, 10), actaFecha: "30 de marzo de 2023",
        actaNotario: "Irving Giovanni Tejada Escobar", regNumero: "697958", regFolio: "663", regLibro: "816",
      },
      edits: {},
      mensaje: "",
    });
    update(doc.id, function (d) { d.demo = true; d.seedV2 = true; return d; });
  })();

  var subs = [];
  function emit() { (subs || []).slice().forEach(function (f) { try { f(); } catch (e) {} }); }
  function onChange(fn) { subs = (subs || []).concat([fn]); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; }

  /* Reemplaza el registro local con lo que trae la hoja compartida.
     Conserva los locales que la hoja todavía no conoce (folio nuevo). */
  function replaceAll(remotos) {
    if (!remotos || !remotos.length) { emit(); return read(); }
    var byFolio = {};
    remotos.forEach(function (d) { if (d && d.folio) byFolio[d.folio] = d; });
    var locales = read().filter(function (d) { return !byFolio[d.folio]; });
    var out = remotos.concat(locales);
    write(out); emit();
    return out;
  }
  function upsert(doc) {
    if (!doc || !doc.folio) return null;
    var list = read();
    var i = -1;
    list.forEach(function (d, j) { if (d.folio === doc.folio) i = j; });
    if (i < 0) list.push(doc); else list[i] = doc;
    write(list); emit();
    return doc;
  }

  window.Docs = {
    onChange: onChange, emit: emit, replaceAll: replaceAll, upsert: upsert,
    ESTADOS: ESTADOS, TIPO_LABEL: TIPO_LABEL, CATEGORIA: CATEGORIA,
    all: all, get: get, create: create, update: update, remove: remove, resend: resend,
    markVisto: markVisto, signFirmante: signFirmante, signSpacio: signSpacio, faltanFirmas: faltanFirmas,
    cancel: cancel, voidDoc: voidDoc,
    fmtDate: fmtDate, fmtDateTime: fmtDateTime, relative: relative, hash: hash,
  };
})();
