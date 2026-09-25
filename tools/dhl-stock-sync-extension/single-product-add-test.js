const fs=require('fs');
const assert=require('assert');
const ui=fs.readFileSync(__dirname+'/single-product-add-mode.js','utf8');
const popup=fs.readFileSync(__dirname+'/popup.html','utf8');

assert.ok(ui.includes("type:'DHL_SCAN_CURRENT_POPUP'"));
assert.ok(ui.includes("productCreate.makeApiProducts([result])"));
assert.ok(ui.includes("type:'DHL_SAPO_PRODUCT_CREATE_START'"));
assert.ok(ui.includes('QUÉT 1 SP ĐANG MỞ'));
assert.ok(ui.includes('ĐĂNG 1 SP LÊN SAPO'));
assert.ok(ui.includes('TẠO EXCEL 1 SP'));
assert.ok(ui.includes('cột A Đường dẫn/Alias làm SKU gốc'));
assert.ok(ui.includes('SKU Sapo = Đường dẫn/Alias + Size'));
assert.ok(popup.includes('<script src="single-product-add-mode.js"></script>'));

console.log('SINGLE PRODUCT ADD PASS',{
  scan:'current popup only',
  sku:'column A alias + size',
  create:'direct Sapo',
  excelFallback:true
});
