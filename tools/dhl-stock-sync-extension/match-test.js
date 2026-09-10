const assert = require('assert');
const m = require('./match-core.js');

const sapoProducts = [
  { productId: 1, name: 'Bộ Quần Áo Bóng Đá Bồ Đào Nha Đỏ Sân Nhà World Cup 2026 - Vải Thun Mè Hàn Quốc - Nhận In Tên Số', skuBase:'Bồ đào nha đỏ 26 HD', variants: ['S','M','L','XL','XXL'].map((size,i)=>({variantId:100+i,sku:`Bồ đào nha đỏ 26 HD-${size}`,size})) },
  { productId: 2, name: 'Bộ Quần Áo Bóng Đá Đức Trắng Tập World Cup 2026, Vải Thun Mè Hàn Quốc, Nhận In Tên Số', skuBase:'Đức trắng tập 26 HD', variants: ['S','M','L','XL','XXL'].map((size,i)=>({variantId:200+i,sku:`Đức trắng tập 26 HD-${size}`,size})) },
  { productId: 3, name: 'Bộ Quần Áo Bóng Đá Tây Ban Nha Màu Đỏ 2026 Sân Nhà, Thun Mè Hàn Quốc, Nhận In Tên Số', skuBase:'Tây Ban Nha đỏ 26 HD', variants: ['S','M','L','XL','XXL'].map((size,i)=>({variantId:300+i,sku:`Tây Ban Nha đỏ 26 HD-${size}`,size})) },
];

let id = 1000;
function product(parentName, colors) {
  const variants = [];
  for (const color of colors) {
    for (const size of ['S','M','L','XL','XXL']) {
      variants.push({id:id++,color,size,name:`${parentName === 'HD' ? 'ĐT Bồ Đào Nha 2026 HD' : parentName} - ${color} - ${size}`,available:size==='XXL'?0:9});
    }
  }
  return {parentId:id++,parentName,variants,complete:true};
}
const source = [
  // Cố tình parentName='HD' để kiểm tra matcher phải lấy được đội từ tên variant nguồn.
  product('HD', ['Đỏ']),
  product('ĐT Đức 2026 HD', ['Đen','Trắng Cam','Trắng Tập']),
  product('ĐT Tây Ban Nha 2026 HD', ['Be Sữa','Đỏ']),
];

const out = m.matchSapoProducts(sapoProducts, source);
assert.strictEqual(out.length, 3);
assert.ok(out.every(x => x.complete));
assert.strictEqual(out[0].best.color, 'Đỏ');
assert.strictEqual(out[1].best.color, 'Trắng Tập');
assert.strictEqual(out[2].best.color, 'Đỏ');
assert.strictEqual(out[0].variantMatches.find(x=>x.sapo.size==='XXL').source.available, 0);
assert.strictEqual(m.normalizeSize('2XL'), 'XXL');
assert.strictEqual(m.normalizeSize('3XL'), 'XXXL');
assert.strictEqual(m.skuBase('Bồ đào nha đỏ 26 HD-XL'), 'Bồ đào nha đỏ 26 HD');

const hints = m.buildScanHints(sapoProducts);
assert.strictEqual(hints.length, 3);
assert.ok(hints.find(x => x.team === 'portugal').colors.includes('do'));
assert.ok(hints.find(x => x.team === 'germany').colors.includes('trang tap'));

// Một nhóm nguồn không được ghép cho hai sản phẩm Sapo cùng đội.
const duplicateTargets = [
  sapoProducts[0],
  { productId: 4, name: 'Bộ Quần Áo Bóng Đá Bồ Đào Nha Xanh Rêu Sân Khách World Cup 2026', skuBase:'Bồ đào nha rêu 26 HD', variants:['S','M','L','XL','XXL'].map((size,i)=>({variantId:400+i,sku:`Bồ đào nha rêu 26 HD-${size}`,size})) }
];
const oneColorSource = [product('ĐT Bồ Đào Nha 2026 HD', ['Đỏ'])];
const dupOut = m.matchSapoProducts(duplicateTargets, oneColorSource);
assert.strictEqual(dupOut.filter(x=>x.complete).length, 1);

console.log('MATCH PASS', out.map(x => ({sapo:x.sapoProduct.productId, source:`${x.best.parentName}/${x.best.color}`, score:Math.round(x.best.score*100), method:x.linkMethod})));
