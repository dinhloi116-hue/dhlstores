const assert=require('assert');
const core=require('./sapo-inventory-resolver-core.js');

const row={variantId:210604445,productId:1001,sku:'ARG-KID-M'};
const exactVariantDifferentSku=[{id:77,variant_id:'210604445',product_id:1001,sku:'arg kid m'}];
assert.strictEqual(core.findCandidate(exactVariantDifferentSku,row).id,77,'variant_id phải ưu tiên, không phụ thuộc SKU');

const bySku=[{id:88,variant_id:999,product_id:1001,sku:' arg-kid-m '}];
assert.strictEqual(core.findCandidate(bySku,row).id,88,'SKU fallback phải không phân biệt hoa/thường/khoảng trắng');

const duplicateSku=[
  {id:90,variant_id:0,product_id:9999,sku:'ARG-KID-M'},
  {id:91,variant_id:0,product_id:1001,sku:'ARG-KID-M'}
];
assert.strictEqual(core.findCandidate(duplicateSku,row).id,91,'Khi SKU trùng, product_id + SKU phải ưu tiên hơn SKU đơn');

assert.deepStrictEqual(core.inventoryCandidates({data:{inventory_items:[{id:1}]}}),[{id:1}]);
assert.deepStrictEqual(core.inventoryCandidates({inventory_item:{id:2}}),[{id:2}]);
assert.deepStrictEqual(core.inventoryCandidates({result:{items:[{id:3}]}}),[{id:3}]);
assert.deepStrictEqual(core.inventoryCandidates([{id:4}]),[{id:4}]);

assert.strictEqual(core.variantInventoryItemId({variant:{inventory_item_id:123}}),123);
assert.strictEqual(core.variantInventoryItemId({variant:{inventory_item:{id:456}}}),456);
assert.strictEqual(core.variantInventoryItemId({data:{variant:{inventory_item_id:789}}}),789);
assert.strictEqual(core.variantInventoryItemId({data:{inventory_item:{id:901}}}),901);
assert.strictEqual(core.variantInventoryItemId({result:{variant:{inventoryItemId:902}}}),902);
assert.strictEqual(core.variantInventoryItemId({inventory_item_id:903}),903);

console.log('SAPO INVENTORY RESOLVER PASS');
