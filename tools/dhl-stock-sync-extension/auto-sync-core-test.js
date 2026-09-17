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

const warehouse={
  products:[{productId:1,name:'ĐT A 2026 HD',variants:[{name:'ĐT A 2026 HD - Đỏ',rawProductLabel:'ĐT A 2026 HD - Đỏ / M',size:'M'}]}],
  variants:[{name:'ĐT A 2026 HD - Đỏ',rawProductLabel:'ĐT A 2026 HD - Đỏ / M',size:'M'}]
};
const catalog={variants:[{name:'ĐT A 2026 HD - Đỏ',size:'M',sku:'A-M',variantId:11,productId:22}]};
const source=[{parentName:'ĐT A 2026 HD',variants:[{name:'ĐT A 2026 HD - Đỏ - M',size:'M',available:7}]}];
const matcher={matchSapoProducts(){return[{variantMatches:[{sapo:warehouse.products[0].variants[0],source:source[0].variants[0]}]}];}};
const coverage=core.skuCoverage(warehouse,catalog);
assert.strictEqual(coverage.matched,1);
assert.strictEqual(coverage.total,1);
const prepared=core.prepareRows(warehouse,catalog,source,matcher);
assert.deepStrictEqual(prepared.rows.map(x=>({sku:x.sku,stock:x.stock,variantId:x.variantId,productId:x.productId})),[{sku:'A-M',stock:7,variantId:11,productId:22}]);
console.log('AUTO SYNC CORE PASS');
