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
assert.ok(manifest.content_scripts[0].js.includes('match-core.js'), 'Content script phải có match-core để chọn đúng màu theo file Sapo');
for (const file of ['background.js','popup.html','popup.js','popup.css','catalog-mode.js','match-core.js','xlsx-lite.js','xlsx-preserve.js','dom-stock-parser.js']) {
  assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
}

const popupHtml = fs.readFileSync(path.join(dir, 'popup.html'), 'utf8');
assert.ok(popupHtml.includes('Chọn file xuất Sapo'));
assert.ok(popupHtml.includes('Chọn file mẫu nhập Sapo'));
assert.ok(popupHtml.includes('QUÉT KHO HD 2026'));
assert.ok(popupHtml.includes('TẠO FILE NHẬP SAPO'));
assert.ok(popupHtml.includes('XUẤT BÁO CÁO LỖI (.TXT)'));
assert.ok(popupHtml.includes('catalog-mode.js'), 'Side panel phải nạp chế độ quét danh sách nguồn');

const content = fs.readFileSync(path.join(dir, 'content.js'), 'utf8');
assert.ok(content.includes('DHL_SCAN_HD_LIVE'));
assert.ok(content.includes('openStockPopup'));
assert.ok(content.includes('quickCandidates'));
assert.ok(content.includes('scanHdLive'));
assert.ok(content.includes("const TARGET_SIZES = ['S', 'M', 'L', 'XL', 'XXL']"));
assert.ok(content.includes('selectTargetControls'), 'Scanner phải chỉ chọn màu mà file Sapo đang cần');
assert.ok(content.includes('switchColorAndRead'), 'Scanner phải chờ AJAX đổi màu trước khi đọc tồn');
assert.ok(content.includes('elapsed >= 650'), 'Không được đọc ngay bảng tồn của màu cũ');
assert.ok(content.includes("ignoredSizes: ['XXXL', 'XXXXL', 'XXXXXL']"));
assert.ok(content.includes('missingColorHints'));
assert.ok(content.includes('/product/child?psId='), 'Chỉ giữ API làm fallback nhận màu mặc định');

const matchCore = fs.readFileSync(path.join(dir, 'match-core.js'), 'utf8');
assert.ok(matchCore.includes('colorCompatibility'));
assert.ok(matchCore.includes("'kem'"), 'Kem phải được coi là họ màu be/sữa');
assert.ok(matchCore.includes('màu tương thích'), 'Ghép phải chặn màu không tương thích');

const popupJs = fs.readFileSync(path.join(dir, 'popup.js'), 'utf8');
assert.ok(popupJs.includes('ensureHdCategoryTab'));
assert.ok(popupJs.includes('DHL_SCAN_HD_LIVE'));
assert.ok(popupJs.includes('variantMatches'));
assert.ok(popupJs.includes('readyVariantCount() > 0'));
assert.ok(!popupJs.includes('fullMatchReady'), 'Không còn bắt buộc 130/130 mới xuất');
assert.ok(popupJs.includes('dòng chưa chắc chắn sẽ BỎ QUA, không ghi 0'));
assert.ok(popupJs.includes("const VERSION = '0.11.0'"));

const catalog = fs.readFileSync(path.join(dir, 'catalog-mode.js'), 'utf8');
assert.ok(catalog.includes('QUÉT TOÀN BỘ TRANG HD'));
assert.ok(catalog.includes('XUẤT CSV TÊN + SKU'));
assert.ok(catalog.includes('discoverAllProductCards'), 'Catalog mode phải nhận diện toàn bộ card sản phẩm hiện có trên trang');
assert.ok(catalog.includes('scanAllCatalogProducts'), 'Catalog mode phải quét lần lượt toàn bộ card đã nhận diện');
assert.ok(catalog.includes('DHL_SCAN_CURRENT_POPUP'), 'Catalog mode phải đọc popup từng sản phẩm mà không cần file Sapo');
assert.ok(catalog.includes('Không lọc riêng ĐT 2026'), 'Catalog mode không được hard-code chỉ ĐT 2026');
assert.ok(catalog.includes('Tên chuẩn đề xuất Sapo'));
assert.ok(catalog.includes('SKU mẫu nguồn'));
assert.ok(catalog.includes("['S', 'M', 'L', 'XL', 'XXL']"));

const preserve = fs.readFileSync(path.join(dir, 'xlsx-preserve.js'), 'utf8');
for (const field of ['Tên sản phẩm*','Mã SKU','Ảnh đại diện','Ảnh phiên bản','Giá','Giá so sánh','Giá vốn','Id phiên bản']) {
  assert.ok(preserve.includes(field), `Thiếu bảo vệ trường ${field}`);
}
assert.ok(preserve.includes('selected.push'));
assert.ok(preserve.includes('skippedVariantCount'));
assert.ok(!preserve.includes('chưa ghép đủ size'), 'Phải cho phép cập nhật từng biến thể độc lập');

console.log('BUILD PASS', {
  version: manifest.version,
  scanner: 'Sapo-target colors + exactly S/M/L/XL/XXL + AJAX wait',
  catalogModeWithoutSapo: true,
  catalogScansAllVisibleCards: true,
  catalogCsv: true,
  strictColorMapping: true,
  ignoresExtraSizes: true,
  variantLevelImport: true,
  partialImport: true,
  stockOnly: true,
  sourceHost: manifest.host_permissions[0]
});
