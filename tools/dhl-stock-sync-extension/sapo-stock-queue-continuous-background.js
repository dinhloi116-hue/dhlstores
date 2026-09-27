(() => {
  'use strict';

  const QUEUE_KEY='dhlSapoPushQueueV1';
  const MANUAL_BATCH_KEY='dhlManualPendingStockBatchV1';
  const MANUAL_ALARM='dhl-sapo-manual-push-queue';
  const AUTO_ALARM='dhl-sapo-push-queue';
  let repairing=false;

  function text(v){return String(v==null?'':v).trim();}

  function isSystemError(message){
    const s=text(message);
    return /mất xác minh|chưa xác minh|api key|api secret|tên shop sapo|sapo http (401|403|405|408|429|5\d\d)|sapo http 404.*request path is not found|failed to fetch|networkerror|err_internet|err_network|quá nhiều yêu cầu|rate limit/i.test(s);
  }

  function isLegacyRoute404(message){
    return /sapo http 404.*request path is not found/i.test(text(message));
  }

  function isLegacyPost405(message){
    return /sapo http 405.*not supported request method ['"]?post['"]?/i.test(text(message));
  }

  function isOpaque400(message){
    return /sapo http 400:\s*\[object object\]/i.test(text(message));
  }

  function sameErrorKey(message){
    return text(message).toLowerCase().replace(/\s+/g,' ').slice(0,220);
  }

  async function clearConsumedManualCache(queue){
    const scans=queue&&queue.sourceScans&&typeof queue.sourceScans==='object'?queue.sourceScans:{};
    if(!Object.keys(scans).length)return;
    const s=await chrome.storage.local.get(MANUAL_BATCH_KEY);
    const pending=s[MANUAL_BATCH_KEY]&&typeof s[MANUAL_BATCH_KEY]==='object'?{...s[MANUAL_BATCH_KEY]}:{};
    let changed=false;
    for(const [profileId,scannedAt] of Object.entries(scans)){
      const entry=pending[profileId];
      if(entry&&Number(entry.scannedAt||0)===Number(scannedAt||0)){
        delete pending[profileId];changed=true;
      }
    }
    if(changed)await chrome.storage.local.set({[MANUAL_BATCH_KEY]:pending});
  }

  async function schedule(queue,isManual,delay=650){
    queue.status='running';
    if(isManual)queue.manualPaused=false;
    await chrome.storage.local.set({[QUEUE_KEY]:queue});
    await chrome.alarms.clear(isManual?MANUAL_ALARM:AUTO_ALARM);
    chrome.alarms.create(isManual?MANUAL_ALARM:AUTO_ALARM,{when:Date.now()+delay});
  }

  async function recoverLegacyPost405Queue(queue,isManual){
    const errors=Array.isArray(queue&&queue.errors)?queue.errors:[];
    if(Number(queue&&queue.success||0)!==0)return false;
    if(Number(queue&&queue.index||0)<=0)return false;
    if(!errors.length||!errors.every(e=>isLegacyPost405(e&&e.error)))return false;
    if(queue.legacyPost405RecoveredAt)return false;

    // Các dòng đã xử lý trước đó đều thất bại do chính endpoint/method của tool,
    // không phải dữ liệu sản phẩm. Vì chưa có dòng nào thành công nên reset index=0 là an toàn.
    queue.recoveryHistory=Array.isArray(queue.recoveryHistory)?queue.recoveryHistory:[];
    queue.recoveryHistory.push({
      at:Date.now(),
      reason:'Sapo 405 POST inventory stock endpoint',
      processed:Number(queue.index||0),
      errors:errors.map(e=>({...e}))
    });
    queue.index=0;
    queue.success=0;
    queue.successRows=[];
    queue.failed=0;
    queue.skippedRows=[];
    queue.errors=[];
    queue.finishedAt=0;
    queue.legacyPost405RecoveredAt=Date.now();
    await schedule(queue,isManual,450);
    return true;
  }

  async function recoverOpaque400Queue(queue,isManual){
    const errors=Array.isArray(queue&&queue.errors)?queue.errors:[];
    const processed=Math.max(0,Number(queue&&queue.index||0));
    if(Number(queue&&queue.success||0)!==0)return false;
    if(processed<=0||errors.length<2)return false;
    if(queue.opaque400RecoveredAt)return false;
    const processedErrors=errors.filter(e=>Number(e&&e.index)>=0&&Number(e&&e.index)<processed);
    if(processedErrors.length<2||!processedErrors.every(e=>isOpaque400(e&&e.error)))return false;

    // Bản cũ đã bỏ qua hàng loạt do lỗi endpoint/method của chính tool.
    // Vì success=0 nên chưa có dòng nào ghi được lên Sapo: retry toàn bộ queue cũ là an toàn.
    queue.recoveryHistory=Array.isArray(queue.recoveryHistory)?queue.recoveryHistory:[];
    queue.recoveryHistory.push({
      at:Date.now(),
      reason:'Opaque Sapo HTTP 400 from stock-write compatibility layer',
      processed,
      errors:processedErrors.map(e=>({...e}))
    });
    queue.index=0;
    queue.success=0;
    queue.successRows=[];
    queue.failed=0;
    queue.skippedRows=[];
    queue.errors=[];
    queue.finishedAt=0;
    queue.opaque400RecoveredAt=Date.now();
    await schedule(queue,isManual,450);
    return true;
  }

  function repeatedSystem400(queue,last){
    if(!last||!/sapo http 400/i.test(text(last.error)))return false;
    const errors=Array.isArray(queue&&queue.errors)?queue.errors:[];
    const key=sameErrorKey(last.error);
    const same=errors.filter(e=>sameErrorKey(e&&e.error)===key);
    return isOpaque400(last.error)||same.length>=2;
  }

  async function continueAfterRowError(){
    if(repairing)return;
    repairing=true;
    try{
      const state=await chrome.storage.local.get(QUEUE_KEY);
      const queue=state[QUEUE_KEY];
      if(!queue)return;

      const isManual=queue.source==='manual';

      // Tự cứu các queue cũ bị bỏ qua hàng loạt vì lỗi compatibility endpoint của tool.
      if(await recoverLegacyPost405Queue(queue,isManual))return;
      if(await recoverOpaque400Queue(queue,isManual))return;

      const paused=isManual?queue.manualPaused===true:queue.status==='paused';
      if(!paused)return;

      const errors=Array.isArray(queue.errors)?queue.errors:[];
      const last=errors.length?errors[errors.length-1]:null;
      if(!last||isSystemError(last.error)||repeatedSystem400(queue,last))return;

      const rows=Array.isArray(queue.rows)?queue.rows:[];
      const index=Math.max(0,Number(queue.index||0));
      if(index>=Number(queue.total||rows.length||0))return;

      // Queue cũ có thể đang dừng vì endpoint PUT cũ trả 404. Sau khi cập nhật,
      // retry đúng dòng đó 1 lần bằng lớp tương thích mới trước khi bỏ qua.
      if(isLegacyRoute404(last.error)){
        queue.compatRetriedIndexes=Array.isArray(queue.compatRetriedIndexes)?queue.compatRetriedIndexes:[];
        if(!queue.compatRetriedIndexes.includes(index)){
          queue.compatRetriedIndexes.push(index);
          last.compatRetry=true;
          last.compatRetryAt=Date.now();
          await schedule(queue,isManual,450);
          return;
        }
      }

      if(last.skipped!==true){
        last.skipped=true;
        last.skippedAt=Date.now();
        queue.skippedRows=Array.isArray(queue.skippedRows)?queue.skippedRows:[];
        queue.skippedRows.push({
          at:last.skippedAt,
          index,
          sku:text(last.sku||rows[index]&&rows[index].sku),
          variantId:Number(last.variantId||rows[index]&&rows[index].variantId)||0,
          stock:Number.isFinite(Number(last.stock))?Number(last.stock):Number(rows[index]&&rows[index].stock),
          error:text(last.error)
        });
      }

      queue.index=index+1;
      queue.failed=Array.isArray(queue.skippedRows)?queue.skippedRows.length:errors.filter(e=>e&&e.skipped).length;
      const done=queue.index>=Number(queue.total||rows.length||0);
      queue.status=done?'done':'running';
      if(isManual)queue.manualPaused=false;
      if(done)queue.finishedAt=Date.now();

      await chrome.storage.local.set({[QUEUE_KEY]:queue});

      if(done){
        if(isManual)try{await clearConsumedManualCache(queue);}catch(_){}
        return;
      }

      await chrome.alarms.clear(isManual?MANUAL_ALARM:AUTO_ALARM);
      chrome.alarms.create(isManual?MANUAL_ALARM:AUTO_ALARM,{when:Date.now()+650});
    }finally{
      repairing=false;
    }
  }

  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes[QUEUE_KEY])setTimeout(()=>continueAfterRowError().catch(()=>{}),40);
  });

  continueAfterRowError().catch(()=>{});
})();
