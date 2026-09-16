(() => {
  'use strict';

  const xlsx=globalThis.DHLXlsxLite;
  const matcher=globalThis.DHLMatchCore;
  const autoCore=globalThis.DHLAutoSyncCore;
  const batch=globalThis.DHLBatchStockCore;
  const historyCore=globalThis.DHLStockHistoryCore;
  const resolver=globalThis.DHLSapoInventoryResolver;
  if(!xlsx||!matcher||!autoCore||!batch||!historyCore||!resolver)return;

  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const STATUS_KEY='dhlAutoSyncStatusV1';
  const CYCLE_KEY='dhlAutoSyncCycleV1';
  const PROFILE_KEY='dhlSavedStockProfilesV1';
  const BATCH_KEY='dhlPendingStockBatchV1';
  const HISTORY_KEY='dhlStockScanHistoryV1';
  const SAPO_QUEUE_KEY='dhlSapoPushQueueV1';
  const SAPO_MAP_KEY='dhlSapoInventoryMapV1';
  const ALARM='dhl-auto-stock-sync';
  const STEP_ALARM='dhl-auto-stock-step';
  const PUSH_ALARM='dhl-sapo-push-queue';
  const MAX_HISTORY=60;
  const PUSH_CHUNK=20;
  const LIST_PAGE_LIMIT=250;
  const MAX_LIST_PAGES=12;

  const text=(v)=>String(v==null?'':v).trim();
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  let configSaveChain=Promise.resolve();

  function base64ToBuffer(value){
    const binary=atob(String(value||''));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);
    return bytes.buffer;
  }

  async function readConfig(){
    const s=await chrome.storage.local.get(CONFIG_KEY);
    return autoCore.normalizeConfig(s[CONFIG_KEY]);
  }

  async function writeStatus(patch){
    const s=await chrome.storage.local.get(STATUS_KEY);
    const current=s[STATUS_KEY]&&typeof s[STATUS_KEY]==='object'?s[STATUS_KEY]:{};
    await chrome.storage.local.set({[STATUS_KEY]:{...current,...patch,updatedAt:Date.now()}});
  }

  function storeHost(value){
    let raw=text(value).replace(/^https?:\/\//i,'').replace(/\/.*$/,'').toLowerCase();
    if(raw&&!raw.includes('.'))raw=`${raw}.mysapo.net`;
    if(!/^[a-z0-9][a-z0-9.-]*\.mysapo\.net$/i.test(raw))throw new Error('Tên shop Sapo phải dạng ten-shop.mysapo.net');
    return raw;
  }

  function authHeaders(sapo){
    const key=text(sapo&&sapo.apiKey),secret=text(sapo&&sapo.apiSecret);
    if(!key||!secret)throw new Error('Chưa nhập API Key / API Secret của ứng dụng riêng Sapo.');
    return{Authorization:`Basic ${btoa(`${key}:${secret}`)}`,Accept:'application/json','Content-Type':'application/json'};
  }

  async function sapoFetch(sapo,path,{method='GET',body=null}={}){
    const host=storeHost(sapo&&sapo.storeHost);
    const response=await fetch(`https://${host}${path}`,{method,headers:authHeaders(sapo),body:body==null?undefined:JSON.stringify(body)});
    const raw=await response.text();
    let data=null;
    try{data=raw?JSON.parse(raw):{};}catch{data={raw};}
    if(!response.ok){
      const detail=text(data&&data.message||data&&data.error||data&&data.errors||raw).slice(0,300);
      throw new Error(`Sapo HTTP ${response.status}${detail?`: ${detail}`:''}`);
    }
    return data||{};
  }

  async function testSapoConnection(input){
    const config=await readConfig();
    const sapo={...(config.sapo||{}),...(input||{})};
    sapo.storeHost=storeHost(sapo.storeHost);
    const shop=await sapoFetch(sapo,'/admin/store.json');
    const locationsData=await sapoFetch(sapo,'/admin/locations.json');
    const locations=Array.isArray(locationsData.locations)?locationsData.locations:Array.isArray(locationsData.data)?locationsData.data:[];
    if(!locations.length)throw new Error('Kết nối được Sapo nhưng không đọc được danh sách chi nhánh.');

    const state=await chrome.storage.local.get(PROFILE_KEY);
    const profiles=Array.isArray(state[PROFILE_KEY])?state[PROFILE_KEY]:[];
    const selected=new Set(config.selectedProfileIds||[]);
    const branchNames=[...new Set(profiles.filter(p=>selected.has(String(p.id))).map(p=>text(p.branchName)).filter(Boolean))];
    if(branchNames.length>1)throw new Error(`Các hồ sơ tự động đang khác chi nhánh: ${branchNames.join(', ')}`);
    const wanted=autoCore.plain(branchNames[0]||text(sapo.locationName));
    let location=null;
    if(Number(sapo.locationId))location=locations.find(x=>Number(x.id)===Number(sapo.locationId))||null;
    if(!location&&wanted)location=locations.find(x=>autoCore.plain(x&&x.name)===wanted)||null;
    if(!location&&locations.length===1)location=locations[0];
    if(!location)throw new Error(`Không tìm thấy chi nhánh Sapo khớp “${branchNames[0]||sapo.locationName||''}”.`);

    const verified={storeHost:sapo.storeHost,apiKey:text(sapo.apiKey),apiSecret:text(sapo.apiSecret),locationId:Number(location.id),locationName:text(location.name),locationCount:locations.length,verifiedAt:Date.now()};
    await saveConfig({sapo:verified});
    return{ok:true,storeName:text(shop&&shop.shop&&shop.shop.name||shop&&shop.store&&shop.store.name||sapo.storeHost),location:{id:verified.locationId,name:verified.locationName},locationCount:locations.length};
  }

  async function setupAlarm(){
    const config=await readConfig();
    await chrome.alarms.clear(ALARM);
    if(!config.enabled){
      await writeStatus({enabled:false,nextRunAt:0,intervalHours:config.intervalHours});
      return;
    }
    chrome.alarms.create(ALARM,{delayInMinutes:config.intervalHours*60,periodInMinutes:config.intervalHours*60});
    const alarm=await chrome.alarms.get(ALARM);
    await writeStatus({enabled:true,nextRunAt:alarm&&alarm.scheduledTime||0,intervalHours:config.intervalHours});
  }

  async function waitTabComplete(tabId,timeout=45000){
    const started=Date.now();
    while(Date.now()-started<timeout){
      try{const tab=await chrome.tabs.get(tabId);if(tab&&tab.status==='complete')return tab;}catch{}
      await sleep(250);
    }
    throw new Error('Trang nguồn tải quá lâu.');
  }

  async function sendScan(tabId,hints){
    try{return await chrome.tabs.sendMessage(tabId,{type:'DHL_SCAN_HD_LIVE',hints});}
    catch(error){
      if(!/Receiving end does not exist|Could not establish connection/i.test(String(error&&error.message||error)))throw error;
      for(const file of ['stock-core.js','dom-stock-parser.js','match-core.js','content.js'])await chrome.scripting.executeScript({target:{tabId},files:[file]});
      await sleep(250);
      return chrome.tabs.sendMessage(tabId,{type:'DHL_SCAN_HD_LIVE',hints});
    }
  }

  async function parseProfile(profile){
    if(!profile||!profile.warehouseBase64||!profile.catalogBase64)throw new Error('Hồ sơ chưa đủ 2 file Sapo.');
    const warehouseData=await xlsx.parseSapoExport(base64ToBuffer(profile.warehouseBase64));
    const catalogData=await xlsx.parseSapoExport(base64ToBuffer(profile.catalogBase64));
    if(!warehouseData||warehouseData.inputType!=='warehouse')throw new Error('File TỒN KHO đã lưu không đúng loại.');
    if(catalogData&&catalogData.inputType==='warehouse')throw new Error('File DANH SÁCH đang là file tồn kho.');
    const coverage=autoCore.skuCoverage(warehouseData,catalogData);
    if(coverage.matched!==coverage.total)throw new Error(`Hồ sơ chưa đủ SKU: ${coverage.matched}/${coverage.total}.`);
    return{warehouseData,catalogData};
  }

  async function recordHistory(profile,sourceUrl,sourceResults){
    const snap=historyCore.snapshotFromSource(sourceResults,{profileId:profile.id,profileName:profile.name,sourceUrl,at:Date.now(),matcher});
    if(!snap.items.length)return;
    const s=await chrome.storage.local.get(HISTORY_KEY);
    const history=s[HISTORY_KEY]&&typeof s[HISTORY_KEY]==='object'?s[HISTORY_KEY]:{};
    const list=Array.isArray(history[profile.id])?history[profile.id]:[];
    list.push(snap);if(list.length>MAX_HISTORY)list.splice(0,list.length-MAX_HISTORY);
    history[profile.id]=list;await chrome.storage.local.set({[HISTORY_KEY]:history});
  }

  async function scanProfile(profile,url,config){
    if(!autoCore.validSourceUrl(url))throw new Error('URL nguồn chưa hợp lệ hoặc đang là trang chi tiết sản phẩm.');
    const parsed=await parseProfile(profile),hints=matcher.buildScanHints(parsed.warehouseData.products);
    let tab=null;
    try{
      tab=await chrome.tabs.create({url,active:false});await waitTabComplete(tab.id);await sleep(500);
      const response=await sendScan(tab.id,hints);
      if(!response||!response.ok)throw new Error(response&&response.error||'Không nhận được dữ liệu nguồn.');
      const sourceResults=Array.isArray(response.result)?response.result:[];
      const prepared=autoCore.prepareRows(parsed.warehouseData,parsed.catalogData,sourceResults,matcher);
      if(!prepared.rows.length)throw new Error('Quét xong nhưng chưa ghép được dòng tồn kho nào.');
      const branch=text(parsed.warehouseData.warehouseBranchName||profile.branchName);if(!branch)throw new Error('Không đọc được tên chi nhánh từ hồ sơ.');
      const entry={profileId:profile.id,profileName:text(profile.name)||'Hồ sơ',branch,sourceUrl:url,scannedAt:Date.now(),variantTotal:Number((parsed.warehouseData.variants||[]).length),rowCount:prepared.rows.length,missingSkuCount:prepared.missingSku.length,rows:prepared.rows,auto:true};
      const s=await chrome.storage.local.get(BATCH_KEY),pending=s[BATCH_KEY]&&typeof s[BATCH_KEY]==='object'?s[BATCH_KEY]:{};
      await chrome.storage.local.set({[BATCH_KEY]:{...pending,[profile.id]:entry}});await recordHistory(profile,url,sourceResults);return entry;
    }finally{if(tab&&tab.id&&config.closeTabsAfterScan!==false){try{await chrome.tabs.remove(tab.id);}catch{}}}
  }

  async function startCycle(reason='alarm'){
    const config=await readConfig();
    if(reason==='alarm'&&!config.enabled)return{ok:false,reason:'disabled'};
    if(!config.selectedProfileIds.length)throw new Error('Chưa chọn hồ sơ nào cho chế độ tự động.');
    const q=await chrome.storage.local.get([CYCLE_KEY,SAPO_QUEUE_KEY]);
    if(q[CYCLE_KEY]&&q[CYCLE_KEY].running)return{ok:false,reason:'already-running'};
    if(q[SAPO_QUEUE_KEY]&&['running','queued'].includes(q[SAPO_QUEUE_KEY].status))return{ok:false,reason:'sapo-push-running'};
    const state=await chrome.storage.local.get(PROFILE_KEY),profiles=Array.isArray(state[PROFILE_KEY])?state[PROFILE_KEY]:[];
    const ids=config.selectedProfileIds.filter(id=>profiles.some(p=>String(p.id)===String(id)));if(!ids.length)throw new Error('Các hồ sơ đã chọn không còn tồn tại.');
    const next={id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,running:true,reason,startedAt:Date.now(),profileIds:ids,index:0,results:[],errors:[]};
    await chrome.storage.local.set({[CYCLE_KEY]:next});await writeStatus({running:true,lastRunAt:Date.now(),lastReason:reason,lastError:'',progress:`0/${ids.length}`});
    chrome.alarms.create(STEP_ALARM,{when:Date.now()+500});return{ok:true,cycleId:next.id};
  }

  async function processCycleStep(){
    const s=await chrome.storage.local.get([CYCLE_KEY,PROFILE_KEY,CONFIG_KEY]),cycle=s[CYCLE_KEY];if(!cycle||!cycle.running)return;
    const config=autoCore.normalizeConfig(s[CONFIG_KEY]),profiles=Array.isArray(s[PROFILE_KEY])?s[PROFILE_KEY]:[];
    if(cycle.index>=cycle.profileIds.length){await finalizeCycle(cycle,config);return;}
    const profileId=cycle.profileIds[cycle.index],profile=profiles.find(p=>String(p.id)===String(profileId));let result=null,error='';
    try{if(!profile)throw new Error('Hồ sơ không còn tồn tại.');const url=text(config.profileUrls[profile.id]||profile.lastSourceUrl);result=await scanProfile(profile,url,config);cycle.results.push({profileId:profile.id,profileName:profile.name,rowCount:result.rowCount,scannedAt:result.scannedAt,branch:result.branch});}
    catch(err){error=err&&err.message||String(err);cycle.errors.push({profileId,profileName:profile&&profile.name||profileId,error,at:Date.now()});}
    cycle.index+=1;await chrome.storage.local.set({[CYCLE_KEY]:cycle});await writeStatus({running:true,progress:`${cycle.index}/${cycle.profileIds.length}`,currentProfile:profile&&profile.name||'',lastStepError:error,results:cycle.results,errors:cycle.errors});
    if(cycle.index<cycle.profileIds.length)chrome.alarms.create(STEP_ALARM,{when:Date.now()+1500});else await finalizeCycle(cycle,config);
  }

  async function finalizeCycle(cycle,config){
    cycle.running=false;cycle.finishedAt=Date.now();await chrome.storage.local.set({[CYCLE_KEY]:cycle});
    const ok=cycle.errors.length===0&&cycle.results.length===cycle.profileIds.length;
    await writeStatus({running:false,lastFinishedAt:cycle.finishedAt,lastOkAt:ok?cycle.finishedAt:0,lastError:ok?'':`${cycle.errors.length} hồ sơ lỗi`,results:cycle.results,errors:cycle.errors,progress:`${cycle.results.length}/${cycle.profileIds.length}`});
    if(ok&&config.autoPushSapo===true&&config.sapo&&config.sapo.verifiedAt&&config.sapo.locationId)await enqueueSapoPush(config,cycle);
    const alarm=await chrome.alarms.get(ALARM);if(alarm)await writeStatus({nextRunAt:alarm.scheduledTime});
  }

  function pushState(queue,status,config,extra={}){
    const total=Number(queue&&queue.total||0),done=Number(queue&&queue.index||0),success=Number(queue&&queue.success||0);
    const errors=Array.isArray(queue&&queue.errors)?queue.errors:[],lastError=errors.length?errors[errors.length-1]:null;
    return{
      status,
      done,
      success,
      total,
      remaining:Math.max(0,total-done),
      failed:errors.length,
      lastError,
      shop:text(queue&&queue.host||config&&config.sapo&&config.sapo.storeHost),
      locationName:text(queue&&queue.locationName||config&&config.sapo&&config.sapo.locationName),
      startedAt:Number(queue&&queue.startedAt||queue&&queue.createdAt||0),
      finishedAt:Number(queue&&queue.finishedAt||0),
      ...extra
    };
  }

  async function enqueueSapoPush(config,cycle){
    const s=await chrome.storage.local.get(BATCH_KEY),pending=s[BATCH_KEY]&&typeof s[BATCH_KEY]==='object'?s[BATCH_KEY]:{};
    const combined=batch.combineEntries(cycle.profileIds.map(id=>pending[id]).filter(Boolean));
    const startedAt=Date.now();
    const queue={id:`push-${startedAt}`,status:'running',createdAt:startedAt,startedAt,host:storeHost(config.sapo.storeHost),locationId:Number(config.sapo.locationId),locationName:text(config.sapo.locationName),rows:combined.rows,index:0,total:combined.rows.length,success:0,successRows:[],errors:[],profileCount:combined.profileCount};
    await chrome.storage.local.set({[SAPO_QUEUE_KEY]:queue});await writeStatus({push:pushState(queue,'queued',config)});chrome.alarms.create(PUSH_ALARM,{when:Date.now()+1000});
  }

  function findExactVariant(candidates,row){
    const variantId=Number(row&&row.variantId);
    if(!variantId)return null;
    return (Array.isArray(candidates)?candidates:[]).find(x=>Number(x&&x.variant_id)===variantId)||null;
  }

  function findSkuFallback(candidates,row){
    const sku=resolver.normSku(row&&row.sku);
    if(!sku)return null;
    return (Array.isArray(candidates)?candidates:[]).find(x=>resolver.normSku(x&&x.sku)===sku)||null;
  }

  async function tryInventoryQuery(sapo,row,params,mode='auto'){
    // Lookup inventory item không phụ thuộc location_id. Chi nhánh chỉ dùng ở bước PUT tồn kho.
    const q=new URLSearchParams({...params,limit:'50'});
    const data=await sapoFetch(sapo,`/admin/inventory_items.json?${q.toString()}`);
    const candidates=resolver.inventoryCandidates(data);
    let item=null;
    if(mode==='variant')item=findExactVariant(candidates,row);
    else if(mode==='sku')item=findSkuFallback(candidates,row);
    else item=resolver.findCandidate(candidates,row);
    return item&&Number(item.id)?item:null;
  }

  async function resolveInventoryItem(sapo,row,map){
    const mapKey=`${storeHost(sapo.storeHost)}|${Number(sapo.locationId)}|${Number(row.variantId)}`;
    if(map[mapKey])return{itemId:Number(map[mapKey]),mapKey,cached:true,method:'cache'};
    const attempts=[];

    // Khóa chính là variant_id. SKU không được dùng để loại một inventory item có variant_id đúng.
    if(Number(row.variantId)){
      try{
        const item=await tryInventoryQuery(sapo,row,{variant_id:String(row.variantId)},'variant');
        if(item){map[mapKey]=Number(item.id);return{itemId:Number(item.id),mapKey,cached:false,method:'variant_id'};}
      }catch(err){attempts.push(err&&err.message||String(err));}

      // Một số phiên bản API trả inventory_item_id trực tiếp ở endpoint variant.
      try{
        const variantData=await sapoFetch(sapo,`/admin/variants/${Number(row.variantId)}.json`);
        const itemId=resolver.variantInventoryItemId(variantData);
        if(itemId){map[mapKey]=itemId;return{itemId,mapKey,cached:false,method:'variant.inventory_item_id'};}
      }catch(err){attempts.push(err&&err.message||String(err));}
    }

    // SKU chỉ là fallback sau khi toàn bộ đường variant_id không tìm được.
    if(text(row.sku)){
      try{
        const item=await tryInventoryQuery(sapo,row,{sku:text(row.sku)},'sku');
        if(item){map[mapKey]=Number(item.id);return{itemId:Number(item.id),mapKey,cached:false,method:'sku'};}
      }catch(err){attempts.push(err&&err.message||String(err));}
    }

    if(Number(row.productId)){
      try{
        const item=await tryInventoryQuery(sapo,row,{product_id:String(row.productId)});
        if(item){map[mapKey]=Number(item.id);return{itemId:Number(item.id),mapKey,cached:false,method:'product_id'};}
      }catch(err){attempts.push(err&&err.message||String(err));}
    }

    // Fallback cuối: API có thể bỏ qua filter. Quét danh sách KHÔNG kèm location_id,
    // ưu tiên tìm đúng variant trên mọi trang rồi mới dùng SKU fallback.
    let skuFallback=null;
    for(let page=1;page<=MAX_LIST_PAGES;page+=1){
      try{
        const q=new URLSearchParams({limit:String(LIST_PAGE_LIMIT),page:String(page)});
        const data=await sapoFetch(sapo,`/admin/inventory_items.json?${q.toString()}`),candidates=resolver.inventoryCandidates(data);
        const exact=findExactVariant(candidates,row);
        if(exact&&Number(exact.id)){map[mapKey]=Number(exact.id);return{itemId:Number(exact.id),mapKey,cached:false,method:`list-variant-page-${page}`};}
        if(!skuFallback)skuFallback=findSkuFallback(candidates,row);
        if(candidates.length<LIST_PAGE_LIMIT)break;
      }catch(err){attempts.push(err&&err.message||String(err));break;}
    }
    if(skuFallback&&Number(skuFallback.id)){
      map[mapKey]=Number(skuFallback.id);
      return{itemId:Number(skuFallback.id),mapKey,cached:false,method:'list-sku-fallback'};
    }

    const extra=attempts.length?` • API: ${attempts[attempts.length-1]}`:'';
    throw new Error(`Không tìm thấy inventory item cho SKU ${text(row.sku)||'—'} / variant ${Number(row.variantId)||'—'}${extra}`);
  }

  async function processSapoQueue(){
    const s=await chrome.storage.local.get([SAPO_QUEUE_KEY,SAPO_MAP_KEY,CONFIG_KEY]),queue=s[SAPO_QUEUE_KEY],config=autoCore.normalizeConfig(s[CONFIG_KEY]);
    if(!queue||queue.status!=='running')return;
    queue.successRows=Array.isArray(queue.successRows)?queue.successRows:[];
    queue.errors=Array.isArray(queue.errors)?queue.errors:[];
    if(!config.autoPushSapo||!config.sapo||!config.sapo.verifiedAt){
      const row=Array.isArray(queue.rows)?queue.rows[queue.index]||{}:{};
      queue.status='paused';
      queue.errors.push({at:Date.now(),index:queue.index,sku:text(row.sku),variantId:Number(row.variantId)||0,stock:Number(row.stock),error:'Tự ghi Sapo đã bị tắt hoặc mất xác minh.'});
      await chrome.storage.local.set({[SAPO_QUEUE_KEY]:queue});
      await writeStatus({push:pushState(queue,'error',config,{error:'Tự ghi Sapo đã bị tắt hoặc mất xác minh.'})});
      return;
    }
    const map=s[SAPO_MAP_KEY]&&typeof s[SAPO_MAP_KEY]==='object'?s[SAPO_MAP_KEY]:{},end=Math.min(queue.total,queue.index+PUSH_CHUNK);
    try{
      while(queue.index<end){
        const row=queue.rows[queue.index],rowIndex=queue.index;
        const resolved=await resolveInventoryItem(config.sapo,row,map);
        await sleep(1200);
        await sapoFetch(config.sapo,`/admin/inventory_items/${resolved.itemId}/locations/${Number(config.sapo.locationId)}.json`,{method:'PUT',body:{inventory_level:{available:Number(row.stock)}}});
        queue.success=Number(queue.success||0)+1;
        queue.successRows.push({index:rowIndex,sku:text(row.sku),variantId:Number(row.variantId)||0,productId:Number(row.productId)||0,stock:Number(row.stock),itemId:resolved.itemId,method:resolved.method,at:Date.now()});
        queue.index+=1;

        // Lưu NGAY sau từng dòng thành công để service worker dừng giữa chừng cũng không ghi lại từ đầu.
        await chrome.storage.local.set({[SAPO_MAP_KEY]:map,[SAPO_QUEUE_KEY]:queue});
        await writeStatus({push:pushState(queue,'running',config)});
        await sleep(1200);
      }
      if(queue.index>=queue.total){
        queue.status='done';queue.finishedAt=Date.now();
        await chrome.storage.local.set({[SAPO_MAP_KEY]:map,[SAPO_QUEUE_KEY]:queue});
        await writeStatus({push:pushState(queue,'done',config)});
      }else{
        await writeStatus({push:pushState(queue,'running',config)});
        chrome.alarms.create(PUSH_ALARM,{when:Date.now()+65000});
      }
    }catch(err){
      const row=queue.rows[queue.index]||{};
      const lastError={at:Date.now(),index:queue.index,sku:text(row.sku),variantId:Number(row.variantId)||0,stock:Number(row.stock),error:err&&err.message||String(err)};
      queue.status='paused';queue.errors.push(lastError);
      await chrome.storage.local.set({[SAPO_MAP_KEY]:map,[SAPO_QUEUE_KEY]:queue});
      await writeStatus({push:pushState(queue,'error',config,{error:lastError.error})});
    }
  }

  async function saveConfigNow(raw){
    const current=await readConfig(),next=autoCore.normalizeConfig({...current,...raw,updatedAt:Date.now()});
    if(next.autoPushSapo&&!(next.sapo&&next.sapo.verifiedAt&&next.sapo.locationId))next.autoPushSapo=false;
    await chrome.storage.local.set({[CONFIG_KEY]:next});
    await setupAlarm();
    return next;
  }

  function saveConfig(raw){
    const run=()=>saveConfigNow(raw||{});
    const pending=configSaveChain.then(run,run);
    configSaveChain=pending.catch(()=>{});
    return pending;
  }

  chrome.alarms.onAlarm.addListener((alarm)=>{
    if(alarm.name===ALARM)startCycle('alarm').catch(err=>writeStatus({running:false,lastError:err.message||String(err)}));
    else if(alarm.name===STEP_ALARM)processCycleStep().catch(err=>writeStatus({running:false,lastError:err.message||String(err)}));
    else if(alarm.name===PUSH_ALARM)processSapoQueue().catch(err=>writeStatus({push:{status:'error',error:err.message||String(err)}}));
  });

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(!message||!message.type)return;
    if(message.type==='DHL_AUTO_GET_STATE'){
      Promise.all([readConfig(),chrome.storage.local.get([STATUS_KEY,SAPO_QUEUE_KEY])]).then(([config,s])=>sendResponse({ok:true,config,status:s[STATUS_KEY]||{},pushQueue:s[SAPO_QUEUE_KEY]||null})).catch(e=>sendResponse({ok:false,error:e.message||String(e)}));return true;
    }
    if(message.type==='DHL_AUTO_SAVE_CONFIG'){
      saveConfig(message.config||{}).then(config=>sendResponse({ok:true,config})).catch(e=>sendResponse({ok:false,error:e.message||String(e)}));return true;
    }
    if(message.type==='DHL_AUTO_RUN_NOW'){
      startCycle('manual').then(result=>sendResponse({ok:true,result})).catch(e=>sendResponse({ok:false,error:e.message||String(e)}));return true;
    }
    if(message.type==='DHL_SAPO_TEST'){
      testSapoConnection(message.sapo||{}).then(result=>sendResponse(result)).catch(e=>sendResponse({ok:false,error:e.message||String(e)}));return true;
    }
    if(message.type==='DHL_SAPO_RETRY_PUSH'){
      chrome.storage.local.get(SAPO_QUEUE_KEY).then(async s=>{const q=s[SAPO_QUEUE_KEY];if(q&&q.status==='paused'){q.status='running';await chrome.storage.local.set({[SAPO_QUEUE_KEY]:q});chrome.alarms.create(PUSH_ALARM,{when:Date.now()+500});sendResponse({ok:true});}else sendResponse({ok:false,error:'Không có hàng đợi Sapo đang tạm dừng.'});}).catch(e=>sendResponse({ok:false,error:e.message||String(e)}));return true;
    }
  });

  chrome.runtime.onStartup.addListener(()=>setupAlarm().catch(()=>{}));
  chrome.runtime.onInstalled.addListener(()=>setupAlarm().catch(()=>{}));
  setupAlarm().catch(()=>{});
})();
