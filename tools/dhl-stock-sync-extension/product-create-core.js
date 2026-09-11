(function(root,factory){
  const api=factory(root.DHLXlsxLite,root.DHLShopRules,root.DHLMatchCore);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLProductCreateCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(xlsx,rules,matcher){
  'use strict';

  const HEADERS=[
    'Đường dẫn/Alias','Tên sản phẩm*','Mô tả sản phẩm','Nhãn hiệu','Loại sản phẩm','Nhóm ngành nghề tính thuế GTGT, TNCN','Tags','Yêu cầu vận chuyển','Hiển thị*',
    'Thuộc tính 1','Giá trị thuộc tính 1','Thuộc tính 2','Giá trị thuộc tính 2','Thuộc tính 3','Giá trị thuộc tính 3','Áp dụng thuế','Mã SKU','Barcode','Đơn vị tính',
    'Ảnh đại diện','Chú thích ảnh','Thẻ tiêu đề(SEO Title)','Thẻ mô tả(SEO Description)','Mô tả ngắn','Quản lý kho','Quản lý lô - HSD','Số ngày cảnh báo trước hết hạn',
    'Khối lượng','Đơn vị khối lượng','Ảnh phiên bản','Cho phép tiếp tục mua khi hết hàng','Giá','Giá so sánh','Giá vốn','Cửa hàng chính_Tồn kho','Id phiên bản'
  ];

  function text(value){return String(value==null?'':value).trim();}
  function plain(value){
    return text(value).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }
  function colorKey(value){return plain(value)||'(khong mau)';}
  function normalizeSize(value){return matcher&&matcher.normalizeSize?matcher.normalizeSize(value):text(value).toUpperCase();}

  function sizeSort(values){
    const preferred=['XXS','XS','S','M','L','XL','XXL','XXXL','XXXXL','XXXXXL','FREE'];
    return [...new Set(values.map(normalizeSize).filter(Boolean))].sort((a,b)=>{
      const an=Number(a),bn=Number(b);
      if(Number.isFinite(an)&&Number.isFinite(bn))return an-bn;
      const ai=preferred.indexOf(a),bi=preferred.indexOf(b);
      if(ai>=0||bi>=0)return (ai<0?999:ai)-(bi<0?999:bi);
      return a.localeCompare(b,'vi');
    });
  }

  function groupCatalog(catalogResults){
    const groups=[];
    for(const product of catalogResults||[]){
      const byColor=new Map();
      for(const variant of product.variants||[]){
        const color=text(variant.color)||'(không màu)';
        const key=colorKey(color);
        if(!byColor.has(key))byColor.set(key,{color,variants:[]});
        byColor.get(key).variants.push(variant);
      }
      for(const entry of byColor.values()){
        const parentName=text(product.parentName);
        if(!parentName)continue;
        const standardName=entry.color&&entry.color!=='(không màu)'?`${parentName} - ${entry.color}`:parentName;
        groups.push({
          parentId:Number(product.parentId)||0,
          parentName,
          color:entry.color,
          standardName,
          sourceUrl:text(product.sourceUrl),
          imageUrl:text(product.imageUrl)||(entry.variants.find(v=>text(v.image))||{}).image||'',
          variants:entry.variants
        });
      }
    }
    return groups;
  }

  function makeRows(catalogResults){
    if(!rules)throw new Error('Thiếu bộ quy tắc SKU');
    const rows=[];
    const groups=groupCatalog(catalogResults);
    for(const group of groups){
      const bySize=new Map();
      for(const variant of group.variants||[]){
        const size=normalizeSize(variant.size);
        const stock=Number(variant.available);
        if(!size||!Number.isFinite(stock)||stock<0)continue;
        if(!bySize.has(size))bySize.set(size,{size,stock,variant});
      }
      const sizes=sizeSort([...bySize.keys()]);
      if(!sizes.length)continue;

      const alias=typeof rules.generatedAliasForStandardName==='function'?rules.generatedAliasForStandardName(group.standardName):plain(group.standardName).replace(/\s+/g,'-');
      const skuBase=rules.skuBaseForStandardName(group.standardName);
      if(!skuBase)throw new Error(`Không tạo được SKU cho ${group.standardName}`);

      sizes.forEach((size,index)=>{
        const item=bySize.get(size);
        const first=index===0;
        const row=new Array(HEADERS.length).fill('');
        row[0]=alias;
        row[1]=first?group.standardName:'';
        row[6]=first?'Nguồn aobongda.net':'';
        row[7]=first?'Có':'';
        row[8]=first?'Có':'';
        row[9]=first?'Size':'';
        row[10]=size;
        row[16]=`${skuBase}-${size}`;
        row[18]='Cái';
        row[19]=first?group.imageUrl:'';
        row[24]='Sapo';
        row[29]=group.imageUrl;
        row[30]='Không';
        row[34]=item.stock;
        rows.push({values:row,standardName:group.standardName,size,stock:item.stock,sku:row[16],imageUrl:group.imageUrl,sourceUrl:group.sourceUrl});
      });
    }
    return{groups,rows};
  }

  function xmlEscape(value){
    return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  }
  function cellXml(col,row,value,styleId=0){
    const ref=`${xlsx.indexToCol(col)}${row}`;
    const style=styleId?` s="${styleId}"`:'';
    if(value==null||value==='')return`<c r="${ref}"${style}/>`;
    if(typeof value==='number'&&Number.isFinite(value))return`<c r="${ref}"${style}><v>${value}</v></c>`;
    const str=String(value),preserve=/^\s|\s$|\n/.test(str)?' xml:space="preserve"':'';
    return`<c r="${ref}"${style} t="inlineStr"><is><t${preserve}>${xmlEscape(str)}</t></is></c>`;
  }

  function buildWorkbook(catalogResults){
    if(!xlsx||typeof xlsx.zipStore!=='function')throw new Error('Thiếu bộ tạo Excel');
    const built=makeRows(catalogResults);
    if(!built.rows.length)throw new Error('Chưa có sản phẩm/màu/size hợp lệ để tạo file Sapo');
    const matrix=[HEADERS,...built.rows.map(x=>x.values)];
    const sheetRows=matrix.map((row,ri)=>`<row r="${ri+1}">${row.map((v,ci)=>cellXml(ci,ri+1,v,ri===0?1:0)).join('')}</row>`).join('');
    const widths=[24,38,24,18,18,18,20,16,14,16,16,16,16,16,16,14,28,18,14,55,22,28,32,28,16,16,16,14,16,55,22,14,14,14,18,18];
    const cols=widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
    const lastCol=xlsx.indexToCol(HEADERS.length-1),lastRow=matrix.length;

    const files=new Map();
    files.set('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
    files.set('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    files.set('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet0" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    files.set('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    files.set('xl/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4472C4"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
    files.set('xl/worksheets/sheet1.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastCol}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${lastCol}${lastRow}"/></worksheet>`);

    return{bytes:xlsx.zipStore(files),rows:built.rows.length,products:built.groups.length,details:built.rows,headers:HEADERS.slice()};
  }

  return{HEADERS,groupCatalog,makeRows,buildWorkbook};
});
