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

const duplicateTargets = [
  sapoProducts[0],
  { productId: 4, name: 'Bộ Quần Áo Bóng Đá Bồ Đào Nha Xanh Rêu Sân Khách World Cup 2026', skuBase:'Bồ đào nha rêu 26 HD', variants:['S','M','L','XL','XXL'].map((size,i)=>({variantId:400+i,sku:`Bồ đào nha rêu 26 HD-${size}`,size})) }
];
const oneColorSource = [product('ĐT Bồ Đào Nha 2026 HD', ['Đỏ'])];
const dupOut = m.matchSapoProducts(duplicateTargets, oneColorSource);
assert.strictEqual(dupOut.filter(x=>x.complete).length, 1);

function variants(prefix, baseId){
  return ['S','M','L','XL','XXL'].map((size,i)=>({variantId:baseId+i,sku:`${prefix}-${size}`,size}));
}
function sourceOne(parentName,color,base){
  return {parentId:base,parentName,complete:true,variants:['S','M','L','XL','XXL'].map((size,i)=>({id:base+i,color,size,name:`${parentName} - ${color} - ${size}`,available:7+i}))};
}
const strictTargets = [
  {productId:10,name:'Bộ Quần Áo Bóng Đá Mexico Màu Xanh Lá 2026 Sân Nhà',skuBase:'Mexico xanh 26 HD',variants:variants('Mexico xanh 26 HD',1000)},
  {productId:11,name:'Bộ Quần Áo Bóng Đá Hà Lan Trắng Sân Khách World Cup 2026',skuBase:'Hà lan trắng 26 HD',variants:variants('Hà lan trắng 26 HD',1100)},
  {productId:12,name:'Bộ Quần Áo Bóng Đá Ý Vàng Sân Khách World Cup 2026',skuBase:'Ý vàng 26 HD',variants:variants('Ý vàng 26 HD',1200)},
  {productId:13,name:'Bộ Quần Áo Bóng Đá Anh Be Sữa Sân Khách World Cup 2026',skuBase:'Anh be HD',variants:variants('Anh be HD',1300)},
];
const strictSource = [
  sourceOne('ĐT Mexico 2026 HD','Rêu',5000),
  sourceOne('ĐT Hà Lan 2026 HD','Rêu',5100),
  sourceOne('ĐT Ý 2026 HD','Xanh Ngọc',5200),
  sourceOne('ĐT Anh 2026 HD','Kem',5300),
];
const strictOut = m.matchSapoProducts(strictTargets, strictSource);
assert.strictEqual(strictOut[0].matched,true,'Mexico xanh phải ghép được Rêu');
assert.strictEqual(strictOut[1].matched,false,'Hà Lan trắng không được ghép nhầm Rêu');
assert.strictEqual(strictOut[2].matched,false,'Ý vàng không được ghép nhầm Xanh Ngọc');
assert.strictEqual(strictOut[3].matched,true,'Anh be phải ghép được Kem');
assert.ok(m.scoreColorHint('xanh','Rêu')>=0.5);
assert.strictEqual(m.scoreColorHint('đỏ','Kem'),0);

console.log('MATCH PASS', out.map(x => ({sapo:x.sapoProduct.productId, source:`${x.best.parentName}/${x.best.color}`, score:Math.round(x.best.score*100), method:x.linkMethod})));
console.log('STRICT COLOR PASS', strictOut.map(x => ({sapo:x.sapoProduct.productId, matched:x.matched, source:x.best?x.best.color:null})));
