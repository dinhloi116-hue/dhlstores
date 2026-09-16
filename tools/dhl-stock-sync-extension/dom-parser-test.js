const assert=require('assert');
const p=require('./dom-stock-parser.js');

assert.deepStrictEqual(p.extractSizeStock('S Còn hàng (15)'),{size:'S',stock:15});
assert.deepStrictEqual(p.extractSizeStock('M - Còn hàng (26)'),{size:'M',stock:26});
assert.deepStrictEqual(p.extractSizeStock('L | Còn hàng (34)'),{size:'L',stock:34});
assert.deepStrictEqual(p.extractSizeStock('XL Tình trạng tồn: 19'),{size:'XL',stock:19});
assert.deepStrictEqual(p.extractSizeStock('XXL - Hết hàng'),{size:'XXL',stock:0});
assert.deepStrictEqual(p.extractSizeStock('2XL - Còn hàng (8)'),{size:'XXL',stock:8});
assert.strictEqual(p.looksLikeColorName('Xanh Đen'),true);
assert.strictEqual(p.looksLikeColorName('Trắng Ngọc'),true);
assert.strictEqual(p.looksLikeColorName('Be Sữa'),true);
assert.strictEqual(p.looksLikeColorName('Còn hàng (19)'),false);
assert.strictEqual(p.looksLikeColorName('Tên size'),false);
assert.deepStrictEqual(p.dedupeColorNames(['Xanh Đen',' xanh đen ','Xanh Ngọc']),['Xanh Đen','Xanh Ngọc']);
const rows=p.parseRowTexts(['S Còn hàng (7)','M Còn hàng (11)','L Còn hàng (50)','XL Còn hàng (32)','XXL Còn hàng (11)','XXXL Hết hàng']);
assert.deepStrictEqual(rows.map(x=>[x.size,x.stock]),[['S',7],['M',11],['L',50],['XL',32],['XXL',11],['XXXL',0]]);
console.log('DOM PARSER PASS',{rows:rows.length,colors:true,outOfStock:true});
