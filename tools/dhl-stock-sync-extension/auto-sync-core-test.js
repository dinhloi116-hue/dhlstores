const assert=require('assert');
const core=require('./auto-sync-core.js');

assert.strictEqual(core.validSourceUrl('https://si.aobongda.net/hd-pc36029.html'),true);
assert.strictEqual(core.validSourceUrl('https://si.aobongda.net/ao-tre-em-pc37502.html'),true);
assert.strictEqual(core.validSourceUrl('https://si.aobongda.net/foo-p12345.html'),false);
assert.strictEqual(core.validSourceUrl('https://example.com/hd-pc36029.html'),false);

const cfg=core.normalizeConfig({enabled:true,intervalHours:3,selectedProfileIds:['a','a','b'],profileUrls:{a:'https://si.aobongda.net/hd-pc36029.html'}});
assert.strictEqual(cfg.enabled,true);
assert.strictEqual(cfg.intervalHours,3);
assert.deepStrictEqual(cfg.selectedProfileIds,['a','b']);
assert.strictEqual(core.normalizeConfig({intervalHours:99}).intervalHours,2);

// File kho có thể cũ và chưa có sản phẩm mới.
const warehouse={
  products:[{productId:1,name:'ĐT Cũ 2026 HD - Đỏ',variants:[{name:'ĐT Cũ 2026 HD - Đỏ',rawProductLabel:'ĐT Cũ 2026 HD - Đỏ / M',size:'M'}]}],
  variants:[{name:'ĐT Cũ 2026 HD - Đỏ',rawProductLabel:'ĐT Cũ 2026 HD - Đỏ / M',size:'M'}]
};

// products_export là MASTER và có thêm một sản phẩm mới mà file kho chưa có.
const catalog={
  products:[
    {productId:22,name:'ĐT A 2026 HD - Đỏ',variants:[
      {name:'ĐT A 2026 HD - Đỏ',size:'M',sku:'A-M',variantId:11,productId:22}
    ]},
    {productId:33,name:'ĐT B 2026 HD - Trắng',variants:[
      {name:'ĐT B 2026 HD - Trắng',size:'L',sku:'B-L',variantId:12,productId:33}
    ]}
  ],
  variants:[
    {name:'ĐT A 2026 HD - Đỏ',size:'M',sku:'A-M',variantId:11,productId:22},
    {name:'ĐT B 2026 HD - Trắng',size:'L',sku:'B-L',variantId:12,productId:33}
  ]
};

const source=[
  {parentName:'ĐT A 2026 HD',variants:[{name:'ĐT A 2026 HD - Đỏ - M',size:'M',available:7}]},
  {parentName:'ĐT B 2026 HD',variants:[{name:'ĐT B 2026 HD - Trắng - L',size:'L',available:9}]}
];

let receivedProducts=null;
const matcher={
  matchSapoProducts(products){
    receivedProducts=products;
    return[
      {variantMatches:[{sapo:catalog.products[0].variants[0],source:source[0].variants[0]}]},
      {variantMatches:[{sapo:catalog.products[1].variants[0],source:source[1].variants[0]}]}
    ];
  }
};

const coverage=core.skuCoverage(warehouse,catalog);
assert.strictEqual(coverage.master,'products_export');
assert.strictEqual(coverage.matched,2);
assert.strictEqual(coverage.total,2);

const prepared=core.prepareRows(warehouse,catalog,source,matcher);
assert.strictEqual(receivedProducts,catalog.products,'Phải match theo products_export, không theo file kho cũ');
assert.deepStrictEqual(
  prepared.rows.map(x=>({sku:x.sku,stock:x.stock,variantId:x.variantId,productId:x.productId})),
  [
    {sku:'A-M',stock:7,variantId:11,productId:22},
    {sku:'B-L',stock:9,variantId:12,productId:33}
  ]
);

console.log('AUTO SYNC CORE PASS', {master:'products_export',catalogOnlyProductIncluded:true});
