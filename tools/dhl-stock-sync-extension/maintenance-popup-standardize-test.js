const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const contentScript=read('content.js');
const catalog=read('catalog-popup-v3-mode.js');
const maintenance=read('maintenance-ui.js');

assert.ok(contentScript.includes("message.type === 'DHL_SCAN_ONE_DESCRIPTOR_POPUP_ONLY'"));
assert.ok(contentScript.includes('Chế độ CHUẨN HÓA 1 LẦN:'));
assert.ok(contentScript.includes('scanOneDescriptor(descriptor,hints,progress)'));
assert.ok(contentScript.includes("stage:'popup-opening'"));
assert.ok(contentScript.includes("stage:'popup-closed'"));
assert.ok(contentScript.includes('const stale=findStockRoot()'));
assert.ok(contentScript.includes('await closeStockPopup(stale)'));
assert.ok(contentScript.includes('const visiblePopup=findStockRoot()'));
assert.ok(contentScript.includes('await closeStockPopup(visiblePopup)'));

assert.ok(catalog.includes('async function standardizeAllByPopup(options={})'));
assert.ok(catalog.includes("type:'DHL_SCAN_ONE_DESCRIPTOR_POPUP_ONLY'"));
assert.ok(catalog.includes("dhlCatalogSkuMode:'maintenance-popup-standardize-once'"));
assert.ok(catalog.includes('Checkpoint sau TỪNG sản phẩm'));
assert.ok(catalog.includes('maintenanceFailureDetail'));
assert.ok(catalog.includes('missingSizes'));
assert.ok(catalog.includes('failures'));
assert.ok(catalog.includes('globalThis.DHLCatalogMaintenance'));
assert.ok(catalog.includes('await sleep(180)'));

assert.ok(maintenance.includes('CHUẨN HÓA 1 LẦN — POPUP TOÀN BỘ'));
assert.ok(maintenance.includes('CHẠY POPUP TOÀN BỘ 1 LẦN'));
assert.ok(maintenance.includes('Không dùng quét API nhanh và không dùng SKU cũ.'));
assert.ok(maintenance.includes('BẬT popup thật lên màn hình'));
assert.ok(maintenance.includes('standardizeAllByPopup'));
assert.ok(maintenance.includes('ĐANG POPUP'));
assert.ok(maintenance.includes('CHI TIẾT SẢN PHẨM LỖI / THIẾU'));
assert.ok(maintenance.includes('thiếu size:'));
assert.ok(maintenance.includes('lý do:'));
assert.ok(maintenance.includes("dhlCatalogMaintenanceProgressV1','dhlCatalogResults"));

console.log('MAINTENANCE POPUP STANDARDIZE PASS',{
  mode:'popup-only',
  sequence:'every product',
  checkpoint:'per product',
  oldSku:'ignored'
});
