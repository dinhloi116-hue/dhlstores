(function(root,factory){
  const api=factory(root.DHLStockHistoryCore||(typeof require==='function'?require('./stock-history-core.js'):null));
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLStockReportCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(history){
  'use strict';
  if(!history)throw new Error('Thiếu bộ lịch sử tồn kho.');
  const text=v=>String(v==null?'':v).trim();
  const number=v=>Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):null;
  function safeUrl(value){
    try{
      const u=new URL(text(value));
      return u.protocol==='https:'||u.protocol==='http:'?u.href:'';
    }catch{return'';}
  }
  function getSnapshot(report,snapshots){
    const list=Array.isArray(snapshots)?snapshots:[];
    const direct=report&&report.visualSnapshot;
    if(direct&&Array.isArray(direct.items))return direct;
    // Older reports may have a checkpoint without image metadata.
    const at=Number(report&&report.snapshotAt||0);
    return list.find(x=>Number(x&&x.at||0)===at)||null;
  }
  function build(report,snapshots){
    const list=Array.isArray(snapshots)?snapshots:[];
    const current=getSnapshot(report,list);
    if(!report||!current||!Array.isArray(current.items)){
      return{ready:false,reason:'Chưa có dữ liệu ảnh/SKU của lượt quét. Hãy quét lại tab nguồn để tạo báo cáo chi tiết.'};
    }
    const prior=Boolean(report.comparable&&report.quality&&report.quality.ok)
      ?list.find(s=>text(s&&s.id)===text(report.previousSnapshotId))||null:null;
    const comparable=Boolean(prior);
    const oldMap=new Map(comparable?(prior.items||[]).map(item=>[text(item.key)||history.itemKey(item),item]):[]);
    const newKeys=new Set();
    const items=[];
    for(const item of current.items){
      const stock=number(item&&item.stock);
      if(stock===null)continue;
      const key=text(item.key)||history.itemKey(item);
      if(!key||newKeys.has(key))continue;
      newKeys.add(key);
      const old=oldMap.get(key)||null;
      const before=comparable&&old?number(old.stock):null;
      let type='unchanged';
      if(comparable&&old&&before!==null){
        if(before>0&&stock===0)type='soldout';
        else if(before===0&&stock>0)type='restocked';
        else if(stock>before)type='increased';
        else if(stock<before)type='decreased';
      }else if(comparable&&!old)type='added';
      else if(stock===0)type='zero';
      items.push({
        key,sku:text(item.sku),name:text(item.name),color:text(item.color),
        size:text(item.size),before,stock,delta:before===null?null:stock-before,
        type,currentlyOut:stock===0,
        imageUrl:safeUrl(item.imageUrl),imageScope:text(item.imageScope),
        productUrl:safeUrl(item.productUrl),sourceName:text(item.sourceName)
      });
    }
    if(comparable){
      for(const [key,old] of oldMap){
        if(newKeys.has(key))continue;
        items.push({
          key,sku:text(old.sku),name:text(old.name),color:text(old.color),
          size:text(old.size),before:number(old.stock),stock:null,delta:null,
          type:'missing',currentlyOut:false,imageUrl:safeUrl(old.imageUrl),
          imageScope:text(old.imageScope),productUrl:safeUrl(old.productUrl),
          sourceName:text(old.sourceName)
        });
      }
    }
    const priority={soldout:0,restocked:1,zero:2,increased:3,decreased:4,added:5,missing:6,unchanged:7};
    items.sort((a,b)=>(priority[a.type]??8)-(priority[b.type]??8)
      ||a.name.localeCompare(b.name,'vi')||a.color.localeCompare(b.color,'vi')
      ||a.size.localeCompare(b.size,'vi'));
    const counts={
      all:items.length,
      focus:items.filter(x=>x.type!=='unchanged').length,
      zero:items.filter(x=>x.currentlyOut).length,
      soldout:items.filter(x=>x.type==='soldout').length,
      restocked:items.filter(x=>x.type==='restocked').length,
      increased:items.filter(x=>x.type==='increased').length,
      decreased:items.filter(x=>x.type==='decreased').length,
      missing:items.filter(x=>x.type==='missing').length,
      added:items.filter(x=>x.type==='added').length
    };
    const fullyScanned=report.comparable===true&&report.quality&&report.quality.ok===true;
    let notice='';
    if(!fullyScanned)notice='Đây là lượt quét chưa hoàn tất/không đủ điều kiện đối chiếu toàn bộ. Chỉ xem số tồn đã đọc; không kết luận hàng mới hết hoặc có trở lại.';
    else if(!comparable)notice='Chưa có mốc quét trước phù hợp. Đây là mốc đầu tiên: danh sách tồn 0 vẫn hiển thị, biến động chỉ có sau lượt quét kế tiếp.';
    return{
      ready:true,profileId:text(report.profileId),profileName:text(report.profileName||current.profileName),
      at:Number(report.at||current.at||0),previousAt:comparable?Number(prior.at||0):0,
      comparable,notice,
      totalStock:Number(current.totalStock||0),
      rowCount:items.filter(x=>x.stock!==null).length,
      items,counts
    };
  }
  return{build,safeUrl};
});
