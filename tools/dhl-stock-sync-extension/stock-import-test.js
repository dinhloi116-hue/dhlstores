const assert=require('assert');
const xlsx=require('./xlsx-lite.js');
const stock=require('./stock-import-core.js');

function inlineCell(ref,value){
  const text=String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
}
function numCell(ref,value){return `<c r="${ref}"><v>${Number(value)}</v></c>`;}

(async()=>{
  const headers=['Đường dẫn/Alias','Tên sản phẩm*','Mô tả sản phẩm','Nhãn hiệu','Thuộc tính 1','Giá trị thuộc tính 1','Thuộc tính 2','Giá trị thuộc tính 2','Mã SKU','Quản lý kho','Giá','Giá so sánh','Giá vốn','Id sản phẩm','Id phiên bản'];
  const h=headers.map((v,i)=>inlineCell(`${xlsx.indexToCol(i)}1`,v)).join('');
  const r2=[inlineCell('A2','mexico'),inlineCell('B2','ĐT Mexico 2026 HD - Rêu'),inlineCell('C2','Mô tả'),inlineCell('D2','ĐHL SPORTS'),inlineCell('E2','Kiểu'),inlineCell('F2','Không in'),inlineCell('G2','Kíchcỡ'),inlineCell('H2','S'),inlineCell('I2','Mexico xanh 26 HD-S'),inlineCell('J2','Sapo'),numCell('K2',0),numCell('L2',44),numCell('M2',0),numCell('N2',100),numCell('O2',200)].join('');
  const r3=[inlineCell('H3','M'),inlineCell('I3','Mexico xanh 26 HD-M'),numCell('N3',100),numCell('O3',201)].join('');
  const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:O3"/><sheetData><row r="1">${h}</row><row r="2">${r2}</row><row r="3">${r3}</row></sheetData></worksheet>`;
  const input=xlsx.zipStore(new Map([['xl/worksheets/sheet1.xml',new TextEncoder().encode(xml)]]));
  const parsed=await xlsx.parseSapoExport(input);
  const out=stock.buildInventoryWorkbook(xlsx,parsed,{'200':6,'201':18},'Cửa hàng chính');
  const book=await xlsx.readFirstSheet(out.bytes);
  const hm=xlsx.headerMap(book.rows[0]);
  assert.strictEqual(book.rows[0].length,36);
  assert.strictEqual(hm['Cửa hàng chính_Tồn kho'],34);
  assert.strictEqual(hm['Id phiên bản'],35);
  assert.strictEqual(book.rows[1][hm['Cửa hàng chính_Tồn kho']],6);
  assert.strictEqual(book.rows[2][hm['Cửa hàng chính_Tồn kho']],18);
  assert.strictEqual(book.rows[1][hm['Id phiên bản']],200);
  assert.strictEqual(book.rows[2][hm['Id phiên bản']],201);
  assert.strictEqual(book.rows[2][hm['Tên sản phẩm*']],'ĐT Mexico 2026 HD - Rêu','Tên sản phẩm phải được điền lặp theo đúng mẫu');
  assert.strictEqual(book.rows[2][hm['Đường dẫn/Alias']],'mexico','Alias phải được điền lặp theo đúng mẫu');
  assert.strictEqual(book.rows[2][hm['Mã SKU']],'Mexico xanh 26 HD-M');
  console.log('SAPO 36-COL STOCK IMPORT PASS',{columns:36,stockCol:35,variantIdCol:36,rows:out.rows});
})().catch((error)=>{console.error(error);process.exit(1);});
