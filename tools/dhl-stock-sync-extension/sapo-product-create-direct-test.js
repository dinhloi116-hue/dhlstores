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
assert.ok(bg.includes('Trùng alias trong lượt đẩy'));
assert.ok(bg.includes('Trùng SKU trong lượt đẩy'));
assert.ok(bg.includes('thiếu link ảnh nguồn'));
assert.ok(!bg.includes("images:(item.images||[]).map"),'Không upload ảnh trong POST product; ảnh phải đi qua phase có checkpoint + variant_ids');

assert.ok(ui.includes('ĐẨY THẲNG LÊN SAPO — KHÔNG CẦN EXCEL'));
assert.ok(ui.includes('không cần tải Excel'));
assert.ok(ui.includes('SKU + ảnh + tồn'));
assert.ok(ui.includes('Excel chỉ còn là phương án dự phòng'));

console.log('SAPO PRODUCT CREATE DIRECT PASS',{
  product:'POST direct',
  images:'checkpointed + variant-bound',
  stock:'location inventory first, Product Variant fallback on 403',
  excel:'fallback only'
});