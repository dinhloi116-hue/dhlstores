const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const popup=read('popup.html');
const shell=read('catalog-ui-shell.js');
const scanner=read('catalog-popup-v3-mode.js');
const diagnostics=read('catalog-scan-diagnostics-mode.js');

assert.ok(popup.includes('catalog-popup-v3-mode.js'),'Phải nạp scanner popup v3');
assert.ok(popup.includes('catalog-scan-diagnostics-mode.js'),'Phải nạp chẩn đoán lỗi quét');
assert.ok(!popup.includes('catalog-generic-mode.js'),'Không nạp scanner generic cũ song song');
assert.ok(!popup.includes('catalog-api-mode.js'),'Không nạp scanner API cũ song song');
assert.ok(!popup.includes('catalog-api-v2-mode.js'),'Không nạp scanner API v2 cũ song song');
assert.ok(shell.includes('id="catalogQuickTest"'),'UI shell phải tự tạo nút TEST NHANH');
assert.ok(scanner.includes('async function waitPopup(timeout = 2500)'),'Scanner phải có timeout popup rõ ràng');
assert.ok(scanner.includes('Không tìm thấy nút Thêm vào giỏ'),'Scanner phải ghi lý do thiếu action');
assert.ok(scanner.includes('Popup không mở cho'),'Scanner phải ghi lý do popup không mở');
assert.ok(diagnostics.includes('CHI TIẾT SẢN PHẨM QUÉT LỖI'),'UI phải hiện chi tiết sản phẩm lỗi');
assert.ok(diagnostics.includes('Nguyên nhân scanner:'),'UI phải hiện nguyên nhân scanner thật');

console.log('CATALOG SINGLE SCANNER PASS');
