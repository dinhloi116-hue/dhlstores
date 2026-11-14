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

  // Legacy v0.26.0 periodic scheduling is retired. The Chrome alarm below
  // is ONLY a continuation/wake-up signal for a user-started scan.
  async function clearLegacySchedule(){
    await chrome.alarms.clear(ALARM);
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
    const cycle=s[CYCLE_KEY]||null;
    const q=s[QUEUE_KEY];
    return{
      config:{
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
      scheduleDisabled:true
    };
  }
  async function configure(request){
    const stored=await getStorage([CONFIG_KEY,PROFILE_KEY,CYCLE_KEY]);
    const old=normalize(stored[CONFIG_KEY]);
    const profiles=Array.isArray(stored[PROFILE_KEY])?stored[PROFILE_KEY]:[];
    const byId=new Map(profiles.map(p=>[text(p&&p.id),p]));
    const ids=[...new Set((Array.isArray(request.profileIds)?request.profileIds:[])
      .map(text).filter(Boolean))];
    if(!ids.length)throw new Error('Hãy chọn ít nhất một tab nguồn đã lưu.');
    for(const id of ids){
      const profile=byId.get(id);
      if(!profile||!validUrl(profile.lastSourceUrl))
        throw new Error('Danh mục không có URL nguồn hợp lệ: '+id);
    }
    const push=request.pushToSapo===true;
    const sapo=old.sapo||{};
    if(push&&!(sapo.verifiedAt&&sapo.locationId&&text(sapo.storeHost)
      &&text(sapo.apiKey)&&text(sapo.apiSecret)))
      throw new Error('Xác minh API và kho Sapo ở phần ĐẦU RA trước khi chọn đẩy trực tiếp.');
    const cycle=stored[CYCLE_KEY];
    if(cycle&&cycle.running)
      throw new Error('Đang đồng bộ. Chỉ thay đổi danh sách tab sau khi lượt này kết thúc.');
    // Always disable the old scheduled flag, including after upgrading from v0.26.0.
    const next={...old,enabled:false,autoPushSapo:push,
      selectedProfileIds:ids,updatedAt:Date.now()};
    await chrome.storage.local.set({[CONFIG_KEY]:next});
    await clearLegacySchedule();
    return{saved:true,count:ids.length,autoPushSapo:push};
  }
  async function startCycle(request={}){
    if(starting)return{started:false,reason:'starting'};
    starting=true;
    try{
      const s=await getStorage([CONFIG_KEY,PROFILE_KEY,CYCLE_KEY,QUEUE_KEY,JOB_KEY]);
      const cfg=normalize(s[CONFIG_KEY]);
      if(s[CYCLE_KEY]&&!TERMINAL.includes(s[CYCLE_KEY].phase))return{started:false,reason:'cycle-active'};
      if(s[JOB_KEY]&&s[JOB_KEY].running)return{started:false,reason:'scanner-busy'};
      if(s[QUEUE_KEY]&&['running','queued','paused','blocked-quality'].includes(s[QUEUE_KEY].status))
        return{started:false,reason:'push-busy'};
      if(s[QUEUE_KEY]&&s[QUEUE_KEY].manualPaused)
        return{started:false,reason:'push-paused'};
      const pmap=new Map((Array.isArray(s[PROFILE_KEY])?s[PROFILE_KEY]:[])
        .map(p=>[text(p&&p.id),p]));
      const hasExplicit=Array.isArray(request.profileIds);
      const ids=hasExplicit?[...new Set(request.profileIds.map(text).filter(Boolean))]
        :(cfg.selectedProfileIds.length?cfg.selectedProfileIds:
          [...pmap.values()].filter(p=>validUrl(p.lastSourceUrl)).map(p=>text(p.id)));
      if(!ids.length)throw new Error('Chưa có tab danh mục nguồn đã lưu để đồng bộ.');
      for(const id of ids){
        if(!pmap.has(id)||!validUrl(pmap.get(id).lastSourceUrl))
          throw new Error('Hồ sơ '+id+' không còn URL nguồn hợp lệ.');
      }
      const push=typeof request.pushToSapo==='boolean'?request.pushToSapo:cfg.autoPushSapo;
      if(push){
        const sapo=cfg.sapo||{};
        if(!(sapo.verifiedAt&&sapo.locationId&&text(sapo.storeHost)
          &&text(sapo.apiKey)&&text(sapo.apiSecret)))
          throw new Error('Chưa xác minh API và đúng kho Sapo, chỉ có thể quét và xem báo cáo.');
      }
      // One click both saves selected categories and starts ONE run; never set
      // enabled=true or schedule a recurring scan.
      await chrome.storage.local.set({[CONFIG_KEY]:{
        ...cfg,enabled:false,autoPushSapo:push,selectedProfileIds:ids,updatedAt:Date.now()
      }});
      await clearLegacySchedule();
      const id='auto-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
      const cycle={
        id,phase:'next',running:true,profileIds:[...ids],
        index:0,scans:[],errors:[],startedAt:Date.now(),currentName:'',
        autoPushRequested:push,windowId:0,tabId:0
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
      if(cycle.phase==='scan'){
        const job=stored[JOB_KEY];
        if(!job||job.id!==cycle.jobId||job.autoCycleId!==cycle.id){
          await finish(cycle,'failed','Lượt quét nguồn bị thay thế; đã dừng tự ghi.');
          return;
        }
        if(job.running){
          if(Date.now()-Number(cycle.tabStartedAt||cycle.startedAt)>90*60*1000){
            try{await runner.cancelNow();}catch(_){}
            await finish(cycle,'failed','Tab '+cycle.currentName+' quá thời gian quét 90 phút. Không đẩy Sapo.');
          }
          return;
        }
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
        cycle={...cycle,phase:'scan',jobId:job.id,tabStartedAt:Date.now()};
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
      message.type==='DHL_SCHEDULED_RUN_NOW'?startCycle(message):resumePush();
    work.then(result=>sendResponse({ok:true,result}))
      .catch(err=>sendResponse({ok:false,error:reason(err)}));
    return true;
  });
  chrome.runtime.onStartup.addListener(()=>clearLegacySchedule().then(()=>advance()).catch(()=>{}));
  chrome.runtime.onInstalled.addListener(()=>clearLegacySchedule().then(()=>advance()).catch(()=>{}));
  // Wake in-progress ONE-SHOT run after MV3 service-worker restart.
  clearLegacySchedule().then(()=>advance()).catch(()=>{});
})();
