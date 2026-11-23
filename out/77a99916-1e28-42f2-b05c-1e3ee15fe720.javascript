/* ══════════════════════════════════════════════════════════════
   Spacio AM — Correos transaccionales de firma electrónica.
   Misma shell reutilizable del sistema de correos de las apps
   (EPI / mi.spacioam): tablas role="presentation", CSS inline,
   600px, wordmark serif + eslogan, CTA peach, pie de marca.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var C = { bg: "#FAFAFA", card: "#FFFFFF", ink: "#3E3F3F", earth: "#938B8A", divider: "#D8D4CE", peach: "#E9826A", beige: "#F5F3F0" };
  var SERIF = "Georgia, 'Times New Roman', serif";
  var SANS = "Helvetica, Arial, sans-serif";
  var SLOGAN = "Hay espacios en donde sueñas con volver a despertar";
  var CONTACT = "hola@spacioam.com  ·  +502 5690 9499";
  var FROM_NAME = "Spacio AM";
  var FROM_EMAIL = "hola@spacioam.com";

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Shell idéntica a la de mi-spacioam ("Correos a socios"):
     wordmark, eyebrow, titular serif centrado, banner de imagen,
     párrafos, banda opcional, tabla beige, CTA píldora ink,
     despedida, nota al pie y pie de marca. */
  /* Las imágenes se sirven siempre desde la app de contratos, para que
     el correo salga idéntico se envíe desde Grow o desde Docs. */
  var HOST = window.SPACIO_MAIL_HOST || "https://docs.spacioam.com/";
  var LOGO = HOST + "assets/email/logo-wordmark.png";
  var IMG = HOST + "assets/email/";

  function emailShell(o) {
    o = o || {};
    var eyebrow = o.eyebrow || "", heading = o.heading || "", paras = o.paras || [], rows = o.rows || [];
    var cta = o.cta || null, footerNote = o.footerNote || "", signoff = o.signoff || "Con cariño,\nEl equipo de Spacio AM";
    var preheader = o.preheader || paras[0] || heading;
    var base = o.base || "";
    var B = [];
    B.push('<tr><td align="center" style="padding:44px 32px 30px"><img src="' + LOGO + '" width="150" alt="Spacio AM" style="display:block;margin:0 auto;border:0;width:150px;height:auto"></td></tr>');
    if (eyebrow)
      B.push('<tr><td align="center" style="padding:0 40px 12px"><div style="font-family:' + SANS + ';font-size:10px;font-weight:600;letter-spacing:.32em;text-transform:uppercase;color:' + (o.urgente ? C.peach : C.earth) + '">' + esc(eyebrow) + '</div></td></tr>');
    if (heading)
      B.push('<tr><td align="center" style="padding:0 40px 22px"><h1 style="margin:0;font-family:' + SERIF + ';font-weight:400;font-size:30px;line-height:1.25;color:' + C.ink + ';letter-spacing:-.01em">' + esc(heading) + '</h1></td></tr>');
    if (o.image)
      B.push('<tr><td style="padding:6px 32px 26px"><img src="' + IMG + o.image + '" alt="" style="display:block;width:100%;height:auto;border-radius:18px"></td></tr>');
    paras.forEach(function (p) {
      B.push('<tr><td style="padding:0 44px 16px"><p style="margin:0;font-family:' + SANS + ';font-size:14px;line-height:1.85;letter-spacing:.04em;color:' + C.ink + '">' + esc(p) + '</p></td></tr>');
    });
    if (o.band)
      B.push('<tr><td style="padding:12px 32px 24px"><img src="' + IMG + o.band + '" alt="" style="display:block;width:100%;height:auto;border-radius:14px"></td></tr>');
    if (rows.length) {
      var tr = rows.map(function (r, i) {
        var l = i === rows.length - 1 ? "none" : "1px solid " + C.divider;
        return '<tr><td style="padding:13px 0;border-bottom:' + l + ';font-family:' + SANS + ';font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:' + C.earth + '">' + esc(r[0]) + '</td>' +
          '<td align="right" style="padding:13px 0;border-bottom:' + l + ';font-family:' + SANS + ';font-size:14px;font-weight:600;color:' + C.ink + '">' + esc(r[1]) + '</td></tr>';
      }).join("");
      B.push('<tr><td style="padding:10px 44px 26px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.beige + ';border-radius:16px;padding:6px 20px">' + tr + '</table></td></tr>');
    }
    if (o.stops) {
      var c = o.stops.map(function (s) {
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;background:' + C.bg + ';border:1px solid ' + (s.urgente ? C.peach : C.divider) + ';border-radius:14px"><tr>' +
          '<td width="46" align="center" valign="top" style="padding:16px 0 16px 16px;font-family:' + SERIF + ';font-size:22px;color:' + (s.urgente ? C.peach : C.earth) + '">' + esc(s.n) + '</td>' +
          '<td style="padding:16px 18px 16px 6px"><div style="font-family:' + SERIF + ';font-size:17px;color:' + C.ink + ';line-height:1.35">' + esc(s.titulo) + '</div>' +
          '<div style="margin-top:5px;font-family:' + SANS + ';font-size:11.5px;letter-spacing:.08em;color:' + C.earth + '">' + esc(s.meta) + '</div></td></tr></table>';
      }).join("");
      B.push('<tr><td style="padding:0 44px 22px">' + c + '</td></tr>');
    }
    if (cta && cta.label)
      B.push('<tr><td align="center" style="padding:8px 44px 34px"><a href="' + esc(cta.url || "#") + '" style="display:inline-block;background:' + C.ink + ';color:' + C.bg + ';font-family:' + SANS + ';font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;text-decoration:none;padding:15px 34px;border-radius:999px">' + esc(cta.label) + '</a></td></tr>');
    if (signoff) {
      var l = signoff.split("\n");
      B.push('<tr><td style="padding:0 44px 8px"><div style="font-family:' + SERIF + ';font-size:17px;color:' + C.ink + ';line-height:1.4">' + esc(l[0]) + '</div>' +
        '<div style="margin-top:4px;font-family:' + SANS + ';font-size:12px;letter-spacing:.1em;color:' + C.earth + '">' + esc(l.slice(1).join(" · ")) + '</div></td></tr>');
    }
    if (footerNote)
      B.push('<tr><td style="padding:20px 44px 0"><div style="border-top:1px solid ' + C.divider + ';padding-top:16px;font-family:' + SANS + ';font-size:11px;line-height:1.7;letter-spacing:.05em;color:' + C.earth + '">' + esc(footerNote) + '</div></td></tr>');
    B.push('<tr><td align="center" style="padding:32px 44px 46px"><div style="font-family:' + SANS + ';font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:' + C.earth + '">Spacio AM · Guatemala</div>' +
      '<div style="margin-top:8px;font-family:' + SANS + ';font-size:10.5px;letter-spacing:.06em;color:' + C.earth + '">' + esc(CONTACT) + '</div></td></tr>');

    var H = [];
    H.push('<!doctype html><html lang="es"><head><meta charset="utf-8">');
    H.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
    H.push('<meta name="color-scheme" content="light only"><title>' + esc(heading) + '</title></head>');
    H.push('<body style="margin:0;padding:0;background:#EDEAE6;">');
    H.push('<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EDEAE6;font-size:1px;line-height:1px;">' + esc(preheader) + '</div>');
    H.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EDEAE6;margin:0;padding:0"><tr><td align="center" style="padding:28px 14px 40px">');
    H.push('<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:' + C.bg + ';border-radius:20px;overflow:hidden;box-shadow:0 4px 16px rgba(62,63,63,.05)">');
    H.push(B.join(""));
    H.push('</table></td></tr></table></body></html>');

    var T = ["SPACIO AM", SLOGAN, ""];
    if (eyebrow) T.push(eyebrow.toUpperCase());
    if (heading) { T.push(heading); T.push(""); }
    paras.forEach(function (p) { T.push(p); T.push(""); });
    if (rows.length) { T.push("— — —"); rows.forEach(function (r) { T.push(r[0] + ": " + r[1]); }); T.push(""); }
    if (o.stops) { o.stops.forEach(function (s) { T.push(s.n + ". " + s.titulo + " — " + s.meta); }); T.push(""); }
    if (cta && cta.label) { T.push(cta.label + ": " + (cta.url || "")); T.push(""); }
    if (footerNote) { T.push(footerNote); T.push(""); }
    signoff.split("\n").forEach(function (x) { T.push(x); });
    T.push("", CONTACT, "Guatemala · hospitalidad boutique");
    return { html: H.join(""), text: T.join("\n") };
  }

  function firstName(n) { return String(n || "").trim().split(/\s+/)[0] || "hola"; }
  function cap(n) {
    return String(n || "").toLowerCase().split(/\s+/).map(function (w) { return w ? w[0].toUpperCase() + w.slice(1) : w; }).join(" ");
  }

  var EMAILS = {
    /* 1 · Solicitud de firma → al firmante */
    solicitudFirma: function (d) {
      d = d || {};
      return emailShell({
        base: d.base || "",
        eyebrow: "Documento para firmar",
        image: "hero-firma.png",
        heading: "Tienes un documento listo para revisar y firmar",
        preheader: "Revisa y firma tu " + (d.documento || "documento") + ". Toma menos de dos minutos.",
        paras: [
          "Hola " + cap(firstName(d.nombre || "Gabriel")) + ", preparamos tu " + (d.documento || "contrato") + " y lo dejamos listo para tu revisión.",
          "Ábrelo con el botón de abajo: podrás leerlo completo, firmarlo desde tu teléfono o computadora y quedarte con una copia en PDF.",
        ],
        rows: [
          ["Documento", d.documento || "Contrato de servicios"],
          ["Enviado por", d.remitente || "Spacio AM · Administración"],
          ["Folio", d.folio || "SAM-000128"],
          ["Válido hasta", d.vence || "en 14 días"],
        ],
        cta: { label: "Revisar y firmar", url: d.url || "https://docs.spacioam.com/firmar" },
        footerNote: "Este enlace es personal: solo funciona con tu correo (" + (d.correo || "correo@ejemplo.com") + "). Si algo en el documento no coincide con lo que conversamos, respóndenos este correo antes de firmar.",
        signoff: "Con cariño,\nEl equipo de Spacio AM",
      });
    },

    /* 2 · Recordatorio */
    recordatorioFirma: function (d) {
      d = d || {};
      return emailShell({
        base: d.base || "",
        eyebrow: "Recordatorio amable",
        urgente: true,
        band: "band-espera.png",
        heading: "Tu documento sigue esperando tu firma",
        preheader: "Tu " + (d.documento || "documento") + " sigue pendiente de firma.",
        paras: [
          "Hola " + cap(firstName(d.nombre || "Gabriel")) + ", tu " + (d.documento || "documento") + " sigue pendiente de firma.",
          "Cuando tengas un momento, ábrelo y déjalo listo. Si preferís que lo revisemos juntos, escríbenos y lo vemos.",
        ],
        rows: [
          ["Documento", d.documento || "Contrato de servicios"],
          ["Enviado", d.enviado || "hace 3 días"],
          ["Folio", d.folio || "SAM-000128"],
        ],
        cta: { label: "Abrir y firmar", url: d.url || "https://docs.spacioam.com/firmar" },
        signoff: "Gracias,\nEl equipo de Spacio AM",
      });
    },

    /* 3 · Copia firmada → a las dos partes */
    copiaFirmada: function (d) {
      d = d || {};
      return emailShell({
        base: d.base || "",
        eyebrow: "Documento firmado",
        image: "hero-copia.png",
        heading: "Listo: aquí está tu copia firmada",
        preheader: "Ambas partes firmaron. Adjuntamos la copia en PDF.",
        paras: [
          "Hola " + cap(firstName(d.nombre || "Gabriel")) + ", ambas partes firmaron el documento. Adjuntamos la copia en PDF con el certificado de firma electrónica.",
          "Guárdala para tu registro. También queda disponible en el panel de contratos de Spacio AM.",
        ],
        rows: [
          ["Documento", d.documento || "Contrato de servicios"],
          ["Firmado por", (d.nombre || "Gabriel Asturias Moreira") + " · " + (d.fechaFirmante || "14 ago 2026, 10:32")],
          ["Firmado por", (d.contraparte || "Juan Francisco Ovalle Lanuza") + " · " + (d.fechaSpacio || "14 ago 2026, 11:08")],
          ["Certificado", d.certificado || "SAM-FE-000128-A1F4"],
        ],
        cta: { label: "Descargar copia en PDF", url: d.url || "https://docs.spacioam.com/copia" },
        footerNote: "El certificado registra fecha, hora, correo y huella del documento de cada firma. Si detectas algo distinto a lo acordado, escríbenos y lo revisamos.",
        signoff: "Con cariño,\nEl equipo de Spacio AM",
      });
    },

    /* 4 · Envío cancelado / documento anulado */
    envioCancelado: function (d) {
      d = d || {};
      return emailShell({
        base: d.base || "",
        eyebrow: "Envío cancelado",
        band: "band-cerrado.png",
        heading: "Cancelamos la solicitud de firma",
        preheader: "El enlace de firma de tu documento quedó sin efecto.",
        paras: [
          "Hola " + cap(firstName(d.nombre || "Gabriel")) + ", cancelamos la solicitud de firma de tu " + (d.documento || "documento") + ". El enlace anterior ya no funciona.",
          d.motivo ? "Motivo: " + d.motivo : "Si corresponde, te enviaremos una versión corregida en breve.",
        ],
        rows: [
          ["Documento", d.documento || "Contrato de servicios"],
          ["Folio", d.folio || "SAM-000128"],
          ["Cancelado", d.fecha || "14 ago 2026, 12:20"],
        ],
        signoff: "Gracias por tu comprensión,\nEl equipo de Spacio AM",
      });
    },
    /* 5 · Solicitud de datos al propietario / firmante */
    solicitudDatos: function (d) {
      d = d || {};
      return emailShell({
        base: d.base || "",
        eyebrow: "Necesitamos unos datos",
        image: "hero-datos.png",
        heading: "Un par de datos para preparar tu contrato",
        preheader: "Compártenos tus datos y preparamos tu " + (d.documento || "contrato") + ".",
        paras: [
          "Hola " + cap(firstName(d.nombre || "Marcel")) + ", para dejar listo tu " + (d.documento || "contrato de co-hosting") + " necesitamos confirmar unos datos.",
          "Llénalos con el botón de abajo — toma dos minutos y puedes adjuntar la foto de tu DPI para que los tomemos de ahí.",
        ],
        rows: (d.campos && d.campos.length ? d.campos : [
          ["Datos personales", "Nombre completo, DPI, edad, estado civil"],
          ["Domicilio", "Dirección y municipio"],
          ["Propiedad", "Dirección, edificio, apartamento y nivel"],
          ["Facturación", "Régimen fiscal y NIT"],
        ]),
        cta: { label: "Completar mis datos", url: d.url || "https://docs.spacioam.com/datos" },
        footerNote: "Usamos estos datos únicamente para redactar tu documento. Si prefieres enviárnoslos por aquí, responde este correo.",
        signoff: "Con cariño,\nEl equipo de Spacio AM",
      });
    },
  };

  var META = [
    { id: "solicitudFirma", label: "Solicitud de firma", recipient: "Firmante", trigger: "Se envía el documento para firma", goal: "Pedir revisión y firma con enlace personal" },
    { id: "recordatorioFirma", label: "Recordatorio de firma", recipient: "Firmante", trigger: "El documento sigue pendiente", goal: "Recordar sin presionar" },
    { id: "copiaFirmada", label: "Copia firmada", recipient: "Ambas partes", trigger: "Las dos partes firmaron", goal: "Entregar PDF + certificado" },
    { id: "envioCancelado", label: "Envío cancelado", recipient: "Firmante", trigger: "Admin cancela o anula el envío", goal: "Avisar que el enlace ya no sirve" },
    { id: "solicitudDatos", label: "Solicitud de datos", recipient: "Propietario / firmante", trigger: "Admin pide los datos para redactar", goal: "Recolectar datos y DPI antes de generar" },
  ];

  function build(id, d, opts) {
    d = Object.assign({}, d || {});
    if (opts && opts.base) d.base = opts.base;
    return (EMAILS[id] || EMAILS.solicitudFirma)(d);
  }

  window.SpacioEmails = { emailShell: emailShell, EMAILS: EMAILS, META: META, build: build, C: C, FROM_NAME: FROM_NAME, FROM_EMAIL: FROM_EMAIL };
})();
