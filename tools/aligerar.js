#!/usr/bin/env node
/* Aligerar el app de Grow (27-nov-2026).
 *
 * El index.html que exporta Claude Design trae TODO adentro en base64 (fotos, fuentes, librerías y la plantilla):
 * 15 MB que el teléfono baja y desempaca antes de dibujar nada (11 s en blanco en 4G). Este paso de build saca cada
 * pieza a su propio archivo en assets/app/ y deja en index.html solo el cargador (el mismo de Claude Design, que ahora
 * usa las direcciones en vez de desempacar). El navegador baja cada pieza cuando la necesita y la guarda en caché.
 *
 *   node tools/aligerar.js            convierte un index.html exportado (o vuelve a sellar el ya aligerado)
 *   node tools/aligerar.js --revisar  solo revisa (lo corre el check «Revisar index»): falla si index.html pesa
 *                                     más de 1 MB, si trae piezas en base64 o si un archivo de assets/app cambió
 *                                     y su sello (?v=) no
 *
 * Para cambiar una pieza del app: edita su archivo en assets/app/ y corre `node tools/aligerar.js` (pone el sello nuevo).
 * Si vuelves a exportar desde Claude Design, pega el index.html nuevo y corre lo mismo.
 */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..');
const INDEX = path.join(RAIZ, 'index.html');
const DIR = 'assets/app';
const TOPE = 1024 * 1024;
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/svg+xml': 'svg', 'image/webp': 'webp', 'image/gif': 'gif',
  'text/javascript': 'js', 'application/javascript': 'js', 'font/woff2': 'woff2', 'font/woff': 'woff', 'font/otf': 'otf',
  'font/ttf': 'ttf', 'text/css': 'css', 'text/html': 'html', 'application/json': 'json' };

const sello = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
const isla = (html, tipo) => {
  const m = html.match(new RegExp('<script type="__bundler/' + tipo + '">([\\s\\S]*?)</script>'));
  return m ? { texto: m[1], ini: m.index, fin: m.index + m[0].length } : null;
};
const ponerIsla = (html, tipo, texto) => {
  const i = isla(html, tipo);
  if (!i) throw new Error('falta la isla ' + tipo);
  return html.slice(0, i.ini) + '<script type="__bundler/' + tipo + '">\n' + texto + '\n  </script>' + html.slice(i.fin);
};

/* Las fotos que window.SPACIO_FOTOS traía incrustadas pasan a archivos; window.F(p) ya sabe usar una dirección. */
function sacarFotos(texto) {
  if (!/window\.SPACIO_FOTOS\s*=\s*\{/.test(texto)) return null;
  const fotos = [];
  const nuevo = texto.replace(/"(assets\/photos\/[\w.-]+\.(?:jpe?g|png|webp))"\s*:\s*"data:image\/[\w+.-]+;base64,([A-Za-z0-9+/=]+)"/g, (_, clave, b64) => {
    const buf = Buffer.from(b64, 'base64');
    const rel = DIR + '/fotos/' + path.basename(clave);
    fotos.push({ rel, buf });
    return JSON.stringify(clave) + ': ' + JSON.stringify(rel + '?v=' + sello(buf));
  });
  return { texto: nuevo.replace('/* Fotos incrustadas (data-URLs) para que el bundle funcione sin la carpeta assets/. */',
    '/* Fotos del app: cada una en su archivo de assets/app/fotos (tools/aligerar.js). */'), fotos };
}

/* Las <img> de la plantilla con foto del app cargan solo cuando se van a ver (loading="lazy"): la plantilla trae las
   pantallas de todos los roles y el teléfono bajaba 5 MB de fotos de golpe. La que está a la vista carga igual. */
function perezosas(tpl, uuidsImagen) {
  return tpl.replace(/<img\b([^>]*?)\ssrc="([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"([^>]*)>/g, (todo, a, uuid, b) =>
    (!uuidsImagen.has(uuid) || /\sloading=/.test(a + b)) ? todo : '<img' + a + ' src="' + uuid + '" loading="lazy"' + b + '>');
}

/* Los scripts clásicos de la plantilla (y React) se piden desde el primer momento con <link rel="preload">, en paralelo
   con la plantilla, en vez de esperar a que el cargador los inserte uno por uno. */
function precargar(html, tpl, nuevo, relTpl) {
  const urls = [];
  const re = /<script\b([^>]*)\ssrc="([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/g;
  let m;
  while ((m = re.exec(tpl))) if (!/type="module"/.test(m[1]) && nuevo[m[2]] && !urls.includes(nuevo[m[2]].src)) urls.push(nuevo[m[2]].src);
  const ext = isla(html, 'ext_resources');
  for (const r of ext ? JSON.parse(ext.texto) : []) if (/\/(react|react-dom)@/.test(r.id) && nuevo[r.uuid]) urls.push(nuevo[r.uuid].src);
  const bloque = '<!-- aligerar:precarga -->\n  <link rel="preload" as="fetch" crossorigin="anonymous" href="' + relTpl + '">\n' +
    urls.map((u) => '  <link rel="preload" as="script" href="' + u + '">').join('\n') + '\n  <!-- /aligerar:precarga -->';
  if (/<!-- aligerar:precarga -->[\s\S]*?<!-- \/aligerar:precarga -->/.test(html)) return html.replace(/<!-- aligerar:precarga -->[\s\S]*?<!-- \/aligerar:precarga -->/, () => bloque);
  const ancla = html.match(/<link rel="stylesheet" href="https:\/\/hub\.spacioam\.com\/ds\/esqueleto\.css">\n/) || html.match(/<title>[^<]*<\/title>\n/);
  return html.slice(0, ancla.index + ancla[0].length) + '  ' + bloque + '\n' + html.slice(ancla.index + ancla[0].length);
}

function escribir(rel, buf) {
  const abs = path.join(RAIZ, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (!fs.existsSync(abs) || !fs.readFileSync(abs).equals(buf)) fs.writeFileSync(abs, buf);
}

/* El cargador de Claude Design, con dos cambios: una pieza con `src` se usa por su dirección (sin desempacar) y la
   plantilla puede venir de un archivo (__bundler/template_src). Lo de base64 sigue funcionando igual. */
function parcharCargador(html) {
  if (html.includes('templateSrcEl')) return html;
  const reemplazos = [
    [`    const manifestEl = document.querySelector('script[type="__bundler/manifest"]');
    const templateEl = document.querySelector('script[type="__bundler/template"]');
    if (!manifestEl || !templateEl) {`,
     `    const manifestEl = document.querySelector('script[type="__bundler/manifest"]');
    const templateEl = document.querySelector('script[type="__bundler/template"]');
    // Aligerado (tools/aligerar.js): la plantilla vive en su archivo y se pide en cuanto arranca el cargador.
    const templateSrcEl = document.querySelector('script[type="__bundler/template_src"]');
    const templateFetch = templateSrcEl
      ? fetch(JSON.parse(templateSrcEl.textContent)).then(function(r) { if (!r.ok) throw new Error('plantilla ' + r.status); return r.text(); })
      : null;
    if (!manifestEl || (!templateEl && !templateFetch)) {`],
    [`    let template = JSON.parse(templateEl.textContent);`,
     `    let template = templateEl ? JSON.parse(templateEl.textContent) : null;`],
    [`      const entry = manifest[uuid];
      try {
        const binaryStr = atob(entry.data);`,
     `      const entry = manifest[uuid];
      try {
        // Aligerado: la pieza está en su archivo; se usa su dirección y el navegador la baja solo si la necesita.
        if (entry.src) {
          if (pageSet.has(uuid)) { pageTexts[uuid] = await (await fetch(entry.src)).text(); return; }
          blobUrls[uuid] = new URL(entry.src, location.href).href;
          return;
        }
        const binaryStr = atob(entry.data);`],
    [`    setStatus('Dibujando…');`,
     `    if (template == null) template = await templateFetch;
    setStatus('Dibujando…');`],
    [`    if (window.Babel && typeof window.Babel.transformScriptTags === 'function') {
      window.Babel.transformScriptTags();
    }`,
     `    if (window.Babel && typeof window.Babel.transformScriptTags === 'function') {
      window.Babel.transformScriptTags();
    }
    // Aligerado: con el app ya dibujado, las fotos de las demás pantallas se bajan en silencio (quedan en caché),
    // para que al entrar se vean de una como antes.
    setTimeout(function() {
      const fotos = uuids.filter(function(u) { return manifest[u].src && /^image[/]/.test(manifest[u].mime); }).map(function(u) { return blobUrls[u]; })
        .concat(Object.values(window.SPACIO_FOTOS || {}));
      // Se guardan en window.__fotosListas para que el navegador las tenga en memoria, ya decodificadas.
      window.__fotosListas = fotos.map(function(src) { const i = new Image(); i.src = src; if (i.decode) i.decode().catch(function() {}); return i; });
    }, 2500);`]
  ];
  for (const [a, b] of reemplazos) {
    if (html.split(a).length !== 2) throw new Error('el cargador cambió y no encuentro: ' + a.trim().split('\n')[0]);
    html = html.replace(a, () => b);
  }
  return html;
}

function aligerar() {
  let html = fs.readFileSync(INDEX, 'utf8');
  const man = isla(html, 'manifest');
  if (!man) throw new Error('index.html no es un bundle de Claude Design (falta __bundler/manifest)');
  const manifest = JSON.parse(man.texto);
  const nuevo = {};
  let sacados = 0;
  for (const [uuid, e] of Object.entries(manifest)) {
    const ext = EXT[e.mime] || 'bin';
    const rel = DIR + '/' + uuid + '.' + ext;
    let buf;
    if (e.data != null) {
      buf = Buffer.from(e.data, 'base64');
      if (e.compressed) buf = zlib.gunzipSync(buf);
      sacados++;
    } else {
      buf = fs.readFileSync(path.join(RAIZ, rel));
    }
    if (ext === 'js') {
      const f = sacarFotos(buf.toString('utf8'));
      if (f) { f.fotos.forEach((x) => escribir(x.rel, x.buf)); buf = Buffer.from(f.texto, 'utf8'); }
    }
    escribir(rel, buf);
    nuevo[uuid] = { mime: e.mime, src: rel + '?v=' + sello(buf) };
  }
  html = ponerIsla(html, 'manifest', JSON.stringify(nuevo, null, 0).replace(/},"/g, '},\n"'));

  const tpl = isla(html, 'template');
  const relTpl = DIR + '/plantilla.html';
  let tplBuf;
  if (tpl) {
    tplBuf = Buffer.from(JSON.parse(tpl.texto), 'utf8');
    html = html.slice(0, tpl.ini) + '<script type="__bundler/template_src">""</script>' + html.slice(tpl.fin);
  } else {
    tplBuf = fs.readFileSync(path.join(RAIZ, relTpl));
  }
  // Solo fotos (jpeg) e imágenes de más de 500 KB; los logos chicos siguen cargando de una.
  const uuidsImagen = new Set(Object.keys(nuevo).filter((u) => nuevo[u].mime === 'image/jpeg' ||
    (/^image\//.test(nuevo[u].mime) && fs.statSync(path.join(RAIZ, nuevo[u].src.split('?')[0])).size > 500 * 1024)));
  tplBuf = Buffer.from(perezosas(tplBuf.toString('utf8'), uuidsImagen), 'utf8');
  escribir(relTpl, tplBuf);
  html = ponerIsla(html, 'template_src', JSON.stringify(relTpl + '?v=' + sello(tplBuf)));
  html = precargar(html, tplBuf.toString('utf8'), nuevo, relTpl + '?v=' + sello(tplBuf));
  html = parcharCargador(html);
  fs.writeFileSync(INDEX, html);
  console.log('index.html: ' + (html.length / 1024).toFixed(0) + ' KB · piezas desempacadas ahora: ' + sacados + ' · piezas en ' + DIR + ': ' + Object.keys(nuevo).length);
}

function revisar() {
  const fallas = [];
  const html = fs.readFileSync(INDEX, 'utf8');
  if (Buffer.byteLength(html) > TOPE) fallas.push('index.html pesa ' + (Buffer.byteLength(html) / 1048576).toFixed(1) + ' MB (tope 1 MB).');
  const man = isla(html, 'manifest');
  if (man) {
    const manifest = JSON.parse(man.texto);
    const enBase64 = Object.values(manifest).filter((e) => e.data != null).length;
    if (enBase64) fallas.push(enBase64 + ' piezas vienen en base64 dentro de index.html.');
    for (const [uuid, e] of Object.entries(manifest)) {
      if (e.data != null) continue;
      const [rel, v] = String(e.src || '').split('?v=');
      const abs = path.join(RAIZ, rel);
      if (!fs.existsSync(abs)) { fallas.push('falta ' + rel + '.'); continue; }
      if (sello(fs.readFileSync(abs)) !== v) fallas.push(rel + ' cambió y su sello ?v= no.');
    }
    const ts = isla(html, 'template_src');
    if (!ts) fallas.push('falta __bundler/template_src (la plantilla sigue dentro de index.html).');
    else {
      const [rel, v] = JSON.parse(ts.texto).split('?v=');
      if (!fs.existsSync(path.join(RAIZ, rel))) fallas.push('falta ' + rel + '.');
      else if (sello(fs.readFileSync(path.join(RAIZ, rel))) !== v) fallas.push(rel + ' cambió y su sello ?v= no.');
    }
    for (const f of fs.existsSync(path.join(RAIZ, DIR)) ? fs.readdirSync(path.join(RAIZ, DIR)).filter((x) => x.endsWith('.js')) : []) {
      const t = fs.readFileSync(path.join(RAIZ, DIR, f), 'utf8');
      if (/"data:image\/[\w+.-]+;base64,[A-Za-z0-9+/=]{200000,}/.test(t) && /SPACIO_FOTOS/.test(t)) fallas.push(DIR + '/' + f + ' trae fotos en base64.');
    }
  }
  if (fallas.length) {
    console.error('Index pesado o desactualizado:\n- ' + fallas.join('\n- ') + '\nQué hacer: corre «node tools/aligerar.js» y sube index.html junto con assets/app/.');
    process.exit(1);
  }
  console.log('OK: index.html ' + (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB, todas las piezas en ' + DIR + ' con su sello al día.');
}

if (process.argv.includes('--revisar')) revisar(); else aligerar();
