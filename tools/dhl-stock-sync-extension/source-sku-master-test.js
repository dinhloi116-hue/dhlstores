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
const alias=rules.generatedAliasForStandardName(standard);
const created=productCreate.makeApiProducts(scanned).products[0];
assert.strictEqual(created.alias,alias);
assert.deepStrictEqual(created.variants.map(v=>v.sku),[
  `${alias}-S`,`${alias}-M`,`${alias}-L`
]);

const catalog={
  variants:[
    {productId:90,variantId:901,name:standard,size:'S',sku:`${alias}-S`},
    {productId:90,variantId:902,name:standard,size:'M',sku:`${alias}-M`},
    {productId:90,variantId:903,name:standard,size:'L',sku:`${alias}-L`}
  ]
};
const prepared=autoCore.prepareRows({},catalog,scanned,matcher,rules);
assert.strictEqual(prepared.master,'alias_size_exact');
assert.deepStrictEqual(prepared.rows.map(r=>r.sku),[
  `${alias}-S`,`${alias}-M`,`${alias}-L`
]);
assert.deepStrictEqual(prepared.rows.map(r=>r.variantId),[901,902,903]);
assert.strictEqual(prepared.matchedSkuCount,3);

const contentScanner=fs.readFileSync(__dirname+'/content.js','utf8');
assert.ok(contentScanner.includes('scanDescriptorApiFast'));
assert.ok(contentScanner.includes("const concurrency=Math.min(3,Math.max(1,links.length))"));
assert.ok(contentScanner.includes("stage:'popup-fallback'"));

console.log('ALIAS SKU MASTER PASS',{
  skuBase:'column A Đường dẫn/Alias',
  variantSku:'alias + size',
  stockSync:'exact SKU match only',
  fastScanner:true
});
