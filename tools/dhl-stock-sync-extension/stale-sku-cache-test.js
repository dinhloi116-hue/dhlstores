const assert=require('assert');
const core=require('./auto-sync-core.js');
const matcher=require('./match-core.js');
global.DHLShopRules=require('./shop-rules.js');
require('./generic-shop-rules.js');
const rules=global.DHLShopRules;

const standard='ĐT Mexico 2026 HD - Rêu';
const scanned=[{
  parentId:62001,
  parentName:'ĐT Mexico 2026 HD',
  complete:true,
  variants:['S','M','L','XL','XXL'].map((size,i)=>({
    id:620010+i,
    parentId:62001,
    color:'Rêu',
    size,
    name:`${standard} - ${size}`,
    available:6+i
  }))
}];

// Cache cũ từng có SKU kiểu chữ tự đặt, không còn tồn tại trên Sapo.
const staleCatalog={
  variants:['S','M','L','XL','XXL'].map((size,i)=>({
    productId:700,
    variantId:7000+i,
    name:standard,
    size,
    sku:`Mexico xanh 26 HD-${size}`
  }))
};

const out=core.prepareRows({},staleCatalog,scanned,matcher,rules);
assert.strictEqual(out.master,'clean_alias_output_stale_cache_safe');
assert.deepStrictEqual(out.rows.map(r=>r.sku),[
  'dt-mexico-2026-hd-reu-S',
  'dt-mexico-2026-hd-reu-M',
  'dt-mexico-2026-hd-reu-L',
  'dt-mexico-2026-hd-reu-XL',
  'dt-mexico-2026-hd-reu-XXL'
]);
assert.ok(out.rows.every(r=>r.matchedBy==='legacy-name-size-id-only'));
assert.deepStrictEqual(out.rows.map(r=>r.variantId),[7000,7001,7002,7003,7004]);

console.log('STALE SKU CACHE PASS',{
  old:'Mexico xanh 26 HD-S',
  current:'dt-mexico-2026-hd-reu-S',
  staleSkuIgnored:true
});
