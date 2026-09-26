const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const retry=fs.readFileSync(path.join(dir,'catalog-lag-retry-mode.js'),'utf8');
const popup=fs.readFileSync(path.join(dir,'popup.html'),'utf8');

assert.ok(retry.includes("type:'DHL_SCAN_ONE_DESCRIPTOR'"));
assert.ok(retry.includes('yêu cầu đủ màu/size/tồn'));
assert.ok(retry.includes('lagRetryAttempted'));
assert.ok(retry.includes('lagRetryRecovered'));
assert.ok(retry.includes('result&&result.complete===true&&variants.length>0'));
assert.ok(popup.includes('catalog-lag-retry-mode.js'));
assert.ok(popup.indexOf('catalog-lag-retry-mode.js')>popup.indexOf('catalog-popup-v3-mode.js'));

console.log('CATALOG LAG RETRY PASS',{canonicalScanner:true,aliasSkuRule:true});
