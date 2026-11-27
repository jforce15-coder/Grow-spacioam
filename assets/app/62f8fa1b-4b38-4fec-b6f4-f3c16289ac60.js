/* ══════════════════════════════════════════════════════════════
   Carga del módulo de contratos de Spacio AM Docs dentro de Grow.
   Los archivos .jsx de Docs se usan tal cual (mismo generador,
   misma hoja con membrete, mismo proceso de firma); aquí solo se
   transpilan y evalúan en orden antes de montarlos.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.__docsBoot) return;
  window.__docsBoot = true;

  window.SPACIO_DOCS_NO_SEED = true;   // dentro de Grow no se siembra el demo
  window.SPACIO_DOCS_ORIGEN = "grow";
  /* Enlace público de firma: el mismo de la app de Docs. */
  window.SPACIO_FIRMA_BASE = window.SPACIO_FIRMA_BASE || "https://docs.spacioam.com/index.html";

  var CDN = [
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    "https://unpkg.com/docx@8.5.0/build/index.umd.js",
  ];
  var BABEL = "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js";

  /* Orden de evaluación: las dependencias antes del envoltorio. */
  var FILES = [
    "brand.jsx",
    "panel-ui.jsx",
    "paginate.jsx",
    "contracts.jsx",
    "contracts-cohosting.jsx",
    "docx-export.jsx",
    "esign.jsx",
    "docs-grow.jsx",
  ];

  function script(src) {
    return new Promise(function (res) {
      var s = document.createElement("script");
      s.src = src; s.async = false;
      s.onload = res; s.onerror = function () { res(); };
      document.head.appendChild(s);
    });
  }
  function waitFor(test, ms) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function tick() {
        if (test()) return res(true);
        if (Date.now() - t0 > (ms || 20000)) return res(false);
        setTimeout(tick, 60);
      })();
    });
  }

  function run(code, name) {
    var out = window.Babel.transform(code, {
      presets: ["react"], filename: name, sourceMaps: false,
    }).code;
    // eslint-disable-next-line no-new-func
    (new Function(out + "\n//# sourceURL=docs/" + name))();
  }

  function fuente(f) {
    /* En el entregable de un solo archivo, el bundler deja los .jsx en
       window.__resources; fuera de él se leen con fetch. */
    var emb = (window.__DOCS_SRC || {})[f];
    if (emb) return Promise.resolve(emb);
    var pre = (window.__resources || {})[f] || (window.__resources || {})["./" + f];
    if (pre) {
      if (/^data:/.test(pre)) {
        var b64 = pre.slice(pre.indexOf(",") + 1);
        try {
          var bin = atob(b64), bytes = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return Promise.resolve(new TextDecoder("utf-8").decode(bytes));
        } catch (e) { /* sigue con fetch */ }
      } else return Promise.resolve(pre);
    }
    return fetch(f).then(function (r) { return r.text(); });
  }

  var ready = Promise.all(CDN.map(script))
    .then(function () { return waitFor(function () { return window.React && window.ReactDOM; }); })
    .then(function () { return window.Babel ? null : script(BABEL); })
    .then(function () { return waitFor(function () { return window.Babel && window.Babel.transform; }); })
    .then(function () {
      return FILES.reduce(function (chain, f) {
        return chain.then(function () {
          return fuente(f).then(function (code) {
            try { run(code, f); } catch (e) { console.error("docs-boot: " + f, e); }
          });
        });
      }, Promise.resolve());
    })
    .then(function () {
      window.__docsReady = true;
      window.dispatchEvent(new Event("docs-ready"));
      /* Trae de la hoja compartida los contratos generados en cualquiera
         de las dos apps, para que el listado sea el mismo en las dos. */
      if (window.SpacioSync && window.SpacioSync.endpoint()) window.SpacioSync.pull();
    });

  window.DocsBoot = { ready: ready };
})();
