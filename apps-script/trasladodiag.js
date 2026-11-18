/* ═══ TRASLADO · revisión del robot (Hub-Spacioam docs/specs/traslado-workspace.md) ═══
   Grow no tiene activadores: lo único que hay que probar al mudarlo a alma@ es que el proyecto nuevo abre la hoja y la
   carpeta madre (SPREADSHEET_ID y FOLDER_ID vienen en las Propiedades) y que ya tiene LOGIN_SECRETO.
   Robot: { action: "__traslado", token } → id del proyecto, con qué cuenta corre, activadores vivos, si abre la hoja y
   la carpeta y si tiene LOGIN_SECRETO. Solo lee: no cambia nada. */
function growTrasladoDiag_(body) {
  if (!body || body.action !== '__traslado') return null;
  var out;
  try {
    if (!esRobot_({ robot: String(body.token || '') })) out = { ok: false, error: 'token' };
    else {
      var n = {}, abre = {}, cuenta = '';
      /* El viejo no tiene el permiso de activadores (nunca los usó): sin permiso, activadores = null y sigue. */
      try { ScriptApp.getProjectTriggers().forEach(function (t) { var f = t.getHandlerFunction(); n[f] = (n[f] || 0) + 1; }); } catch (e) { n = null; }
      try { cuenta = Session.getEffectiveUser().getEmail(); } catch (e) {}
      try { abre.hoja = !!SpreadsheetApp.openById(SPREADSHEET_ID).getName(); } catch (e) { abre.hoja = false; }
      try { abre.carpeta = !!DriveApp.getFolderById(FOLDER_ID).getName(); } catch (e) { abre.carpeta = false; }
      out = { ok: true, proyecto: ScriptApp.getScriptId(), cuenta: cuenta, activadores: n, abre: abre,
              login_secreto: !!PropertiesService.getScriptProperties().getProperty('LOGIN_SECRETO') };
    }
  } catch (e) { out = { ok: false, error: String(e.message || e).slice(0, 120) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
