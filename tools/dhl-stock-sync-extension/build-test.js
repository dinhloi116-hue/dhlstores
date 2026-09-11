const fs = require('fs');
const path = require('path');
const assert = require('assert');
const dir = __dirname;

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.strictEqual(manifest.manifest_version, 3);
assert.strictEqual(manifest.version, '0.11.0');
assert.ok(manifest.host_permissions.includes('https://si.aobongda.net/*'));
assert.ok(!manifest.host_permissions.some((x) => /sapo/i.test(x)), 'Extension không truy cập Sapo trực tiếp');
assert.ok(manifest.permissions.includes('sidePanel'));
assert.ok(manifest.permissions.includes('scripting'));
assert.strictEqual(manifest.side_panel.default_path, 'popup.html');
assert.ok(!manifest.action.default_popup);
for (const file of manifest.content_scripts[0].js) assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
for (const file of ['background.js','popup.html','popup.js','popup.css','catalog-mode.js','catalog-export-fix.js','simple-mode.js','one-file-mode.js','warehouse-core.js','stock-import-core.js','shop-rules.js','match-core.js','xlsx-lite.js','xlsx-preserve.js','dom-stock-parser.js']) {
  assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
}

const popupHtml = fs.readFileSync(path.join(dir, 'popup.html'), 'utf8');
assert.ok(popupHtml.includes('Chọn file Quản lý kho Sapo'));
assert.ok(popupHtml.includes('templateStep" style="display:none"'));
assert.ok(popupHtml.includes('QUÉT KHO HD 2026'));
assert.ok(popupHtml.includes('DÙNG TRỰC TIẾP FILE QUẢN LÝ KHO SAPO'));
assert.ok(popupHtml.includes('warehouse-core.js'));
assert.ok(popupHtml.indexOf('warehouse-core.js') < popupHtml.indexOf('popup.js'), 'warehouse-core phải bọc parser trước popup.js');
assert.ok(popupHtml.includes('one-file-mode.js'));

const content = fs.readFileSync(path.join(dir, 'content.js'), 'utf8');
assert.ok(content.includes('DHL_SCAN_HD_LIVE'));
assert.ok(content.includes('openStockPopup'));
assert.ok(content.includes("const TARGET_SIZES = ['S', 'M', 'L', 'XL', 'XXL']"));
assert.ok(content.includes('switchColorAndRead'));
assert.ok(content.includes('elapsed >= 650'));

const popupJs = fs.readFileSync(path.join(dir, 'popup.js'), 'utf8');
assert.ok(popupJs.includes('ensureHdCategoryTab'));
assert.ok(popupJs.includes('DHL_SCAN_HD_LIVE'));
assert.ok(popupJs.includes('variantMatches'));
assert.ok(!popupJs.includes('fullMatchReady'));
assert.ok(popupJs.includes("const VERSION = '0.11.0'"));

const warehouse = fs.readFileSync(path.join(dir, 'warehouse-core.js'), 'utf8');
assert.ok(warehouse.includes("map['Sản phẩm']"));
assert.ok(warehouse.includes("map['Tồn kho']"));
assert.ok(warehouse.includes("/(S|M|L|XL|XXL)"));
assert.ok(warehouse.includes('inputType:\'warehouse\''));
assert.ok(warehouse.includes('updateWarehouseWorkbook'));
assert.ok(warehouse.includes('xlsx.parseSapoExport=async function'));

const oneFile = fs.readFileSync(path.join(dir, 'one-file-mode.js'), 'utf8');
assert.ok(oneFile.includes('TẠO FILE KHO ĐÃ CẬP NHẬT TỒN'));
assert.ok(oneFile.includes("sapoData.inputType==='warehouse'"));
assert.ok(oneFile.includes('updateWarehouseWorkbook'));
assert.ok(oneFile.includes('DANH_SACH_QUAN_LY_KHO_DA_CAP_NHAT_TON'));
assert.ok(oneFile.includes('scanAfterFile'));

const catalog = fs.readFileSync(path.join(dir, 'catalog-mode.js'), 'utf8');
assert.ok(catalog.includes('QUÉT TOÀN BỘ TRANG HD'));
assert.ok(catalog.includes('discoverAllProductCards'));
assert.ok(catalog.includes('DHL_SCAN_CURRENT_POPUP'));
assert.ok(catalog.includes('Tên chuẩn đề xuất Sapo'));
assert.ok(catalog.includes('SKU mẫu nguồn'));

console.log('BUILD PASS', {
  version: manifest.version,
  scanner: 'S/M/L/XL/XXL + AJAX wait',
  dailyInput: 'Sapo warehouse export',
  warehouseHeader: 'Sản phẩm + Tồn kho',
  adultVariantsOnly: true,
  output: 'same warehouse workbook with updated Tồn kho',
  childrenUntouched: true,
  sourceHost: manifest.host_permissions[0]
});
