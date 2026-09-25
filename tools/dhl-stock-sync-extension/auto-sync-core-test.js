const assert=require('assert');
const core=require('./auto-sync-core.js');
const matcher=require('./match-core.js');

assert.strictEqual(core.validSourceUrl('https://si.aobongda.net/hd-pc36029.html'),true);
assert.strictEqual(core.validSourceUrl('https://si.aobongda.net/ao-tre-em-pc37502.html'),true);
assert.strictEqual(core.validSourceUrl('https://si.aobongda.net/foo-p12345.html'),false);
assert.strictEqual(core.validSourceUrl('https://example.com/hd-pc36029.html'),false);

const cfg=core.normalizeConfig({enabled:true,intervalHours:3,selectedProfileIds:['a','a','b'],profileUrls:{a:'https://si.aobongda.net/hd-pc36029.html'}});
assert.strictEqual(cfg.enabled,true);
assert.strictEqual(cfg.intervalHours,3);
assert.deepStrictEqual(cfg.selectedProfileIds,['a','b']);

const warehouse={warehouseBranchName:'dhl sport',products:[],variants:[]};

// Sapo đã đồng bộ SKU cho màu Hồng; màu Trắng vẫn chưa có trên Sapo.
const catalog={
  products:[{
    productId:91959154,
    name:'CLB Real 26-27 HD - Hồng',
    variants:['S','M','L','XL','XXL'].map((size,i)=>({
      productId:91959154,
      variantId:228274684+i,
      name:'CLB Real 26-27 HD - Hồng',
      size,
      sku:`WEB-REAL-HONG-${size}`
    }))
  }],
  variants:[]
};
catalog.variants=catalog.products[0].variants.slice();

function sourceGroup(parentId,color,prefix,baseStock){
  return {
    parentId,parentName:'CLB Real 26-27 HD',complete:true,
    variants:['S','M','L','XL','XXL'].map((size,i)=>({
      id:parentId*100+i,
      parentId,
      color,
      size,
      sku:`${prefix}-${size}`,
      name:`CLB Real 26-27 HD - ${color} - ${size}`,
      available:baseStock+i
    }))
  };
}
const source=[
  sourceGroup(7001,'Hồng','WEB-REAL-HONG',10),
  sourceGroup(7001,'Trắng','WEB-REAL-TRANG',20)
];

const prepared=core.prepareRows(warehouse,catalog,source,matcher);
assert.strictEqual(prepared.master,'source_sku_exact');
assert.strictEqual(prepared.sourceProductCount,2);
assert.strictEqual(prepared.sourceVariantCount,10);
assert.strictEqual(prepared.rows.length,10,'Mọi biến thể có SKU nguồn phải vào file tồn');
assert.strictEqual(prepared.matchedSkuCount,5);
assert.strictEqual(prepared.sourceOnlySkuCount,5);
assert.strictEqual(prepared.generatedSkuCount,0);

const pink=prepared.rows.filter(x=>x.standardName==='CLB Real 26-27 HD - Hồng');
const white=prepared.rows.filter(x=>x.standardName==='CLB Real 26-27 HD - Trắng');
assert.strictEqual(pink.length,5);
assert.strictEqual(white.length,5);
assert.strictEqual(pink[0].sku,'WEB-REAL-HONG-S');
assert.strictEqual(pink[0].variantId,228274684,'SKU trùng nguồn/Sapo phải lấy đúng variant ID');
assert.strictEqual(white[0].sku,'WEB-REAL-TRANG-S','SKU nguồn phải giữ nguyên 100%');
assert.ok(white.every(x=>x.variantId===0),'SKU mới chưa có trên Sapo phải được đánh dấu source-only');

const missingSkuSource=[{
  parentId:9,parentName:'TEST',complete:false,
  variants:[{id:1,color:'Đỏ',size:'M',sku:'',name:'TEST - Đỏ - M',available:3}]
}];
const missing=core.prepareRows(warehouse,catalog,missingSkuSource,matcher);
assert.strictEqual(missing.rows.length,0);
assert.strictEqual(missing.missingSku.length,1,'Không được tự sinh SKU khi website chưa trả SKU thật');

console.log('AUTO SYNC CORE PASS',{
  master:'source_sku_exact',
  scannedVariants:prepared.sourceVariantCount,
  matchedSku:prepared.matchedSkuCount,
  sourceOnlySku:prepared.sourceOnlySkuCount,
  generatedSku:prepared.generatedSkuCount
});
