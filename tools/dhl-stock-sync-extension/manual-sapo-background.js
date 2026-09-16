(() => {
  'use strict';

  const autoCore=globalThis.DHLAutoSyncCore;
  const batch=globalThis.DHLBatchStockCore;
  const resolver=globalThis.DHLSapoInventoryResolver;
  if(!autoCore||!batch||!resolver)return;

  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const STATUS_KEY='dhlAutoSyncStatusV1';
  const CYCLE_KEY='dhlAutoSyncCycleV1';
  const BATCH_KEY='dhlPendingStockBatchV1';
  const SAPO_QUEUE_KEY='dhlSapoPushQueueV1';
  const SAPO_MAP_KEY='dhlSapoInventoryMapV1';
  const MANUAL_ALARM='dhl-sapo-manual-push-queue';
  const AUTO_PUSH_ALARM='dhl-sapo-push-queue';
  const PUSH_CHUNK=20;
  const LIST_PAGE_LIMIT=250;
  const MAX_LIST_PAGES=12;

  const text=(v)=>String(v==null?'':v).trim();
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

  async function readConfig(){
    const s=await chrome.storage.local.get(CONFIG_KEY);
    return autoCore.normalizeConfig(s[CONFIG_KEY]);
  }

  async function writePushStatus(push){
    const s=await chrome.storage.local.get(STATUS_KEY);
    const current=s[STATUS_KEY]&&typeof s[STATUS_KEY]==='object'?s[STATUS_KEY]:{};
    await chrome.storage.local.set({[STATUS_KEY]:{...current,push,updatedAt:Date.now()}});
  }

  function storeHost(value){
    let raw=text(value).replace(/^https?:\/\//i,'').replace(/\/.*$/,'').toLowerCase();
    if(raw&&!raw.includes('.'))raw=`${raw}.mysapo.net`;
    if(!/^[a-z0-9][a-z0-9.-]*\.mysapo\.net$/i.test(raw))throw new Error('Tên shop Sapo phải dạng ten-shop.mysapo.net');
    return raw;
  }

  function authHeaders(sapo){
    const key=text(sapo&&sapo.apiKey),secret=text(sapo&&sapo.apiSecret);
    if(!key||!secret)throw new Error('Chưa có API Key / API Secret của Ứng dụng riêng Sapo.');
    return{Authorization:`Basic ${btoa(`${key}:${secret}`)}`,Accept:'application/json','Content-Type':'application/json'};
  }

  async function sapoFetch(sapo,path,{method='GET',body=null}={}){
    const host=storeHost(sapo&&sapo.storeHost);
    const response=await fetch(`https://${host}${path}`,{method,headers:authHeaders(sapo),body:body==null?undefined:JSON.stringify(body)});
    const raw=await response.text();
    let data={};
    try{data=raw?JSON.parse(raw):{};}catch{data={raw};}
    if(!response.ok){
      const detail=text(data&&data.message||data&&data.error||data&&data.errors||raw).slice(0,300);
      throw new Error(`Sapo HTTP ${response.status}${detail?`: ${detail}`:''}`);
    }
    return data||{};
  }

  function pushState(queue,status,config,extra={}){
    const total=Number(queue&&queue.total||0),done=Number(queue&&queue.index||0),success=Number(queue&&queue.success||0);
    const errors=Array.isArray(queue&&queue.errors)?queue.errors:[];
    return{
      status,done,success,total,remaining:Math.max(0,total-done),failed:errors.length,
      lastError:errors.length?errors[errors.length-1]:null,
      shop:text(queue&&queue.host||config&&config.sapo&&config.sapo.storeHost),
      locationName:text(queue&&queue.locationName||config&&config.sapo&&config.sapo.locationName),
      startedAt:Number(queue&&queue.startedAt||queue&&queue.createdAt||0),
      finishedAt:Number(queue&&queue.finishedAt||0),source:'manual',...extra
    };
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
    if(map[mapKey])return{itemId:Number(map[mapKey]),method:'cache'};
    const attempts=[];

    if(Number(row.variantId)){
      try{
        const item=await tryInventoryQuery(sapo,row,{variant_id:String(row.variantId)},'variant');
        if(item){map[mapKey]=Number(item.id);return{itemId:Number(item.id),method:'variant_id'};}
      }catch(err){attempts.push(err&&err.message||String(err));}
      try{
        const variantData=await sapoFetch(sapo,`/admin/variants/${Number(row.variantId)}.json`);
        const itemId=resolver.variantInventoryItemId(variantData);
        if(itemId){map[mapKey]=itemId;return{itemId,method:'variant.inventory_item_id'};}
      }catch(err){attempts.push(err&&err.message||String(err));}
    }

    if(text(row.sku)){
      try{
        const item=await tryInventoryQuery(sapo,row,{sku:text(row.sku)},'sku');
        if(item){map[mapKey]=Number(item.id);return{itemId:Number(item.id),method:'sku'};}
      }catch(err){attempts.push(err&&err.message||String(err));}
    }

    if(Number(row.productId)){
      try{
        const item=await tryInventoryQuery(sapo,row,{product_id:String(row.productId)});
        if(item){map[mapKey]=Number(item.id);return{itemId:Number(item.id),method:'product_id'};}
      }catch(err){attempts.push(err&&err.message||String(err));}
    }

    let skuFallback=null;
    for(let page=1;page<=MAX_LIST_PAGES;page+=1){
      try{
        const q=new URLSearchParams({limit:String(LIST_PAGE_LIMIT),page:String(page)});
        const data=await sapoFetch(sapo,`/admin/inventory_items.json?${q.toString()}`);
        const candidates=resolver.inventoryCandidates(data);
        const exact=findExactVariant(candidates,row);
        if(exact&&Number(exact.id)){map[mapKey]=Number(exact.id);return{itemId:Number(exact.id),method:`list-variant-page-${page}`};}
        if(!skuFallback)skuFallback=findSkuFallback(candidates,row);
        if(candidates.length<LIST_PAGE_LIMIT)break;
      }catch(err){attempts.push(err&&err.message||String(err));break;}
    }
    if(skuFallback&&Number(skuFallback.id)){
      map[mapKey]=Number(skuFallback.id);
      return{itemId:Number(skuFallback.id),method:'list-sku-fallback'};
    }

    const extra=attempts.length?` • API: ${attempts[attempts.length-1]}`:'';
    throw new Error(`Không tìm thấy inventory item cho SKU ${text(row.sku)||'—'} / variant ${Number(row.variantId)||'—'}${extra}`);
  }

  async function enqueueOrResume(profileIds){
    const config=await readConfig();
    if(!config.sapo||!config.sapo.verifiedAt||!config.sapo.locationId)throw new Error('Chưa xác minh Ứng dụng riêng Sapo. Hãy KIỂM TRA KẾT NỐI SAPO trước.');

    const state=await chrome.storage.local.get([SAPO_QUEUE_KEY,CYCLE_KEY,BATCH_KEY]);
    const existing=state[SAPO_QUEUE_KEY];
    const cycle=state[CYCLE_KEY];
    if(cycle&&cycle.running)throw new Error('Đang có lượt quét tự động chạy. Chờ quét xong rồi đẩy Sapo thủ công.');

    if(existing&&existing.source==='manual'&&existing.status==='running'&&existing.manualPaused===true){
      existing.manualPaused=false;
      await chrome.storage.local.set({[SAPO_QUEUE_KEY]:existing});
      await chrome.alarms.clear(AUTO_PUSH_ALARM);
      await writePushStatus(pushState(existing,'running',config));
      chrome.alarms.create(MANUAL_ALARM,{when:Date.now()+500});
      return{resumed:true,total:existing.total,index:existing.index};
    }
    if(existing&&['running','queued'].includes(existing.status))throw new Error('Đang có hàng đợi ghi Sapo khác. Chờ hàng đợi hiện tại hoàn tất.');

    const pending=state[BATCH_KEY]&&typeof state[BATCH_KEY]==='object'?state[BATCH_KEY]:{};
    const ids=Array.isArray(profileIds)?profileIds.map(String).filter(Boolean):[];
    const entries=(ids.length?ids.map(id=>pending[id]):Object.values(pending)).filter(Boolean);
    if(!entries.length)throw new Error('Chưa có kết quả quét thủ công để đẩy lên Sapo.');
    const combined=batch.combineEntries(entries);
    if(!combined.rows.length)throw new Error('Kết quả quét chưa có dòng tồn kho hợp lệ.');

    const startedAt=Date.now();
    const queue={
      id:`manual-push-${startedAt}`,source:'manual',manualPaused:false,status:'running',createdAt:startedAt,startedAt,
      host:storeHost(config.sapo.storeHost),locationId:Number(config.sapo.locationId),locationName:text(config.sapo.locationName),
      rows:combined.rows,index:0,total:combined.rows.length,success:0,successRows:[],errors:[],profileCount:combined.profileCount,profileIds:ids
    };
    await chrome.alarms.clear(AUTO_PUSH_ALARM);
    await chrome.storage.local.set({[SAPO_QUEUE_KEY]:queue});
    await writePushStatus(pushState(queue,'queued',config));
    chrome.alarms.create(MANUAL_ALARM,{when:Date.now()+700});
    return{resumed:false,total:queue.total,index:0};
  }

  async function processManualQueue(){
    const s=await chrome.storage.local.get([SAPO_QUEUE_KEY,SAPO_MAP_KEY,CONFIG_KEY]);
    const queue=s[SAPO_QUEUE_KEY],config=autoCore.normalizeConfig(s[CONFIG_KEY]);
    if(!queue||queue.source!=='manual'||queue.status!=='running'||queue.manualPaused===true)return;
    queue.successRows=Array.isArray(queue.successRows)?queue.successRows:[];
    queue.errors=Array.isArray(queue.errors)?queue.errors:[];
    if(!config.sapo||!config.sapo.verifiedAt||!config.sapo.locationId){
      queue.manualPaused=true;
      const row=Array.isArray(queue.rows)?queue.rows[queue.index]||{}:{};
      queue.errors.push({at:Date.now(),index:queue.index,sku:text(row.sku),variantId:Number(row.variantId)||0,stock:Number(row.stock),error:'Mất xác minh Ứng dụng riêng Sapo.'});
      await chrome.storage.local.set({[SAPO_QUEUE_KEY]:queue});
      await writePushStatus(pushState(queue,'manual-error',config,{error:'Mất xác minh Ứng dụng riêng Sapo.'}));
      return;
    }

    const map=s[SAPO_MAP_KEY]&&typeof s[SAPO_MAP_KEY]==='object'?s[SAPO_MAP_KEY]:{};
    const end=Math.min(queue.total,queue.index+PUSH_CHUNK);
    try{
      while(queue.index<end){
        const row=queue.rows[queue.index],rowIndex=queue.index;
        const resolved=await resolveInventoryItem(config.sapo,row,map);
        await sleep(1200);
        await sapoFetch(config.sapo,`/admin/inventory_items/${resolved.itemId}/locations/${Number(config.sapo.locationId)}.json`,{method:'PUT',body:{inventory_level:{available:Number(row.stock)}}});
        queue.success=Number(queue.success||0)+1;
        queue.successRows.push({index:rowIndex,sku:text(row.sku),variantId:Number(row.variantId)||0,productId:Number(row.productId)||0,stock:Number(row.stock),itemId:resolved.itemId,method:resolved.method,at:Date.now()});
        queue.index+=1;
        await chrome.storage.local.set({[SAPO_MAP_KEY]:map,[SAPO_QUEUE_KEY]:queue});
        await writePushStatus(pushState(queue,'running',config));
        await sleep(1200);
      }
      if(queue.index>=queue.total){
        queue.status='done';queue.manualPaused=false;queue.finishedAt=Date.now();
        await chrome.storage.local.set({[SAPO_MAP_KEY]:map,[SAPO_QUEUE_KEY]:queue});
        await writePushStatus(pushState(queue,'done',config));
      }else{
        await writePushStatus(pushState(queue,'running',config));
        chrome.alarms.create(MANUAL_ALARM,{when:Date.now()+65000});
      }
    }catch(err){
      const row=queue.rows[queue.index]||{};
      const lastError={at:Date.now(),index:queue.index,sku:text(row.sku),variantId:Number(row.variantId)||0,stock:Number(row.stock),error:err&&err.message||String(err)};
      queue.manualPaused=true;queue.errors.push(lastError);
      await chrome.storage.local.set({[SAPO_MAP_KEY]:map,[SAPO_QUEUE_KEY]:queue});
      await writePushStatus(pushState(queue,'manual-error',config,{error:lastError.error}));
    }
  }

  chrome.alarms.onAlarm.addListener(alarm=>{
    if(alarm.name===MANUAL_ALARM)processManualQueue().catch(async err=>{
      const config=await readConfig().catch(()=>({}));
      await writePushStatus({status:'manual-error',error:err&&err.message||String(err),source:'manual',shop:text(config&&config.sapo&&config.sapo.storeHost),locationName:text(config&&config.sapo&&config.sapo.locationName)}).catch(()=>{});
    });
  });

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(!message||message.type!=='DHL_SAPO_PUSH_MANUAL')return;
    enqueueOrResume(message.profileIds||[]).then(result=>sendResponse({ok:true,result})).catch(err=>sendResponse({ok:false,error:err&&err.message||String(err)}));
    return true;
  });
})();
