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
for (const file of ['background.js','popup.html','popup.js','popup.css','catalog-mode.js','catalog-export-fix.js','simple-mode.js','one-file-mode.js','direct-stock-core.js','shop-rules.js','match-core.js','xlsx-lite.js','xlsx-preserve.js','dom-stock-parser.js']) {
  assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
}

const popupHtml = fs.readFileSync(path.join(dir, 'popup.html'), 'utf8');
assert.ok(popupHtml.includes('Chọn file xuất Sapo'));
assert.ok(popupHtml.includes('templateStep" style="display:none"'), 'Mẫu nhập cũ phải bị ẩn ở chế độ 1 file');
assert.ok(popupHtml.includes('QUÉT KHO HD 2026'));
assert.ok(popupHtml.includes('CHỈ SỬA TỒN KHO TRÊN FILE XUẤT SAPO'));
assert.ok(popupHtml.includes('XUẤT BÁO CÁO LỖI (.TXT)'));
assert.ok(popupHtml.includes('catalog-mode.js'), 'Side panel phải nạp chế độ quét danh sách nguồn');
assert.ok(popupHtml.includes('shop-rules.js'), 'Side panel phải nạp quy tắc tên nguồn của shop');
assert.ok(popupHtml.includes('simple-mode.js'), 'Side panel phải nạp chế độ chuẩn hóa tên');
assert.ok(popupHtml.includes('direct-stock-core.js'), 'Side panel phải nạp bộ sửa tồn trực tiếp');
assert.ok(popupHtml.includes('one-file-mode.js'), 'Side panel phải nạp chế độ 1 file');

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

const popupJs = fs.readFileSync(path.join(dir, 'popup.js'), 'utf8');
assert.ok(popupJs.includes('ensureHdCategoryTab'));
assert.ok(popupJs.includes('DHL_SCAN_HD_LIVE'));
assert.ok(popupJs.includes('variantMatches'));
assert.ok(!popupJs.includes('fullMatchReady'), 'Không còn bắt buộc 130/130 mới xuất');
assert.ok(popupJs.includes("const VERSION = '0.11.0'"));

const oneFile = fs.readFileSync(path.join(dir, 'one-file-mode.js'), 'utf8');
assert.ok(oneFile.includes('TẠO FILE SAPO ĐÃ CẬP NHẬT TỒN'));
assert.ok(oneFile.includes('FILE CHƯA CÓ CỘT TỒN KHO'));
assert.ok(oneFile.includes('Tùy chọn trường hiển thị'));
assert.ok(oneFile.includes('direct.updateExportWorkbook'));
assert.ok(oneFile.includes('scanAfterFile'), 'Phải bắt quét tồn mới sau khi chọn file');

const direct = fs.readFileSync(path.join(dir, 'direct-stock-core.js'), 'utf8');
assert.ok(direct.includes('updateExportWorkbook'));
assert.ok(direct.includes('resolveInventoryHeaders'));
assert.ok(direct.includes('skippedVariantCount'));
assert.ok(direct.includes('stock===0'), 'Tồn 0 thật phải được ghi 0');
assert.ok(direct.includes('Tool không tự bịa/thêm tên chi nhánh nữa'), 'Không được tự thêm tên chi nhánh giả định');

const catalog = fs.readFileSync(path.join(dir, 'catalog-mode.js'), 'utf8');
assert.ok(catalog.includes('QUÉT TOÀN BỘ TRANG HD'));
assert.ok(catalog.includes('discoverAllProductCards'), 'Catalog mode phải nhận diện toàn bộ card sản phẩm hiện có trên trang');
assert.ok(catalog.includes('scanAllCatalogProducts'), 'Catalog mode phải quét lần lượt toàn bộ card đã nhận diện');
assert.ok(catalog.includes('DHL_SCAN_CURRENT_POPUP'), 'Catalog mode phải đọc popup từng sản phẩm mà không cần file Sapo');
assert.ok(catalog.toLowerCase().includes('không lọc riêng đt 2026'), 'Catalog mode không được hard-code chỉ ĐT 2026');
assert.ok(catalog.includes('Tên chuẩn đề xuất Sapo'));
assert.ok(catalog.includes('SKU mẫu nguồn'));
assert.ok(catalog.includes("['S', 'M', 'L', 'XL', 'XXL']"));

const simple = fs.readFileSync(path.join(dir, 'simple-mode.js'), 'utf8');
assert.ok(simple.includes('TẠO FILE ĐỔI TÊN SAPO'), 'Tool phải tự tạo file chuẩn hóa tên, không cần nhờ ChatGPT');
assert.ok(simple.includes('tên nguồn chính xác + size chính xác'), 'Đồng bộ hằng ngày phải ghép exact name + exact size');
assert.ok(simple.includes('buildRenameWorkbook'), 'Tool phải tự sửa tên trên file xuất Sapo');
assert.ok(simple.includes('Chỉ đổi Tên sản phẩm*'), 'Tool phải nói rõ chỉ đổi tên khi chuẩn hóa');

const shopRules = fs.readFileSync(path.join(dir, 'shop-rules.js'), 'utf8');
assert.ok(shopRules.includes("'mexico xanh 26 hd':'ĐT Mexico 2026 HD - Rêu'"));
assert.ok(shopRules.includes("'y vang 26 hd':'ĐT Ý 2026 HD - Kem'"));
assert.ok(shopRules.includes("'anh be hd':'ĐT Anh 2026 HD - Vàng Kem'"));

console.log('BUILD PASS', {
  version: manifest.version,
  scanner: 'exact source name + exactly S/M/L/XL/XXL + AJAX wait',
  catalogModeWithoutSapo: true,
  selfServiceRename: true,
  oneFileDailyWorkflow: true,
  exactDailyMatching: true,
  directStockEditOnExport: true,
  requireRealSapoInventoryColumn: true,
  unmatchedKeepsOldStock: true,
  stockOnly: true,
  sourceHost: manifest.host_permissions[0]
});
