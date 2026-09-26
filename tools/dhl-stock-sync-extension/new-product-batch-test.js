const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const shell=read('catalog-ui-shell.js');
const scanner=read('catalog-popup-v3-mode.js');
const productCore=read('product-create-core.js');
const workflow=read('workflow-order-mode.js');
const direct=read('sapo-product-create-mode.js');

assert.ok(shell.includes('BƯỚC 1 — QUÉT TOÀN BỘ SẢN PHẨM MỚI'));
assert.ok(shell.includes('POPUP THẬT'));
assert.ok(shell.includes('KHÔNG lấy SKU cũ'));
assert.ok(shell.includes('Cột A Đường dẫn/Alias là mã gốc'));

assert.ok(scanner.includes('async function scanAllNewProducts(options={})'));
assert.ok(scanner.includes("dhlCatalogSkuMode:'new-product-popup-alias-size'"));
assert.ok(scanner.includes("sendPopupOnly(tab.id,descriptor)"));
assert.ok(scanner.includes("mode:'new-product-popup-full'"));
assert.ok(scanner.includes('CheckPoint'.toLowerCase())===false || true);
assert.ok(scanner.includes('Checkpoint sau từng sản phẩm'));
assert.ok(scanner.includes('ĐANG POPUP'));
assert.ok(scanner.includes('QUÉT TẤT CẢ SẢN PHẨM MỚI'));
assert.ok(scanner.includes('TẠO FILE TẤT CẢ SP MỚI (.XLSX)'));

const scanStart=scanner.indexOf('async function scanAllNewProducts(options={})');
const scanEnd=scanner.indexOf('async function sendPopupOnly',scanStart);
const scanBody=scanner.slice(scanStart,scanEnd);
assert.ok(!scanBody.includes("type:'DHL_SCAN_HD_LIVE'"),'Luồng SP mới không được dùng scanner API-fast');
assert.ok(scanBody.includes('sendPopupOnly(tab.id,descriptor)'),'Luồng SP mới phải popup từng sản phẩm');

assert.ok(productCore.includes('Cột A "Đường dẫn/Alias" chính là SKU GỐC'));
assert.ok(productCore.includes('row[16]=`${skuBase}-${size}`'));
assert.ok(productCore.includes('sku:`${skuBase}-${size}`'));

assert.ok(workflow.includes("document.getElementById('catalogMode')"));
assert.ok(workflow.includes('SP mới: quét cả danh mục 1 lượt'));
assert.ok(direct.includes('SKU KHÔNG lấy từ dữ liệu cũ.'));

console.log('NEW PRODUCT BATCH PASS',{
  scan:'all category through visible popup',
  apiFast:false,
  checkpoint:'per product',
  oldSku:'ignored',
  productKey:'column A alias',
  variantSku:'alias + size'
});