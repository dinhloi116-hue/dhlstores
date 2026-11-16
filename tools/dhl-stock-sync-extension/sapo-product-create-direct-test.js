const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const bg=fs.readFileSync(path.join(dir,'sapo-product-create-background.js'),'utf8');
const ui=fs.readFileSync(path.join(dir,'sapo-product-create-mode.js'),'utf8');

assert.ok(bg.includes("'/admin/products.json'"));
assert.ok(bg.includes("method:'POST',body:productPayload(item)"));
assert.ok(bg.includes('function imageGroups(item)'));
assert.ok(bg.includes('function imageVariantIds(image)'));
assert.ok(bg.includes('imageIndex:0'));
assert.ok(bg.includes('imageResults:[]'));
assert.ok(bg.includes("body.image.variant_ids=variantIds"));
assert.ok(bg.includes('/images.json'));
assert.ok(bg.includes('imageAltMarker'));
assert.ok(bg.includes('variantIds.every(id=>bound.has(id))'));
assert.ok(bg.includes('function setVariantStock'));
assert.ok(bg.includes("sapoFetch(sapo,'/admin/inventory_levels/set.json'"));
assert.ok(bg.includes('location_id:Number(sapo.locationId)'));
assert.ok(bg.includes('inventory_item_id:Number(invId)'));
assert.ok(bg.includes('/admin/variants/${variantId}.json'));
assert.ok(bg.includes("method:'PUT'"));
assert.ok(bg.includes("inventory_management:'bizweb'"));
assert.ok(bg.includes('inventory_quantity:Number(expected.stock)'));
assert.ok(bg.includes('/Sapo HTTP 403:\\s*access_denied/i'));
assert.ok(bg.includes("method:'variant.inventory_quantity:fallback-403'"));
assert.ok(bg.includes('item.stockResults=Array.isArray(item.stockResults)?item.stockResults:[]'));
assert.ok(bg.includes('Checkpoint sau từng size'));
assert.ok(bg.includes('function retryableStockError'));
assert.ok(bg.includes('Sapo HTTP (?:500|502|503|504)'));
assert.ok(bg.includes('async function setVariantStockWithRetry'));
assert.ok(bg.includes('const delays=[700,1400,2800,5000]'));
assert.ok(bg.includes('const result=await setVariantStockWithRetry(sapo,sapoVariant,expected,item,queue)'));
assert.ok(bg.includes('đã tự thử lại ${delays.length+1} lần tại đúng SKU'));
assert.ok(bg.includes('item.stockRetryHistory'));
assert.ok(ui.includes('Sapo lỗi tạm thời • tự thử lại'));
assert.ok(bg.includes("const LEGACY_QUEUE_CUTOFF=Date.parse('2026-09-28T06:20:00Z')"));
assert.ok(bg.includes('async function clearCreateState'));
assert.ok(bg.includes('async function cleanupLegacyQueue'));
assert.ok(bg.includes('if(ts>0&&ts<LEGACY_QUEUE_CUTOFF)'));
assert.ok(bg.includes("if(old&&old.status==='running')"));
assert.ok(bg.includes('if(old)await clearCreateState()'));
assert.ok(bg.includes('queue.errors=[]'));
assert.ok(bg.includes("message.type==='DHL_SAPO_PRODUCT_CREATE_CLEAR_STATE'"));
assert.ok(bg.includes('Trùng alias trong lượt đẩy'));
assert.ok(bg.includes('Trùng SKU trong lượt đẩy'));
assert.ok(bg.includes('thiếu link ảnh nguồn'));
assert.ok(!bg.includes("images:(item.images||[]).map"),'Không upload ảnh trong POST product; ảnh phải đi qua phase có checkpoint + variant_ids');

assert.ok(ui.includes('ĐẨY THẲNG LÊN SAPO — KHÔNG CẦN EXCEL'));
assert.ok(ui.includes('KHÔNG CẦN EXCEL'));
assert.ok(ui.includes('SKU, ảnh từng phiên bản và tồn kho'));
assert.ok(ui.includes('Excel chỉ còn là phương án dự phòng'));
assert.ok(!/hàng đợi/i.test(ui),'UI sản phẩm mới không được hiện khái niệm hàng đợi cũ');

console.log('SAPO PRODUCT CREATE DIRECT PASS',{
  product:'POST direct',
  images:'checkpointed + variant-bound',
  stock:'location inventory first, Product Variant fallback on 403, 5xx auto-retry per SKU',
  excel:'fallback only',
  staleState:'auto purge legacy paused/done state'
});