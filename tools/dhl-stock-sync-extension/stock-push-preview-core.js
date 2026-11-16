(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLStockPushPreviewCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const text=v=>String(v==null?'':v).trim();
  const normSku=v=>text(v).normalize('NFC').toUpperCase();
  function build(entries,config,previousQueue,dependencies){
    const {quality,batch,branchCore,excelSku}=dependencies||{};
    if(!quality||!batch||!branchCore||!excelSku)throw new Error('Thiếu mô-đun kiểm tra an toàn tồn kho.');
    const original=Array.isArray(entries)?entries:[];
    if(!original.length)throw new Error('Chưa có lượt quét tồn kho hợp lệ.');
    if(original.some(entry=>!quality.trustedEntry(entry)))throw new Error('Còn lượt quét chưa xác minh đầy đủ.');
    const sapo=config&&config.sapo||{};
    if(!Number(sapo.locationId)||!Number(sapo.verifiedAt))throw new Error('Chưa xác minh chi nhánh Sapo.');
    const normalized=original.map(entry=>{
      excelSku.validate(entry.rows);
      return{...entry,branch:branchCore.resolve(entry,config)};
    });
    const combined=batch.combineEntries(normalized);
    excelSku.validate(combined.rows);
    const ordered=combined.rows.slice().sort((a,b)=>normSku(a.sku).localeCompare(normSku(b.sku),'en'));
    const priorValid=Boolean(previousQueue&&previousQueue.source==='manual'
      &&Number(previousQueue.locationId)===Number(sapo.locationId)
      &&text(previousQueue.host).toLowerCase()===text(sapo.storeHost).toLowerCase());
    const previous=new Map();
    if(priorValid){
      for(const item of previousQueue.successRows||[]){
        if(item&&normSku(item.sku)&&Number.isSafeInteger(Number(item.stock))&&Number(item.stock)>=0)
          previous.set(normSku(item.sku),Number(item.stock));
      }
    }
    const rows=ordered.map(row=>{
      const sku=normSku(row.sku);
      const oldStock=previous.has(sku)?previous.get(sku):null;
      return{
        sku:text(row.sku),
        variantName:text(row.variantName),
        stock:Number(row.stock),
        oldStock,
        delta:oldStock==null?null:Number(row.stock)-oldStock,
        risk:Number(row.stock)===0?'sold-out':oldStock!=null&&Math.abs(Number(row.stock)-oldStock)>=20?'large-change':'normal'
      };
    });
    const identity={
      locationId:Number(sapo.locationId),
      verifiedAt:Number(sapo.verifiedAt),
      host:text(sapo.storeHost).toLowerCase(),
      branch:text(combined.branch),
      scans:normalized.map(entry=>[text(entry.profileId),Number(entry.scannedAt||0),text(entry.jobId)]).sort((a,b)=>a[0].localeCompare(b[0])),
      rows:ordered.map(row=>[normSku(row.sku),Number(row.stock)])
    };
    return{
      signature:JSON.stringify(identity),
      locationName:text(sapo.locationName),
      branch:combined.branch,
      profileCount:combined.profileCount,
      rows,
      summary:{
        count:rows.length,
        zero:rows.filter(r=>r.stock===0).length,
        changed:rows.filter(r=>r.delta!==null&&r.delta!==0).length,
        unknown:rows.filter(r=>r.oldStock===null).length,
        largeChange:rows.filter(r=>r.risk==='large-change').length,
        recordedAt:priorValid?Number(previousQueue.finishedAt||0):0
      }
    };
  }
  return{build,normSku};
});
