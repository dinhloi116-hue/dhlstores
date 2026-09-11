const assert=require('assert');
const xlsx=require('./xlsx-lite.js');
globalThis.DHLXlsxLite=xlsx;
const warehouse=require('./warehouse-core.js');

function inlineCell(ref,value){
  const text=String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
}
function numCell(ref,value){return `<c r="${ref}"><v>${Number(value)}</v></c>`;}

(async()=>{
  const title=`<row r="1">${inlineCell('A1','Quản lý kho phiên bản sản phẩm')}</row>`;
  const branch=`<row r="2">${inlineCell('E2','dhl sport')}</row>`;
  const headers=['STT','Sản phẩm','Giá bán','Giá vốn','Tồn kho','Có thể bán','Đang giao dịch','Đang về kho','Đang đóng gói','Không thể bán'];
  const h=`<row r="3">${headers.map((v,i)=>inlineCell(`${xlsx.indexToCol(i)}3`,v)).join('')}</row>`;
  const r4=`<row r="4">${numCell('A4',1)}${inlineCell('B4','ĐT Mexico 2026 HD - Rêu Không in / S')}${numCell('E4',99)}${numCell('F4',99)}</row>`;
  const r5=`<row r="5">${numCell('A5',2)}${inlineCell('B5','ĐT Mexico 2026 HD - Rêu Không in / M')}${numCell('E5',88)}${numCell('F5',88)}</row>`;
  const r6=`<row r="6">${numCell('A6',3)}${inlineCell('B6','Bộ Trẻ Em Không in tên số / Size 9: 30–34kg')}${numCell('E6',5)}</row>`;
  const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:J6"/><sheetData>${title}${branch}${h}${r4}${r5}${r6}</sheetData></worksheet>`;
  const input=xlsx.zipStore(new Map([['xl/worksheets/sheet1.xml',new TextEncoder().encode(xml)]]));

  const parsed=await warehouse.parseWarehouseExport(input);
  assert.strictEqual(parsed.inputType,'warehouse');
  assert.strictEqual(parsed.products.length,1);
  assert.strictEqual(parsed.variants.length,2,'Chỉ lấy size người lớn S/M/L/XL/XXL');
  assert.strictEqual(parsed.products[0].name,'ĐT Mexico 2026 HD - Rêu');
  assert.deepStrictEqual(parsed.products[0].variants.map(v=>v.size),['S','M']);
  assert.strictEqual(parsed.warehouseStockCol,4);

  const out=await warehouse.updateWarehouseWorkbook(input,parsed,{'4':7,'5':19});
  assert.strictEqual(out.rows,2);
  const check=await xlsx.readFirstSheet(out.bytes);
  assert.strictEqual(check.rows[3][4],7);
  assert.strictEqual(check.rows[4][4],19);
  assert.strictEqual(check.rows[3][5],99,'Chỉ sửa cột Tồn kho, giữ Có thể bán');
  assert.strictEqual(check.rows[5][4],5,'Dòng trẻ em giữ nguyên');

  console.log('WAREHOUSE PASS',{products:parsed.products.length,variants:parsed.variants.length,stockUpdated:true,childrenUntouched:true});
})().catch((error)=>{console.error(error);process.exit(1);});
