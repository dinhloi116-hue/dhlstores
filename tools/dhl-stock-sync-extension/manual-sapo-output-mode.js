(() => {
  'use strict';

  const BATCH_KEY='dhlManualPendingStockBatchV1';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const QUEUE_KEY='dhlSapoPushQueueV1';
  const JOB_KEY='dhlManualScanJobV2';
  let recovering=false;

  const text=(v)=>String(v==null?'':v).trim();
  const setText=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value;};

  function send(message){
    return new Promise((resolve,reject)=>{
      chrome.runtime.sendMessage(message,response=>{
        const err=chrome.runtime.lastError;
        if(err){reject(err);return;}
        if(!response){reject(new Error('Không nhận được phản hồi từ background.'));return;}
        resolve(response);
      });
    });
  }

  async function readState(){
    const s=await chrome.storage.local.get([BATCH_KEY,CONFIG_KEY,QUEUE_KEY,JOB_KEY]);
    const pending=s[BATCH_KEY]&&typeof s[BATCH_KEY]==='object'?s[BATCH_KEY]:{};
    const config=s[CONFIG_KEY]&&typeof s[CONFIG_KEY]==='object'?s[CONFIG_KEY]:{};
    const queue=s[QUEUE_KEY]&&typeof s[QUEUE_KEY]==='object'?s[QUEUE_KEY]:null;
    const job=s[JOB_KEY]&&typeof s[JOB_KEY]==='object'?s[JOB_KEY]:null;
    const manualEntries=Object.values(pending).filter(x=>x&&x.auto!==true&&Array.isArray(x.rows)&&x.rows.length);
    return{config,queue,job,manualEntries};
  }

  function setState(message,kind=''){
    const el=document.getElementById('manualSapoOutputState');
    if(!el)return;
    el.textContent=text(message);
    el.className=`manual-output-state ${kind}`.trim();
  }

  async function pushManual(){
    const btn=document.getElementById('manualSapoPushBtn');
    if(btn){btn.disabled=true;setText(btn,'ĐANG KHỞI TẠO...');}
    try{
      const s=await readState();
      const profileIds=s.manualEntries.map(x=>String(x.profileId||'')).filter(Boolean);
      if(!profileIds.length)throw new Error('Chưa có kết quả quét để đẩy lên Sapo.');
      const response=await send({type:'DHL_SAPO_PUSH_MANUAL',profileIds});
      if(!response.ok)throw new Error(response.error||'Không bắt đầu được lượt đẩy Sapo.');
      setState('Đã bắt đầu đẩy tồn lên Sapo theo nhịp nhỏ. Có thể bấm DỪNG bất kỳ lúc nào.','ok');
    }catch(error){
      setState(error.message||String(error),'bad');
    }finally{
      await refresh().catch(()=>{});
    }
  }

  async function cancelPush(){
    const btn=document.getElementById('manualSapoCancelBtn');
    if(btn){btn.disabled=true;setText(btn,'ĐANG DỪNG...');}
    try{
      const response=await send({type:'DHL_SAPO_PUSH_CANCEL'});
      if(!response.ok)throw new Error(response.error||'Không dừng được lượt đẩy.');
      setState('Đã dừng đẩy Sapo. Cache quét vẫn được giữ nguyên.','ok');
    }catch(error){
      setState(error.message||String(error),'bad');
    }finally{
      await refresh().catch(()=>{});
    }
  }

  function injectStyle(){
    if(document.getElementById('manualSapoOutputStyle'))return;
    const style=document.createElement('style');
    style.id='manualSapoOutputStyle';
    style.textContent=`
      .manual-output-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}
      .manual-output-actions button{width:100%;min-height:42px;margin-top:0!important;font-size:11px;font-weight:900}
      #manualSapoPushBtn{background:#0f172a;color:#fff;border-color:#0f172a}
      #manualSapoCancelBtn{margin-top:7px;width:100%;min-height:34px;font-size:10px;font-weight:800}
      .manual-output-state{margin-top:7px;padding:7px 8px;border-radius:7px;background:#f8fafc;color:#475569;font-size:10px;line-height:1.4}
      .manual-output-state.ok{background:#f0fdf4;color:#166534}.manual-output-state.bad{background:#fef2f2;color:#991b1b}
      #manualSapoProgress{height:6px;margin-top:6px;border-radius:999px;overflow:hidden;background:#e2e8f0}
      #manualSapoProgressFill{height:100%;width:0;border-radius:inherit;background:#0f172a;transition:width .18s ease}
    `;
    document.head.appendChild(style);
  }

  function mount(){
    const box=document.getElementById('batchPendingBox');
    const excel=document.getElementById('batchExportBtn');
    if(!box||!excel)return false;
    if(document.getElementById('manualSapoPushBtn'))return true;
    injectStyle();

    const actions=document.createElement('div');
    actions.className='manual-output-actions';
    excel.insertAdjacentElement('beforebegin',actions);
    actions.appendChild(excel);

    const push=document.createElement('button');
    push.id='manualSapoPushBtn';
    push.type='button';
    push.className='primary';
    push.textContent='ĐẨY LÊN SAPO';
    push.addEventListener('click',pushManual);
    actions.appendChild(push);

    const cancel=document.createElement('button');
    cancel.id='manualSapoCancelBtn';
    cancel.type='button';
    cancel.className='secondary';
    cancel.textContent='DỪNG ĐẨY SAPO';
    cancel.hidden=true;
    cancel.addEventListener('click',cancelPush);
    actions.insertAdjacentElement('afterend',cancel);

    const note=document.createElement('div');
    note.id='manualSapoOutputState';
    note.className='manual-output-state';
    cancel.insertAdjacentElement('afterend',note);

    const progress=document.createElement('div');
    progress.id='manualSapoProgress';
    progress.hidden=true;
    progress.innerHTML='<div id="manualSapoProgressFill"></div>';
    note.insertAdjacentElement('afterend',progress);
    return true;
  }

  async function refresh(){
    if(!mount())return;
    let s=await readState();

    if(!s.manualEntries.length&&!recovering&&s.job&&['done','paused'].includes(s.job.status)&&Array.isArray(s.job.results)&&s.job.results.length){
      recovering=true;
      try{
        const rebuilt=await send({type:'DHL_MANUAL_JOB_REBUILD_OUTPUT'});
        if(rebuilt&&rebuilt.ok)s=await readState();
      }catch(_){}
      finally{recovering=false;}
    }

    const excel=document.getElementById('batchExportBtn');
    const push=document.getElementById('manualSapoPushBtn');
    const cancel=document.getElementById('manualSapoCancelBtn');
    const progress=document.getElementById('manualSapoProgress');
    const progressFill=document.getElementById('manualSapoProgressFill');
    const sapo=s.config&&s.config.sapo||{};
    const verified=Boolean(sapo.verifiedAt&&sapo.locationId);
    const hasCredentials=Boolean(text(sapo.storeHost)&&text(sapo.apiKey)&&text(sapo.apiSecret));
    const count=s.manualEntries.length;
    const rows=s.manualEntries.reduce((sum,x)=>sum+Number(x.rowCount||(x.rows||[]).length||0),0);
    const queue=s.queue&&s.queue.source==='manual'?s.queue:null;
    const busy=Boolean(queue&&queue.status==='running'&&queue.manualPaused!==true);

    if(excel)setText(excel,count?`TẢI FILE EXCEL (${count})`:'TẢI FILE EXCEL');

    if(push){
      setText(push,rows?`ĐẨY LÊN SAPO (${rows} DÒNG)`:'ĐẨY LÊN SAPO');
      push.disabled=!count||busy||(!verified&&!hasCredentials);
    }
    if(cancel){
      cancel.hidden=!busy;
      cancel.disabled=false;
      setText(cancel,'DỪNG ĐẨY SAPO');
    }

    if(progress&&progressFill){
      const total=Number(queue&&queue.total||0),done=Number(queue&&queue.index||0);
      const visible=Boolean(queue&&total>0);
      progress.hidden=!visible;
      progressFill.style.width=visible?`${Math.max(0,Math.min(100,Math.round((done/total)*100)))}%`:'0%';
    }

    if(busy){
      const total=Number(queue.total||0),done=Number(queue.index||0),success=Number(queue.success||0),failed=Number(queue.failed||0);
      setState(`Đang đẩy nhanh ${done}/${total} • thành công ${success}${failed?` • lỗi ${failed}`:''}.`,'ok');
    }else if(queue&&queue.status==='done-with-errors'){
      const total=Number(queue.total||0),success=Number(queue.success||0),failed=Number(queue.failed||0);
      setState(`Đã chạy hết ${total} dòng • thành công ${success} • lỗi ${failed}. Cache vẫn giữ để có thể đẩy lại hoặc tải Excel.`,'bad');
    }else if(queue&&queue.status==='done'){
      const total=Number(queue.total||0);
      setState(`Đã đẩy xong ${total}/${total} dòng lên Sapo.`,'ok');
    }else if(queue&&queue.status==='cancelled'){
      setState('Đã dừng đẩy Sapo. Cache vẫn còn để tải Excel hoặc đẩy lại.','ok');
    }else if(!count){
      setState('Quét xong một tab thì có thể tải Excel hoặc đẩy lên Sapo.');
    }else if(verified||hasCredentials){
      setState(`${count} hồ sơ • ${rows} dòng sẵn sàng. Đẩy Sapo chỉ chạy khi anh bấm nút.`,'ok');
    }else{
      setState('Đã có dữ liệu quét nhưng chưa có thông tin kết nối Sapo đã lưu.','bad');
    }
  }

  if(mount()){
    refresh().catch(()=>{});
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&(changes[BATCH_KEY]||changes[CONFIG_KEY]||changes[QUEUE_KEY]))refresh().catch(()=>{});
    });
  }
})();