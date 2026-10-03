const assert=require('assert');
const xlsx=require('./xlsx-lite.js');
const direct=require('./direct-stock-core.js');

function inlineCell(ref,value){
  const text=String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
}
function numCell(ref,value){return `<c r="${ref}"><v>${Number(value)}</v></c>`;}

(async()=>{
  // Giống file xuất Sapo hiện tại của user: có ID nhưng KHÔNG có cột tồn kho.
  // Tool phải chặn và yêu cầu xuất lại với trường Tồn kho do chính Sapo tạo.
  const headers=['Tên sản phẩm*','Mã SKU','Thuộc tính 1','Giá trị thuộc tính 1','Giá','Id sản phẩm','Id phiên bản'];
  const row1=headers.map((v,i)=>inlineCell(`${xlsx.indexToCol(i)}1`,v)).join('');
  const row2=[inlineCell('A2','ĐT Mexico 2026 HD - Rêu'),inlineCell('B2','Mexico xanh 26 HD-S'),inlineCell('C2','Size'),inlineCell('D2','S'),numCell('E2',123000),numCell('F2',100),numCell('G2',200)].join('');
  const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:G2"/><sheetData><row r="1">${row1}</row><row r="2">${row2}</row></sheetData></worksheet>`;
  const files=new Map([['xl/worksheets/sheet1.xml',new TextEncoder().encode(xml)]]);
  const input=xlsx.zipStore(files);

  const parsed=await xlsx.parseSapoExport(input);
  assert.strictEqual(direct.resolveInventoryHeader(parsed.headerMap),'');
  await assert.rejects(
    ()=>direct.updateExportWorkbook(xlsx,input,parsed,{'200':6}),
    /Tùy chọn trường hiển thị/
  );

  console.log('DIRECT EXPORT STOCK PASS',{missingStockColumnBlocked:true});
})().catch((error)=>{console.error(error);process.exit(1);});
