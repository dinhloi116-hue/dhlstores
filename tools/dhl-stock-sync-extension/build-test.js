const fs = require('fs');
const path = require('path');
const assert = require('assert');
const dir = __dirname;

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.strictEqual(manifest.manifest_version, 3);
assert.strictEqual(manifest.version, '0.6.0');
assert.ok(manifest.host_permissions.includes('https://si.aobongda.net/*'));
assert.ok(!manifest.host_permissions.some(x => /sapo/i.test(x)), 'Extension không cần quyền truy cập Sapo trực tiếp');
assert.ok(manifest.permissions.includes('sidePanel'), 'Thiếu quyền sidePanel');
assert.ok(manifest.permissions.includes('scripting'), 'Thiếu quyền scripting để tự nối lại tab nguồn');
assert.strictEqual(manifest.side_panel.default_path, 'popup.html');
assert.strictEqual(manifest.background.service_worker, 'background.js');
assert.ok(!manifest.action.default_popup, 'Không dùng popup vì click ra ngoài sẽ tự đóng');
assert.ok(Array.isArray(manifest.content_scripts) && manifest.content_scripts.length === 1);
for (const file of manifest.content_scripts[0].js) assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
for (const file of ['background.js','popup.html','popup.js','popup.css','match-core.js','xlsx-lite.js','xlsx-preserve.js']) assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);

const popup = fs.readFileSync(path.join(dir, 'popup.html'), 'utf8');
assert.ok(popup.includes('Chọn file xuất Sapo'));
assert.ok(popup.includes('Chọn file mẫu nhập Sapo'));
assert.ok(popup.includes('QUÉT KHO HD 2026'));
assert.ok(popup.includes('TẠO FILE NHẬP SAPO'));
assert.ok(popup.includes('CHỈ GHI ĐÈ TỒN KHO'));
assert.ok(popup.includes('match-core.js'));
assert.ok(popup.includes('xlsx-lite.js'));
assert.ok(popup.includes('xlsx-preserve.js'));

const background = fs.readFileSync(path.join(dir, 'background.js'), 'utf8');
assert.ok(background.includes('openPanelOnActionClick'));

const content = fs.readFileSync(path.join(dir, 'content.js'), 'utf8');
assert.ok(content.includes('/product/child?psId='));
assert.ok(content.includes('/hd-pc36029.html'));
assert.ok(content.includes('DHL_SCAN_HD_2026'));
assert.ok(content.includes("credentials: 'include'"));
assert.ok(content.includes('AbortController'));
assert.ok(content.includes('descriptor.title'), 'Phải ưu tiên tên sản phẩm từ danh mục nguồn');

const popupJs = fs.readFileSync(path.join(dir, 'popup.js'), 'utf8');
assert.ok(popupJs.includes('parseSapoExport'));
assert.ok(popupJs.includes('matchSapoProducts'));
assert.ok(popupJs.includes('buildSapoImport'));
assert.ok(popupJs.includes('sizeResolved'));
assert.ok(popupJs.includes('buildScanHints'));
assert.ok(popupJs.includes('fullMatchReady'));
assert.ok(popupJs.includes('chrome.scripting.executeScript'));
assert.ok(popupJs.includes('Could not establish connection'));

const xlsx = fs.readFileSync(path.join(dir, 'xlsx-lite.js'), 'utf8');
assert.ok(xlsx.includes('detectSizeDimension'));
assert.ok(xlsx.includes("label==='size'||label==='kichco'"));
assert.ok(xlsx.includes('sizeFromSku'));
assert.ok(xlsx.includes('skuBase'));

const matcher = fs.readFileSync(path.join(dir, 'match-core.js'), 'utf8');
assert.ok(matcher.includes('productSkuBase'));
assert.ok(matcher.includes('sourceIdentity'));
assert.ok(matcher.includes('assignedG'), 'Nguồn không được ghép trùng cho nhiều SP Sapo');

const preserve = fs.readFileSync(path.join(dir, 'xlsx-preserve.js'), 'utf8');
for (const field of ['Tên sản phẩm*','Mã SKU','Ảnh đại diện','Ảnh phiên bản','Giá','Giá so sánh','Giá vốn','Id phiên bản']) {
  assert.ok(preserve.includes(field), `Thiếu bảo vệ trường ${field}`);
}
assert.ok(preserve.includes('chưa ghép đủ size'));

console.log('BUILD PASS', {
  manifest: manifest.version,
  sidePanel: true,
  autoReconnect: true,
  fileDrivenLinks: true,
  dynamicSize: true,
  stockOnlyImport: true,
  sourceHost: manifest.host_permissions[0]
});
