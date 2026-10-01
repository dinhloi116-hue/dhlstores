const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const lazy=read('lazy-product-mode.js');
const shell=read('catalog-ui-shell.js');
const scanner=read('catalog-popup-v3-mode.js');
const productCore=read('product-create-core.js');
const workflow=read('workflow-order-mode.js');
const direct=read('sapo-product-create-mode.js');
const contentScanner=read('content.js');

// Luồng thêm SP hiện tại được lazy-load để panel mở nhanh.
assert.ok(lazy.includes('THÊM SẢN PHẨM MỚI'));
for(const file of ['product-create-core.js','catalog-ui-shell.js','catalog-popup-v3-mode.js','sapo-product-create-mode.js','single-product-add-mode.js']){
  assert.ok(lazy.includes(`'${file}'`),`Lazy loader thiếu ${file}`);
}

assert.ok(shell.includes('2. THÊM SẢN PHẨM MỚI'));
assert.ok(shell.includes('QUÉT TẤT CẢ SP MỚI'));
assert.ok(shell.includes('TẠO EXCEL SP MỚI'));
assert.ok(shell.includes('SKU = Đường dẫn/Alias + Size'));

assert.ok(scanner.includes('async function scanAllNewProducts(options={})'));
assert.ok(scanner.includes("dhlCatalogSkuMode:'new-product-popup-alias-size'"));
assert.ok(scanner.includes("sendPopupOnly(tab.id,descriptor)"));
assert.ok(scanner.includes("mode:'new-product-popup-full'"));
assert.ok(scanner.includes('Checkpoint sau từng sản phẩm'));
assert.ok(scanner.includes('QUÉT SẢN PHẨM MỚI = POPUP THẬT 100%.'));

const scanStart=scanner.indexOf('async function scanAllNewProducts(options={})');
const scanEnd=scanner.indexOf('async function sendPopupOnly',scanStart);
const scanBody=scanner.slice(scanStart,scanEnd);
assert.ok(!scanBody.includes("type:'DHL_SCAN_HD_LIVE'"),'Luồng SP mới không được dùng scanner API-fast');
assert.ok(scanBody.includes('sendPopupOnly(tab.id,descriptor)'),'Luồng SP mới phải popup từng sản phẩm');

assert.ok(productCore.includes('MASTER SKU:'));
assert.ok(productCore.includes('row[16]=`${skuBase}-${size}`'));
assert.ok(productCore.includes('sku:`${skuBase}-${size}`'));
assert.ok(productCore.includes('Ảnh phiên bản: ghi link cho TỪNG SKU'));

assert.ok(workflow.includes("document.getElementById('catalogMode')"));
assert.ok(workflow.includes('2. THÊM SẢN PHẨM MỚI'));
assert.ok(direct.includes('SKU KHÔNG lấy từ dữ liệu cũ.'));
assert.ok(direct.includes('Thiếu link ảnh nguồn'));

assert.ok(contentScanner.includes('function colorImageUrl'));
assert.ok(contentScanner.includes('imageUrlFromScope'));
assert.ok(contentScanner.includes('missingImageColors'));
assert.ok(contentScanner.includes('imageUrls'));

console.log('NEW PRODUCT BATCH PASS',{
  startup:'lazy-loaded',
  scan:'full popup per product',
  apiFast:false,
  checkpoint:'per product',
  productKey:'real source alias / SKU base',
  variantSku:'alias + size'
});
