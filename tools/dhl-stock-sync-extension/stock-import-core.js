(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLStockImportCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const INVENTORY_HEADERS=['Tên phiên bản sản phẩm','SKU*','Mã lô','Ngày sản xuất','Hạn sử dụng','Tồn kho','Vị trí lưu kho'];
  const TEMPLATE_SIGNATURE='SAPO-INVENTORY-TEMPLATE-V2';

  function xmlEscape(value){
    return String(value==null?'':value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  }

  function cellXml(xlsx,colIndex,rowIndex,value,styleId=0){
    const ref=`${xlsx.indexToCol(colIndex)}${rowIndex}`;
    const style=styleId?` s="${styleId}"`:'';
    if(value==null||value==='')return`<c r="${ref}"${style}/>`;
    if(typeof value==='number'&&Number.isFinite(value))return`<c r="${ref}"${style}><v>${value}</v></c>`;
    const text=String(value);
    const preserve=/^\s|\s$|\n/.test(text)?' xml:space="preserve"':'';
    return`<c r="${ref}"${style} t="inlineStr"><is><t${preserve}>${xmlEscape(text)}</t></is></c>`;
  }

  function skuHeaderCell(){
    return '<c r="B4" s="3" t="inlineStr"><is>'+
      '<r><rPr><b/><sz val="11"/><color rgb="FF000000"/><rFont val="Calibri"/></rPr><t>SKU</t></r>'+
      '<r><rPr><b/><sz val="11"/><color rgb="FFFF0000"/><rFont val="Calibri"/></rPr><t>*</t></r>'+
      '</is></c>';
  }

  function makeOfficialInventoryXlsx(xlsx,dataRows,branchName){
    const branch=String(branchName||'').trim();
    if(!branch)throw new Error('Không đọc được tên chi nhánh từ file Quản lý kho Sapo');
    const lastRow=Math.max(4,dataRows.length+4);
    const rowXml=[];

    // Bố cục bám đúng file mẫu Sapo do người dùng cung cấp:
    // A1 tiêu đề; hàng 2 trống; F3 tên chi nhánh; hàng 4 là header; dữ liệu bắt đầu hàng 5.
    rowXml.push(`<row r="1" spans="1:7" ht="31.5" customHeight="1">${cellXml(xlsx,0,1,'Cập nhật tồn kho phiên bản sản phẩm',1)}</row>`);
    rowXml.push('<row r="2" spans="1:7"></row>');
    rowXml.push(`<row r="3" spans="1:7">${cellXml(xlsx,0,3,'',2)}${cellXml(xlsx,1,3,'',2)}${cellXml(xlsx,2,3,'',2)}${cellXml(xlsx,3,3,'',2)}${cellXml(xlsx,4,3,'',2)}${cellXml(xlsx,5,3,branch,11)}${cellXml(xlsx,6,3,'',12)}</row>`);
    rowXml.push(`<row r="4" spans="1:7">${cellXml(xlsx,0,4,INVENTORY_HEADERS[0],3)}${skuHeaderCell()}${cellXml(xlsx,2,4,INVENTORY_HEADERS[2],3)}${cellXml(xlsx,3,4,INVENTORY_HEADERS[3],10)}${cellXml(xlsx,4,4,INVENTORY_HEADERS[4],10)}${cellXml(xlsx,5,4,INVENTORY_HEADERS[5],3)}${cellXml(xlsx,6,4,INVENTORY_HEADERS[6],3)}</row>`);

    dataRows.forEach((row,index)=>{
      const ri=index+5;
      const values=[row.variantName||'',row.sku||'',row.lot||'',row.manufactureDate||'',row.expiryDate||'',Number(row.stock),row.storageLocation||''];
      rowXml.push(`<row r="${ri}" spans="1:7">`+
        cellXml(xlsx,0,ri,values[0],2)+
        cellXml(xlsx,1,ri,values[1],2)+
        cellXml(xlsx,2,ri,values[2],2)+
        cellXml(xlsx,3,ri,values[3],4)+
        cellXml(xlsx,4,ri,values[4],4)+
        cellXml(xlsx,5,ri,values[5],2)+
        cellXml(xlsx,6,ri,values[6],2)+
        `</row>`);
    });

    const sheetXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`+
      `<dimension ref="A1:G${lastRow}"/>`+
      `<sheetViews><sheetView tabSelected="1" workbookViewId="0"><selection activeCell="F5" sqref="F5"/></sheetView></sheetViews>`+
      `<sheetFormatPr defaultColWidth="14.42578125" defaultRowHeight="15" customHeight="1"/>`+
      `<cols>`+
      `<col min="1" max="1" width="63.5703125" customWidth="1"/>`+
      `<col min="2" max="3" width="24.5703125" customWidth="1"/>`+
      `<col min="4" max="4" width="15.7109375" customWidth="1"/>`+
      `<col min="5" max="5" width="14.28515625" customWidth="1"/>`+
      `<col min="6" max="6" width="19" customWidth="1"/>`+
      `<col min="7" max="7" width="21.42578125" customWidth="1"/>`+
      `</cols>`+
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
      `<bookViews><workbookView/></bookViews><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>`+
      `</workbook>`;
    const workbookRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>`+
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`+
      `</Relationships>`;

    // Style IDs giữ theo bố cục của file mẫu Sapo: title, border, header, date/text, branch pair.
    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`+
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`+
      `<fonts count="5">`+
      `<font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>`+
      `<font><b/><sz val="24"/><color rgb="FF000000"/><name val="Calibri"/></font>`+
      `<font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>`+
      `<font><b/><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>`+
      `<font><b/><sz val="11"/><color rgb="FFFF0000"/><name val="Calibri"/></font>`+
      `</fonts>`+
      `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>`+
      `<borders count="6">`+
      `<border><left/><right/><top/><bottom/><diagonal/></border>`+
      `<border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border>`+
      `<border><left style="thin"/><right style="thin"/><top style="thin"/><bottom/><diagonal/></border>`+
      `<border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border>`+
      `<border><left style="thin"/><right/><top style="thin"/><bottom style="thin"/><diagonal/></border>`+
      `<border><left/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border>`+
      `</borders>`+
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`+
      `<cellXfs count="13">`+
      `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`+
      `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>`+
      `<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>`+
      `<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>`+
      `<xf numFmtId="49" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>`+
      `<xf numFmtId="49" fontId="2" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>`+
      `<xf numFmtId="49" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>`+
      `<xf numFmtId="0" fontId="2" fillId="0" borderId="4" xfId="0" applyFont="1" applyBorder="1"/>`+
      `<xf numFmtId="0" fontId="2" fillId="0" borderId="5" xfId="0" applyFont="1" applyBorder="1"/>`+
      `<xf numFmtId="49" fontId="2" fillId="0" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>`+
      `<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left"/></xf>`+
      `<xf numFmtId="0" fontId="3" fillId="0" borderId="4" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>`+
      `<xf numFmtId="0" fontId="3" fillId="0" borderId="5" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>`+
      `</cellXfs>`+
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`+
      `</styleSheet>`;

    return xlsx.zipStore(new Map([
      ['[Content_Types].xml',contentTypes],['_rels/.rels',rootRels],['xl/workbook.xml',workbook],
      ['xl/_rels/workbook.xml.rels',workbookRels],['xl/worksheets/sheet1.xml',sheetXml],['xl/styles.xml',styles]
    ]));
  }

  function buildOfficialInventoryWorkbook(xlsx,rows,branchName){
    const clean=[];
    let zeroCount=0;
    for(const row of rows||[]){
      const sku=String(row&&row.sku||'').trim();
      const stock=Number(row&&row.stock);
      if(!sku)throw new Error('Thiếu SKU* ở một biến thể. Sapo bắt buộc SKU để nhập tồn kho.');
      if(!Number.isFinite(stock)||stock<0)throw new Error(`Tồn kho không hợp lệ cho SKU ${sku}`);
      clean.push({...row,sku,stock});
      if(stock===0)zeroCount++;
    }
    if(!clean.length)throw new Error('Không có biến thể nào đủ điều kiện tạo file nhập tồn kho');
    return{
      bytes:makeOfficialInventoryXlsx(xlsx,clean,branchName),
      rows:clean.length,
      zeroCount,
      branchName:String(branchName||'').trim(),
      headers:INVENTORY_HEADERS.slice(),
      templateSignature:TEMPLATE_SIGNATURE
    };
  }

  function buildInventoryWorkbook(xlsx,sapoExport,inventoryByVariantId,branchName){
    const rows=[];
    for(const variant of (sapoExport&&sapoExport.variants)||[]){
      const key=String(variant.variantId);
      if(!Object.prototype.hasOwnProperty.call(inventoryByVariantId||{},key))continue;
      if(!variant.sku)throw new Error(`Biến thể ${key} chưa có SKU`);
      rows.push({variantName:[variant.name,variant.size].filter(Boolean).join(' - '),sku:variant.sku,stock:Number(inventoryByVariantId[key])});
    }
    return buildOfficialInventoryWorkbook(xlsx,rows,branchName);
  }

  return{INVENTORY_HEADERS,TEMPLATE_SIGNATURE,makeOfficialInventoryXlsx,buildOfficialInventoryWorkbook,buildInventoryWorkbook};
});