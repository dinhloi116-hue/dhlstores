(() => {
  'use strict';
  const core=globalThis.DHLAutoSyncCore;
  const quality=globalThis.DHLScanQualityCore;
  const runner=globalThis.DHLManualJobRunner;
  const sapoBridge=globalThis.DHLSapoAutoBridge;
  if(!core||!quality||!runner||!sapoBridge)return;

  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const PROFILE_KEY='dhlSavedStockProfilesV1';
  const BATCH_KEY='dhlManualPendingStockBatchV1';
  const JOB_KEY='dhlManualScanJobV2';
  const QUEUE_KEY='dhlSapoPushQueueV1';
  const CYCLE_KEY='dhlScheduledStockCycleV1';
  const ALARM='dhl-scheduled-stock-cycle';
  const STEP='dhl-scheduled-stock-step';
  const TERMINAL=['done','scan-only','failed','push-paused'];
  let stepping=false,starting=false;
  const text=v=>String(v==null?'':v).trim();
  const reason=e=>text(e&&e.message||e);
  const validUrl=core.validSourceUrl;
  const isBusyQueue=q=>Boolean(q&&['running','queued'].includes(q.status));
  const normalize=c=>core.normalizeConfig(c);
  const getStorage=keys=>chrome.storage.local.get(keys);
  const setCycle=c=>chrome.storage.local.set({[CYCLE_KEY]:c});

  async function setupAlarm(force=false){
    const stored=await getStorage(CONFIG_KEY);
    const config=normalize(stored[CONFIG_KEY]);
    const existing=await chrome.alarms.get(ALARM);
    if(!config.enabled){
      if(existing)await chrome.alarms.clear(ALARM);
      return 0;
    }
    const period=config.intervalHours*60;
    if(force||!existing||Number(existing.periodInMinutes)!==period){
      if(existing)await chrome.alarms.clear(ALARM);
      chrome.alarms.create(ALARM,{
        delayInMinutes:period,periodInMinutes:period
      });
    }
    const alarm=await chrome.alarms.get(ALARM);
    return alarm&&alarm.scheduledTime||0;
  }
  function scheduleStep(){
    chrome.alarms.create(STEP,{when:Date.now()+30000});
    setTimeout(()=>advance().catch(()=>{}),150);
  }
  async function waitSourceTab(tabId,sourceUrl){
    const deadline=Date.now()+45000;
    while(Date.now()<deadline){
      let tab;
      try{tab=await chrome.tabs.get(tabId);}catch(_){throw new Error('Tab nguồn tự động đã bị đóng.');}
      if(tab&&tab.status==='complete'&&tab.url===sourceUrl&&tab.active)return tab;
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    throw new Error('Danh mục nguồn tải quá lâu hoặc tab không còn được chọn.');
  }
  async function closeOwnWindow(cycle){
    if(!Number(cycle&&cycle.windowId))return;
    try{await chrome.windows.remove(Number(cycle.windowId));}catch(_){}
  }
  async function finish(cycle,status,message=''){
    await closeOwnWindow(cycle);
    await chrome.alarms.clear(STEP);
    const next={...cycle,phase:status,running:false,windowId:0,tabId:0,
      finishedAt:Date.now(),error:text(message)};
    await setCycle(next);
    return next;
  }
  async function configuration(){
    const s=await getStorage(CONFIG_KEY);
    return normalize(s[CONFIG_KEY]);
  }
  async function getState(){
    const s=await getStorage([CONFIG_KEY,PROFILE_KEY,CYCLE_KEY,QUEUE_KEY]);
    const cfg=normalize(s[CONFIG_KEY]),sapo=cfg.sapo||{};
    const alarm=await chrome.alarms.get(ALARM);
    const cycle=s[CYCLE_KEY]||null;
    const q=s[QUEUE_KEY];
    return{
      config:{
        enabled:cfg.enabled,intervalHours:cfg.intervalHours,
        autoPushSapo:cfg.autoPushSapo,selectedProfileIds:cfg.selectedProfileIds,
        profileUrls:cfg.profileUrls,
        sapoConnected:Boolean(sapo.verifiedAt&&sapo.locationId&&sapo.apiKey&&sapo.apiSecret),
        locationName:text(sapo.locationName),storeHost:text(sapo.storeHost)
      },
      profiles:(Array.isArray(s[PROFILE_KEY])?s[PROFILE_KEY]:[])
        .map(p=>({id:text(p&&p.id),name:text(p&&p.name),url:text(p&&p.lastSourceUrl),
          productCount:Number(p&&p.productCount||0)}))
        .filter(p=>p.id&&validUrl(p.url)),
      cycle:cycle?{
        id:cycle.id,phase:cycle.phase,running:cycle.running,
        profileIds:cycle.profileIds,index:cycle.index,
        currentName:cycle.currentName,scanned:(cycle.scans||[]).length,
        errors:cycle.errors||[],error:cycle.error||'',
        startedAt:cycle.startedAt,finishedAt:cycle.finishedAt,
        pushTotal:cycle.pushTotal||0
      }:null,
      push:q&&q.source==='auto'?{
        status:q.status,total:q.total,index:q.index,success:q.success,
        failed:q.failed,manualPaused:q.manualPaused,cycleId:q.autoCycleId
      }:null,
      nextRunAt:alarm&&alarm.scheduledTime||0
    };
  }
  async function configure(request){
    const stored=await getStorage([CONFIG_KEY,PROFILE_KEY,CYCLE_KEY]);
    const old=normalize(stored[CONFIG_KEY]);
    const profiles=Array.isArray(stored[PROFILE_KEY])?stored[PROFILE_KEY]:[];
    const catalog=new Map(profiles.map(p=>[text(p&&p.id),p]));
    const ids=[...new Set((Array.isArray(request.profileIds)?request.profileIds:[])
      .map(text).filter(Boolean))];
    const hours=Number(request.intervalHours);
    if(![1,2,3,6,12,24].includes(hours))throw new Error('Chu kỳ phải là 1, 2, 3, 6, 12 hoặc 24 giờ.');
    for(const id of ids){
      const p=catalog.get(id);
      if(!p||!validUrl(p.lastSourceUrl))throw new Error('Hồ sơ không có URL nguồn hợp lệ: '+id);
    }
    if(request.enabled&&!ids.length)throw new Error('Chọn ít nhất một danh mục đã lưu trước khi bật tự động.');
    const sapo=old.sapo||{};
    if(request.autoPushSapo&&!(
      sapo.verifiedAt&&sapo.locationId&&text(sapo.storeHost)&&text(sapo.apiKey)&&text(sapo.apiSecret)
    ))throw new Error('Hãy kết nối và xác minh kho Sapo trong ĐẦU RA trước khi bật tự đẩy.');
    const current=stored[CYCLE_KEY];
    if(current&&current.running&&request.enabled&&
      (ids.join('|')!==current.profileIds.join('|')||hours!==old.intervalHours)){
      throw new Error('Đang quét. Đợi lượt hiện tại xong hoặc tắt tự động trước khi đổi danh mục/lịch.');
    }
    const next={...old,enabled:request.enabled===true,
      autoPushSapo:request.autoPushSapo===true,
      intervalHours:hours,selectedProfileIds:ids,updatedAt:Date.now()};
    await chrome.storage.local.set({[CONFIG_KEY]:next});
    const nextRunAt=await setupAlarm(true);
    if(!next.enabled&&current&&current.running){
      await finish(current,'failed','Người dùng đã tắt lịch tự động; không đẩy Sapo.');
    }
    return{nextRunAt};
  }
  async function startCycle(){
    if(starting)return{started:false,reason:'starting'};
    starting=true;
    try{
      const s=await getStorage([CONFIG_KEY,PROFILE_KEY,CYCLE_KEY,QUEUE_KEY,JOB_KEY]);
      const cfg=normalize(s[CONFIG_KEY]);
      if(!cfg.enabled)return{started:false,reason:'disabled'};
      if(s[CYCLE_KEY]&&!TERMINAL.includes(s[CYCLE_KEY].phase))return{started:false,reason:'cycle-active'};
      if(s[JOB_KEY]&&s[JOB_KEY].running)return{started:false,reason:'scanner-busy'};
      if(isBusyQueue(s[QUEUE_KEY]))return{started:false,reason:'push-busy'};
      const pmap=new Map((Array.isArray(s[PROFILE_KEY])?s[PROFILE_KEY]:[])
        .map(p=>[text(p&&p.id),p]));
      if(!cfg.selectedProfileIds.length)throw new Error('Chưa chọn tab nguồn tự động.');
      for(const id of cfg.selectedProfileIds){
        if(!pmap.has(id)||!validUrl(pmap.get(id).lastSourceUrl))
          throw new Error('Hồ sơ '+id+' không còn URL nguồn hợp lệ.');
      }
      const id='auto-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
      const cycle={
        id,phase:'next',running:true,profileIds:[...cfg.selectedProfileIds],
        index:0,scans:[],errors:[],startedAt:Date.now(),currentName:'',
        autoPushRequested:cfg.autoPushSapo,windowId:0,tabId:0
      };
      await setCycle(cycle);
      scheduleStep();
      return{started:true,id};
    }finally{starting=false;}
  }
  async function advance(){
    if(stepping)return;
    stepping=true;
    try{
      const stored=await getStorage([CYCLE_KEY,CONFIG_KEY,PROFILE_KEY,JOB_KEY,BATCH_KEY,QUEUE_KEY]);
      let cycle=stored[CYCLE_KEY];
      if(!cycle||!cycle.running)return;
      const cfg=normalize(stored[CONFIG_KEY]);
      if(!cfg.enabled){await finish(cycle,'failed','Tự động đã bị tắt.');return;}
      if(cycle.phase==='scan'){
        const job=stored[JOB_KEY];
        if(!job||job.id!==cycle.jobId||job.autoCycleId!==cycle.id){
          await finish(cycle,'failed','Lượt quét nguồn bị thay thế; đã dừng tự ghi.');
          return;
        }
        if(job.running)return;
        const entry=(stored[BATCH_KEY]||{})[cycle.currentProfileId];
        if(job.status!=='done'||!entry||entry.jobId!==job.id
           ||entry.autoCycleId!==cycle.id||entry.auto!==true||entry.partial
           ||!quality.trustedEntry(entry)){
          await finish(cycle,'failed','Tab '+cycle.currentName+' chưa quét đủ/đúng SKU, size, màu. Không đẩy Sapo.');
          return;
        }
        cycle.scans.push({
          profileId:cycle.currentProfileId,jobId:job.id,scannedAt:entry.scannedAt,
          rowCount:entry.rowCount
        });
        await closeOwnWindow(cycle);
        cycle={...cycle,index:cycle.index+1,phase:'next',windowId:0,tabId:0,
          jobId:'',currentProfileId:'',currentName:''};
        await setCycle(cycle);
        scheduleStep();
        return;
      }
      if(cycle.phase==='next'){
        if(cycle.index>=cycle.profileIds.length){
          if(!cycle.autoPushRequested||!cfg.autoPushSapo){
            await finish(cycle,'scan-only','Quét đủ danh mục; lượt này chưa được bật quyền tự đẩy Sapo.');
            return;
          }
          cycle={...cycle,phase:'ready-to-push'};
          await setCycle(cycle);
          scheduleStep();
          return;
        }
        const id=cycle.profileIds[cycle.index];
        const profile=(Array.isArray(stored[PROFILE_KEY])?stored[PROFILE_KEY]:[])
          .find(p=>text(p&&p.id)===id);
        const url=text(profile&&profile.lastSourceUrl);
        if(!validUrl(url)){await finish(cycle,'failed','URL danh mục không còn hợp lệ: '+id);return;}
        const window=await chrome.windows.create({url,focused:false,type:'normal',width:1000,height:750});
        const tab=window&&window.tabs&&window.tabs[0];
        if(!tab||!tab.id){
          await finish({...cycle,windowId:Number(window&&window.id)||0},'failed','Không tạo được tab nguồn.');
          return;
        }
        cycle={...cycle,phase:'launching',windowId:window.id,tabId:tab.id,
          currentProfileId:id,currentName:text(profile.name)||id};
        await setCycle(cycle);
        await waitSourceTab(tab.id,url);
        const job=await runner.startJob({
          profileId:id,sourceUrl:url,sourceTabId:tab.id,
          pageTitle:text(profile.pageTitle||profile.name),scope:'all',autoCycleId:cycle.id
        });
        cycle={...cycle,phase:'scan',jobId:job.id};
        await setCycle(cycle);
        scheduleStep();
        return;
      }
      if(cycle.phase==='ready-to-push'){
        if(!cfg.autoPushSapo||!cycle.autoPushRequested){
          await finish(cycle,'scan-only','Tự đẩy phải được bật trước khi bắt đầu lượt quét.');return;
        }
        if(cycle.scans.length!==cycle.profileIds.length){
          await finish(cycle,'failed','Thiếu kết quả danh mục; không đẩy tồn.');return;
        }
        const result=await sapoBridge.enqueueVerifiedAutoCycle(cycle);
        cycle={...cycle,phase:'pushing',pushTotal:result.total,queueId:result.queueId};
        await setCycle(cycle);
        scheduleStep();
        return;
      }
      if(cycle.phase==='pushing'){
        const q=stored[QUEUE_KEY];
        if(!q||q.source!=='auto'||q.autoCycleId!==cycle.id
          ||q.id!==cycle.queueId){
          await finish(cycle,'failed','Không còn hàng đợi Sapo của lượt này.');return;
        }
        if(q.manualPaused){
          cycle={...cycle,phase:'push-paused',running:false,
            error:'Sapo tạm dừng do lỗi/API giới hạn. Kiểm tra trước khi tiếp tục.',
            finishedAt:Date.now()};
          await setCycle(cycle);
          return;
        }
        if(q.status==='done'||q.status==='done-with-errors'){
          await finish(cycle,q.status==='done'?'done':'failed',
            q.status==='done'?'Đã đồng bộ đầy đủ lên Sapo.':'Có SKU ghi thất bại; kiểm tra nhật ký.');
          return;
        }
        return;
      }
      if(cycle.phase==='launching'){
        // On a worker restart midway through tab creation, fail closed rather
        // than spawning duplicate scans and writing stale stock.
        await finish(cycle,'failed','Bị gián đoạn khi mở tab. Chạy lại an toàn.');
      }
    }catch(err){
      const stored=await getStorage(CYCLE_KEY);
      const cycle=stored[CYCLE_KEY];
      if(cycle&&cycle.running)await finish(cycle,'failed',reason(err));
    }finally{stepping=false;}
  }
  async function resumePush(){
    const data=await getStorage(CYCLE_KEY),cycle=data[CYCLE_KEY];
    if(!cycle||cycle.phase!=='push-paused')throw new Error('Không có lượt tự đẩy đang tạm dừng.');
    const result=await sapoBridge.resumeAutoQueue(cycle.id);
    await setCycle({...cycle,phase:'pushing',running:true,error:''});
    scheduleStep();
    return result;
  }
  chrome.alarms.onAlarm.addListener(a=>{
    if(a.name===ALARM)startCycle().catch(()=>{});
    if(a.name===STEP)advance().catch(()=>{});
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes[JOB_KEY]){
      const job=changes[JOB_KEY].newValue;
      if(job&&job.autoCycleId&&job.running===false)scheduleStep();
    }
    if(changes[QUEUE_KEY]){
      const queue=changes[QUEUE_KEY].newValue;
      if(queue&&queue.source==='auto'&&(queue.manualPaused||['done','done-with-errors'].includes(queue.status)))
        scheduleStep();
    }
  });
  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(!message||!['DHL_SCHEDULED_GET','DHL_SCHEDULED_CONFIGURE',
      'DHL_SCHEDULED_RUN_NOW','DHL_SCHEDULED_RESUME_PUSH'].includes(message.type))return;
    const work=message.type==='DHL_SCHEDULED_GET'?getState():
      message.type==='DHL_SCHEDULED_CONFIGURE'?configure(message):
      message.type==='DHL_SCHEDULED_RUN_NOW'?startCycle():resumePush();
    work.then(result=>sendResponse({ok:true,result}))
      .catch(err=>sendResponse({ok:false,error:reason(err)}));
    return true;
  });
  chrome.runtime.onStartup.addListener(()=>setupAlarm().then(()=>advance()).catch(()=>{}));
  chrome.runtime.onInstalled.addListener(()=>setupAlarm().then(()=>advance()).catch(()=>{}));
  // Reattach to running scan after MV3 service-worker restart.
  setupAlarm().then(()=>advance()).catch(()=>{});
})();
