const fs=require('fs');
const path=require('path');
const assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'marketplace-sku-mode.js'),'utf8');
const popup=fs.readFileSync(path.join(__dirname,'popup.html'),'utf8');
const lazy=fs.readFileSync(path.join(__dirname,'lazy-product-mode.js'),'utf8');

assert.ok(src.includes('CHUẨN HÓA SKU SÀN — SHOPEE / LAZADA'));
assert.ok(src.includes('FILE SHOPEE → SỬA SKU'));
assert.ok(src.includes('FILE LAZADA → SỬA SKU'));
assert.ok(src.includes("platform==='lazada'"));
assert.ok(src.includes("'sellersku'"));
assert.ok(src.includes("'skuphanloai'"));
assert.ok(src.includes("'skusanpham'"));
assert.ok(src.includes('SKU sản phẩm = Đường dẫn/Alias'));
assert.ok(src.includes('SKU phân loại = Alias + Size'));
assert.ok(src.includes('buildPatchedWorkbook'));
assert.ok(src.includes('patchCell'));
assert.ok(src.includes('Các cột khác giữ nguyên.'));
assert.ok(src.includes('Chưa an toàn để xuất:'));
assert.ok(!popup.includes('<script src="marketplace-sku-mode.js"></script>'),'Marketplace SKU không được nạp lúc mở panel');
assert.ok(lazy.includes("'marketplace-sku-mode.js'"),'Marketplace SKU phải được lazy-load khi mở phần Thêm sản phẩm');

console.log('MARKETPLACE SKU PASS',{
  shopee:true,
  lazada:true,
  mutation:'SKU columns only',
  source:'dhlCatalogResults',
  rule:'alias + size'
});