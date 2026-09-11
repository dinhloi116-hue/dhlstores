const assert=require('assert');
const xlsx=require('./xlsx-lite.js');
const direct=require('./direct-stock-core.js');

function inlineCell(ref,value){
  const text=String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
}
function numCell(ref,value){return `<c r="${ref}"><v>${Number(value)}</v></c>`;}

(async()=>{
  // Giống file XUẤT Sapo: có ID nhưng KHÔNG có cột tồn kho.
  const headers=['Tên sản phẩm*','Mã SKU','Id sản phẩm','Id phiên bản','Thuộc tính 1','Giá trị thuộc tính 1','Giá'];
  const row1=headers.map((v,i)=>inlineCell(`${xlsx.indexToCol(i)}1`,v)).join('');
  const row2=[inlineCell('A2','ĐT Mexico 2026 HD - Rêu'),inlineCell('B2','Mexico xanh 26 HD-S'),numCell('C2',100),numCell('D2',200),inlineCell('E2','Size'),inlineCell('F2','S'),numCell('G2',123000)].join('');
  const row3=[inlineCell('B3','Mexico xanh 26 HD-M'),numCell('C3',100),numCell('D3',201),inlineCell('F3','M'),numCell('G3',123000)].join('');
  const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:G3"/><sheetData><row r="1">${row1}</row><row r="2">${row2}</row><row r="3">${row3}</row></sheetData></worksheet>`;
  const files=new Map([['xl/worksheets/sheet1.xml',new TextEncoder().encode(xml)]]);
  const input=xlsx.zipStore(files);

  const parsed=await xlsx.parseSapoExport(input);
  assert.strictEqual(direct.resolveInventoryHeader(parsed.headerMap),'');

  const out=await direct.updateExportWorkbook(xlsx,input,parsed,{'200':6});
  assert.strictEqual(out.addedInventoryColumn,true);
  assert.strictEqual(out.inventoryHeader,'Cửa hàng chính_Tồn kho');
  assert.strictEqual(out.rows,1);

  const check=await xlsx.readFirstSheet(out.bytes);
  const h=xlsx.headerMap(check.rows[0]);
  const stockCol=h['Cửa hàng chính_Tồn kho'];
  assert.ok(Number.isInteger(stockCol),'Phải tự thêm cột Cửa hàng chính_Tồn kho');
  assert.strictEqual(check.rows[1][stockCol],6,'Mexico S phải nhận tồn 6');
  assert.strictEqual(check.rows[2][stockCol],undefined,'Size chưa ghép phải để trống, không tự ghi 0');
  assert.strictEqual(check.rows[1][0],'ĐT Mexico 2026 HD - Rêu');
  assert.strictEqual(check.rows[1][1],'Mexico xanh 26 HD-S');
  assert.strictEqual(check.rows[1][6],123000,'Giá phải giữ nguyên');
  assert.strictEqual(check.rows[1][3],200,'Id phiên bản phải giữ nguyên');

  console.log('DIRECT EXPORT STOCK PASS',{addedStockColumn:true,changed:out.rows,unmatchedBlank:true});
})().catch((error)=>{console.error(error);process.exit(1);});
