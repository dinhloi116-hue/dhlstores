const assert = require('assert');
const lite = require('./xlsx-lite.js');
globalThis.DHLXlsxLite = lite;
require('./xlsx-preserve.js');
const xlsx = globalThis.DHLXlsxLite;

function esc(v) {
  return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function cell(ci, ri, value) {
  if (value == null || value === '') return '';
  const ref = `${xlsx.indexToCol(ci)}${ri}`;
  if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${esc(value)}</t></is></c>`;
}
function workbookBytes(headers) {
  const headerCells = headers.map((v, i) => cell(i, 1, v)).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${xlsx.indexToCol(headers.length - 1)}2"/><sheetData><row r="1">${headerCells}</row><row r="2"></row></sheetData></worksheet>`;
  return xlsx.zipStore(new Map([['xl/worksheets/sheet1.xml', new TextEncoder().encode(xml)]]));
}

(async () => {
  const exportHeaders = [
    'Đường dẫn/Alias','Tên sản phẩm*','Thuộc tính 1','Giá trị thuộc tính 1','Thuộc tính 2','Giá trị thuộc tính 2',
    'Mã SKU','Ảnh đại diện','Ảnh phiên bản','Giá','Giá so sánh','Giá vốn','Id sản phẩm','Id phiên bản'
  ];
  const eh = xlsx.headerMap(exportHeaders);
  const rows = [
    exportHeaders,
    ['mexico-2026','Bộ Quần Áo Bóng Đá Mexico Màu Xanh Lá 2026 Sân Nhà','Kiểu','Không in','Size','S','Mexico xanh 26 HD-S','main-s.jpg','s.jpg',120000,150000,70000,1,101],
    ['mexico-2026','',null,'Không in',null,'M','Mexico xanh 26 HD-M','main-m.jpg','m.jpg',120000,150000,70000,1,102],
    ['mexico-2026','',null,'Không in',null,'L','Mexico xanh 26 HD-L','main-l.jpg','l.jpg',120000,150000,70000,1,103]
  ];
  const variants = [
    {productId:1,variantId:101,name:'Bộ Quần Áo Bóng Đá Mexico Màu Xanh Lá 2026 Sân Nhà',sku:'Mexico xanh 26 HD-S',size:'S',raw:rows[1]},
    {productId:1,variantId:102,name:'Bộ Quần Áo Bóng Đá Mexico Màu Xanh Lá 2026 Sân Nhà',sku:'Mexico xanh 26 HD-M',size:'M',raw:rows[2]},
    {productId:1,variantId:103,name:'Bộ Quần Áo Bóng Đá Mexico Màu Xanh Lá 2026 Sân Nhà',sku:'Mexico xanh 26 HD-L',size:'L',raw:rows[3]}
  ];
  const sapoExport = {headers:exportHeaders,headerMap:eh,rows,variants,products:[{productId:1,name:variants[0].name,variants}]};
  const templateHeaders = [
    'Đường dẫn/Alias','Tên sản phẩm*','Thuộc tính 1','Giá trị thuộc tính 1','Thuộc tính 2','Giá trị thuộc tính 2',
    'Mã SKU','Ảnh đại diện','Ảnh phiên bản','Giá','Giá so sánh','Giá vốn','Cửa hàng chính_Tồn kho','Id phiên bản'
  ];
  const template = workbookBytes(templateHeaders);

  const out = await xlsx.buildSapoImport(template, sapoExport, {'101':7});
  assert.strictEqual(out.rows, 1);
  assert.strictEqual(out.variantCount, 1);
  assert.strictEqual(out.productCount, 1);
  assert.strictEqual(out.skippedVariantCount, 2);

  const parsed = await xlsx.readFirstSheet(out.bytes);
  const h = xlsx.headerMap(parsed.rows[0]);
  assert.strictEqual(parsed.rows[1][h['Tên sản phẩm*']], variants[0].name);
  assert.strictEqual(parsed.rows[1][h['Mã SKU']], 'Mexico xanh 26 HD-S');
  assert.strictEqual(parsed.rows[1][h['Giá trị thuộc tính 2']], 'S');
  assert.strictEqual(parsed.rows[1][h['Cửa hàng chính_Tồn kho']], 7);
  assert.strictEqual(parsed.rows[1][h['Id phiên bản']], 101);
  assert.strictEqual(parsed.rows[1][h['Ảnh đại diện']], 'main-s.jpg');
  assert.strictEqual(parsed.rows[1][h['Ảnh phiên bản']], 's.jpg');
  assert.strictEqual(parsed.rows[1][h['Giá']], 120000);

  const outM = await xlsx.buildSapoImport(template, sapoExport, {'102':19});
  const parsedM = await xlsx.readFirstSheet(outM.bytes);
  const hm = xlsx.headerMap(parsedM.rows[0]);
  assert.strictEqual(parsedM.rows.length, 2);
  assert.strictEqual(parsedM.rows[1][hm['Tên sản phẩm*']], variants[0].name);
  assert.strictEqual(parsedM.rows[1][hm['Thuộc tính 2']], 'Size');
  assert.strictEqual(parsedM.rows[1][hm['Giá trị thuộc tính 2']], 'M');
  assert.strictEqual(parsedM.rows[1][hm['Mã SKU']], 'Mexico xanh 26 HD-M');
  assert.strictEqual(parsedM.rows[1][hm['Cửa hàng chính_Tồn kho']], 19);
  assert.strictEqual(parsedM.rows[1][hm['Id phiên bản']], 102);
  assert.strictEqual(parsedM.rows[1][hm['Ảnh đại diện']], 'main-m.jpg');

  const outZero = await xlsx.buildSapoImport(template, sapoExport, {'103':0});
  const parsedZero = await xlsx.readFirstSheet(outZero.bytes);
  const hz = xlsx.headerMap(parsedZero.rows[0]);
  assert.strictEqual(parsedZero.rows[1][hz['Cửa hàng chính_Tồn kho']], 0);
  assert.strictEqual(parsedZero.rows[1][hz['Mã SKU']], 'Mexico xanh 26 HD-L');

  console.log('PRESERVE PARTIAL PASS', {
    mexicoS: 7,
    partialVariantAllowed: true,
    standaloneRows: true,
    zeroStockPreserved: true,
    protected: ['Tên sản phẩm','SKU','Ảnh','Giá','Id phiên bản']
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
