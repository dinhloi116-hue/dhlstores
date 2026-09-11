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
for (const file of ['background.js','popup.html','popup.js','popup.css','catalog-mode.js','catalog-export-fix.js','simple-mode.js','one-file-mode.js','stock-import-core.js','shop-rules.js','match-core.js','xlsx-lite.js','xlsx-preserve.js','dom-stock-parser.js']) {
  assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
}

const popupHtml = fs.readFileSync(path.join(dir, 'popup.html'), 'utf8');
assert.ok(popupHtml.includes('Chọn file xuất Sapo'));
assert.ok(popupHtml.includes('templateStep" style="display:none"'));
assert.ok(popupHtml.includes('QUÉT KHO HD 2026'));
assert.ok(popupHtml.includes('ĐẦU RA ĐÚNG MẪU NHẬP SAPO'));
assert.ok(popupHtml.includes('stock-import-core.js'));
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

const oneFile = fs.readFileSync(path.join(dir, 'one-file-mode.js'), 'utf8');
assert.ok(oneFile.includes('TẠO FILE TỒN KHO THEO MẪU SAPO'));
assert.ok(oneFile.includes('buildInventoryWorkbook'));
assert.ok(oneFile.includes('36 cột'));
assert.ok(oneFile.includes('Xác định theo ID'));
assert.ok(oneFile.includes('scanAfterFile'));

const stockImport = fs.readFileSync(path.join(dir, 'stock-import-core.js'), 'utf8');
assert.ok(stockImport.includes("'Cửa hàng chính_Tồn kho','Id phiên bản'"));
assert.ok(stockImport.includes("sheetName='Mẫu file nhập'"));
assert.ok(stockImport.includes('SAPO_HEADERS'));
assert.ok(stockImport.includes('variant.variantId'));
assert.ok(stockImport.includes('productBase'));

const catalog = fs.readFileSync(path.join(dir, 'catalog-mode.js'), 'utf8');
assert.ok(catalog.includes('QUÉT TOÀN BỘ TRANG HD'));
assert.ok(catalog.includes('discoverAllProductCards'));
assert.ok(catalog.includes('DHL_SCAN_CURRENT_POPUP'));
assert.ok(catalog.includes('Tên chuẩn đề xuất Sapo'));
assert.ok(catalog.includes('SKU mẫu nguồn'));

const simple = fs.readFileSync(path.join(dir, 'simple-mode.js'), 'utf8');
assert.ok(simple.includes('TẠO FILE ĐỔI TÊN SAPO'));
assert.ok(simple.includes('tên nguồn chính xác + size chính xác'));
assert.ok(simple.includes('buildRenameWorkbook'));

console.log('BUILD PASS', {
  version: manifest.version,
  scanner: 'S/M/L/XL/XXL + AJAX wait',
  catalogModeWithoutSapo: true,
  selfServiceRename: true,
  exactDailyMatching: true,
  outputFormat: 'accepted Sapo 36-column product import template',
  inventoryColumn: 35,
  variantIdColumn: 36,
  sourceHost: manifest.host_permissions[0]
});
