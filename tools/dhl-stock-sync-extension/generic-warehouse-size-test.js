const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, 'generic-warehouse-mode.js'), 'utf8');
const context = {
  console,
  globalThis: null
};
context.globalThis = context;
context.DHLXlsxLite = {
  __genericWarehouseV1: false,
  headerMap(){ return {}; },
  async readFirstSheet(){ return { rows: [] }; },
  async parseSapoExport(){ return null; }
};
context.DHLMatchCore = {
  normalizeSize(value){ return String(value == null ? '' : value).trim().toUpperCase().replace(/\s+/g, ''); }
};
context.DHLWarehouseCore = {
  canonicalWarehouseName(value){ return String(value || '').trim(); }
};

vm.createContext(context);
vm.runInContext(code, context);

const api = context.DHLGenericWarehouse;
assert.ok(api, 'DHLGenericWarehouse phải được expose');

const cases = [
  ['Size 5 (20-25kg)', '5'],
  ['Size 7 (26-29kg)', '7'],
  ['Size 9 (30-34kg)', '9'],
  ['Size 11 (35-39kg)', '11'],
  ['Size 13 (40-44kg)', '13'],
  ['Size 15 dưới 50kg', '15'],
  ['13', '13'],
  ['XL', 'XL']
];

for (const [raw, expected] of cases) {
  assert.strictEqual(api.normalizeWarehouseSize(raw), expected, `${raw} -> ${expected}`);
}

const parsed = api.parseLabel('ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh Không in / Size 13 (40-44kg)');
assert.ok(parsed, 'Phải parse được nhãn trẻ em có cân nặng');
assert.strictEqual(parsed.name, 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh');
assert.strictEqual(parsed.size, '13');

console.log('GENERIC WAREHOUSE SIZE PASS');
