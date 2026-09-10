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
  const exportHeaders = ['Đường dẫn/Alias','Tên sản phẩm*','Mã SKU','Ảnh đại diện','Ảnh phiên bản','Giá','Giá so sánh','Giá vốn','Id sản phẩm','Id phiên bản'];
  const eh = xlsx.headerMap(exportHeaders);
  const rows = [
    exportHeaders,
    ['ao-bi-do','Áo Bỉ Đỏ 2026','BI-DO-S','main.jpg','s.jpg',120000,150000,70000,1,101],
    ['ao-bi-do','','BI-DO-M','main.jpg','m.jpg',120000,150000,70000,1,102],
    ['ao-bi-do','','','gallery-2.jpg','','','','','','']
  ];
  const variants = [
    {productId:1,variantId:101,name:'Áo Bỉ Đỏ 2026',sku:'BI-DO-S',size:'S',raw:rows[1]},
    {productId:1,variantId:102,name:'Áo Bỉ Đỏ 2026',sku:'BI-DO-M',size:'M',raw:rows[2]}
  ];
  const sapoExport = {headers:exportHeaders,headerMap:eh,rows,variants,products:[{productId:1,name:'Áo Bỉ Đỏ 2026',variants}]};
  const templateHeaders = ['Đường dẫn/Alias','Tên sản phẩm*','Mã SKU','Ảnh đại diện','Ảnh phiên bản','Giá','Giá so sánh','Giá vốn','Cửa hàng chính_Tồn kho','Id phiên bản'];
  const template = workbookBytes(templateHeaders);
  const out = await xlsx.buildSapoImport(template, sapoExport, {'101':4,'102':0});
  assert.strictEqual(out.rows, 3, 'Phải giữ cả dòng ảnh gallery');
  assert.strictEqual(out.productCount, 1);

  const parsed = await xlsx.readFirstSheet(out.bytes);
  const h = xlsx.headerMap(parsed.rows[0]);
  assert.strictEqual(parsed.rows[1][h['Tên sản phẩm*']], 'Áo Bỉ Đỏ 2026');
  assert.strictEqual(parsed.rows[1][h['Mã SKU']], 'BI-DO-S');
  assert.strictEqual(parsed.rows[2][h['Mã SKU']], 'BI-DO-M');
  assert.strictEqual(parsed.rows[1][h['Ảnh đại diện']], 'main.jpg');
  assert.strictEqual(parsed.rows[1][h['Ảnh phiên bản']], 's.jpg');
  assert.strictEqual(parsed.rows[2][h['Ảnh phiên bản']], 'm.jpg');
  assert.strictEqual(parsed.rows[3][h['Ảnh đại diện']], 'gallery-2.jpg');
  assert.strictEqual(parsed.rows[1][h['Giá']], 120000);
  assert.strictEqual(parsed.rows[1][h['Giá so sánh']], 150000);
  assert.strictEqual(parsed.rows[1][h['Giá vốn']], 70000);
  assert.strictEqual(parsed.rows[1][h['Cửa hàng chính_Tồn kho']], 4);
  assert.strictEqual(parsed.rows[2][h['Cửa hàng chính_Tồn kho']], 0);
  assert.strictEqual(parsed.rows[1][h['Id phiên bản']], 101);
  assert.strictEqual(parsed.rows[2][h['Id phiên bản']], 102);

  let blocked = false;
  try {
    await xlsx.buildSapoImport(template, sapoExport, {'101':4});
  } catch (error) {
    blocked = /chưa ghép đủ|ghi đè một phần/i.test(error.message);
  }
  assert.ok(blocked, 'Phải chặn khi một sản phẩm chưa có đủ tồn cho mọi size');

  console.log('PRESERVE PASS', {
    rows: out.rows,
    stockOnly: true,
    kept: ['Tên sản phẩm','SKU','Ảnh','Giá','Id phiên bản'],
    partialProductBlocked: true
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
