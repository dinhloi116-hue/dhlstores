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


// Regression: products_export mới có CLB Real / ARS / Liver.
// Các tên này không được phép biến mất khỏi file tồn chỉ vì không có trong TEAM_PATTERNS.
function clubProduct(productId,name,color,skuToken,baseId){
  return {
    productId,name:`${name} - ${color}`,
    skuBase:`ABDN-${skuToken}`,
    variants:['S','M','L','XL','XXL'].map((size,i)=>({
      productId,variantId:baseId+i,
      name:`${name} - ${color}`,
      sku:`ABDN-${skuToken}-${size}`,
      size
    }))
  };
}
function clubSource(parentId,parentName,colors){
  const variants=[];let n=0;
  for(const color of colors){
    for(const size of ['S','M','L','XL','XXL']){
      variants.push({
        id:parentId*100+n++,parentId,color,size,
        name:`${parentName} - ${color} - ${size}`,
        available:size==='XXL'?0:11
      });
    }
  }
  return{parentId,parentName,variants,complete:true};
}

const clubTargets=[
  clubProduct(91959154,'CLB Real 26-27 HD','Hồng','CLB-REAL-26-27-HD-HONG-14NE9U1',228274684),
  clubProduct(91959152,'CLB Real 26-27 HD','Trắng','CLB-REAL-26-27-HD-TRANG-14HQR4B',228274679),
  clubProduct(91959151,'CLB Real 26-27 HD','Xanh Rêu','CLB-REAL-26-27-HD-XANH-REU-1Y8VHAE',228274674),
  clubProduct(91959150,'CLB Real 26-27 HD','Trắng Có Cổ','CLB-REAL-26-27-HD-TRANG-CO-C-BSBWNF',228274669),
  clubProduct(91959149,'CLB ARS 26-27 HD','Đỏ','CLB-ARS-26-27-HD-DO-1E6II4I',228274664),
  clubProduct(91959148,'CLB Liver 26-27 HD','Đỏ','CLB-LIVER-26-27-HD-DO-128IY0I',228274659)
];
const clubSourceData=[
  clubSource(7001,'CLB Real 26-27 HD',['Hồng','Trắng','Xanh Rêu','Trắng Có Cổ']),
  clubSource(7002,'CLB ARS 26-27 HD',['Đỏ']),
  clubSource(7003,'CLB Liver 26-27 HD',['Đỏ'])
];
const clubOut=m.matchSapoProducts(clubTargets,clubSourceData);
assert.strictEqual(clubOut.length,6);
assert.ok(clubOut.every(x=>x.matched),'Tất cả mẫu CLB mới trong products_export phải ghép được nguồn');
assert.ok(clubOut.every(x=>x.complete),'Tất cả size của mẫu CLB mới phải ghép đủ');
assert.strictEqual(clubOut.reduce((n,x)=>n+x.variantMatches.length,0),30);
assert.strictEqual(clubOut[0].best.color,'Hồng');
assert.strictEqual(clubOut[3].best.color,'Trắng Có Cổ');
assert.strictEqual(clubOut[4].best.parentName,'CLB ARS 26-27 HD');
assert.strictEqual(clubOut[5].best.parentName,'CLB Liver 26-27 HD');
console.log('CLUB MASTER MATCH PASS',clubOut.map(x=>({name:x.sapoProduct.name,matched:x.matched,score:Math.round(x.best.score*100)})));

console.log('MATCH PASS', out.map(x => ({sapo:x.sapoProduct.productId, source:`${x.best.parentName}/${x.best.color}`, score:Math.round(x.best.score*100), method:x.linkMethod})));
console.log('STRICT COLOR PASS', strictOut.map(x => ({sapo:x.sapoProduct.productId, matched:x.matched, source:x.best?x.best.color:null})));
