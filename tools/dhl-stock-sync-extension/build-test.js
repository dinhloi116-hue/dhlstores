const fs = require('fs');
const path = require('path');
const assert = require('assert');
const dir = __dirname;

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.strictEqual(manifest.manifest_version, 3);
assert.ok(manifest.host_permissions.includes('https://si.aobongda.net/*'));
assert.ok(!manifest.host_permissions.some(x => /sapo/i.test(x)), 'Bản test chưa được phép ghi Sapo');
assert.ok(Array.isArray(manifest.content_scripts) && manifest.content_scripts.length === 1);
for (const file of manifest.content_scripts[0].js) {
  assert.ok(fs.existsSync(path.join(dir, file)), `Thiếu ${file}`);
}
assert.ok(fs.existsSync(path.join(dir, manifest.action.default_popup)));

const popup = fs.readFileSync(path.join(dir, 'popup.html'), 'utf8');
assert.ok(popup.includes('popup.js'));
assert.ok(popup.includes('Quét sản phẩm hiện tại'));
assert.ok(popup.includes('Quét danh sách'));
assert.ok(popup.includes('Xuất CSV'));

const content = fs.readFileSync(path.join(dir, 'content.js'), 'utf8');
assert.ok(content.includes('/product/child?psId='));
assert.ok(content.includes("credentials: 'include'"));
assert.ok(content.includes("cache: 'no-store'"));
assert.ok(content.includes('AbortController'));

console.log('BUILD PASS', {
  manifest: manifest.version,
  host: manifest.host_permissions[0],
  contentScripts: manifest.content_scripts[0].js.length,
});
