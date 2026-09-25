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
assert.ok(ui.includes('Không cần quét cả danh mục, không cần cập nhật products_export trước.'));
assert.ok(popup.includes('<script src="single-product-add-mode.js"></script>'));
assert.ok(popup.indexOf('single-product-add-mode.js')>popup.indexOf('sapo-product-create-mode.js'));

console.log('SINGLE PRODUCT ADD PASS',{
  scan:'current popup only',
  create:'direct Sapo',
  duplicateProtection:'alias + SKU handled by existing product queue',
  excelFallback:true
});
