(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLDirectStockCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function resolveInventoryHeader(headerMap){
    const keys=Object.keys(headerMap||{});
    return keys.find((key)=>/_Tồn kho$/i.test(key))||keys.find((key)=>/Tồn kho/i.test(key))||'';
  }

  function setNumericCell(xml,rowNumber,col,value){
    const rowRe=new RegExp(`(<(?:[A-Za-z_][\\w.-]*:)?row\\b[^>]*\\br="${rowNumber}"[^>]*>)([\\s\\S]*?)(<\\/(?:[A-Za-z_][\\w.-]*:)?row>)`);
    let changed=false;
    const next=String(xml||'').replace(rowRe,(whole,open,body,close)=>{
      const ref=`${col}${rowNumber}`;
      const cellRe=new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?c\\b[^>]*\\br="${ref}"[^>]*(?:\\/>|>[\\s\\S]*?<\\/(?:[A-Za-z_][\\w.-]*:)?c>)`);
      const cell=`<c r="${ref}"><v>${Number(value)}</v></c>`;
      changed=true;
      return cellRe.test(body)?`${open}${body.replace(cellRe,cell)}${close}`:`${open}${body}${cell}${close}`;
    });
    return{xml:next,changed};
  }

  async function updateExportWorkbook(xlsx,exportBuffer,sapoData,inventoryByVariantId){
    if(!xlsx||typeof xlsx.readFirstSheet!=='function')throw new Error('Thiếu bộ đọc Excel');
    if(!sapoData)throw new Error('Chưa đọc file xuất Sapo');
    const map=sapoData.headerMap||xlsx.headerMap((sapoData.rows||[])[0]||[]);
    const inventoryHeader=resolveInventoryHeader(map);
    if(!inventoryHeader)throw new Error('File xuất Sapo không có cột Tồn kho');
    if(map['Id phiên bản']==null)throw new Error('File xuất Sapo thiếu cột Id phiên bản');

    const book=await xlsx.readFirstSheet(exportBuffer);
    const col=xlsx.indexToCol(map[inventoryHeader]);
    let xml=book.xml;
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
      changedIds,
      skippedVariantCount:Math.max(0,(sapoData.variants||[]).length-changed)
    };
  }

  return{resolveInventoryHeader,setNumericCell,updateExportWorkbook};
});
