import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, '..', 'data', 'wud-fi-tideh.csv');
const OUT_PATH = join(__dirname, '..', 'js', 'data.js');

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const raw = readFileSync(CSV_PATH, 'utf8');
const rows = parseCSV(raw);
const dataRows = rows.slice(1).filter(r => (r[0] || '').trim().length > 0);

const items = dataRows.map(r => ({
  original: (r[0] || '').trim(),
  english: (r[1] || '').trim(),
  meaning: (r[2] || '').trim(),
  audio: (r[3] || '').trim() || null,
  slug: (r[4] || '').trim()
}));

const banner = '// Auto-generated from data/wud-fi-tideh.csv by tools/build-data.mjs — do not edit by hand.\n';
const out = banner +
  '(function (root, factory) {\n' +
  '  var api = factory();\n' +
  '  if (typeof module !== "undefined" && module.exports) { module.exports = api; }\n' +
  '  else { root.WUD_DATA = api.WUD_DATA; }\n' +
  '})(typeof globalThis !== "undefined" ? globalThis : this, function () {\n' +
  '  var WUD_DATA = ' + JSON.stringify(items, null, 2).replace(/\n/g, '\n  ') + ';\n' +
  '  return { WUD_DATA: WUD_DATA };\n' +
  '});\n';

writeFileSync(OUT_PATH, out, 'utf8');
console.log('Wrote ' + items.length + ' proverbs to ' + OUT_PATH);
