// Datos de ejemplo — Spacio AM Gestión. En producción cada colección es una hoja del Google Sheet.
export const ETAPAS = [
  { id: "desconocido", n: 1, nombre: "Desconocido", bloque: 1 },
  { id: "reunion", n: 2, nombre: "Reunión", bloque: 1 },
  { id: "archivos", n: 3, nombre: "Archivos", bloque: 1 },
  { id: "visita", n: 4, nombre: "Visita", bloque: 1 },
  { id: "decision", n: 5, nombre: "¿Vale la pena?", bloque: 1 },
  { id: "anteproyecto", n: 6, nombre: "Ante proyecto", bloque: 2 },
  { id: "presupuesto", n: 7, nombre: "Presupuesto", bloque: 2 },
  { id: "contrato", n: 8, nombre: "Contrato", bloque: 2 },
  { id: "ejecucion", n: 11, nombre: "Ejecución", bloque: 3 },
  { id: "fotos", n: 12, nombre: "Fotos pro", bloque: 3 },
  { id: "lanzamiento", n: 14, nombre: "Lanzamiento", bloque: 3 },
  { id: "revision", n: 15, nombre: "Revisión 3 meses", bloque: 3 },
  { id: "descartado", n: 0, nombre: "Descartados", bloque: 0 }
];

export const CATALOGO = [
  { cat: "Baños", item: "Jaboneras", precio: 75 },
  { cat: "Baños", item: "Planta decorativa pequeña", precio: 100 },
  { cat: "Baños", item: "Toallas de cuerpo", precio: 75 },
  { cat: "Baños", item: "Toallas de mano", precio: 60 },
  { cat: "Baños", item: "Basurero baño", precio: 200 },
  { cat: "Baños", item: "Alfombra", precio: 80 },
  { cat: "Baños", item: "Espejo", precio: 550 },
  { cat: "Sala / Comedor", item: "Comedor 4 plazas", precio: 2500 },
  { cat: "Sala / Comedor", item: "Sillas de comedor", precio: 620 },
  { cat: "Sala / Comedor", item: "Silla alta", precio: 1600 },
  { cat: "Sala / Comedor", item: "Cuadro decorativo mediano", precio: 500 },
  { cat: "Sala / Comedor", item: "Cojines", precio: 185 },
  { cat: "Sala / Comedor", item: "Decoración (libros, florero, flores secas)", precio: 1000 },
  { cat: "Sala / Comedor", item: "Chapa inteligente para entrada", precio: 1745 },
  { cat: "Sala / Comedor", item: "Planta artificial y maceta", precio: 800 },
  { cat: "Sala / Comedor", item: "Bandejas para café", precio: 140 },
  { cat: "Sala / Comedor", item: "Coffee table", precio: 1800 },
  { cat: "Sala / Comedor", item: "Sofá", precio: 6000 },
  { cat: "Sala / Comedor", item: "Mueble TV", precio: 2200 },
  { cat: "Sala / Comedor", item: "Rack TV", precio: 160 },
  { cat: "Sala / Comedor", item: "TV", precio: 4300 },
  { cat: "Sala / Comedor", item: "Luminaria general", precio: 2000 },
  { cat: "Sala / Comedor", item: "Recibidor y espejo", precio: 1500 },
  { cat: "Sala / Comedor", item: "Instalaciones varias", precio: 2000 },
  { cat: "Habitaciones", item: "Bocina / white noise", precio: 350 },
  { cat: "Habitaciones", item: "Colchón", precio: 2400 },
  { cat: "Habitaciones", item: "Cabecera", precio: 900 },
  { cat: "Habitaciones", item: "Sábanas", precio: 250 },
  { cat: "Habitaciones", item: "Duvet cover", precio: 600 },
  { cat: "Habitaciones", item: "Inserto de duvet", precio: 700 },
  { cat: "Habitaciones", item: "Mesas de noche", precio: 1300 },
  { cat: "Habitaciones", item: "Lámparas", precio: 600 },
  { cat: "Habitaciones", item: "Almohadas", precio: 100 },
  { cat: "Habitaciones", item: "Protector de colchón", precio: 285 },
  { cat: "Habitaciones", item: "Arte", precio: 600 },
  { cat: "Habitaciones", item: "Pie de cama", precio: 800 },
  { cat: "Habitaciones", item: "Cortina roller blackout", precio: 1400 },
  { cat: "Habitaciones", item: "Planchador y plancha", precio: 450 },
  { cat: "Cocina", item: "Sartenes y olla", precio: 780 },
  { cat: "Cocina", item: "Tostador", precio: 339 },
  { cat: "Cocina", item: "Cuchillos", precio: 350 },
  { cat: "Cocina", item: "Vajilla (platos, vasos, cubiertos)", precio: 484 },
  { cat: "Cocina", item: "Jarra para calentar agua", precio: 300 },
  { cat: "Cocina", item: "Ecofiltro", precio: 850 },
  { cat: "Cocina", item: "Cafetera", precio: 450 },
  { cat: "Cocina", item: "Estufa", precio: 3500 },
  { cat: "Cocina", item: "Refrigeradora", precio: 3600 },
  { cat: "Cocina", item: "Microondas", precio: 800 },
  { cat: "Cocina", item: "Torre de lavado", precio: 7000 }
];

export const PROVEEDORES = [
  { nombre: "CEMACO", alias: "Cemaco", desc: "Menaje, línea blanca y decoración general", tel: "2410-0000", correo: "ventas@cemaco.com", notas: "Crédito a 30 días; entregas a domicilio." },
  { nombre: "KALEA", alias: "Kalea", desc: "Mobiliario de sala y comedor", tel: "2386-5500", correo: "hola@kalea.gt", notas: "Tiempo de entrega 2-3 semanas." },
  { nombre: "SUO", alias: "Suo (47533419)", desc: "Sofás y colchones a medida", tel: "4753-3419", correo: "suo.muebles@gmail.com", notas: "A medida; anticipo del 50%." },
  { nombre: "TU CASA BONITA", alias: "Tu casa bonita (42105639)", desc: "Mesas y mobiliario de madera", tel: "4210-5639", correo: "tucasabonitagt@gmail.com", notas: "Madera sólida; pedidos por WhatsApp." },
  { nombre: "PRICESMART", alias: "Pricesmart", desc: "Toallas y ropa de cama por volumen", tel: "2379-6868", correo: "servicio@pricesmart.com", notas: "Requiere membresía; compra por volumen." },
  { nombre: "DOMOTEK", alias: "Domotek", desc: "Chapas inteligentes", tel: "2222-1010", correo: "info@domotek.gt", notas: "Incluye instalación de chapas." },
  { nombre: "IGLOOHOME", alias: "Igloohome", desc: "Cerraduras digitales", tel: "—", correo: "support@igloohome.co", notas: "Importado; soporte por correo." },
  { nombre: "COOL HOME", alias: "Cool Home (59866584)", desc: "Duvets e insertos", tel: "5986-6584", correo: "coolhome.gt@gmail.com", notas: "Duvets king/queen en stock." },
  { nombre: "ROOMS", alias: "Rooms (41604225)", desc: "Cabeceras", tel: "4160-4225", correo: "rooms.gt@gmail.com", notas: "Cabeceras tapizadas a medida." },
  { nombre: "BAZAR FABRICS", alias: "Bazar Fabrics z.10", desc: "Cojines y textiles" },
  { nombre: "KAHIKO", alias: "Kahiko", desc: "Decoración y objetos" },
  { nombre: "STEREN", alias: "Steren", desc: "Bocinas y electrónica menor" }
];

export const DUENOS = [
  { id: "marcel-r", nombre: "Marcel Reiche", email: "marcel.reiche@gmail.com", props: ["p1", "p4"] },
  { id: "ana-b", nombre: "Ana Barrios", email: "ana@bayit151.com", props: ["p2"] },
  { id: "jose-c", nombre: "José Calderón", email: "josecalderon@ufm.edu", props: ["p3"] },
  { id: "vilma-t", nombre: "Vilma Torres", email: "vilmatorres.p84@gmail.com", props: ["p5"] },
  { id: "roberto-p", nombre: "Roberto Paiz", email: "rpaiz@gmail.com", props: ["p7"] }
];

export const CHECKLIST = ["Internet", "Limpieza inicial", "Insumos iniciales", "Cerradura inteligente", "Calentador", "Electricidad", "Tarjetas de acceso", "Llave para locker"];

// Revisión post-lanzamiento: checklists por hito. Los items son agregables globalmente.
export const REVISION_HITOS = [
  { id: "2sem", label: "2 semanas", items: ["Primeras reseñas monitoreadas", "Ajuste de precio inicial", "Revisar reporte de limpieza"] },
  { id: "4sem", label: "4 semanas", items: ["Revisar ocupación vs. proyección", "Fotos de refuerzo si aplica", "Feedback de huéspedes"] },
  { id: "1mes", label: "1 mes", items: ["Cierre financiero del mes", "Ajuste de tarifa dinámica", "Revisar insumos y reposición"] },
  { id: "2mes", label: "2 meses", items: ["Análisis de posicionamiento orgánico", "Revisar competencia de la zona"] },
  { id: "3mes", label: "3 meses", items: ["Revisión integral de precio y posicionamiento (análisis IA)", "Reunión de resultados con propietario", "Renovar estrategia de temporada"] }
];

// Plantillas de correo editables (brand voice Spacio AM)
export const CORREO_TEMPLATES = [
  { id: "seguimiento", nombre: "Seguimiento (captación)", asunto: "¿Agendamos tu reunión?", cta: "Agendar reunión", cuerpo: "Hola {nombre}, nos encantaría conocer más de {propiedad}. ¿Agendamos una reunión corta esta semana? Cuéntanos qué día te funciona." },
  { id: "recordatorio", nombre: "Recordatorio de presupuesto", asunto: "Tu propuesta te espera", cta: "Revisar presupuesto", cuerpo: "Hola {nombre}, dejamos lista la propuesta para {propiedad}. Cuando gustes la revisamos juntos y resolvemos cualquier duda." },
  { id: "reunion", nombre: "Invitación a reunión", asunto: "Nos vemos pronto", cta: "Unirme a la reunión", cuerpo: "Hola {nombre}, te esperamos en la reunión de {propiedad}. Aquí está el enlace de Google Meet; si necesitas reprogramar, avísanos." },
  { id: "deposito", nombre: "Datos fiscales / depósito", asunto: "Últimos datos para arrancar", cta: "Enviar mis datos", cuerpo: "Hola {nombre}, recibimos tu depósito para {propiedad}. Para tu factura necesitamos tus datos fiscales (NIT, régimen). ¡Ya casi arrancamos!" },
  { id: "lanzamiento", nombre: "Lanzamiento", asunto: "{propiedad} ya recibe huéspedes", cta: "Ver el anuncio", cuerpo: "¡{nombre}, lo logramos! {propiedad} ya está publicada y lista para recibir a sus primeros huéspedes. Gracias por confiar en Spacio AM." }
];

export const CORREOS = [
  { fecha: "2026-08-18 09:12", tipo: "recordatorio", para: "ana@bayit151.com", asunto: "Tu propuesta te espera", proyectoId: "p2", estado: "enviado" },
  { fecha: "2026-08-17 16:40", tipo: "reunion", para: "vilmatorres.p84@gmail.com", asunto: "Nos vemos pronto", proyectoId: "p5", estado: "enviado" },
  { fecha: "2026-08-19 08:05", tipo: "seguimiento", para: "josecalderon@ufm.edu", asunto: "¿Agendamos tu reunión?", proyectoId: "p3", estado: "programado" }
];

export const EQUIPO = [
  { id: "alejandra", nombre: "Alejandra Molina", rol: "Administrador principal", inicial: "AM", color: "#3B6691", foto: null },
  { id: "gabriel", nombre: "Gabriel Asturias", rol: "Administrador secundario", inicial: "GA", color: "#3d6b52", foto: null },
  { id: "juan", nombre: "Juan Ovalle", rol: "Personal de campo", inicial: "JO", color: "#9a5020", foto: null },
  { id: "andrea", nombre: "Andrea Súchite", rol: "Compras y montaje", inicial: "AS", color: "#8a4b8f", foto: null }
];

// Plantilla de tareas por etapa (Paymo). Se instancian por proyecto; el admin puede agregar/editar.
export const TAREAS_DEFAULT = [
  { etapa: "reunion", nombre: "Agendar reunión virtual", resp: "alejandra", equipo: false, dias: 2 },
  { etapa: "reunion", nombre: "Enviar minuta / transcripción", resp: "alejandra", equipo: false, dias: 1 },
  { etapa: "visita", nombre: "Asignar y coordinar visita", resp: "gabriel", equipo: false, dias: 2 },
  { etapa: "visita", nombre: "Levantamiento en sitio + fotos", resp: "juan", equipo: true, dias: 1, dep: "Asignar y coordinar visita" },
  { etapa: "anteproyecto", nombre: "Generar renders por espacio", resp: "andrea", equipo: true, dias: 4 },
  { etapa: "anteproyecto", nombre: "Enviar propuesta al propietario", resp: "alejandra", equipo: false, dias: 1, dep: "Generar renders por espacio" },
  { etapa: "presupuesto", nombre: "Armar presupuesto base", resp: "andrea", equipo: false, dias: 2 },
  { etapa: "presupuesto", nombre: "Enviar presupuesto y dar seguimiento", resp: "alejandra", equipo: false, dias: 3, dep: "Armar presupuesto base" },
  { etapa: "contrato", nombre: "Preparar y enviar contrato a firma", resp: "alejandra", equipo: false, dias: 2 },
  { etapa: "ejecucion", nombre: "Compras de mobiliario", resp: "andrea", equipo: true, dias: 20 },
  { etapa: "ejecucion", nombre: "Coordinar entregas e instalación", resp: "gabriel", equipo: true, dias: 14, dep: "Compras de mobiliario" },
  { etapa: "fotos", nombre: "Montaje final y styling", resp: "andrea", equipo: true, dias: 3 },
  { etapa: "fotos", nombre: "Fotografía profesional", resp: "juan", equipo: false, dias: 1, dep: "Montaje final y styling" },
  { etapa: "lanzamiento", nombre: "Publicar en Airbnb y Booking", resp: "alejandra", equipo: false, dias: 2 }
];

const PRES_RUE = [
  { cat: "Baños", item: "Jaboneras", precio: 75, cant: 7 },
  { cat: "Baños", item: "Toallas de cuerpo", precio: 75, cant: 8 },
  { cat: "Baños", item: "Toallas de mano", precio: 60, cant: 4 },
  { cat: "Baños", item: "Alfombra", precio: 80, cant: 2 },
  { cat: "Sala / Comedor", item: "Comedor 4 plazas", precio: 2500, cant: 1 },
  { cat: "Sala / Comedor", item: "Sillas de comedor", precio: 620, cant: 4 },
  { cat: "Sala / Comedor", item: "Sofá", precio: 6000, cant: 1 },
  { cat: "Sala / Comedor", item: "Coffee table", precio: 1800, cant: 1 },
  { cat: "Sala / Comedor", item: "TV", precio: 4300, cant: 1 },
  { cat: "Sala / Comedor", item: "Mueble TV", precio: 2200, cant: 1 },
  { cat: "Sala / Comedor", item: "Chapa inteligente para entrada", precio: 1745, cant: 1 },
  { cat: "Sala / Comedor", item: "Decoración (libros, florero, flores secas)", precio: 1000, cant: 1 },
  { cat: "Habitaciones", item: "Colchón", precio: 2400, cant: 2 },
  { cat: "Habitaciones", item: "Cabecera", precio: 900, cant: 2 },
  { cat: "Habitaciones", item: "Mesas de noche", precio: 1300, cant: 3 },
  { cat: "Habitaciones", item: "Lámparas", precio: 600, cant: 3 },
  { cat: "Habitaciones", item: "Duvet cover", precio: 600, cant: 2 },
  { cat: "Habitaciones", item: "Arte", precio: 600, cant: 2 },
  { cat: "Habitaciones", item: "Cortina roller blackout", precio: 1400, cant: 2 },
  { cat: "Cocina", item: "Estufa", precio: 3500, cant: 1 },
  { cat: "Cocina", item: "Refrigeradora", precio: 3600, cant: 1 },
  { cat: "Cocina", item: "Microondas", precio: 800, cant: 1 },
  { cat: "Cocina", item: "Sartenes y olla", precio: 780, cant: 1 },
  { cat: "Cocina", item: "Vajilla (platos, vasos, cubiertos)", precio: 484, cant: 1 },
  { cat: "Cocina", item: "Ecofiltro", precio: 850, cant: 1 }
];

export const PROYECTOS = [
  {
    id: "p1", nombre: "Rue 301", edificio: "Rue de la Paix", apto: "301", zona: "Zona 4", hab: 2, banos: 2,
    duenoId: "marcel-r", etapa: "ejecucion", farol: "info", amueblado: true, conAnteproyecto: true,
    creado: "2026-05-12", equipado: "Solo detalles", lineaBlanca: false, tipo: "Edificio",
    reunion: { fecha: "2026-05-20 10:00", meet: "meet.google.com/spa-cioa-rue", transcripcion: "El propietario busca renta estable; viaja seguido y quiere cero fricción. Le gustan los tonos tierra y menciona su colección de vinilos de jazz — posible temática musical sutil. Se acordó modalidad cohosting 20% y visita para el 28 de mayo." },
    visita: { fecha: "2026-05-28", asignadoA: "Gabriel Asturias", completa: true, parqueo: "1 parqueo, chapa digital ya instalada", ingreso: "Tarjeta de acceso · se entrega en recepción", equipado: "Solo detalles", detalles: "Jaboneras, arte, sábanas, toallas, ropa de cama", lavado: "En el edificio (tokens)", amenidades: "Piscina, gym, terraza con parrilla", parqueoPago: "Sí, Q25/noche para visitas", fotos: 22 },
    anteproyecto: { visibleDueno: true, costo: 2000, espacios: [
      { nombre: "Sala", opciones: 4, favorita: 2, comentario: "Me encantó la opción 2, el sofá terracota. Quitaría el tapiz de la pared." },
      { nombre: "Dormitorio principal", opciones: 4, favorita: 1, comentario: "La 1, con los cuadros de jazz. Esa es la idea." },
      { nombre: "Comedor", opciones: 4, favorita: null, comentario: null }
    ]},
    presupuesto: { estado: "aprobado", items: PRES_RUE, cobraMobiliario: true, feePct: 10, cobraDiseno: true, disenoQ: 2000, fotosProUsd: 200, depositos: [{ fecha: "2026-06-10", monto: 57876, comprobante: "deposito-rue301.pdf", verificado: true }] },
    contrato: { estado: "firmado", fechaFirma: "2026-06-08", firmantes: [{ nombre: "Marcel Reiche", rol: "Propietario", firmado: true }, { nombre: "Spacio AM", rol: "Administrador", firmado: true }], pdf: "contrato-rue301.pdf" },
    facturas: [
      { num: "687753843", fecha: "2026-06-15", monto: 3859.92, desc: "Ropa de cama, menaje de cocina y planchas", proveedor: "CEMACO", tipo: "pdf", entrega: "inmediata", items: ["Sábanas", "Duvet cover", "Sartenes y olla"] },
      { num: "939933987", fecha: "2026-06-26", monto: 6585.0, desc: "Mesas de noche, mesa de centro y sillas de comedor", proveedor: "TU CASA BONITA", tipo: "pdf", entrega: "programada 2026-07-08", items: ["Mesas de noche", "Coffee table", "Sillas de comedor"] },
      { num: "3107275642", fecha: "2026-06-28", monto: 6782.79, desc: "TV Samsung 65\", toallas, lámpara, vajilla, tostadora", proveedor: "CEMACO", tipo: "foto", entrega: "inmediata", items: ["TV", "Toallas de cuerpo", "Vajilla (platos, vasos, cubiertos)"] },
      { num: "4242096571", fecha: "2026-07-16", monto: 5075.0, desc: "Estufa eléctrica Whirlpool 30\" con entrega", proveedor: "CEMACO", tipo: "pdf", entrega: "programada 2026-07-24", items: ["Estufa"] },
      { num: "2019184357", fecha: "2026-07-02", monto: 3899.0, desc: "Sofá", proveedor: "SUO", tipo: "pdf", entrega: "programada 2026-07-30", items: ["Sofá"] }
    ],
    checklist: ["Internet", "Limpieza inicial", "Cerradura inteligente", "Electricidad"],
    gantt: [
      { hito: "Depósito recibido", fecha: "2026-06-10", done: true },
      { hito: "Compras fase 1", fecha: "2026-06-15 → 2026-07-20", done: true },
      { hito: "Entrega sofá (Suo)", fecha: "2026-07-30", done: false },
      { hito: "Montaje final", fecha: "2026-08-24", done: false },
      { hito: "Fotos profesionales", fecha: "2026-08-28", done: false }
    ]
  },
  {
    id: "p2", nombre: "Fiamene 404", edificio: "Fiamene", apto: "404", zona: "Zona 10", hab: 1, banos: 1,
    duenoId: "ana-b", etapa: "presupuesto", farol: "attention", amueblado: true, conAnteproyecto: true,
    creado: "2026-07-02", equipado: "Sin equipar", lineaBlanca: false, tipo: "Edificio",
    reunion: { fecha: "2026-07-09 15:00", meet: "meet.google.com/spa-cioa-fia", transcripcion: "Primera propiedad de la dueña en renta corta. Pide presupuesto conservador; interesada en huéspedes corporativos. Se explicó fee de mobiliario 10% y costo de anteproyecto." },
    visita: { fecha: "2026-07-16", asignadoA: "Juan Ovalle", completa: true, parqueo: "Sin parqueo propio · parqueo de pago en sótano", ingreso: "Chapa digital por instalar · buzón en recepción", equipado: "Equipamiento completo, sin electrodomésticos", detalles: "Requiere torre de lavado", lavado: "En el apartamento", amenidades: "Lobby, área de coworking", parqueoPago: "Sí", fotos: 18 },
    anteproyecto: { visibleDueno: true, costo: 1500, espacios: [
      { nombre: "Sala-comedor", opciones: 4, favorita: 3, comentario: "La 3 es perfecta para corporativos. ¿El wall panel sube mucho el presupuesto?" },
      { nombre: "Dormitorio", opciones: 4, favorita: null, comentario: null }
    ]},
    presupuesto: { estado: "enviado", items: [
      { cat: "Baños", item: "Jaboneras", precio: 75, cant: 4 },
      { cat: "Baños", item: "Toallas de cuerpo", precio: 75, cant: 4 },
      { cat: "Baños", item: "Espejo", precio: 550, cant: 1 },
      { cat: "Sala / Comedor", item: "Silla alta", precio: 1600, cant: 2 },
      { cat: "Sala / Comedor", item: "Sofá", precio: 6000, cant: 1 },
      { cat: "Sala / Comedor", item: "Chapa inteligente para entrada", precio: 1745, cant: 1 },
      { cat: "Sala / Comedor", item: "Coffee table", precio: 1800, cant: 1 },
      { cat: "Sala / Comedor", item: "Luminaria general", precio: 2000, cant: 1 },
      { cat: "Habitaciones", item: "Colchón", precio: 2400, cant: 1 },
      { cat: "Habitaciones", item: "Cabecera", precio: 900, cant: 1 },
      { cat: "Habitaciones", item: "Mesas de noche", precio: 1300, cant: 2 },
      { cat: "Habitaciones", item: "Cortina roller blackout", precio: 1400, cant: 1 },
      { cat: "Cocina", item: "Torre de lavado", precio: 7000, cant: 1 },
      { cat: "Cocina", item: "Cafetera", precio: 450, cant: 1 },
      { cat: "Cocina", item: "Vajilla (platos, vasos, cubiertos)", precio: 484, cant: 1 }
    ], cobraMobiliario: true, feePct: 10, cobraDiseno: true, disenoQ: 1500, fotosProUsd: 150, depositos: [] },
    contrato: { estado: "pendiente", firmantes: [{ nombre: "Ana Barrios", rol: "Propietaria", firmado: false }, { nombre: "Spacio AM", rol: "Administrador", firmado: false }] },
    facturas: [], checklist: [], gantt: []
  },
  {
    id: "p3", nombre: "Eon 901", edificio: "Eon", apto: "901", zona: "Zona 13", hab: 3, banos: 2,
    duenoId: "jose-c", etapa: "visita", farol: "warning", amueblado: false, conAnteproyecto: false,
    creado: "2026-07-28", equipado: "Equipado completo", lineaBlanca: true, tipo: "Condominio",
    reunion: { fecha: "2026-08-04 11:00", meet: "meet.google.com/spa-cioa-eon", transcripcion: "Propiedad ya amueblada; solo requiere gestión. El dueño quiere revisar machote de contrato antes de la visita. Sin anteproyecto." },
    visita: { fecha: "2026-08-21", asignadoA: "Gabriel Asturias", completa: false },
    anteproyecto: null,
    presupuesto: null,
    contrato: { estado: "pendiente", firmantes: [{ nombre: "José Calderón", rol: "Propietario", firmado: false }, { nombre: "Spacio AM", rol: "Administrador", firmado: false }] },
    facturas: [], checklist: [], gantt: []
  },
  {
    id: "p4", nombre: "Modra 1108", edificio: "Modra", apto: "1108", zona: "Zona 4", hab: 2, banos: 2,
    duenoId: "marcel-r", etapa: "lanzamiento", farol: "success", amueblado: true, conAnteproyecto: true,
    creado: "2026-03-02", equipado: "Sin equipar", lineaBlanca: false, tipo: "Edificio",
    reunion: { fecha: "2026-03-10 09:00", meet: "meet.google.com/spa-cioa-mod", transcripcion: "Segunda propiedad de Marcel con nosotros. Decoración con temática de juegos tradicionales de Guatemala." },
    visita: { fecha: "2026-03-18", asignadoA: "Juan Ovalle", completa: true, fotos: 24 },
    anteproyecto: { visibleDueno: true, costo: 2000, espacios: [{ nombre: "Sala", opciones: 4, favorita: 4, comentario: "¡Los cuadros de barrilete y trompo quedaron increíbles!" }] },
    presupuesto: { estado: "aprobado", items: PRES_RUE.slice(0, 18), cobraMobiliario: true, feePct: 10, cobraDiseno: true, disenoQ: 2000, fotosProUsd: 200, depositos: [{ fecha: "2026-04-02", monto: 48000, comprobante: "deposito-modra.pdf", verificado: true }] },
    contrato: { estado: "firmado", fechaFirma: "2026-03-28", firmantes: [{ nombre: "Marcel Reiche", rol: "Propietario", firmado: true }, { nombre: "Spacio AM", rol: "Administrador", firmado: true }], pdf: "contrato-modra1108.pdf" },
    facturas: [{ num: "2830126329", fecha: "2026-05-17", monto: 9288, desc: "Factura global del proyecto", proveedor: "SPACIO AM", tipo: "pdf", entrega: "inmediata", items: [], global: true }],
    checklist: ["Internet", "Limpieza inicial", "Insumos iniciales", "Cerradura inteligente", "Calentador", "Electricidad", "Tarjetas de acceso", "Llave para locker"],
    gantt: [{ hito: "Publicado en Airbnb", fecha: "2026-06-20", done: true }, { hito: "Publicado en Booking", fecha: "2026-06-22", done: true }, { hito: "Revisión a 3 meses", fecha: "2026-09-20", done: false }]
  },
  {
    id: "p5", nombre: "Attica 702", edificio: "Attica", apto: "702", zona: "Zona 14", hab: 1, banos: 1,
    duenoId: "vilma-t", etapa: "reunion", farol: "pending", amueblado: null, conAnteproyecto: null,
    creado: "2026-08-11", equipado: "Solo detalles", lineaBlanca: true, tipo: "Edificio",
    reunion: { fecha: "2026-08-20 16:00", meet: "meet.google.com/spa-cioa-att", transcripcion: null },
    visita: null, anteproyecto: null, presupuesto: null,
    contrato: { estado: "sin iniciar", firmantes: [] }, facturas: [], checklist: [], gantt: []
  },
  {
    id: "p6", nombre: "Vía 5 — 208", edificio: "Vía 5", apto: "208", zona: "Zona 4", hab: 1, banos: 1,
    duenoId: null, dueno: "Karla Estrada", etapa: "descartado", farol: "error", motivo: "Renta esperada por debajo del mínimo de la zona; edificio sin amenidades y sin parqueo.",
    creado: "2026-06-30", equipado: "Sin equipar", lineaBlanca: false, tipo: "Edificio",
    visita: null, anteproyecto: null, presupuesto: null, contrato: { estado: "—", firmantes: [] }, facturas: [], checklist: [], gantt: []
  },
  {
    id: "p7", nombre: "Zima 502", edificio: "Zima", apto: "502", zona: "Zona 15", hab: 2, banos: 2,
    duenoId: "roberto-p", etapa: "revision", farol: "success", amueblado: false, conAnteproyecto: false,
    creado: "2025-11-10", equipado: "Equipado completo", lineaBlanca: true, tipo: "Edificio",
    reunion: { fecha: "2025-11-18 10:00", meet: "meet.google.com/spa-cioa-zim", transcripcion: "Propiedad ya equipada; solo gestión y lanzamiento." },
    visita: { fecha: "2025-11-25", asignadoA: "Juan Ovalle", completa: true, fotos: 16 },
    anteproyecto: null, presupuesto: null,
    contrato: { estado: "firmado", fechaFirma: "2025-12-02", firmantes: [{ nombre: "Roberto Paiz", rol: "Propietario", firmado: true }, { nombre: "Spacio AM", rol: "Administrador", firmado: true }], pdf: "contrato-zima502.pdf" },
    facturas: [], checklist: ["Internet", "Limpieza inicial", "Insumos iniciales", "Cerradura inteligente", "Calentador", "Electricidad", "Tarjetas de acceso", "Llave para locker"],
    gantt: [{ hito: "Publicado en Airbnb", fecha: "2026-01-08", done: true }, { hito: "Revisión a 3 meses", fecha: "2026-04-08", done: true }]
  }
];

// Datos bancarios reales (contenido del link bit.ly/Spacioam-cuentasgt)
export const CUENTAS = [
  { banco: "Banco Industrial", tipo: "Monetaria (Q)", numero: "123-456789-0", nombre: "Spacio AM, S.A." },
  { banco: "BAC", tipo: "Ahorro (Q)", numero: "987654321", nombre: "Spacio AM, S.A." }
];

// Contactos de primera llamada (previos al proceso). Los llena el administrador.
export const CONTACTOS = [
  { id: "c1", nombre: "Lucía Mendoza", contacto: "+502 5512 8890", info: "Referida por Marcel. Tiene 2 aptos en Zona 14, uno lo maneja sola en Airbnb.", estado: "por-llamar", creado: "2026-08-17" },
  { id: "c2", nombre: "Diego Herrera", contacto: "diego.herrera@outlook.com", info: "Escribió por Instagram. Apto nuevo en Cayalá, aún sin entregar.", estado: "llamado", creado: "2026-08-14" }
];

// Recepciones de mercadería (formulario público por link, sin login)
export const RECEPCIONES = [
  { id: "r1", proyectoId: "p1", fecha: "2026-06-27", numeroDoc: "3107275642", llegoDoc: true, completo: true, buenEstado: true, cuadra: true, comentario: "TV y toallas recibidas, todo en orden.", fotos: 3, estado: "entregado" },
  { id: "r2", proyectoId: "p1", fecha: "2026-07-09", numeroDoc: "939933987", llegoDoc: false, completo: false, buenEstado: true, cuadra: false, comentario: "Llegaron 2 de 3 mesas de noche; falta una. Sin documento físico.", fotos: 4, estado: "pendiente" }
];
