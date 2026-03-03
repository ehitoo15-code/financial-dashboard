import * as XLSX from 'xlsx';

export async function loadExcelData() {
    const response = await fetch('/data.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    const data = {};
    for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        data[name] = {
            raw: sheet,
            json: XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true }),
            name: name
        };
    }
    return data;
}

export function getCellValue(sheet, row, col) {
    if (!sheet || !sheet.json) return null;
    if (row < 0 || row >= sheet.json.length) return null;
    const r = sheet.json[row];
    if (!r || col < 0 || col >= r.length) return null;
    return r[col];
}

export function getRow(sheet, row) {
    if (!sheet || !sheet.json || row < 0 || row >= sheet.json.length) return [];
    return sheet.json[row] || [];
}

export function getColValues(sheet, col, startRow, endRow) {
    const values = [];
    for (let r = startRow; r <= endRow; r++) {
        values.push(getCellValue(sheet, r, col));
    }
    return values;
}
