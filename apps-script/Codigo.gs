/**
 * Recibe las confirmaciones de la invitación y las escribe en esta planilla.
 *
 * Una fila por persona: si alguien vuelve a confirmar (porque cambió de idea,
 * o porque el navegador le mostró un error aunque la primera vez sí se guardó),
 * se actualiza su fila en vez de agregar otra.
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
    var nombre = String(datos.nombre || '').trim().slice(0, 120);

    if (!nombre) return responder({ ok: false, error: 'falta el nombre' });

    var fila = [
      new Date(),
      nombre,
      String(datos.respuesta || '').slice(0, 60),
      String(datos.dieta || '').slice(0, 120)
    ];

    var h = hoja();
    var existente = filaDe(h, nombre);

    if (existente) {
      h.getRange(existente, 1, 1, fila.length).setValues([fila]);
    } else {
      h.appendRow(fila);
    }

    return responder({ ok: true, actualizado: Boolean(existente) });
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

/**
 * Correr una vez a mano desde el editor (elegirla arriba y darle Ejecutar)
 * para limpiar los duplicados que ya quedaron. Por cada nombre repetido deja
 * la fila más reciente y borra las demás.
 */
function limpiarDuplicados() {
  var h = hoja();
  var ultima = h.getLastRow();
  if (ultima < 3) { Logger.log('Nada que limpiar.'); return; }

  var filas = h.getRange(2, 1, ultima - 1, COLUMNAS.length).getValues();
  var masReciente = {};   // clave -> { indice, fecha }
  var aBorrar = [];

  filas.forEach(function (fila, i) {
    var indice = i + 2;
    var k = clave(fila[1]);
    if (!k) return;

    var fecha = fila[0] instanceof Date ? fila[0].getTime() : 0;
    var previa = masReciente[k];

    if (!previa) {
      masReciente[k] = { indice: indice, fecha: fecha };
    } else if (fecha >= previa.fecha) {
      aBorrar.push(previa.indice);
      masReciente[k] = { indice: indice, fecha: fecha };
    } else {
      aBorrar.push(indice);
    }
  });

  // De abajo hacia arriba, para que borrar una no corra las que faltan.
  aBorrar.sort(function (a, b) { return b - a; })
         .forEach(function (indice) { h.deleteRow(indice); });

  Logger.log('Borradas ' + aBorrar.length + ' filas repetidas.');
}

/** Número de la fila de esa persona, o null si es la primera vez que confirma. */
function filaDe(h, nombre) {
  var ultima = h.getLastRow();
  if (ultima < 2) return null;

  var buscada = clave(nombre);
  var nombres = h.getRange(2, 2, ultima - 1, 1).getValues();

  for (var i = 0; i < nombres.length; i++) {
    if (clave(nombres[i][0]) === buscada) return i + 2;
  }
  return null;
}

/** "  José Pérez " y "jose perez" son la misma persona. */
function clave(nombre) {
  return String(nombre || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
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
