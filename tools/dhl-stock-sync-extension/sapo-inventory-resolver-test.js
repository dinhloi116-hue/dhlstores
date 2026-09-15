const assert=require('assert');
const core=require('./sapo-inventory-resolver-core.js');

const row={variantId:210604445,productId:1001,sku:'ARG-KID-M'};
const exactVariantDifferentSku=[{id:77,variant_id:'210604445',product_id:1001,sku:'arg kid m'}];
assert.strictEqual(core.findCandidate(exactVariantDifferentSku,row).id,77,'variant_id phải ưu tiên, không phụ thuộc SKU');

const bySku=[{id:88,variant_id:999,product_id:1001,sku:' arg-kid-m '}];
assert.strictEqual(core.findCandidate(bySku,row).id,88,'SKU fallback phải không phân biệt hoa/thường/khoảng trắng');

assert.deepStrictEqual(core.inventoryCandidates({data:{inventory_items:[{id:1}]}}),[{id:1}]);
assert.deepStrictEqual(core.inventoryCandidates({inventory_item:{id:2}}),[{id:2}]);
assert.strictEqual(core.variantInventoryItemId({variant:{inventory_item_id:123}}),123);
assert.strictEqual(core.variantInventoryItemId({variant:{inventory_item:{id:456}}}),456);

console.log('SAPO INVENTORY RESOLVER PASS');
