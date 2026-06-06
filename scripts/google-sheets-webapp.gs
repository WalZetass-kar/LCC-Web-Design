/**
 * Zetass Pos - Google Sheets Web App endpoint.
 *
 * Cara pakai:
 * 1. Buka https://script.google.com dan buat project baru.
 * 2. Tempel isi file ini.
 * 3. Deploy > New deployment > Web app.
 * 4. Execute as: Me.
 * 5. Who has access: Anyone with the link.
 * 6. Salin Web App URL ke Settings > Asisten AI & Google Sheets.
 *
 * Opsional:
 * - Isi Script Property SPREADSHEET_ID jika ingin memakai spreadsheet tertentu.
 * - Jika kosong, script membuat file "Zetass Pos Export" di Google Drive pemilik script.
 */

const DEFAULT_SPREADSHEET_NAME = 'Zetass Pos Export'

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}')
    if (!payload || !Array.isArray(payload.sheets)) {
      return jsonResponse({ success: false, message: 'Payload tidak valid' })
    }

    const spreadsheet = getSpreadsheet()
    payload.sheets.forEach(function(sheetPayload) {
      writeSheet(spreadsheet, sheetPayload)
    })

    return jsonResponse({
      success: true,
      spreadsheetId: spreadsheet.getId(),
      spreadsheetUrl: spreadsheet.getUrl(),
      action: payload.action || 'append_dashboard',
    })
  } catch (err) {
    return jsonResponse({ success: false, message: String(err && err.message ? err.message : err) })
  }
}

function doGet() {
  const spreadsheet = getSpreadsheet()
  return jsonResponse({
    success: true,
    app: 'Zetass Pos',
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
  })
}

function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties()
  const configuredId = props.getProperty('SPREADSHEET_ID')
  if (configuredId) return SpreadsheetApp.openById(configuredId)

  const existing = DriveApp.getFilesByName(DEFAULT_SPREADSHEET_NAME)
  if (existing.hasNext()) {
    const file = existing.next()
    props.setProperty('SPREADSHEET_ID', file.getId())
    return SpreadsheetApp.openById(file.getId())
  }

  const spreadsheet = SpreadsheetApp.create(DEFAULT_SPREADSHEET_NAME)
  props.setProperty('SPREADSHEET_ID', spreadsheet.getId())
  return spreadsheet
}

function writeSheet(spreadsheet, sheetPayload) {
  const name = String(sheetPayload.name || 'Export').slice(0, 80)
  const rows = Array.isArray(sheetPayload.rows) ? sheetPayload.rows : []
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name)

  sheet.clearContents()
  if (rows.length === 0) return

  const width = rows.reduce(function(max, row) {
    return Math.max(max, Array.isArray(row) ? row.length : 1)
  }, 1)

  const normalized = rows.map(function(row) {
    const values = Array.isArray(row) ? row.slice() : [row]
    while (values.length < width) values.push('')
    return values
  })

  sheet.getRange(1, 1, normalized.length, width).setValues(normalized)
  sheet.autoResizeColumns(1, width)
  sheet.setFrozenRows(1)
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
