/* Spacio AM · Filtro pill — puerto del Select editorial de mi-spacioam.
   Multi-selección, búsqueda por texto, orden alfabético (con "Todos" fijo primero).
   Montado vía <x-import>. Props: value (string | array), options [{value,label,sub}],
   onChange, icon, minWidth, multi, searchable, placeholder. */
var React = window.React;
var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;

function I(name, size, color) {
  var ns = window.SpacioAMDesignSystem_2c08fe, Ic = ns && ns.Icon;
  return Ic ? React.createElement(Ic, { name: name, size: size || 15, color: color || "var(--fg-muted)" }) : null;
}

function PillFilter(props) {
  var value = props.value, options = props.options || [], onChange = props.onChange;
  var multi = !!props.multi, minWidth = props.minWidth || 180, placeholder = props.placeholder;
  var st = useState(false), open = st[0], setOpen = st[1];
  var qs = useState(""), q = qs[0], setQ = qs[1];
  var ref = useRef(null);
  useEffect(function () {
    var h = function (e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", h); return function () { document.removeEventListener("mousedown", h); };
  }, []);
  var sel = multi ? (Array.isArray(value) ? value : []) : value;
  var isActive = function (v) { return multi ? (v === "all" ? sel.length === 0 : sel.indexOf(v) >= 0) : v === value; };
  var sentinel = options.filter(function (o) { return o.value === "all"; });
  var rest = options.filter(function (o) { return o.value !== "all"; }).slice()
    .sort(function (a, b) { return String(a.label).localeCompare(String(b.label), "es", { numeric: true, sensitivity: "base" }); });
  var ordered = sentinel.concat(rest);
  var showSearch = props.searchable != null ? props.searchable : options.length > 6;
  var shown = q ? ordered.filter(function (o) { return (String(o.label) + " " + (o.sub || "")).toLowerCase().indexOf(q.toLowerCase()) >= 0; }) : ordered;
  var triggerLabel;
  if (multi) {
    triggerLabel = sel.length === 0 ? (sentinel[0] ? sentinel[0].label : (placeholder || "")) :
      sel.length === 1 ? ((options.find(function (o) { return o.value === sel[0]; }) || {}).label || "") :
        (sel.length + " " + (placeholder || "seleccionados"));
  } else {
    var cur = options.find(function (o) { return o.value === value; }); triggerLabel = cur ? cur.label : (placeholder || "");
  }
  var pick = function (v) {
    if (!multi) { onChange && onChange(v); setOpen(false); setQ(""); return; }
    if (v === "all") { onChange && onChange([]); return; }
    var next = sel.indexOf(v) >= 0 ? sel.filter(function (x) { return x !== v; }) : sel.concat(v);
    onChange && onChange(next);
  };
  return React.createElement("div", { ref: ref, style: { position: "relative" } },
    React.createElement("button", {
      onClick: function () { setOpen(!open); },
      style: { display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", background: "var(--surface)", border: "1px solid var(--divider)", borderRadius: 999, padding: "10px 14px 10px 16px", fontFamily: "var(--font-sans)", fontSize: 12, letterSpacing: "0.08em", color: "var(--fg)", boxShadow: "var(--shadow-xs)" }
    },
      props.icon ? I(props.icon, 15) : null,
      React.createElement("span", { style: { fontWeight: 500 } }, triggerLabel),
      (multi && sel.length > 0) ? React.createElement("span", { style: { minWidth: 17, height: 17, padding: "0 5px", borderRadius: 999, background: "var(--accent)", color: "#fff", fontSize: 9.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" } }, sel.length) : null,
      React.createElement("span", { style: { transform: open ? "rotate(180deg)" : "none", transition: "transform .18s", display: "inline-flex" } }, I("chevronDown", 14))
    ),
    open ? React.createElement("div", {
      style: { position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 60, minWidth: minWidth, background: "var(--surface)", border: "1px solid var(--divider)", borderRadius: 16, boxShadow: "var(--shadow-md)", padding: 6, maxHeight: 360, display: "flex", flexDirection: "column" }
    },
      showSearch ? React.createElement("div", { style: { padding: "4px 4px 8px" } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, background: "var(--bg-alt)", border: "1px solid var(--divider)", borderRadius: 10, padding: "9px 11px" } },
          I("search", 14),
          React.createElement("input", { autoFocus: true, value: q, onChange: function (e) { setQ(e.target.value); }, placeholder: placeholder || "Buscar…", style: { border: "none", outline: "none", background: "transparent", width: "100%", fontFamily: "var(--font-sans)", fontSize: 12.5, letterSpacing: "0.03em", color: "var(--fg)" } }),
          q ? React.createElement("button", { onClick: function () { setQ(""); }, style: { border: "none", background: "transparent", cursor: "pointer", display: "inline-flex", color: "var(--fg-muted)" } }, I("x", 13)) : null
        )
      ) : null,
      React.createElement("div", { style: { overflowY: "auto", minHeight: 0 } },
        shown.map(function (o) {
          var active = isActive(o.value);
          return React.createElement("button", {
            key: o.value, onClick: function () { pick(o.value); },
            style: { display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: active ? "var(--bg-alt)" : "transparent", borderRadius: 11, padding: "11px 12px", fontFamily: "var(--font-sans)", fontSize: 12.5, letterSpacing: "0.04em", color: "var(--fg)" }
          },
            (multi && o.value !== "all") ? React.createElement("span", { style: { flexShrink: 0, width: 17, height: 17, borderRadius: 5, border: "1.5px solid " + (active ? "var(--accent)" : "var(--divider)"), background: active ? "var(--accent)" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center" } }, active ? I("check", 12, "#fff") : null) : null,
            o.sub ? React.createElement("span", { style: { display: "flex", flexDirection: "column", gap: 2 } },
              React.createElement("span", { style: { fontWeight: 500 } }, o.label),
              React.createElement("span", { style: { fontSize: 10.5, color: "var(--fg-muted)", letterSpacing: "0.06em" } }, o.sub)
            ) : React.createElement("span", { style: { fontWeight: active ? 500 : 400 } }, o.label),
            (active && !multi) ? React.createElement("span", { style: { marginLeft: "auto", display: "inline-flex" } }, I("check", 15, "var(--accent)")) : null
          );
        }),
        shown.length === 0 ? React.createElement("div", { style: { padding: "16px 12px", textAlign: "center", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-muted)" } }, "Sin resultados") : null
      )
    ) : null
  );
}

module.exports = { PillFilter: PillFilter };
