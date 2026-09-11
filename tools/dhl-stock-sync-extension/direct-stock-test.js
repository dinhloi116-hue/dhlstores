const assert=require('assert');
const xlsx=require('./xlsx-lite.js');
const direct=require('./direct-stock-core.js');

function inlineCell(ref,value){
  const text=String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
}
function numCell(ref,value){return `<c r="${ref}"><v>${Number(value)}</v></c>`;}

(async()=>{
  const headers=['Tên sản phẩm*','Mã SKU','Id sản phẩm','Id phiên bản','Thuộc tính 1','Giá trị thuộc tính 1','Cửa hàng chính_Tồn kho','Giá'];
  const row1=headers.map((v,i)=>inlineCell(`${xlsx.indexToCol(i)}1`,v)).join('');
  const row2=[inlineCell('A2','ĐT Mexico 2026 HD - Rêu'),inlineCell('B2','Mexico xanh 26 HD-S'),numCell('C2',100),numCell('D2',200),inlineCell('E2','Size'),inlineCell('F2','S'),numCell('G2',99),numCell('H2',123000)].join('');
  const row3=[inlineCell('B3','Mexico xanh 26 HD-M'),numCell('C3',100),numCell('D3',201),inlineCell('F3','M'),numCell('G3',88),numCell('H3',123000)].join('');
  const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:H3"/><sheetData><row r="1">${row1}</row><row r="2">${row2}</row><row r="3">${row3}</row></sheetData></worksheet>`;
  const files=new Map([['xl/worksheets/sheet1.xml',new TextEncoder().encode(xml)]]);
  const input=xlsx.zipStore(files);
  const parsed=await xlsx.parseSapoExport(input);
  assert.strictEqual(parsed.variants.length,2);
  assert.strictEqual(parsed.variants[0].variantId,200);
  assert.strictEqual(parsed.variants[1].variantId,201);

  const out=await direct.updateExportWorkbook(xlsx,input,parsed,{'200':7,'201':0});
  assert.strictEqual(out.rows,2);
  assert.strictEqual(out.zeroCount,1);
  assert.strictEqual(out.inventoryHeader,'Cửa hàng chính_Tồn kho');

  const check=await xlsx.readFirstSheet(out.bytes);
  assert.strictEqual(check.rows[1][6],7,'Mexico S phải thành 7');
  assert.strictEqual(check.rows[2][6],0,'Mexico M phải thành 0');
  assert.strictEqual(check.rows[1][1],'Mexico xanh 26 HD-S','SKU phải giữ nguyên');
  assert.strictEqual(check.rows[1][7],123000,'Giá phải giữ nguyên');
  assert.strictEqual(check.rows[1][3],200,'Id phiên bản phải giữ nguyên');
  assert.strictEqual(check.rows[1][0],'ĐT Mexico 2026 HD - Rêu','Tên phải giữ nguyên');

  const partial=await direct.updateExportWorkbook(xlsx,input,parsed,{'200':5});
  const checkPartial=await xlsx.readFirstSheet(partial.bytes);
  assert.strictEqual(checkPartial.rows[1][6],5);
  assert.strictEqual(checkPartial.rows[2][6],88,'Biến thể chưa ghép phải giữ tồn cũ, không tự ghi 0');

  console.log('DIRECT STOCK PASS',{changed:out.rows,zero:out.zeroCount,partialKeepsOld:true});
})().catch((error)=>{console.error(error);process.exit(1);});
