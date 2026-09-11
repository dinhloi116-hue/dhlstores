const assert=require('assert');
const xlsx=require('./xlsx-lite.js');
const direct=require('./direct-stock-core.js');

function inlineCell(ref,value){
  const text=String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
}
function numCell(ref,value){return `<c r="${ref}"><v>${Number(value)}</v></c>`;}
function workbookFromXml(xml){
  return xlsx.zipStore(new Map([['xl/worksheets/sheet1.xml',new TextEncoder().encode(xml)]]));
}

(async()=>{
  // Case 1: file already has inventory column -> update in place.
  const headers=['Tên sản phẩm*','Mã SKU','Id sản phẩm','Id phiên bản','Thuộc tính 1','Giá trị thuộc tính 1','Cửa hàng chính_Tồn kho','Giá'];
  const row1=headers.map((v,i)=>inlineCell(`${xlsx.indexToCol(i)}1`,v)).join('');
  const row2=[inlineCell('A2','ĐT Mexico 2026 HD - Rêu'),inlineCell('B2','Mexico xanh 26 HD-S'),numCell('C2',100),numCell('D2',200),inlineCell('E2','Size'),inlineCell('F2','S'),numCell('G2',99),numCell('H2',123000)].join('');
  const row3=[inlineCell('B3','Mexico xanh 26 HD-M'),numCell('C3',100),numCell('D3',201),inlineCell('F3','M'),numCell('G3',88),numCell('H3',123000)].join('');
  const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:H3"/><sheetData><row r="1">${row1}</row><row r="2">${row2}</row><row r="3">${row3}</row></sheetData></worksheet>`;
  const input=workbookFromXml(xml);
  const parsed=await xlsx.parseSapoExport(input);
  assert.strictEqual(parsed.variants.length,2);

  const out=await direct.updateExportWorkbook(xlsx,input,parsed,{'200':7,'201':0});
  assert.strictEqual(out.rows,2);
  assert.strictEqual(out.zeroCount,1);
  assert.strictEqual(out.inventoryHeader,'Cửa hàng chính_Tồn kho');
  assert.strictEqual(out.addedInventoryColumn,false);

  const check=await xlsx.readFirstSheet(out.bytes);
  assert.strictEqual(check.rows[1][6],7,'Mexico S phải thành 7');
  assert.strictEqual(check.rows[2][6],0,'Mexico M phải thành 0');
  assert.strictEqual(check.rows[1][1],'Mexico xanh 26 HD-S','SKU phải giữ nguyên');
  assert.strictEqual(check.rows[1][7],123000,'Giá phải giữ nguyên');
  assert.strictEqual(check.rows[1][3],200,'Id phiên bản phải giữ nguyên');

  const partial=await direct.updateExportWorkbook(xlsx,input,parsed,{'200':5});
  const checkPartial=await xlsx.readFirstSheet(partial.bytes);
  assert.strictEqual(checkPartial.rows[1][6],5);
  assert.strictEqual(checkPartial.rows[2][6],88,'Biến thể chưa ghép phải giữ tồn cũ, không tự ghi 0');

  // Case 2: real Sapo product export has NO inventory column and ends with Id phiên bản.
  // Stock must be inserted BEFORE Id phiên bản, because Sapo can ignore columns after Id phiên bản.
  const headers2=['Tên sản phẩm*','Mã SKU','Id sản phẩm','Giá','Id phiên bản'];
  const h2=headers2.map((v,i)=>inlineCell(`${xlsx.indexToCol(i)}1`,v)).join('');
  const r2=[inlineCell('A2','ĐT Mexico 2026 HD - Rêu'),inlineCell('B2','Mexico xanh 26 HD-S'),numCell('C2',100),numCell('D2',123000),numCell('E2',200)].join('');
  const r3=[inlineCell('B3','Mexico xanh 26 HD-M'),numCell('C3',100),numCell('D3',123000),numCell('E3',201)].join('');
  const xml2=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:E3"/><sheetData><row r="1">${h2}</row><row r="2">${r2}</row><row r="3">${r3}</row></sheetData></worksheet>`;
  const input2=workbookFromXml(xml2);
  const parsed2=await xlsx.parseSapoExport(input2);
  const out2=await direct.updateExportWorkbook(xlsx,input2,parsed2,{'200':6,'201':18});
  assert.strictEqual(out2.addedInventoryColumn,true);
  assert.strictEqual(out2.insertedBeforeVariantId,true);

  const check2=await xlsx.readFirstSheet(out2.bytes);
  const hm=xlsx.headerMap(check2.rows[0]);
  assert.ok(hm['Cửa hàng chính_Tồn kho']<hm['Id phiên bản'],'Tồn kho phải nằm trước Id phiên bản');
  assert.strictEqual(check2.rows[1][hm['Cửa hàng chính_Tồn kho']],6);
  assert.strictEqual(check2.rows[2][hm['Cửa hàng chính_Tồn kho']],18);
  assert.strictEqual(check2.rows[1][hm['Id phiên bản']],200,'Id phiên bản phải được dịch sang phải nhưng giữ nguyên giá trị');
  assert.strictEqual(check2.rows[1][3],123000,'Giá phải giữ nguyên');

  console.log('DIRECT STOCK PASS',{changed:out.rows,zero:out.zeroCount,partialKeepsOld:true,stockBeforeVariantId:true});
})().catch((error)=>{console.error(error);process.exit(1);});
