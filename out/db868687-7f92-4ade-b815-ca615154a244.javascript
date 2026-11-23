/* ══════════════════════════════════════════════════════════════
   Spacio AM — Base de datos y archivo de CONTRATOS (compartido)
   Este archivo es idéntico en las dos apps (Grow y Docs): ambas
   escriben en la MISMA hoja y archivan en la MISMA carpeta, así
   que un contrato no tiene diferencia según dónde se generó.

   · Hoja de cálculo  → registro legible (CONTRATOS · FIRMAS)
   · Carpeta de Drive → PDF firmado + certificado
   · Columna Registro → el documento completo en JSON, para que
                        cualquiera de las dos apps lo reconstruya
                        tal cual (firmas, historial, ediciones).

   Endpoint: window.SPACIO_DOCS_ENDPOINT, o el guardado en Setup.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SHEET_ID = "1r__zfIAFLr6mxcuAN6HwQF1OmLTG-lce-jv_naGRDVU";
  var FOLDER_ID = "1GzxF5El3YaT0UVZLMBeRIfwXgzZxyqSa";
  var EP_KEY = "spacio_sync_endpoint_v1";
  var EP_DEFAULT = "https://script.google.com/macros/s/AKfycbz2_KDtQ5Wm8LRiyEwCXxsHx_DtE4pe2b_aJlLFrN0zu7UvLrnh2PM-6VzbEf00oekW_Q/exec";
  var TK_KEY = "spacio_sync_token_v1";
  function token() {
    var ls = "";
    try { ls = localStorage.getItem(TK_KEY) || ""; } catch (e) {}
    return ls || window.SPACIO_DOCS_TOKEN || "Spacio2026!";
  }
  function setToken(t) { try { localStorage.setItem(TK_KEY, t || ""); } catch (e) {} }

  var MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  function F() { return window.Docs; }
  function endpoint() {
    var ls = "";
    try { ls = localStorage.getItem(EP_KEY) || ""; } catch (e) {}
    return ls || window.SPACIO_DOCS_ENDPOINT || EP_DEFAULT;
  }
  function setEndpoint(url) { try { localStorage.setItem(EP_KEY, url || ""); } catch (e) {} }

  /* Nombre y ruta del archivo en Drive — legible, ordenable por folio */
  function fileName(doc) {
    var nm = (doc.firmanteNombre || "Sin nombre").split(/\s+/).slice(0, 3).join(" ");
    return doc.folio + " — " + doc.tipoLabel + " — " + nm + ".pdf";
  }
  function drivePath(doc) {
    var d = new Date(doc.enviado || doc.creado || Date.now());
    return ["Contratos firmados", String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, "0") + " " + MESES[d.getMonth()], doc.categoria, fileName(doc)];
  }

  function estadoLbl(doc) {
    var e = F().ESTADOS[doc.estado];
    return e ? e.label : doc.estado;
  }
  function metodoLbl(m) { return m === "drawn" ? "Trazada" : m === "uploaded" ? "Imagen" : "Escrita"; }

  /* ── Hoja CONTRATOS ─────────────────────────────────────── */
  var CONTRATOS = {
    nombre: "CONTRATOS",
    nota: "Una fila por documento, sin importar en qué app se generó. Ordenada del más reciente al más antiguo.",
    cols: [
      ["Folio", "SAM-000128", "Identificador legible del documento"],
      ["Fecha de envío", "14 ago 2026, 10:32", "Cuándo se envió a firma"],
      ["Categoría", "Co-hosting", "Servicios · Co-hosting · Empleados"],
      ["Documento", "Contrato de co-hosting · individual", "Tipo de documento generado"],
      ["Firmantes", "Marcel Reiche", "1 o 2 por la otra parte, separados por ·"],
      ["Correos", "marcel@ejemplo.com", "Correo de cada firmante"],
      ["Por Spacio AM", "Juan Francisco Ovalle Lanuza", "Quien contrafirma"],
      ["Estado", "Firmado", "Enviado · Visto · Firmado por 1 parte · Firmado · Cancelado · Anulado"],
      ["Firmas completas", "2 de 2", "Avance de firmas"],
      ["Fecha de firma", "14 ago 2026, 11:08", "Última firma registrada"],
      ["Certificado", "SAM-FE-000128-A1F4", "Código del certificado de firma"],
      ["Archivo en Drive", "SAM-000128 — Contrato de co-hosting — Marcel Reiche.pdf", "PDF firmado + certificado"],
      ["Carpeta", "Contratos firmados / 2026 / 08 Agosto / Co-hosting", "Ruta dentro de la carpeta de contratos"],
      ["Notas", "", "Motivo de cancelación o anulación, si aplica"],
      ["Proyecto", "Brunelo 905", "Proyecto de Grow al que pertenece, si aplica"],
      ["Propiedad", "Brunelo · Apto. 905, nivel 9", "Propiedad que cubre el contrato"],
      ["Generado en", "Grow", "App donde se generó: Grow o Docs"],
    ],
    row: function (doc) {
      var fs = doc.firmantes || [];
      var ultima = fs.filter(function (f) { return f.firma; }).map(function (f) { return f.firma.ts; })
        .concat(doc.firmaSpacio ? [doc.firmaSpacio.ts] : []).sort().pop();
      var path = drivePath(doc);
      return [
        doc.folio,
        F().fmtDateTime(doc.enviado),
        doc.categoria,
        doc.tipoLabel,
        fs.map(function (f) { return f.nombre; }).join(" · "),
        fs.map(function (f) { return f.email; }).join(" · "),
        doc.contraparteNombre,
        estadoLbl(doc),
        (fs.filter(function (f) { return f.firma; }).length + (doc.firmaSpacio ? 1 : 0)) + " de " + (fs.length + 1),
        ultima ? F().fmtDateTime(ultima) : "—",
        doc.certificado || "—",
        doc.estado === "firmado" ? fileName(doc) : "—",
        path.slice(0, 4).join(" / "),
        doc.motivo || "",
        doc.proyectoNombre || "—",
        doc.propiedad || "—",
        doc.origen === "grow" ? "Grow" : "Docs",
      ];
    },
  };

  /* ── Hoja FIRMAS ────────────────────────────────────────── */
  var FIRMAS = {
    nombre: "FIRMAS",
    nota: "Una fila por firmante y documento — es la evidencia del certificado.",
    cols: [
      ["Folio", "SAM-000128", "Documento al que pertenece la firma"],
      ["Parte", "Firmante 1", "Firmante 1 · Firmante 2 · Spacio AM"],
      ["Nombre", "Marcel Reiche", "Nombre tal como fue firmado"],
      ["Correo", "marcel@ejemplo.com", "Correo del enlace de firma"],
      ["Estado", "Firmado", "Pendiente · Firmado"],
      ["Fecha y hora", "14 ago 2026, 10:32", "Momento exacto de la firma"],
      ["Método", "Trazada", "Trazada · Imagen · Escrita"],
      ["Origen", "registrado al firmar", "Registro de origen de la firma"],
      ["Huella del documento", "A1F4C09B·77D2E410", "Hash del contenido firmado"],
      ["Firma guardada", "Sí", "Si el firmante guardó su firma para futuros contratos"],
    ],
    rows: function (doc) {
      var huella = F().hash(doc.folio + doc.tipo + JSON.stringify(doc.data)).slice(0, 8) + "·" + F().hash(doc.firmanteEmail || "").slice(0, 8);
      var out = (doc.firmantes || []).map(function (f, i) {
        var guardada = window.Firmas && window.Firmas.get(f.email);
        return [
          doc.folio,
          "Firmante " + (i + 1),
          f.nombre,
          f.email,
          f.firma ? "Firmado" : "Pendiente",
          f.firma ? F().fmtDateTime(f.firma.ts) : "—",
          f.firma ? metodoLbl(f.firma.metodo) : "—",
          f.firma ? (f.firma.ip || "registrado al firmar") : "—",
          huella,
          guardada ? "Sí" : "No",
        ];
      });
      out.push([
        doc.folio, "Spacio AM", doc.contraparteNombre, doc.contraparteEmail,
        doc.firmaSpacio ? "Firmado" : "Pendiente",
        doc.firmaSpacio ? F().fmtDateTime(doc.firmaSpacio.ts) : "—",
        doc.firmaSpacio ? metodoLbl(doc.firmaSpacio.metodo) : "—",
        doc.firmaSpacio ? (doc.firmaSpacio.ip || "registrado al firmar") : "—",
        huella, "Sí",
      ]);
      return out;
    },
  };

  function tabla(hoja, docs) {
    var body = hoja === CONTRATOS
      ? docs.map(function (d) { return CONTRATOS.row(d); })
      : docs.reduce(function (acc, d) { return acc.concat(FIRMAS.rows(d)); }, []);
    return { head: hoja.cols.map(function (c) { return c[0]; }), body: body };
  }

  function toCSV(hoja, docs) {
    var t = tabla(hoja, docs);
    var esc = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    return [t.head.map(esc).join(",")].concat(t.body.map(function (r) { return r.map(esc).join(","); })).join("\n");
  }
  function toTSV(hoja, docs) {
    var t = tabla(hoja, docs);
    return [t.head.join("\t")].concat(t.body.map(function (r) { return r.join("\t"); })).join("\n");
  }
  function download(hoja, docs) {
    var blob = new Blob(["\ufeff" + toCSV(hoja, docs)], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Spacio AM — " + hoja.nombre + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 400);
  }

  function post(body) {
    var url = endpoint();
    if (!url) return Promise.resolve({ ok: false, pending: true, reason: "sin_endpoint" });
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ token: token() }, body)),
    }).then(function (r) { return r.json(); }).catch(function (e) { return { ok: false, error: String(e) }; });
  }

  /* Escritura: la fila legible de CONTRATOS/FIRMAS y el documento completo
     en la hoja DOCUMENTOS, que es la que leen las dos apps. */
  function push(accion, doc) {
    if (!doc) return Promise.resolve({ ok: false });
    return Promise.all([
      post({ action: "upsertContrato", contrato: CONTRATOS.row(doc), firmas: FIRMAS.rows(doc) }),
      post({ action: "guardarDoc", doc: doc }),
    ]).then(function (r) { return { ok: !!(r[0] && r[0].ok && r[1] && r[1].ok), contrato: r[0], doc: r[1] }; });
  }

  /* Lectura: trae TODOS los contratos de la hoja (los de las dos apps)
     y reconstruye el registro local desde la columna Registro. */
  function pull() {
    return post({ action: "listarDocs" }).then(function (r) {
      if (!r || !r.ok) return { ok: false, docs: [] };
      var docs = (r.docs || []).map(function (d) {
        if (typeof d === "string") { try { return JSON.parse(d); } catch (e) { return null; } }
        return d;
      }).filter(Boolean);
      if (F() && F().replaceAll) F().replaceAll(docs);
      return { ok: true, docs: docs };
    });
  }

  /* Archivo: el PDF firmado + certificado va a la carpeta de contratos. */
  function archivar(doc, base64) {
    return post({
      action: "archivarPDF",
      archivo: fileName(doc), carpeta: drivePath(doc).slice(0, 4),
      pdfBase64: base64,
    });
  }

  /* Borra el documento del registro compartido (no solo del navegador). */
  function borrar(doc) {
    return post({ action: "borrarDoc", id: doc && doc.id });
  }

  /* Correo: sale del mismo remitente y con la misma plantilla en las dos apps.
     id = solicitudFirma · recordatorio · copiaFirmada · cancelado · solicitudDatos */
  function correo(id, doc, extra) {
    if (!window.SpacioEmails) return Promise.resolve({ ok: false, error: "sin_plantillas" });
    var F = window.Docs;
    var d = Object.assign({
      nombre: doc.firmanteNombre, correo: doc.firmanteEmail,
      documento: doc.tipoLabel, folio: doc.folio,
      contraparte: doc.contraparteNombre, certificado: doc.certificado || "",
      fechaFirmante: doc.firmaFirmante ? F.fmtDateTime(doc.firmaFirmante.ts) : "pendiente",
      fechaSpacio: doc.firmaSpacio ? F.fmtDateTime(doc.firmaSpacio.ts) : "pendiente",
      enviado: F.relative(doc.enviado), fecha: F.fmtDateTime(doc.enviado),
      url: (window.SPACIO_FIRMA_BASE || "https://docs.spacioam.com/index.html") + "?firmar=" + doc.id,
    }, extra || {});
    var ASUNTOS = {
      solicitudFirma: "Tu " + (doc.tipoLabel || "documento").toLowerCase() + " está listo para firmar",
      recordatorioFirma: "Recordatorio: tu " + (doc.tipoLabel || "documento").toLowerCase() + " sigue pendiente de firma",
      copiaFirmada: "Tu copia firmada · " + doc.folio,
      envioCancelado: "Cancelamos el envío de tu " + (doc.tipoLabel || "documento").toLowerCase(),
      solicitudDatos: "Necesitamos unos datos para tu " + (doc.tipoLabel || "documento").toLowerCase(),
    };
    var m = window.SpacioEmails.build(id, d, {});
    var destinos = (extra && extra.to) ||
      (doc.firmantes || []).map(function (f) { return f.email; }).join(",");
    if (!destinos) return Promise.resolve({ ok: false, error: "sin_destino" });
    return post({
      action: "enviarCorreo", to: destinos,
      asunto: (extra && extra.asunto) || ASUNTOS[id] || ("Spacio AM · " + doc.tipoLabel),
      html: m.html, texto: m.text || "",
      bcc: (extra && extra.bcc) || doc.contraparteEmail || "",
      pdfBase64: (extra && extra.pdfBase64) || "", pdfNombre: (extra && extra.pdfNombre) || "",
    });
  }

  /* Permisos y firmas guardadas viven también en la hoja, para que valgan
     en cualquier dispositivo y en las dos apps. */
  function permisosRemotos() {
    return post({ action: "permisos", modo: "leer" }).then(function (r) {
      if (r && r.ok && r.permisos) window.SPACIO_PERMS_REMOTOS = r.permisos;
      return r;
    });
  }
  function guardarPermiso(correoUsr, perms) {
    return post({ action: "permisos", modo: "guardar", correo: correoUsr,
      generar: !!perms.generar, firmar: !!perms.firmar, admin: !!perms.admin });
  }
  function firmaRemota(correoUsr) {
    return post({ action: "firmaGuardada", modo: "leer", correo: correoUsr });
  }
  function guardarFirmaRemota(correoUsr, nombre, img) {
    return post({ action: "firmaGuardada", modo: "guardar", correo: correoUsr, nombre: nombre, img: img });
  }

  window.SpacioSync = {
    SHEET_ID: SHEET_ID, FOLDER_ID: FOLDER_ID,
    SHEET_URL: "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/edit",
    FOLDER_URL: "https://drive.google.com/drive/folders/" + FOLDER_ID,
    HOJAS: [CONTRATOS, FIRMAS], CONTRATOS: CONTRATOS, FIRMAS: FIRMAS,
    tabla: tabla, toCSV: toCSV, toTSV: toTSV, download: download,
    push: push, pull: pull, archivar: archivar, borrar: borrar, correo: correo, post: post,
    permisosRemotos: permisosRemotos, guardarPermiso: guardarPermiso,
    firmaRemota: firmaRemota, guardarFirmaRemota: guardarFirmaRemota,
    token: token, setToken: setToken,
    fileName: fileName, drivePath: drivePath,
    endpoint: endpoint, setEndpoint: setEndpoint,
  };
})();
