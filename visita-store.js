/* Almacén local del levantamiento de visita (IndexedDB).
   Las fotos son data URLs y no caben en localStorage (5 MB), así que el
   borrador completo —fotos incluidas— vive aquí y sobrevive a recargas,
   cierres de pestaña y pérdida de señal en sitio. */
(function (global) {
  var DB = "SpacioGrowVisitas", STORE = "borradores", VER = 1;
  var _p = null;

  function abrir() {
    if (_p) return _p;
    _p = new Promise(function (res, rej) {
      if (!global.indexedDB) { rej(new Error("sin IndexedDB")); return; }
      var rq = global.indexedDB.open(DB, VER);
      rq.onupgradeneeded = function () {
        var d = rq.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
    return _p;
  }

  function tx(modo, fn) {
    return abrir().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(STORE, modo), st = t.objectStore(STORE), rq = fn(st);
        t.oncomplete = function () { res(rq && rq.result); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }

  var API = {
    key: function (pid, apto) { return String(pid) + "|" + (apto || "unico"); },
    guardar: function (pid, apto, vis) {
      return tx("readwrite", function (st) { return st.put(vis, API.key(pid, apto)); })
        .catch(function (e) { console.warn("visita-store guardar", e); });
    },
    leer: function (pid, apto) {
      return tx("readonly", function (st) { return st.get(API.key(pid, apto)); })
        .catch(function (e) { console.warn("visita-store leer", e); return null; });
    },
    borrar: function (pid, apto) {
      return tx("readwrite", function (st) { return st.delete(API.key(pid, apto)); })
        .catch(function () {});
    },
    /* Todos los borradores guardados en este dispositivo: [{ pid, apto, vis }]. */
    todos: function () {
      return abrir().then(function (d) {
        return new Promise(function (res) {
          var out = [], t = d.transaction(STORE, "readonly"), st = t.objectStore(STORE), rq = st.openCursor();
          rq.onsuccess = function () {
            var c = rq.result;
            if (!c) { res(out); return; }
            var k = String(c.key).split("|");
            out.push({ pid: k[0], apto: k[1] === "unico" ? null : k[1], vis: c.value });
            c.continue();
          };
          rq.onerror = function () { res(out); };
        });
      }).catch(function () { return []; });
    }
  };
  global.SpacioVisitaStore = API;
})(window);
