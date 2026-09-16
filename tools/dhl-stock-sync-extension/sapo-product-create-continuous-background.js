(() => {
  'use strict';

  const QUEUE_KEY='dhlSapoProductCreateQueueV1';
  const ALARM='dhl-sapo-product-create-queue';
  let repairing=false;

  async function continueAfterItemError(){
    if(repairing)return;
    repairing=true;
    try{
      const state=await chrome.storage.local.get(QUEUE_KEY);
      const queue=state[QUEUE_KEY];
      if(!queue||queue.status!=='paused')return;
      const items=Array.isArray(queue.items)?queue.items:[];
      const index=Math.max(0,Number(queue.index||0));
      const item=items[index];

      // Chỉ tự bỏ qua lỗi của 1 sản phẩm cụ thể. Lỗi hệ thống/mất xác minh vẫn phải dừng.
      if(!item||item.status!=='error'||!item.error)return;

      if(item.skipped!==true){
        item.skipped=true;
        item.skippedAt=Date.now();
        queue.failed=Number(queue.failed||0)+1;
      }
      item.finishedAt=item.finishedAt||Date.now();
      queue.lastSkipped={
        at:Date.now(),
        index,
        name:String(item.name||''),
        alias:String(item.alias||''),
        productId:Number(item.productId)||0,
        variantIndex:Number(item.variantIndex)||0,
        error:String(item.error||'')
      };
      queue.index=index+1;
      queue.status='running';
      await chrome.storage.local.set({[QUEUE_KEY]:queue});
      await chrome.alarms.clear(ALARM);
      chrome.alarms.create(ALARM,{when:Date.now()+650});
    }finally{
      repairing=false;
    }
  }

  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes[QUEUE_KEY])setTimeout(()=>continueAfterItemError().catch(()=>{}),40);
  });

  // Tự giải phóng cả hàng đợi cũ đang bị dừng bởi 1 sản phẩm lỗi sau khi người dùng cập nhật extension.
  continueAfterItemError().catch(()=>{});
})();
