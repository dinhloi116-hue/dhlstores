(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLDirectStockCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DEFAULT_INVENTORY_HEADER='Cửa hàng chính_Tồn kho';

  function resolveInventoryHeader(headerMap){
    const keys=Object.keys(headerMap||{});
    return keys.find((key)=>/_Tồn kho$/i.test(key))||keys.find((key)=>/Tồn kho/i.test(key))||'';
  }

  function xmlEscape(value){
    return String(value==null?'':value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&apos;');
  }

  function setCell(xml,rowNumber,col,cellXml){
    const rowRe=new RegExp(`(<(?:[A-Za-z_][\\w.-]*:)?row\\b[^>]*\\br="${rowNumber}"[^>]*>)([\\s\\S]*?)(<\\/(?:[A-Za-z_][\\w.-]*:)?row>)`);
    let changed=false;
    const next=String(xml||'').replace(rowRe,(whole,open,body,close)=>{
      const ref=`${col}${rowNumber}`;
      const cellRe=new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?c\\b[^>]*\\br="${ref}"[^>]*(?:\\/>|>[\\s\\S]*?<\\/(?:[A-Za-z_][\\w.-]*:)?c>)`);
      changed=true;
      return cellRe.test(body)?`${open}${body.replace(cellRe,cellXml)}${close}`:`${open}${body}${cellXml}${close}`;
    });
    return{xml:next,changed};
  }

  function setNumericCell(xml,rowNumber,col,value){
    const ref=`${col}${rowNumber}`;
    return setCell(xml,rowNumber,col,`<c r="${ref}"><v>${Number(value)}</v></c>`);
  }

  function setTextCell(xml,rowNumber,col,value){
    const ref=`${col}${rowNumber}`;
    const text=String(value==null?'':value);
    const preserve=/^\s|\s$|\n/.test(text)?' xml:space="preserve"':'';
    return setCell(xml,rowNumber,col,`<c r="${ref}" t="inlineStr"><is><t${preserve}>${xmlEscape(text)}</t></is></c>`);
  }

  function extendDimension(xml,lastCol){
    return String(xml||'').replace(/(<(?:[A-Za-z_][\w.-]*:)?dimension\b[^>]*\bref=")([A-Z]+)(\d+):([A-Z]+)(\d+)("[^>]*\/>)/,(whole,open,startCol,startRow,endCol,endRow,close)=>{
      return `${open}${startCol}${startRow}:${lastCol}${endRow}${close}`;
    });
  }

  function shiftCellRefsRight(xlsx,xml,startColIndex){
    // Sapo's official import layout places *_Tồn kho BEFORE "Id phiên bản".
    // Product export usually ends at Id phiên bản. Shift that column (and any later
    // cells) one place to the right, then insert the stock column in the freed slot.
    return String(xml||'').replace(/(<(?:[A-Za-z_][\w.-]*:)?c\b[^>]*\br=")([A-Z]+)(\d+)(")/g,(whole,prefix,col,row,suffix)=>{
      const index=xlsx.colToIndex(col);
      if(index<startColIndex)return whole;
      return `${prefix}${xlsx.indexToCol(index+1)}${row}${suffix}`;
    });
  }

  async function updateExportWorkbook(xlsx,exportBuffer,sapoData,inventoryByVariantId){
    if(!xlsx||typeof xlsx.readFirstSheet!=='function')throw new Error('Thiếu bộ đọc Excel');
    if(!sapoData)throw new Error('Chưa đọc file xuất Sapo');
    const map=sapoData.headerMap||xlsx.headerMap((sapoData.rows||[])[0]||[]);
    if(map['Id phiên bản']==null)throw new Error('File xuất Sapo thiếu cột Id phiên bản');

    const book=await xlsx.readFirstSheet(exportBuffer);
    let xml=book.xml;
    let inventoryHeader=resolveInventoryHeader(map);
    let inventoryColIndex;
    let addedInventoryColumn=false;
    let insertedBeforeVariantId=false;

    if(inventoryHeader){
      inventoryColIndex=Number(map[inventoryHeader]);
    }else{
      inventoryHeader=DEFAULT_INVENTORY_HEADER;
      const variantIdColIndex=Number(map['Id phiên bản']);
      if(!Number.isInteger(variantIdColIndex))throw new Error('Không xác định được vị trí cột Id phiên bản');

      // IMPORTANT: do NOT append stock after Id phiên bản. Sapo accepts the file,
      // but its product importer can ignore fields placed after Id phiên bản.
      // Insert stock immediately before Id phiên bản instead.
      xml=shiftCellRefsRight(xlsx,xml,variantIdColIndex);
      inventoryColIndex=variantIdColIndex;
      const stockCol=xlsx.indexToCol(inventoryColIndex);
      const headerResult=setTextCell(xml,1,stockCol,inventoryHeader);
      if(!headerResult.changed)throw new Error('Không thêm được cột Tồn kho vào file xuất Sapo');
      xml=headerResult.xml;

      const oldLast=Math.max((sapoData.headers||[]).length-1,...Object.values(map).filter((v)=>Number.isInteger(v)));
      xml=extendDimension(xml,xlsx.indexToCol(oldLast+1));
      addedInventoryColumn=true;
      insertedBeforeVariantId=true;
    }

    const col=xlsx.indexToCol(inventoryColIndex);
    let changed=0;
    let zeroCount=0;
    const changedIds=[];
    const seen=new Set();

    for(const variant of sapoData.variants||[]){
      const key=String(variant.variantId);
      if(!Object.prototype.hasOwnProperty.call(inventoryByVariantId||{},key))continue;
      if(seen.has(key))throw new Error(`Id phiên bản ${key} bị trùng trong file xuất Sapo`);
      seen.add(key);
      const stock=Number(inventoryByVariantId[key]);
      if(!Number.isFinite(stock)||stock<0)throw new Error(`Tồn kho không hợp lệ cho Id phiên bản ${key}`);
      const rowNumber=Number(variant.rowIndex);
      if(!rowNumber)throw new Error(`Không xác định được dòng Excel cho Id phiên bản ${key}`);
      const result=setNumericCell(xml,rowNumber,col,stock);
      if(!result.changed)throw new Error(`Không tìm thấy dòng ${rowNumber} của Id phiên bản ${key}`);
      xml=result.xml;
      changed+=1;
      if(stock===0)zeroCount+=1;
      changedIds.push(key);
    }

    if(!changed)throw new Error('Không có biến thể nào đủ điều kiện cập nhật tồn kho');
    book.files.set(book.sheetPath,new TextEncoder().encode(xml));
    return{
      bytes:xlsx.zipStore(book.files),
      rows:changed,
      zeroCount,
      inventoryHeader,
      inventoryCol:col,
      addedInventoryColumn,
      insertedBeforeVariantId,
      changedIds,
      skippedVariantCount:Math.max(0,(sapoData.variants||[]).length-changed)
    };
  }

  return{DEFAULT_INVENTORY_HEADER,resolveInventoryHeader,setNumericCell,setTextCell,extendDimension,shiftCellRefsRight,updateExportWorkbook};
});
