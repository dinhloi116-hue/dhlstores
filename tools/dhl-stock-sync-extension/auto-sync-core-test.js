const assert=require('assert');
const core=require('./auto-sync-core.js');
const matcher=require('./match-core.js');
global.DHLShopRules=require('./shop-rules.js');
require('./generic-shop-rules.js');
const rules=global.DHLShopRules;

assert.strictEqual(core.validSourceUrl('https://si.aobongda.net/hd-pc36029.html'),true);
assert.strictEqual(core.validSourceUrl('https://si.aobongda.net/ao-tre-em-pc37502.html'),true);
assert.strictEqual(core.validSourceUrl('https://si.aobongda.net/foo-p12345.html'),false);
assert.strictEqual(core.validSourceUrl('https://example.com/hd-pc36029.html'),false);

const cfg=core.normalizeConfig({enabled:true,intervalHours:3,selectedProfileIds:['a','a','b'],profileUrls:{a:'https://si.aobongda.net/hd-pc36029.html'}});
assert.strictEqual(cfg.enabled,true);
assert.strictEqual(cfg.intervalHours,3);
assert.deepStrictEqual(cfg.selectedProfileIds,['a','b']);

const warehouse={warehouseBranchName:'dhl sport',products:[],variants:[]};
const name='CLB Real 26-27 HD - Hồng';
const alias=rules.generatedAliasForStandardName(name);

const catalog={
  products:[{
    productId:91959154,
    name,
    variants:['S','M','L','XL','XXL'].map((size,i)=>({
      productId:91959154,
      variantId:228274684+i,
      name,
      size,
      sku:`${alias}-${size}`
    }))
  }],
  variants:[]
};
catalog.variants=catalog.products[0].variants.slice();

function sourceGroup(parentId,color,baseStock){
  return {
    parentId,parentName:'CLB Real 26-27 HD',complete:true,
    variants:['S','M','L','XL','XXL'].map((size,i)=>({
      id:parentId*100+i,
      parentId,
      color,
      size,
      name:`CLB Real 26-27 HD - ${color} - ${size}`,
      available:baseStock+i
    }))
  };
}
const source=[
  sourceGroup(7001,'Hồng',10),
  sourceGroup(7001,'Trắng',20)
];

const prepared=core.prepareRows(warehouse,catalog,source,matcher,rules);
assert.strictEqual(prepared.master,'alias_size_exact');
assert.strictEqual(prepared.sourceProductCount,2);
assert.strictEqual(prepared.sourceVariantCount,10);
assert.strictEqual(prepared.rows.length,10);
assert.strictEqual(prepared.matchedSkuCount,5);
assert.strictEqual(prepared.sourceOnlySkuCount,5);
assert.strictEqual(prepared.generatedSkuCount,0);

const pink=prepared.rows.filter(x=>x.standardName==='CLB Real 26-27 HD - Hồng');
const white=prepared.rows.filter(x=>x.standardName==='CLB Real 26-27 HD - Trắng');
assert.strictEqual(pink[0].sku,`${alias}-S`);
assert.strictEqual(pink[0].variantId,228274684);
const whiteAlias=rules.generatedAliasForStandardName('CLB Real 26-27 HD - Trắng');
assert.strictEqual(white[0].sku,`${whiteAlias}-S`);
assert.ok(white.every(x=>x.variantId===0));

console.log('AUTO SYNC CORE PASS',{
  master:'alias_size_exact',
  scannedVariants:prepared.sourceVariantCount,
  matchedSku:prepared.matchedSkuCount,
  sourceOnlySku:prepared.sourceOnlySkuCount
});
