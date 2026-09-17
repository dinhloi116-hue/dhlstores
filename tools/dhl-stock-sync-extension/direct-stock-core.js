(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLDirectStockCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function resolveInventoryHeaders(headerMap){
    const keys=Object.keys(headerMap||{});
    return keys.filter((key)=>/_Tồn kho$/i.test(key)||/Tồn kho/i.test(key));
  }

  function resolveInventoryHeader(headerMap){
    return resolveInventoryHeaders(headerMap)[0]||'';
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

  async function updateExportWorkbook(xlsx,exportBuffer,sapoData,inventoryByVariantId,inventoryHeaderOverride=''){
    if(!xlsx||typeof xlsx.readFirstSheet!=='function')throw new Error('Thiếu bộ đọc Excel');
    if(!sapoData)throw new Error('Chưa đọc file xuất Sapo');
    const map=sapoData.headerMap||xlsx.headerMap((sapoData.rows||[])[0]||[]);
    if(map['Id phiên bản']==null)throw new Error('File xuất Sapo thiếu cột Id phiên bản');

    const inventoryHeaders=resolveInventoryHeaders(map);
    if(!inventoryHeaders.length){
      throw new Error('File xuất Sapo này KHÔNG có cột [Tên chi nhánh]_Tồn kho. Hãy xuất lại từ Sapo và bật trường Tồn kho trong Tùy chọn trường hiển thị. Tool không tự bịa/thêm tên chi nhánh nữa.');
    }

    let inventoryHeader=inventoryHeaderOverride||inventoryHeaders[0];
    if(map[inventoryHeader]==null){
      throw new Error(`Không tìm thấy cột tồn kho đã chọn: ${inventoryHeader}`);
    }

    const book=await xlsx.readFirstSheet(exportBuffer);
    let xml=book.xml;
    const inventoryColIndex=Number(map[inventoryHeader]);
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
      inventoryHeaders,
      inventoryCol:col,
      changedIds,
      skippedVariantCount:Math.max(0,(sapoData.variants||[]).length-changed)
    };
  }

  return{resolveInventoryHeaders,resolveInventoryHeader,setNumericCell,updateExportWorkbook};
});
