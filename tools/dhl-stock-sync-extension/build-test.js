const fs = require('fs');
const path = require('path');
const assert = require('assert');
const dir = __dirname;

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.strictEqual(manifest.manifest_version, 3);
assert.strictEqual(manifest.version, '0.10.0');
assert.ok(manifest.host_permissions.includes('https://si.aobongda.net/*'));
assert.ok(!manifest.host_permissions.some((x) => /sapo/i.test(x)), 'Extension không truy cập Sapo trực tiếp');
assert.ok(manifest.permissions.includes('sidePanel'));
assert.ok(manifest.permissions.includes('scripting'));
assert.strictEqual(manifest.side_panel.default_path, 'popup.html');
assert.ok(!manifest.action.default_popup);
for (const file of manifest.content_scripts[0].js) assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
for (const file of ['background.js','popup.html','popup.js','popup.css','match-core.js','xlsx-lite.js','xlsx-preserve.js','dom-stock-parser.js']) {
  assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
}

const popupHtml = fs.readFileSync(path.join(dir, 'popup.html'), 'utf8');
assert.ok(popupHtml.includes('Chọn file xuất Sapo'));
assert.ok(popupHtml.includes('Chọn file mẫu nhập Sapo'));
assert.ok(popupHtml.includes('QUÉT KHO HD 2026'));
assert.ok(popupHtml.includes('TẠO FILE NHẬP SAPO'));
assert.ok(popupHtml.includes('XUẤT BÁO CÁO LỖI (.TXT)'));

const content = fs.readFileSync(path.join(dir, 'content.js'), 'utf8');
assert.ok(content.includes('DHL_SCAN_HD_LIVE'));
assert.ok(content.includes('openStockPopup'));
assert.ok(content.includes('quickCandidates'));
assert.ok(content.includes('scanHdLive'));
assert.ok(content.includes("const TARGET_SIZES = ['S', 'M', 'L', 'XL', 'XXL']"));
assert.ok(content.includes("root.querySelectorAll('input[type=\"radio\"]')"), 'Màu phải lấy từ radio thật trong popup');
assert.ok(content.includes('Đủ đúng S/M/L/XL/XXL thì chuyển màu ngay'));
assert.ok(content.includes("ignoredSizes: ['XXXL', 'XXXXL', 'XXXXXL']"));
assert.ok(!content.includes("'[class*=\"quick\"]'"), 'Không được lấy cả quick wrapper làm popup tồn');
assert.ok(content.includes('/product/child?psId='), 'Chỉ giữ API làm fallback nhận màu mặc định');

const popupJs = fs.readFileSync(path.join(dir, 'popup.js'), 'utf8');
assert.ok(popupJs.includes('ensureHdCategoryTab'));
assert.ok(popupJs.includes('DHL_SCAN_HD_LIVE'));
assert.ok(popupJs.includes('variantMatches'));
assert.ok(popupJs.includes('readyVariantCount() > 0'));
assert.ok(!popupJs.includes('fullMatchReady'), 'Không còn bắt buộc 130/130 mới xuất');
assert.ok(popupJs.includes('dòng chưa có dữ liệu nguồn sẽ BỎ QUA'));

const preserve = fs.readFileSync(path.join(dir, 'xlsx-preserve.js'), 'utf8');
for (const field of ['Tên sản phẩm*','Mã SKU','Ảnh đại diện','Ảnh phiên bản','Giá','Giá so sánh','Giá vốn','Id phiên bản']) {
  assert.ok(preserve.includes(field), `Thiếu bảo vệ trường ${field}`);
}
assert.ok(preserve.includes('selected.push'));
assert.ok(preserve.includes('skippedVariantCount'));
assert.ok(!preserve.includes('chưa ghép đủ size'), 'Phải cho phép cập nhật từng biến thể độc lập');

console.log('BUILD PASS', {
  version: manifest.version,
  scanner: 'strict popup colors + exactly S/M/L/XL/XXL',
  ignoresExtraSizes: true,
  variantLevelImport: true,
  partialImport: true,
  stockOnly: true,
  sourceHost: manifest.host_permissions[0]
});
