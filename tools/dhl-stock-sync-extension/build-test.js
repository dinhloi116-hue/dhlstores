const fs = require('fs');
const path = require('path');
const assert = require('assert');
const dir = __dirname;

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.strictEqual(manifest.manifest_version, 3);
assert.ok(manifest.host_permissions.includes('https://si.aobongda.net/*'));
assert.ok(!manifest.host_permissions.some(x => /sapo/i.test(x)), 'Extension không cần quyền truy cập Sapo trực tiếp');
assert.ok(Array.isArray(manifest.content_scripts) && manifest.content_scripts.length === 1);
for (const file of manifest.content_scripts[0].js) assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
for (const file of ['popup.html','popup.js','popup.css','match-core.js','xlsx-lite.js']) assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);

const popup = fs.readFileSync(path.join(dir, 'popup.html'), 'utf8');
assert.ok(popup.includes('Chọn file xuất Sapo'));
assert.ok(popup.includes('Chọn file mẫu nhập Sapo'));
assert.ok(popup.includes('QUÉT KHO HD 2026'));
assert.ok(popup.includes('TẠO FILE NHẬP SAPO'));
assert.ok(popup.includes('match-core.js'));
assert.ok(popup.includes('xlsx-lite.js'));

const content = fs.readFileSync(path.join(dir, 'content.js'), 'utf8');
assert.ok(content.includes('/product/child?psId='));
assert.ok(content.includes('/hd-pc36029.html'));
assert.ok(content.includes('DHL_SCAN_HD_2026'));
assert.ok(content.includes("credentials: 'include'"));
assert.ok(content.includes('AbortController'));

const popupJs = fs.readFileSync(path.join(dir, 'popup.js'), 'utf8');
assert.ok(popupJs.includes('parseSapoExport'));
assert.ok(popupJs.includes('matchSapoProducts'));
assert.ok(popupJs.includes('buildSapoImport'));

console.log('BUILD PASS', {manifest: manifest.version, host: manifest.host_permissions[0], sapoFileWorkflow: true});
