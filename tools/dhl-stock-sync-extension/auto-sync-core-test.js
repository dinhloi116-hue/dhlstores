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
assert.strictEqual(core.normalizeConfig({intervalHours:99}).intervalHours,2);

const warehouse={warehouseBranchName:'dhl sport',products:[],variants:[]};

// products_export chỉ có Real Hồng; Real Trắng là mẫu mới chỉ xuất hiện trong kết quả quét.
const catalog={
  products:[{
    productId:91959154,
    name:'CLB Real 26-27 HD - Hồng',
    skuBase:'ABDN-CLB-REAL-26-27-HD-HONG-14NE9U1',
    variants:['S','M','L','XL','XXL'].map((size,i)=>({
      productId:91959154,variantId:228274684+i,name:'CLB Real 26-27 HD - Hồng',
      size,sku:`ABDN-CLB-REAL-26-27-HD-HONG-14NE9U1-${size}`
    }))
  }],
  variants:[]
};
catalog.variants=catalog.products[0].variants.slice();

function sourceGroup(parentId,color,baseStock){
  return {
    parentId,parentName:'CLB Real 26-27 HD',complete:true,
    variants:['S','M','L','XL','XXL'].map((size,i)=>({
      id:parentId*100+i,parentId,color,size,
      name:`CLB Real 26-27 HD - ${color} - ${size}`,
      available:baseStock+i
    }))
  };
}
const source=[
  sourceGroup(7001,'Hồng',10),
  sourceGroup(7001,'Trắng',20)
];

const coverage=core.skuCoverage(warehouse,catalog);
assert.strictEqual(coverage.master,'products_export_lookup');
assert.strictEqual(coverage.matched,5);
assert.strictEqual(coverage.total,5);

const prepared=core.prepareRows(warehouse,catalog,source,matcher,rules);
assert.strictEqual(prepared.master,'source_scan');
assert.strictEqual(prepared.sourceProductCount,2);
assert.strictEqual(prepared.sourceVariantCount,10);
assert.strictEqual(prepared.rows.length,10,'Mọi biến thể quét được phải vào file tồn');
assert.strictEqual(prepared.existingSkuCount,5);
assert.strictEqual(prepared.generatedSkuCount,5);

const pink=prepared.rows.filter(x=>x.standardName==='CLB Real 26-27 HD - Hồng');
const white=prepared.rows.filter(x=>x.standardName==='CLB Real 26-27 HD - Trắng');
assert.strictEqual(pink.length,5);
assert.strictEqual(white.length,5);
assert.strictEqual(pink[0].sku,'ABDN-CLB-REAL-26-27-HD-HONG-14NE9U1-S');
assert.ok(white.every(x=>x.sku.startsWith('ABDN-CLB-REAL-26-27-HD-TRANG-14HQR4B-')),'Mẫu nguồn chưa có trong products_export phải dùng đúng SKU tạo sản phẩm');
assert.ok(white.every(x=>x.variantId===0),'Mẫu chưa đối chiếu được Sapo giữ variantId=0 để resolver tìm bằng SKU');

console.log('AUTO SYNC CORE PASS',{
  master:'source_scan',
  scannedVariants:prepared.sourceVariantCount,
  outputRows:prepared.rows.length,
  existingSku:prepared.existingSkuCount,
  generatedSku:prepared.generatedSkuCount
});
