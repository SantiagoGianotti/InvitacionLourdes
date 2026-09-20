/**
 * Recibe las confirmaciones de la invitación y las escribe en esta planilla.
 *
 * Va pegado dentro de la planilla (Extensiones > Apps Script), así que toma
 * la hoja activa y no hace falta configurar ningún ID.
 */

var HOJA = 'Confirmaciones';
var COLUMNAS = ['Fecha', 'Nombre', 'Respuesta', 'Restricción alimentaria'];

function doPost(e) {
  // Dos personas confirmando en el mismo segundo pisarían la misma fila.
  var candado = LockService.getScriptLock();
  candado.waitLock(20000);

  try {
    var datos = JSON.parse(e.postData.contents);
    var nombre = String(datos.nombre || '').trim();

    if (!nombre) return responder({ ok: false, error: 'falta el nombre' });

    hoja().appendRow([
      new Date(),
      nombre.slice(0, 120),
      String(datos.respuesta || '').slice(0, 60),
      String(datos.dieta || '').slice(0, 120)
    ]);

    return responder({ ok: true });
  } catch (err) {
    return responder({ ok: false, error: String(err) });
  } finally {
    candado.releaseLock();
  }
}

/** Para abrir la URL en el navegador y ver que el despliegue quedó vivo. */
function doGet() {
  return responder({ ok: true, confirmaciones: Math.max(hoja().getLastRow() - 1, 0) });
}

function hoja() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var h = libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);

  if (h.getLastRow() === 0) {
    h.appendRow(COLUMNAS);
    h.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold');
    h.setFrozenRows(1);
    h.setColumnWidth(1, 160);
    h.setColumnWidth(2, 220);
    h.setColumnWidth(3, 200);
    h.setColumnWidth(4, 220);
  }

  return h;
}

function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
