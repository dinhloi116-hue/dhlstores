(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLBatchStockCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const text=(v)=>String(v==null?'':v).trim();

  function normalizeRow(row){
    return{
      variantName:text(row&&row.variantName),
      sku:text(row&&row.sku),
      stock:Number(row&&row.stock),
      standardName:text(row&&row.standardName),
      size:text(row&&row.size),
      variantId:row&&row.variantId,
      productId:row&&row.productId
    };
  }

  function validateEntry(entry){
    if(!entry||!text(entry.profileId))throw new Error('Cache thiếu profileId.');
    if(!text(entry.branch))throw new Error(`Hồ sơ ${text(entry.profileName)||text(entry.profileId)} thiếu tên chi nhánh Sapo.`);
    const rows=Array.isArray(entry.rows)?entry.rows.map(normalizeRow):[];
    if(!rows.length)throw new Error(`Hồ sơ ${text(entry.profileName)||text(entry.profileId)} chưa có dòng tồn kho để gộp.`);
    for(const row of rows){
      if(!row.sku)throw new Error(`Hồ sơ ${text(entry.profileName)||text(entry.profileId)} có dòng thiếu SKU.`);
      if(!Number.isFinite(row.stock)||row.stock<0)throw new Error(`SKU ${row.sku} có tồn kho không hợp lệ.`);
    }
    return{...entry,profileId:text(entry.profileId),profileName:text(entry.profileName),branch:text(entry.branch),rows};
  }

  function combineEntries(entries){
    const list=(Array.isArray(entries)?entries:[]).map(validateEntry);
    if(!list.length)throw new Error('Chưa có tab nào được lưu cache để xuất file gộp.');

    const branches=[...new Set(list.map(x=>x.branch))];
    if(branches.length!==1)throw new Error(`Không thể gộp nhiều chi nhánh Sapo trong một file: ${branches.join(' / ')}.`);

    const bySku=new Map();
    const duplicateSame=[];
    for(const entry of list){
      for(const row of entry.rows){
        const key=row.sku.toLowerCase();
        if(!bySku.has(key)){
          bySku.set(key,{row,profileId:entry.profileId,profileName:entry.profileName});
          continue;
        }
        const old=bySku.get(key);
        if(Number(old.row.stock)!==Number(row.stock)){
          throw new Error(`SKU ${row.sku} bị trùng giữa ${old.profileName||old.profileId} và ${entry.profileName||entry.profileId} nhưng tồn khác nhau (${old.row.stock} / ${row.stock}).`);
        }
        duplicateSame.push(row.sku);
      }
    }

    return{
      branch:branches[0],
      rows:[...bySku.values()].map(x=>x.row),
      profileCount:list.length,
      profiles:list.map(x=>({profileId:x.profileId,profileName:x.profileName,rowCount:x.rows.length,scannedAt:x.scannedAt||0,sourceUrl:text(x.sourceUrl)})),
      duplicateSame
    };
  }

  return{normalizeRow,validateEntry,combineEntries};
});
