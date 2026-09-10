const assert = require('assert');
const x = require('./xlsx-lite.js');

const headers = [
  'Đường dẫn/Alias','Tên sản phẩm*','Thuộc tính 1','Giá trị thuộc tính 1','Thuộc tính 2','Giá trị thuộc tính 2','Thuộc tính 3','Giá trị thuộc tính 3','Mã SKU','Id sản phẩm','Id phiên bản'
];
const h = Object.create(null);
headers.forEach((v,i)=>h[v]=i);

const rowKichCo = ['alias','SP','Kiểu','Không in','Kíchcỡ','XL','','','Bỉ đỏ 26 HD-XL',1,101];
const rowSize = ['alias','SP','Kiểu','Không in','Size','XXL','','','Bỉ đỏ 26 HD-XXL',1,102];

const dim1 = x.detectSizeDimension(rowKichCo,h);
const dim2 = x.detectSizeDimension(rowSize,h);
assert.strictEqual(dim1.index, 2);
assert.strictEqual(dim1.valueHeader, 'Giá trị thuộc tính 2');
assert.strictEqual(dim2.index, 2);
assert.strictEqual(x.normalizeSize('2XL'), 'XXL');
assert.strictEqual(x.sizeFromSku('Argentina trắng xanh 26 HD-L'), 'L');
assert.strictEqual(x.sizeFromSku('Đức trắng tập 26 HD-2XL'), 'XXL');
assert.strictEqual(x.skuBase('Nhật xanh 26 HD-XL'), 'Nhật xanh 26 HD');

console.log('SAPO LINK PASS', {
  dynamicSizeLabels: ['Kíchcỡ','Size'],
  skuSuffixSize: true,
  skuBase: true
});
