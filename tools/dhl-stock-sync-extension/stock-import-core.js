(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLStockImportCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DEFAULT_BRANCH='Cửa hàng chính';

  function xmlEscape(value){
    return String(value==null?'':value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&apos;');
  }

  function cellXml(xlsx,colIndex,rowIndex,value){
    const ref=`${xlsx.indexToCol(colIndex)}${rowIndex}`;
    if(value==null||value==='')return'';
    if(typeof value==='number'&&Number.isFinite(value))return`<c r="${ref}"><v>${value}</v></c>`;
    const text=String(value);
    const preserve=/^\s|\s$|\n/.test(text)?' xml:space="preserve"':'';
    return`<c r="${ref}" t="inlineStr"><is><t${preserve}>${xmlEscape(text)}</t></is></c>`;
  }

  function makeXlsx(xlsx,headers,dataRows,sheetName='Tồn kho'){
    const lastCol=xlsx.indexToCol(Math.max(0,headers.length-1));
    const rowXml=[];
    rowXml.push(`<row r="1">${headers.map((v,i)=>cellXml(xlsx,i,1,v)).join('')}</row>`);
    dataRows.forEach((row,index)=>{
      const ri=index+2;
      rowXml.push(`<row r="${ri}">${row.map((v,i)=>cellXml(xlsx,i,ri,v)).join('')}</row>`);
    });

    const sheetXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`+
      `<dimension ref="A1:${lastCol}${dataRows.length+1}"/>`+
      `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`+
      `<sheetFormatPr defaultRowHeight="15"/>`+
      `<sheetData>${rowXml.join('')}</sheetData>`+
      `</worksheet>`;

    const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`+
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`+
      `<Default Extension="xml" ContentType="application/xml"/>`+
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`+
      `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`+
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`+
      `</Types>`;

    const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`+
      `</Relationships>`;

    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`+
      `<sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets>`+
      `</workbook>`;

    const workbookRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>`+
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`+
      `</Relationships>`;

    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`+
      `<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>`+
      `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>`+
      `<borders count="1"><border/></borders>`+
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`+
      `<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>`+
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`+
      `</styleSheet>`;

    const files=new Map([
      ['[Content_Types].xml',contentTypes],
      ['_rels/.rels',rootRels],
      ['xl/workbook.xml',workbook],
      ['xl/_rels/workbook.xml.rels',workbookRels],
      ['xl/worksheets/sheet1.xml',sheetXml],
      ['xl/styles.xml',styles]
    ]);
    return xlsx.zipStore(files);
  }

  function buildInventoryWorkbook(xlsx,sapoExport,inventoryByVariantId,branchName=DEFAULT_BRANCH){
    if(!xlsx||typeof xlsx.zipStore!=='function')throw new Error('Thiếu bộ tạo Excel');
    if(!sapoExport)throw new Error('Chưa có dữ liệu file xuất Sapo');
    const branch=String(branchName||DEFAULT_BRANCH).trim()||DEFAULT_BRANCH;
    const stockHeader=`${branch}_Tồn kho`;
    const headers=['Tên phiên bản sản phẩm','SKU*',stockHeader];
    const rows=[];
    const seenSku=new Set();
    let zeroCount=0;

    for(const variant of sapoExport.variants||[]){
      const key=String(variant.variantId);
      if(!Object.prototype.hasOwnProperty.call(inventoryByVariantId||{},key))continue;
      const sku=String(variant.sku||'').trim();
      if(!sku)throw new Error(`Biến thể ${key} chưa có SKU. File nhập tồn kho Sapo bắt buộc có SKU.`);
      if(seenSku.has(sku))throw new Error(`SKU bị trùng trong các dòng cập nhật: ${sku}`);
      seenSku.add(sku);
      const stock=Number(inventoryByVariantId[key]);
      if(!Number.isFinite(stock)||stock<0)throw new Error(`Tồn kho không hợp lệ cho SKU ${sku}`);
      const label=[variant.name,variant.size].filter(Boolean).join(' - ');
      rows.push([label,sku,stock]);
      if(stock===0)zeroCount++;
    }

    if(!rows.length)throw new Error('Không có biến thể nào đủ điều kiện tạo file nhập tồn kho');
    return{
      bytes:makeXlsx(xlsx,headers,rows,'Tồn kho'),
      rows:rows.length,
      zeroCount,
      stockHeader,
      branchName:branch
    };
  }

  return{DEFAULT_BRANCH,makeXlsx,buildInventoryWorkbook};
});
