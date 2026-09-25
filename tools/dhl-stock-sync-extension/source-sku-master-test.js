const fs=require('fs');
const assert=require('assert');

global.DHLXlsxLite=require('./xlsx-lite.js');
global.DHLMatchCore=require('./match-core.js');
global.DHLShopRules=require('./shop-rules.js');
require('./generic-shop-rules.js');

const productCreate=require('./product-create-core.js');
const autoCore=require('./auto-sync-core.js');
const matcher=global.DHLMatchCore;

const scanned=[{
  parentId:12345,
  parentName:'CLB ARS 26-27 HD',
  complete:true,
  variants:[
    {id:1,sku:'WEB-ARS-DO-S',color:'Đỏ',size:'S',available:4,name:'CLB ARS 26-27 HD - Đỏ - S'},
    {id:2,sku:'WEB-ARS-DO-M',color:'Đỏ',size:'M',available:7,name:'CLB ARS 26-27 HD - Đỏ - M'},
    {id:3,sku:'WEB-ARS-DO-L',color:'Đỏ',size:'L',available:3,name:'CLB ARS 26-27 HD - Đỏ - L'}
  ]
}];

const created=productCreate.makeApiProducts(scanned).products[0];
assert.deepStrictEqual(created.variants.map(v=>v.sku),['WEB-ARS-DO-S','WEB-ARS-DO-M','WEB-ARS-DO-L']);

const catalog={
  variants:[
    {productId:90,variantId:901,name:'CLB ARS 26-27 HD - Đỏ',size:'S',sku:'WEB-ARS-DO-S'},
    {productId:90,variantId:902,name:'CLB ARS 26-27 HD - Đỏ',size:'M',sku:'WEB-ARS-DO-M'},
    {productId:90,variantId:903,name:'CLB ARS 26-27 HD - Đỏ',size:'L',sku:'WEB-ARS-DO-L'}
  ]
};
const prepared=autoCore.prepareRows({},catalog,scanned,matcher);
assert.strictEqual(prepared.master,'source_sku_exact');
assert.deepStrictEqual(prepared.rows.map(r=>r.sku),['WEB-ARS-DO-S','WEB-ARS-DO-M','WEB-ARS-DO-L']);
assert.deepStrictEqual(prepared.rows.map(r=>r.variantId),[901,902,903]);
assert.strictEqual(prepared.matchedSkuCount,3);
assert.strictEqual(prepared.generatedSkuCount,0);

const content=fs.readFileSync(__dirname+'/content.js','utf8');
const catalogUi=fs.readFileSync(__dirname+'/catalog-popup-v3-mode.js','utf8');
assert.ok(content.includes('collectSourceSkuVariants'));
assert.ok(content.includes("scanMethod: 'category-source-sku-exact'"));
assert.ok(catalogUi.includes('QUÉT TOÀN BỘ + SKU GỐC NGUỒN'));

console.log('SOURCE SKU MASTER PASS',{
  source:'aobongda.net code/SKU',
  productCreate:'preserved',
  stockSync:'exact SKU match only',
  generatedSku:0
});
