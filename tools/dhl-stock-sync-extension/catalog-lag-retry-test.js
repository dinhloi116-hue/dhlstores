const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const popup=fs.readFileSync(path.join(dir,'popup.html'),'utf8');
const lazy=fs.readFileSync(path.join(dir,'lazy-product-mode.js'),'utf8');
const scanner=fs.readFileSync(path.join(dir,'catalog-popup-v3-mode.js'),'utf8');

// Retry layer cũ không còn được nạp; scanner popup hiện tại tự quản lý timeout/failure.
assert.ok(!popup.includes('catalog-lag-retry-mode.js'),'Không nạp lag-retry cũ');
assert.ok(!lazy.includes('catalog-lag-retry-mode.js'),'Không đưa lag-retry cũ vào lazy bundle');
assert.ok(lazy.includes("'catalog-popup-v3-mode.js'"));
assert.ok(scanner.includes('async function waitPopup(timeout = 2500)'));
assert.ok(scanner.includes('async function stableRows(root, timeout=1800)'));
assert.ok(scanner.includes('failedScanResult'));
assert.ok(scanner.includes('Checkpoint sau từng sản phẩm'));
assert.ok(scanner.includes("sendPopupOnly(tab.id,descriptor)"));

console.log('CATALOG LAG HANDLING PASS',{legacyRetry:false,popupWait:true,checkpoint:true});
