const fs=require('fs');
const assert=require('assert');

global.DHLXlsxLite=require('./xlsx-lite.js');
global.DHLMatchCore=require('./match-core.js');
global.DHLShopRules=require('./shop-rules.js');
require('./generic-shop-rules.js');

const productCreate=require('./product-create-core.js');
const autoCore=require('./auto-sync-core.js');
const matcher=global.DHLMatchCore;
const rules=global.DHLShopRules;

const scanned=[{
  parentId:12345,
  parentName:'CLB ARS 26-27 HD',
  complete:true,
  variants:[
    {id:1,color:'Đỏ',size:'S',available:4,name:'CLB ARS 26-27 HD - Đỏ - S'},
    {id:2,color:'Đỏ',size:'M',available:7,name:'CLB ARS 26-27 HD - Đỏ - M'},
    {id:3,color:'Đỏ',size:'L',available:3,name:'CLB ARS 26-27 HD - Đỏ - L'}
  ]
}];

const standard='CLB ARS 26-27 HD - Đỏ';
const cleanAlias='clb-ars-26-27-hd-do';
const created=productCreate.makeApiProducts(scanned).products[0];
assert.strictEqual(created.alias,cleanAlias);
assert.deepStrictEqual(created.variants.map(v=>v.sku),[
  `${cleanAlias}-S`,`${cleanAlias}-M`,`${cleanAlias}-L`
]);

// Sapo đã có SKU sạch -> dùng đúng SKU sạch.
const cleanCatalog={
  variants:[
    {productId:90,variantId:901,name:standard,size:'S',sku:`${cleanAlias}-S`},
    {productId:90,variantId:902,name:standard,size:'M',sku:`${cleanAlias}-M`},
    {productId:90,variantId:903,name:standard,size:'L',sku:`${cleanAlias}-L`}
  ]
};
const cleanPrepared=autoCore.prepareRows({},cleanCatalog,scanned,matcher,rules);
assert.strictEqual(cleanPrepared.master,'clean_alias_output_stale_cache_safe');
assert.deepStrictEqual(cleanPrepared.rows.map(r=>r.sku),[
  `${cleanAlias}-S`,`${cleanAlias}-M`,`${cleanAlias}-L`
]);
assert.deepStrictEqual(cleanPrepared.rows.map(r=>r.variantId),[901,902,903]);
assert.strictEqual(cleanPrepared.matchedSkuCount,3);

// Cache/catalog cũ có SKU hash/hậu tố: chỉ dùng ID tham khảo, đầu ra vẫn phải là clean SKU hiện tại.
const legacyAlias=rules.generatedAliasForStandardName(standard);
assert.notStrictEqual(legacyAlias,cleanAlias);
const legacyCatalog={
  variants:[
    {productId:91,variantId:911,name:standard,size:'S',sku:`${legacyAlias}-S`},
    {productId:91,variantId:912,name:standard,size:'M',sku:`${legacyAlias}-M`},
    {productId:91,variantId:913,name:standard,size:'L',sku:`${legacyAlias}-L`}
  ]
};
const legacyPrepared=autoCore.prepareRows({},legacyCatalog,scanned,matcher,rules);
assert.deepStrictEqual(legacyPrepared.rows.map(r=>r.sku),[
  `${cleanAlias}-S`,`${cleanAlias}-M`,`${cleanAlias}-L`
]);
assert.deepStrictEqual(legacyPrepared.rows.map(r=>r.matchedBy),[
  'legacy-name-size-id-only','legacy-name-size-id-only','legacy-name-size-id-only'
]);
assert.strictEqual(legacyPrepared.matchedSkuCount,3);

const wikaStandard='Áo Thi Đấu Wika CLB Đông Á Thanh Hoá (Bản Fan) - Vàng';
const wikaCleanAlias='ao-thi-dau-wika-clb-dong-a-thanh-hoa-ban-fan-vang';
const wikaScanned=[{
  parentId:77777,
  parentName:'Áo Thi Đấu Wika CLB Đông Á Thanh Hoá (Bản Fan)',
  complete:true,
  variants:[
    {id:7701,color:'Vàng',size:'S',available:5,name:`${wikaStandard} - S`},
    {id:7702,color:'Vàng',size:'M',available:4,name:`${wikaStandard} - M`},
    {id:7703,color:'Vàng',size:'L',available:3,name:`${wikaStandard} - L`},
    {id:7704,color:'Vàng',size:'XL',available:2,name:`${wikaStandard} - XL`},
    {id:7705,color:'Vàng',size:'XXL',available:1,name:`${wikaStandard} - XXL`}
  ]
}];

const wikaCreated=productCreate.makeApiProducts(wikaScanned).products[0];
assert.strictEqual(wikaCreated.alias,wikaCleanAlias);
assert.deepStrictEqual(wikaCreated.variants.map(v=>v.sku),[
  `${wikaCleanAlias}-S`,`${wikaCleanAlias}-M`,`${wikaCleanAlias}-L`,`${wikaCleanAlias}-XL`,`${wikaCleanAlias}-XXL`
]);

const contentScanner=fs.readFileSync(__dirname+'/content.js','utf8');
assert.ok(contentScanner.includes('scanDescriptorApiFast'));
assert.ok(contentScanner.includes("const concurrency=Math.min(3,Math.max(1,links.length))"));
assert.ok(contentScanner.includes("stage:'popup-fallback'"));

console.log('CLEAN SKU MASTER PASS',{
  newProduct:'clean standard-name alias + size',
  randomSuffix:false,
  staleCatalogSkuIgnored:true,
  fastScanner:true
});
