(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.DHLXlsxLite=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const td=typeof TextDecoder!=='undefined'?new TextDecoder('utf-8'):null;
  const te=typeof TextEncoder!=='undefined'?new TextEncoder():null;
  function decode(bytes){if(td)return td.decode(bytes);return Buffer.from(bytes).toString('utf8');}
  function encode(text){if(te)return te.encode(String(text));return new Uint8Array(Buffer.from(String(text),'utf8'));}
  function u16(v,o){return v.getUint16(o,true)}
  function u32(v,o){return v.getUint32(o,true)}
  function put16(v,o,n){v.setUint16(o,n,true)}
  function put32(v,o,n){v.setUint32(o,n>>>0,true)}

  async function inflateRaw(bytes){
    if(typeof DecompressionStream!=='undefined'){
      const ds=new DecompressionStream('deflate-raw');
      const ab=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
      return new Uint8Array(ab);
    }
    if(typeof require==='function'){
      const zlib=require('zlib');
      return new Uint8Array(zlib.inflateRawSync(Buffer.from(bytes)));
    }
    throw new Error('Trình duyệt không hỗ trợ giải nén ZIP');
  }

  async function unzip(input){
    const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    let eocd=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
      if(u32(view,i)===0x06054b50){eocd=i;break;}
    }
    if(eocd<0)throw new Error('File Excel/ZIP không hợp lệ');
    const count=u16(view,eocd+10);
    let pos=u32(view,eocd+16);
    const files=new Map();
    for(let n=0;n<count;n++){
      if(u32(view,pos)!==0x02014b50)throw new Error('ZIP central directory lỗi');
      const method=u16(view,pos+10),compressedSize=u32(view,pos+20),nameLen=u16(view,pos+28),extraLen=u16(view,pos+30),commentLen=u16(view,pos+32),localOffset=u32(view,pos+42);
      const name=decode(bytes.slice(pos+46,pos+46+nameLen));
      if(u32(view,localOffset)!==0x04034b50)throw new Error(`ZIP local header lỗi: ${name}`);
      const localNameLen=u16(view,localOffset+26),localExtraLen=u16(view,localOffset+28),dataStart=localOffset+30+localNameLen+localExtraLen;
      const compressed=bytes.slice(dataStart,dataStart+compressedSize);
      let raw;
      if(method===0)raw=compressed;
      else if(method===8)raw=await inflateRaw(compressed);
      else throw new Error(`ZIP compression chưa hỗ trợ (${method}): ${name}`);
      files.set(name,raw);
      pos+=46+nameLen+extraLen+commentLen;
    }
    return files;
  }

  let CRC_TABLE=null;
  function crc32(bytes){
    if(!CRC_TABLE){
      CRC_TABLE=new Uint32Array(256);
      for(let n=0;n<256;n++){
        let c=n;
        for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
        CRC_TABLE[n]=c>>>0;
      }
    }
    let c=0xffffffff;
    for(const b of bytes)c=CRC_TABLE[(c^b)&255]^(c>>>8);
    return(c^0xffffffff)>>>0;
  }

  function concat(chunks){
    const total=chunks.reduce((n,x)=>n+x.length,0),out=new Uint8Array(total);
    let o=0;
    for(const x of chunks){out.set(x,o);o+=x.length;}
    return out;
  }

  function zipStore(files){
    const locals=[],centrals=[];
    let offset=0;
    for(const [name,rawInput] of files.entries()){
      const nameBytes=encode(name),raw=rawInput instanceof Uint8Array?rawInput:encode(rawInput),crc=crc32(raw),local=new Uint8Array(30),lv=new DataView(local.buffer);
      put32(lv,0,0x04034b50);put16(lv,4,20);put16(lv,6,0);put16(lv,8,0);put16(lv,10,0);put16(lv,12,0);put32(lv,14,crc);put32(lv,18,raw.length);put32(lv,22,raw.length);put16(lv,26,nameBytes.length);put16(lv,28,0);
      locals.push(local,nameBytes,raw);
      const central=new Uint8Array(46),cv=new DataView(central.buffer);
      put32(cv,0,0x02014b50);put16(cv,4,20);put16(cv,6,20);put16(cv,8,0);put16(cv,10,0);put16(cv,12,0);put16(cv,14,0);put32(cv,16,crc);put32(cv,20,raw.length);put32(cv,24,raw.length);put16(cv,28,nameBytes.length);put16(cv,30,0);put16(cv,32,0);put16(cv,34,0);put16(cv,36,0);put32(cv,38,0);put32(cv,42,offset);
      centrals.push(central,nameBytes);
      offset+=local.length+nameBytes.length+raw.length;
    }
    const centralBytes=concat(centrals),localBytes=concat(locals),eocd=new Uint8Array(22),ev=new DataView(eocd.buffer);
    put32(ev,0,0x06054b50);put16(ev,4,0);put16(ev,6,0);put16(ev,8,files.size);put16(ev,10,files.size);put32(ev,12,centralBytes.length);put32(ev,16,localBytes.length);put16(ev,20,0);
    return concat([localBytes,centralBytes,eocd]);
  }

  function xmlEscape(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
  function xmlUnescape(value){return String(value||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');}
  function parseSharedStrings(xml){
    if(!xml)return[];
    const items=[];let m;
    const re=/<(?:[A-Za-z_][\w.-]*:)?si\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?si>/g;
    while((m=re.exec(xml))){
      let text='',t;
      const tre=/<(?:[A-Za-z_][\w.-]*:)?t\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?t>/g;
      while((t=tre.exec(m[1])))text+=xmlUnescape(t[1]);
      items.push(text);
    }
    return items;
  }

  function colToIndex(col){let n=0;for(const ch of col)n=n*26+ch.charCodeAt(0)-64;return n-1;}
  function indexToCol(index){let n=index+1,out='';while(n){const r=(n-1)%26;out=String.fromCharCode(65+r)+out;n=Math.floor((n-1)/26);}return out;}

  function parseSheet(xml,shared){
    const rows=[];let rm;
    const rowRe=/<(?:[A-Za-z_][\w.-]*:)?row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?row>/g;
    while((rm=rowRe.exec(xml))){
      const rowIndex=Number(rm[1]),values=[];let cm;
      const cellRe=/<(?:[A-Za-z_][\w.-]*:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?c>)/g;
      while((cm=cellRe.exec(rm[2]))){
        const attrs=cm[1],inner=cm[2]||'',refMatch=attrs.match(/\br="([A-Z]+)\d+"/);
        if(!refMatch)continue;
        const ci=colToIndex(refMatch[1]),type=(attrs.match(/\bt="([^"]+)"/)||[])[1]||'';
        let value='';
        if(type==='inlineStr'){
          value=[...inner.matchAll(/<(?:[A-Za-z_][\w.-]*:)?t\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?t>/g)].map(x=>xmlUnescape(x[1])).join('');
        }else{
          const vm=inner.match(/<(?:[A-Za-z_][\w.-]*:)?v\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?v>/);
          if(vm){
            if(type==='s')value=shared[Number(vm[1])]??'';
            else if(type==='b')value=vm[1]==='1';
            else{const raw=xmlUnescape(vm[1]),num=Number(raw);value=raw!==''&&Number.isFinite(num)?num:raw;}
          }
        }
        values[ci]=value;
      }
      rows[rowIndex-1]=values;
    }
    return rows;
  }

  async function readFirstSheet(buffer){
    const files=await unzip(buffer);
    const shared=files.has('xl/sharedStrings.xml')?parseSharedStrings(decode(files.get('xl/sharedStrings.xml'))):[];
    const sheetPath=files.has('xl/worksheets/sheet1.xml')?'xl/worksheets/sheet1.xml':[...files.keys()].find(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k));
    if(!sheetPath)throw new Error('Không tìm thấy sheet Excel');
    const xml=decode(files.get(sheetPath)),rows=parseSheet(xml,shared);
    return{files,sheetPath,xml,rows};
  }

  function headerMap(row){
    const map=Object.create(null);
    (row||[]).forEach((v,i)=>{if(v!=null&&String(v).trim())map[String(v).trim()]=i;});
    return map;
  }

  function plainLabel(value){
    return String(value||'').toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');
  }

  function normalizeSize(value){
    const p=String(value||'').trim().toUpperCase().replace(/\s+/g,'');
    return ({'2XL':'XXL','3XL':'XXXL','4XL':'XXXXL','5XL':'XXXXXL'})[p]||p;
  }

  function sizeFromSku(sku){
    const m=String(sku||'').trim().match(/-(S|M|L|XL|XXL|XXXL|XXXXL|XXXXXL|2XL|3XL|4XL|5XL)$/i);
    return m?normalizeSize(m[1]):'';
  }

  function skuBase(sku){
    return String(sku||'').trim().replace(/-(S|M|L|XL|XXL|XXXL|XXXXL|XXXXXL|2XL|3XL|4XL|5XL)$/i,'').trim();
  }

  function detectSizeDimension(row,h){
    for(let i=1;i<=3;i++){
      const labelCol=h[`Thuộc tính ${i}`],valueCol=h[`Giá trị thuộc tính ${i}`];
      if(labelCol==null||valueCol==null)continue;
      const label=plainLabel(row[labelCol]);
      if(label==='size'||label==='kichco'||label==='co'){
        return{index:i,label:String(row[labelCol]||'').trim(),valueHeader:`Giá trị thuộc tính ${i}`,valueCol};
      }
    }
    return null;
  }

  function inferSizeFromRow(row,h){
    for(let i=1;i<=3;i++){
      const valueCol=h[`Giá trị thuộc tính ${i}`];
      if(valueCol==null)continue;
      const value=normalizeSize(row[valueCol]);
      if(/^(S|M|L|XL|XXL|XXXL|XXXXL|XXXXXL)$/.test(value))return{index:i,label:'(tự nhận)',valueHeader:`Giá trị thuộc tính ${i}`,valueCol};
    }
    return null;
  }

  async function parseSapoExport(buffer){
    const book=await readFirstSheet(buffer),rows=book.rows||[];
    if(!rows.length)throw new Error('File xuất Sapo không có dữ liệu');
    const h=headerMap(rows[0]);
    for(const required of ['Tên sản phẩm*','Mã SKU','Id sản phẩm','Id phiên bản'])if(h[required]==null)throw new Error(`File xuất thiếu cột: ${required}`);

    let currentName='',currentProductId='',currentSizeDimension=null;
    const productsById=new Map(),variants=[],issues=[];
    let resolvedSizes=0;

    for(let ri=1;ri<rows.length;ri++){
      const row=rows[ri]||[];
      if(row[h['Tên sản phẩm*']])currentName=String(row[h['Tên sản phẩm*']]).trim();
      const productId=row[h['Id sản phẩm']],variantId=row[h['Id phiên bản']];
      if(productId==null||productId==='')continue;
      const pid=Number(productId);
      if(String(pid)!==currentProductId){
        currentProductId=String(pid);
        currentSizeDimension=detectSizeDimension(row,h)||inferSizeFromRow(row,h);
      }else if(!currentSizeDimension){
        currentSizeDimension=detectSizeDimension(row,h)||inferSizeFromRow(row,h);
      }
      if(variantId==null||variantId==='')continue;

      const sku=String(row[h['Mã SKU']]||'').trim();
      const attrSize=currentSizeDimension?normalizeSize(row[currentSizeDimension.valueCol]):'';
      const skuSize=sizeFromSku(sku);
      const size=attrSize||skuSize;
      if(size)resolvedSizes++;
      if(attrSize&&skuSize&&attrSize!==skuSize){
        issues.push({type:'size-mismatch',row:ri+1,productId:pid,variantId:Number(variantId),sku,attributeSize:attrSize,skuSize});
      }
      if(!size){
        issues.push({type:'size-missing',row:ri+1,productId:pid,variantId:Number(variantId),sku});
      }

      const record={
        rowIndex:ri+1,
        productId:pid,
        variantId:Number(variantId),
        name:currentName,
        sku,
        skuBase:skuBase(sku),
        size,
        sizeFromAttribute:attrSize,
        sizeFromSku:skuSize,
        sizeAttribute:currentSizeDimension?currentSizeDimension.label:'',
        raw:row
      };
      variants.push(record);

      if(!productsById.has(record.productId)){
        productsById.set(record.productId,{productId:record.productId,name:record.name,variants:[],skuBase:'',sizeAttribute:record.sizeAttribute});
      }
      const p=productsById.get(record.productId);
      if(record.name)p.name=record.name;
      if(record.sizeAttribute)p.sizeAttribute=record.sizeAttribute;
      p.variants.push(record);
    }

    const products=[...productsById.values()];
    for(const p of products){
      const bases=[...new Set(p.variants.map(v=>v.skuBase).filter(Boolean))];
      p.skuBase=bases.length===1?bases[0]:'';
      p.sizeSet=[...new Set(p.variants.map(v=>v.size).filter(Boolean))];
      if(bases.length>1)issues.push({type:'sku-base-multiple',productId:p.productId,bases});
    }

    return{
      headers:rows[0],headerMap:h,rows,products,variants,issues,
      sizeResolved:resolvedSizes,
      sizeTotal:variants.length
    };
  }

  function cellXml(colIndex,rowIndex,value){
    const ref=`${indexToCol(colIndex)}${rowIndex}`;
    if(value==null||value==='')return'';
    if(typeof value==='number'&&Number.isFinite(value))return`<c r="${ref}"><v>${value}</v></c>`;
    if(typeof value==='boolean')return`<c r="${ref}" t="b"><v>${value?1:0}</v></c>`;
    const text=String(value),preserve=/^\s|\s$|\n/.test(text)?' xml:space="preserve"':'';
    return`<c r="${ref}" t="inlineStr"><is><t${preserve}>${xmlEscape(text)}</t></is></c>`;
  }

  async function buildSapoImport(templateBuffer,sapoExport,inventoryByVariantId){
    const book=await readFirstSheet(templateBuffer),templateRows=book.rows||[],th=headerMap(templateRows[0]||[]),invHeader=Object.keys(th).find(k=>/_Tồn kho$/i.test(k)||/Tồn kho/i.test(k));
    if(!invHeader)throw new Error('Mẫu nhập Sapo không có cột Tồn kho');
    if(th['Id phiên bản']==null)throw new Error('Mẫu nhập Sapo thiếu cột Id phiên bản');
    const exportH=sapoExport.headerMap,templateHeaders=templateRows[0],productFirst=new Set(),dataRows=[];
    for(const variant of sapoExport.variants){
      if(!Object.prototype.hasOwnProperty.call(inventoryByVariantId,String(variant.variantId)))continue;
      const out=new Array(templateHeaders.length).fill('');
      for(let ci=0;ci<templateHeaders.length;ci++){
        const header=templateHeaders[ci];
        if(header&&exportH[header]!=null)out[ci]=variant.raw[exportH[header]]??'';
      }
      if(!productFirst.has(variant.productId)){
        productFirst.add(variant.productId);
        if(th['Tên sản phẩm*']!=null&&!out[th['Tên sản phẩm*']])out[th['Tên sản phẩm*']]=variant.name;
        if(th['Hiển thị*']!=null&&!out[th['Hiển thị*']])out[th['Hiển thị*']]='Có';
      }else if(th['Tên sản phẩm*']!=null)out[th['Tên sản phẩm*']]='';
      out[th[invHeader]]=Number(inventoryByVariantId[String(variant.variantId)]);
      out[th['Id phiên bản']]=variant.variantId;
      dataRows.push(out);
    }
    if(!dataRows.length)throw new Error('Không có biến thể nào đủ điều kiện tạo file nhập');
    const original=book.xml,sheetDataMatch=original.match(/<sheetData\b[^>]*>[\s\S]*?<\/sheetData>/);
    if(!sheetDataMatch)throw new Error('Mẫu nhập Sapo có cấu trúc sheet không hỗ trợ');
    const row1Match=sheetDataMatch[0].match(/<row\b[^>]*r="1"[^>]*>[\s\S]*?<\/row>/);
    if(!row1Match)throw new Error('Mẫu nhập Sapo thiếu hàng tiêu đề');
    const generated=dataRows.map((row,i)=>{
      const ri=i+2,cells=row.map((v,ci)=>cellXml(ci,ri,v)).join('');
      return`<row r="${ri}">${cells}</row>`;
    }).join('');
    let newXml=original.replace(sheetDataMatch[0],`<sheetData>${row1Match[0]}${generated}</sheetData>`),lastCol=indexToCol((templateHeaders.length||1)-1);
    newXml=newXml.replace(/<dimension\b[^>]*ref="[^"]+"\s*\/>/,`<dimension ref="A1:${lastCol}${dataRows.length+1}"/>`);
    book.files.set(book.sheetPath,encode(newXml));
    return{bytes:zipStore(book.files),rows:dataRows.length,inventoryHeader:invHeader};
  }

  return{
    unzip,zipStore,parseSharedStrings,parseSheet,readFirstSheet,parseSapoExport,buildSapoImport,headerMap,colToIndex,indexToCol,
    normalizeSize,sizeFromSku,skuBase,detectSizeDimension
  };
});
