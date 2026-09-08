/* Mapeo de las 25 hojas normalizadas (Google Sheet) al modelo anidado del DC.
   Devuelve null si no hay proyectos reales, para que la app caiga al demo (datos.js). */
(function () {
  var TRUE = function (v) { return v === true || v === "TRUE" || v === "true" || v === "Sí" || v === "SI" || v === "si" || v === 1 || v === "1"; };
  var num = function (v) { return v == null || v === "" ? 0 : (typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, "")) || 0); };
  var by = function (rows, key, val) { return (rows || []).filter(function (r) { return String(r[key]) === String(val); }); };

  // estado del sheet (Capitalizado) -> estado interno del DC (minúsculas)
  var PRES_EST = { "Borrador": "borrador", "Enviado": "enviado", "Cambios solicitados": "cambios", "Aprobado": "aprobado", "Cerrado": "cerrado" };
  var CONTR_EST = { "Sin iniciar": "sin-iniciar", "Datos pendientes": "datos", "Enviado a firma": "enviado", "Firmado": "firmado", "Anulado": "anulado" };
  var TAREA_EST = { "Por hacer": "por-hacer", "En progreso": "en-progreso", "Completada": "completada" };

  function mapProyecto(p, db) {
    var pid = p.proyecto_id;
    var o = {
      id: pid, nombre: p.nombre, edificio: p.edificio, apto: p.apartamento, zona: p.zona,
      hab: num(p.habitaciones), banos: num(p.banos), tipo: p.tipo || "Edificio",
      duenoId: p.dueno_id, etapa: p.etapa || "desconocido", farol: p.farol || "pending",
      amueblado: TRUE(p.amueblado_por_nosotros), conAnteproyecto: TRUE(p.con_anteproyecto),
      equipado: p.equipado || "Sin equipar", lineaBlanca: TRUE(p.linea_blanca),
      motivo: p.motivo_descarte || "", creado: p.fecha_ingreso || "", carpetaDrive: p.carpeta_drive || "",
      numUnidades: num(p.num_unidades), amenidadesFotos: num(p.amenidades_fotos)
    };
    // varios apartamentos: unidades, fases, presupuestos por fase y visita por unidad
    var fts = by(db["30_FOTOS"], "proyecto_id", pid);
    o.fotos = fts.map(function (f) {
      return { id: f.foto_id, apto: f.apartamento || "", zona: f.zona || "Sin zona", url: f.url || "", fecha: f.fecha || "" };
    });
    var uds = by(db["26_UNIDADES"], "proyecto_id", pid);
    var fss = by(db["27_FASES"], "proyecto_id", pid);
    var pfs = by(db["28_PRESUPUESTOS_FASE"], "proyecto_id", pid);
    var vus = by(db["29_VISITA_UNIDAD"], "proyecto_id", pid);
    if (TRUE(p.es_edificio) || uds.length || fss.length) {
      o.esEdificio = true;
      o.fases = fss.map(function (f) {
        return { id: f.fase_id, nombre: f.nombre, cerrada: TRUE(f.cerrada), unidades: num(f.num_unidades),
          presupuestos: pfs.filter(function (x) { return String(x.fase) === String(f.nombre); }).map(function (x) {
            return { id: x.pres_fase_id, nombre: x.nombre, estado: PRES_EST[x.estado] || "borrador", porUnidad: TRUE(x.por_unidad), total: num(x.total), items: [] };
          }) };
      });
      o.unidades = uds.map(function (u) {
        var vu = vus.filter(function (x) { return String(x.apartamento) === String(u.apartamento); })[0];
        return { id: u.unidad_id, apto: u.apartamento, fase: u.fase || "", etapa: u.etapa || "ejecucion",
          hab: num(u.habitaciones), banos: num(u.banos), fotosPro: TRUE(u.fotos_pro), link: u.link_anuncio || "",
          visitaFecha: u.visita_fecha || "", visitaAsignado: u.visita_asignado_a || "", visitaCompleta: TRUE(u.visita_completa),
          visitaData: vu ? { cats: vu.inventario_cats || {}, mant: vu.mantenimiento || [], items: vu.accesos || {},
            equipado: vu.equipado || "Sin equipar", detalles: vu.detalles || "", lavado: vu.lavado || "",
            fecha: vu.fecha || u.visita_fecha || "", inv: [], invNuevo: "", electro: "Con", torre: "Con" } : null };
      });
    }
    // reunión
    var r = by(db["04_REUNIONES"], "proyecto_id", pid)[0];
    if (r) o.reunion = { fecha: r.fecha_hora, meet: r.enlace_meet, transcripcion: r.transcripcion, resumen: r.resumen_ia };
    // visita
    var v = by(db["05_VISITAS"], "proyecto_id", pid)[0];
    if (v) o.visita = { fecha: v.fecha, asignadoA: v.asignado_a, completa: TRUE(v.completa), parqueo: v.parqueo, ingreso: v.proceso_ingreso, equipado: v.equipado, detalles: v.detalles_faltantes, lavado: v.lavado, amenidades: v.amenidades, parqueoPago: v.parqueo_pago, fotos: num(v.num_fotos), carpetaFotos: v.carpeta_fotos };
    // anteproyecto
    var ante = by(db["06_ANTEPROYECTO"], "proyecto_id", pid);
    if (ante.length) o.anteproyecto = {
      visibleDueno: ante.some(function (a) { return TRUE(a.visible_dueno); }),
      espacios: ante.map(function (a) { return { nombre: a.espacio, opciones: [a.render_1, a.render_2, a.render_3, a.render_4].filter(Boolean).length || 4, favorita: a.favorita ? num(a.favorita) : null, comentario: a.comentario_dueno || null, respuesta: a.respuesta_spacio || null }; })
    };
    // presupuesto + items
    var pres = by(db["08_PRESUPUESTOS"], "proyecto_id", pid)[0];
    if (pres) {
      var items = by(db["09_PRESUPUESTO_ITEMS"], "presupuesto_id", pres.presupuesto_id).map(function (it) {
        return { cat: it.categoria, item: it.item, precio: num(it.precio_unitario), cant: num(it.cantidad) || 1, status: it.status, proveedor: it.proveedor, encargado: it.encargado };
      });
      o.presupuesto = { estado: PRES_EST[pres.estado] || "borrador", items: items, cobraMobiliario: true, feePct: num(pres.fee_pct), cobraDiseno: num(pres.anteproyecto_q) > 0, disenoQ: num(pres.anteproyecto_q), fotosProUsd: num(pres.fotos_pro_usd), depositos: pres.deposito_fecha ? [{ fecha: pres.deposito_fecha, monto: num(pres.deposito_monto), comprobante: pres.comprobante_url, verificado: !!pres.comprobante_url }] : [] };
    }
    // contrato + firmas
    var c = by(db["13_CONTRATOS"], "proyecto_id", pid)[0];
    if (c) {
      var firmas = by(db["14_FIRMAS"], "contrato_id", c.contrato_id).map(function (f) { return { nombre: f.nombre, rol: f.rol, correo: f.correo, firmado: !!f.fecha_hora, firma: f.firma_url }; });
      o.contrato = { estado: CONTR_EST[c.estado] || "sin-iniciar", fechaFirma: c.fecha_firma, firmantes: firmas.length ? firmas : [], pdf: c.pdf_url };
    }
    // facturas
    var facts = by(db["10_FACTURAS"], "proyecto_id_none", "___");
    var asigns = by(db["11_FACTURA_ASIGNACIONES"], "proyecto_id", pid);
    var factById = {};
    (db["10_FACTURAS"] || []).forEach(function (f) { factById[f.factura_id] = f; });
    o.facturas = asigns.map(function (a) {
      var f = factById[a.factura_id] || {};
      return { num: f.numero_factura || a.factura_id, fecha: f.fecha, monto: num(a.monto_asignado || f.monto), desc: f.descripcion, proveedor: f.proveedor, tipo: (f.formato === "Foto" ? "foto" : "pdf"), entrega: f.entrega, items: Array.isArray(a.items_presupuesto) ? a.items_presupuesto : [], archivo: f.archivo_url };
    });
    // checklist
    var chk = by(db["15_CHECKLIST"], "proyecto_id", pid);
    if (chk.length) o.checklist = chk.map(function (x) { return x.item; });
    // milestones -> gantt
    var ms = by(db["21_MILESTONES"], "proyecto_id", pid);
    if (ms.length) o.gantt = ms.map(function (m) { return { hito: m.nombre, fecha: m.fecha, done: m.estado === "Cumplido" || TRUE(m.estado) }; });
    // tareas extra (fuera de plantilla)
    var tareas = by(db["18_TAREAS"], "proyecto_id", pid);
    if (tareas.length) o.tareasExtra = tareas.map(function (tk) { return { etapa: tk.etapa, nombre: tk.nombre, resp: tk.responsable_id, equipo: TRUE(tk.es_equipo), dias: num(tk.dias_duracion) || 2, estado: TAREA_EST[tk.estado] || "por-hacer" }; });
    return o;
  }

  function hydrate(db) {
    if (!db || !db["01_PROYECTOS"] || !db["01_PROYECTOS"].length) return null;
    var out = {};
    out.proyectos = db["01_PROYECTOS"].map(function (p) { return mapProyecto(p, db); });
    out.duenos = (db["02_DUENOS"] || []).map(function (d) {
      return { id: d.dueno_id, nombre: d.nombre, email: d.email, telefono: d.telefono, nit: d.nit,
        props: out.proyectos.filter(function (p) { return p.duenoId === d.dueno_id; }).map(function (p) { return p.id; }) };
    });
    // Equipo real (17_USUARIOS). Sin esto la app usaba los nombres de ejemplo.
    var PALETA = ["#3B6691", "#3d6b52", "#8a4b8f", "#9a5020", "#6F6867", "#B54D36"];
    out.equipo = (db["17_USUARIOS"] || []).map(function (u, i) {
      var nom = u.nombre || u.email || u.usuario_id;
      // El nombre real del administrador principal es Juan Ovalle; la semilla vieja decía Jorge.
      if (/^jovalle@/i.test(String(u.email || "")) && /jorge/i.test(String(nom))) nom = "Juan Ovalle";
      return { id: u.usuario_id || u.email, nombre: nom, rol: u.rol || "", email: u.email || "",
        inicial: u.inicial || String(nom).split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase(),
        color: PALETA[i % PALETA.length], foto: null };
    });
    out.contactos = (db["22_CONTACTOS"] || []).map(function (c) {
      return { id: c.contacto_id, nombre: c.nombre, contacto: c.contacto, info: c.info, estado: c.estado === "Llamado" ? "llamado" : "por-llamar", creado: c.fecha_creado };
    });
    out.recepciones = (db["23_RECEPCIONES"] || []).map(function (r) {
      return { id: r.recepcion_id, proyectoId: r.proyecto_id, fecha: r.fecha, numeroDoc: r.numero_doc, llegoDoc: TRUE(r.llego_doc), completo: TRUE(r.completo), buenEstado: TRUE(r.buen_estado), cuadra: TRUE(r.cuadra), fotos: num(r.num_fotos), comentario: r.comentario, estado: r.estado === "Entregado" ? "entregado" : "pendiente" };
    });
    out.correos = (db["24_CORREOS"] || []).map(function (c) {
      return { fecha: c.fecha_hora, tipo: c.tipo, para: c.para, asunto: c.asunto, proyectoId: c.proyecto_id, estado: (c.estado || "Enviado").toLowerCase() };
    });
    out.tpls = (db["25_CORREO_TEMPLATES"] || []).map(function (t) {
      return { id: t.template_id, nombre: t.nombre, asunto: t.asunto, cuerpo: t.cuerpo, cta: t.cta };
    });
    return out;
  }

  if (typeof window !== "undefined") window.SPACIO_MAP = { hydrate: hydrate };
})();
