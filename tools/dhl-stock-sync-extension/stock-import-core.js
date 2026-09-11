(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLStockImportCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DEFAULT_BRANCH='Cửa hàng chính';
  const SAPO_HEADERS=[
    'Đường dẫn/Alias','Tên sản phẩm*','Mô tả sản phẩm','Nhãn hiệu','Loại sản phẩm',
    'Nhóm ngành nghề tính thuế GTGT, TNCN','Tags','Yêu cầu vận chuyển','Hiển thị*',
    'Thuộc tính 1','Giá trị thuộc tính 1','Thuộc tính 2','Giá trị thuộc tính 2','Thuộc tính 3','Giá trị thuộc tính 3',
    'Áp dụng thuế','Mã SKU','Barcode','Đơn vị tính','Ảnh đại diện','Chú thích ảnh',
    'Thẻ tiêu đề(SEO Title)','Thẻ mô tả(SEO Description)','Mô tả ngắn','Quản lý kho','Quản lý lô - HSD',
    'Số ngày cảnh báo trước hết hạn','Khối lượng','Đơn vị khối lượng','Ảnh phiên bản',
    'Cho phép tiếp tục mua khi hết hàng','Giá','Giá so sánh','Giá vốn','Cửa hàng chính_Tồn kho','Id phiên bản'
  ];

  function xmlEscape(value){
    return String(value==null?'':value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  }

  function cellXml(xlsx,colIndex,rowIndex,value){
    const ref=`${xlsx.indexToCol(colIndex)}${rowIndex}`;
    if(value==null||value==='')return'';
    if(typeof value==='number'&&Number.isFinite(value))return`<c r="${ref}"><v>${value}</v></c>`;
    if(typeof value==='boolean')return`<c r="${ref}" t="b"><v>${value?1:0}</v></c>`;
    const text=String(value);
    const preserve=/^\s|\s$|\n/.test(text)?' xml:space="preserve"':'';
    return`<c r="${ref}" t="inlineStr"><is><t${preserve}>${xmlEscape(text)}</t></is></c>`;
  }

  function makeXlsx(xlsx,headers,dataRows,sheetName='Mẫu file nhập'){
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

    return xlsx.zipStore(new Map([
      ['[Content_Types].xml',contentTypes],['_rels/.rels',rootRels],['xl/workbook.xml',workbook],
      ['xl/_rels/workbook.xml.rels',workbookRels],['xl/worksheets/sheet1.xml',sheetXml],['xl/styles.xml',styles]
    ]));
  }

  function nonBlank(value){return value!==undefined&&value!==null&&value!=='';}

  function buildInventoryWorkbook(xlsx,sapoExport,inventoryByVariantId,branchName=DEFAULT_BRANCH){
    if(!xlsx||typeof xlsx.zipStore!=='function')throw new Error('Thiếu bộ tạo Excel');
    if(!sapoExport)throw new Error('Chưa có dữ liệu file xuất Sapo');

    const branch=String(branchName||DEFAULT_BRANCH).trim()||DEFAULT_BRANCH;
    if(branch!==DEFAULT_BRANCH)throw new Error('Bản này đang theo đúng mẫu Sapo của shop: Cửa hàng chính_Tồn kho');
    const stockHeader='Cửa hàng chính_Tồn kho';
    const exportH=sapoExport.headerMap||{};
    const rows=[];
    let zeroCount=0;

    const productBase=new Map();
    for(const p of sapoExport.products||[]){
      const first=(p.variants||[])[0];
      if(first)productBase.set(String(p.productId),first.raw||[]);
    }

    for(const variant of sapoExport.variants||[]){
      const key=String(variant.variantId);
      if(!Object.prototype.hasOwnProperty.call(inventoryByVariantId||{},key))continue;
      const stock=Number(inventoryByVariantId[key]);
      if(!Number.isFinite(stock)||stock<0)throw new Error(`Tồn kho không hợp lệ cho Id phiên bản ${key}`);

      const base=productBase.get(String(variant.productId))||[];
      const out=SAPO_HEADERS.map((header)=>{
        if(header===stockHeader)return stock;
        if(header==='Id phiên bản')return variant.variantId;
        if(header==='Tên sản phẩm*')return variant.name||'';
        const ci=exportH[header];
        if(ci==null)return'';
        const rowValue=(variant.raw||[])[ci];
        if(nonBlank(rowValue))return rowValue;
        const baseValue=base[ci];
        return nonBlank(baseValue)?baseValue:'';
      });
      rows.push(out);
      if(stock===0)zeroCount++;
    }

    if(!rows.length)throw new Error('Không có biến thể nào đủ điều kiện tạo file nhập tồn kho');
    return{
      bytes:makeXlsx(xlsx,SAPO_HEADERS,rows,'Mẫu file nhập'),
      rows:rows.length,
      zeroCount,
      stockHeader,
      headers:SAPO_HEADERS.slice()
    };
  }

  return{DEFAULT_BRANCH,SAPO_HEADERS,makeXlsx,buildInventoryWorkbook};
});
