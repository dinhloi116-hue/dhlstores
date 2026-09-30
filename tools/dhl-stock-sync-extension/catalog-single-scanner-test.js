const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const popup=read('popup.html');
const lazy=read('lazy-product-mode.js');
const shell=read('catalog-ui-shell.js');
const scanner=read('catalog-popup-v3-mode.js');

assert.ok(!popup.includes('catalog-popup-v3-mode.js'),'Scanner SP mới không được nạp lúc mở panel');
assert.ok(lazy.includes("'catalog-popup-v3-mode.js'"),'Scanner popup v3 phải nằm trong lazy bundle');
assert.ok(!popup.includes('catalog-scan-diagnostics-mode.js'),'Không nạp diagnostics cũ ở startup');
assert.ok(!popup.includes('catalog-generic-mode.js'),'Không nạp scanner generic cũ song song');
assert.ok(!popup.includes('catalog-api-mode.js'),'Không nạp scanner API cũ song song');
assert.ok(!popup.includes('catalog-api-v2-mode.js'),'Không nạp scanner API v2 cũ song song');

assert.ok(shell.includes('id="catalogQuickTest"'),'UI shell vẫn có hook TEST NHANH ẩn');
assert.ok(scanner.includes('async function waitPopup(timeout = 2500)'),'Scanner phải có timeout popup rõ ràng');
assert.ok(scanner.includes('Không tìm thấy nút Thêm vào giỏ'),'Scanner phải ghi lý do thiếu action');
assert.ok(scanner.includes('Popup không mở cho'),'Scanner phải ghi lý do popup không mở');
assert.ok(scanner.includes('function failedScanResult(item, message)'),'Scanner phải giữ kết quả lỗi có cấu trúc');
assert.ok(scanner.includes("mode:'new-product-popup-full'"),'Scanner SP mới phải popup-full');

console.log('CATALOG SINGLE SCANNER PASS',{startup:'lazy',scanner:'popup-v3'});
