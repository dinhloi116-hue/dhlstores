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
  // Real export ends with Id sản phẩm, Id phiên bản.
  const headers=['Tên sản phẩm*','Mã SKU','Thuộc tính 1','Giá trị thuộc tính 1','Giá','Id sản phẩm','Id phiên bản'];
  const row1=headers.map((v,i)=>inlineCell(`${xlsx.indexToCol(i)}1`,v)).join('');
  const row2=[inlineCell('A2','ĐT Mexico 2026 HD - Rêu'),inlineCell('B2','Mexico xanh 26 HD-S'),inlineCell('C2','Size'),inlineCell('D2','S'),numCell('E2',123000),numCell('F2',100),numCell('G2',200)].join('');
  const row3=[inlineCell('B3','Mexico xanh 26 HD-M'),inlineCell('D3','M'),numCell('E3',123000),numCell('F3',100),numCell('G3',201)].join('');
  const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:G3"/><sheetData><row r="1">${row1}</row><row r="2">${row2}</row><row r="3">${row3}</row></sheetData></worksheet>`;
  const files=new Map([['xl/worksheets/sheet1.xml',new TextEncoder().encode(xml)]]);
  const input=xlsx.zipStore(files);

  const parsed=await xlsx.parseSapoExport(input);
  assert.strictEqual(direct.resolveInventoryHeader(parsed.headerMap),'');

  const out=await direct.updateExportWorkbook(xlsx,input,parsed,{'200':6});
  assert.strictEqual(out.addedInventoryColumn,true);
  assert.strictEqual(out.insertedBeforeVariantId,true);
  assert.strictEqual(out.inventoryHeader,'Cửa hàng chính_Tồn kho');
  assert.strictEqual(out.rows,1);

  const check=await xlsx.readFirstSheet(out.bytes);
  const h=xlsx.headerMap(check.rows[0]);
  const stockCol=h['Cửa hàng chính_Tồn kho'];
  const variantCol=h['Id phiên bản'];
  const priceCol=h['Giá'];
  const productIdCol=h['Id sản phẩm'];
  assert.ok(Number.isInteger(stockCol),'Phải tự thêm cột Cửa hàng chính_Tồn kho');
  assert.ok(stockCol<variantCol,'Cột tồn kho phải nằm trước Id phiên bản để Sapo đọc');
  assert.strictEqual(check.rows[1][stockCol],6,'Mexico S phải nhận tồn 6');
  assert.strictEqual(check.rows[2][stockCol],undefined,'Size chưa ghép phải để trống, không tự ghi 0');
  assert.strictEqual(check.rows[1][0],'ĐT Mexico 2026 HD - Rêu');
  assert.strictEqual(check.rows[1][1],'Mexico xanh 26 HD-S');
  assert.strictEqual(check.rows[1][priceCol],123000,'Giá phải giữ nguyên theo đúng header');
  assert.strictEqual(check.rows[1][productIdCol],100,'Id sản phẩm phải giữ nguyên');
  assert.strictEqual(check.rows[1][variantCol],200,'Id phiên bản phải giữ nguyên');

  console.log('DIRECT EXPORT STOCK PASS',{addedStockColumn:true,stockBeforeVariantId:true,changed:out.rows,unmatchedBlank:true});
})().catch((error)=>{console.error(error);process.exit(1);});
