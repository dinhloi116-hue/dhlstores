(() => {
  'use strict';

  const autoCore=globalThis.DHLAutoSyncCore;
  const batch=globalThis.DHLBatchStockCore;
  const resolver=globalThis.DHLSapoInventoryResolver;
  const quality=globalThis.DHLScanQualityCore;
  const branchCore=globalThis.DHLStockBranchCore;
  const previewCore=globalThis.DHLStockPushPreviewCore;
  const excelSku=globalThis.DHLExcelSkuCore;
  if(!autoCore||!batch||!resolver||!quality||!branchCore||!previewCore||!excelSku)return;

  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const STATUS_KEY='dhlAutoSyncStatusV1';
  const CYCLE_KEY='dhlAutoSyncCycleV1';
  const BATCH_KEY='dhlManualPendingStockBatchV1';
  const SAPO_QUEUE_KEY='dhlSapoPushQueueV1';
  const PREVIEW_KEY='dhlSapoManualPreviewV1';
  const PREVIEW_TTL_MS=10*60*1000;
  const SAPO_MAP_KEY='dhlSapoInventoryMapV1';
  const MANUAL_ALARM='dhl-sapo-manual-push-queue';
  const AUTO_PUSH_ALARM='dhl-sapo-push-queue';
  const LEGACY_STOCK_QUEUE_CUTOFF=Date.parse('2026-09-28T00:00:00Z');
  const PUSH_CHUNK=12;
  // Four simultaneous stock operations balance low latency against Sapo
  // throttling. Each is an idempotent absolute stock SET, never additive.
  const MAX_PARALLEL_SKUS=4;
  let pushInFlight=false;
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

  function sapoErrorDetail(data,raw){
    const candidate=data&&typeof data==='object'?(data.message||data.error||data.errors||data):raw;
    if(candidate&&typeof candidate==='object'){
      try{return JSON.stringify(candidate).slice(0,500);}catch{return String(candidate).slice(0,500);}
    }
    return text(candidate||raw).slice(0,500);
  }

  async function sapoFetch(sapo,path,{method='GET',body=null}={}){
    const host=storeHost(sapo&&sapo.storeHost);
    const response=await fetch(`https://${host}${path}`,{method,headers:authHeaders(sapo),body:body==null?undefined:JSON.stringify(body)});
    const raw=await response.text();
    let data={};
    try{data=raw?JSON.parse(raw):{};}catch{data={raw};}
    if(!response.ok){
      const detail=sapoErrorDetail(data,raw);
      if(response.status===401){
        const code=/invalid_request/i.test(detail)?'invalid_request':'Unauthorized';
        const route=String(path).split('?')[0];
        // Do not include credentials or the Authorization header in errors.
        throw new Error(`Sapo HTTP 401 (${code}) tại ${route}: Sapo từ chối xác thực. Kiểm tra API Key + Secret lấy từ cùng một ỨNG DỤNG RIÊNG của shop ${host} (Sapo Web > Ứng dụng > Ứng dụng riêng); không dùng mã Partner/OAuth. Kiểm tra quyền Admin API rồi nhập lại cả hai mã và bấm KẾT NỐI & XÁC MINH KHO.`);
      }
      throw new Error(`Sapo HTTP ${response.status}${detail?`: ${detail}`:''}`);
    }
    return data||{};
  }

  // Connection is an explicit user action. Credentials are never embedded in
  // the extension source, logged, or returned by the connection response.
  async function connectSapo(request){
    const current=await readConfig();
    const previous=current&&current.sapo||{};
    const candidate={
      ...previous,
      storeHost:storeHost(text(request&&request.storeHost)||previous.storeHost),
      apiKey:text(request&&request.apiKey)||text(previous.apiKey),
      apiSecret:text(request&&request.apiSecret)||text(previous.apiSecret),
      verifiedAt:0,locationId:0,locationName:''
    };
    authHeaders(candidate);
    await sapoFetch(candidate,'/admin/store.json');
    const data=await sapoFetch(candidate,'/admin/locations.json');
    const locations=(Array.isArray(data&&data.locations)?data.locations:Array.isArray(data&&data.data)?data.data:[])
      .filter(x=>Number(x&&x.id)>0&&text(x&&x.name))
      .map(x=>({id:Number(x.id),name:text(x.name)}));
    if(!locations.length)throw new Error('Sapo chưa trả danh sách kho/chi nhánh. Kiểm tra quyền Admin API.');
    const chosenId=Number(request&&request.locationId)||0;
    const configuredName=text(previous.excelLocationName||current.excelLocationName||'dhl sport').toLowerCase();
    const matches=locations.filter(x=>x.name.toLowerCase()===configuredName);
    let location=chosenId?locations.find(x=>x.id===chosenId)||null:null;
    if(chosenId&&!location)throw new Error('Kho vừa chọn không tồn tại trong danh sách Sapo.');
    if(!location&&matches.length===1)location=matches[0];
    if(!location&&locations.length===1)location=locations[0];
    if(!location)return{needsLocation:true,locations};
    // Save unverified credentials FIRST, then verified location in a second
    // write. Existing auth-change safety guard cannot erase a newly verified
    // location as the credentials stay unchanged in the second write.
    const staged={...current,autoPushSapo:false,sapo:candidate};
    await chrome.storage.local.set({[CONFIG_KEY]:staged});
    const verified={...staged,sapo:{
      ...candidate,locationId:location.id,locationName:location.name,
      verifiedAt:Date.now()
    }};
    await chrome.storage.local.set({[CONFIG_KEY]:verified});
    await chrome.storage.local.remove(PREVIEW_KEY);
    return{connected:true,locationId:location.id,locationName:location.name,storeHost:candidate.storeHost};
  }

  async function ensureVerifiedSapo(config){
    const sapo={...(config&&config.sapo||{})};
    if(sapo.verifiedAt&&sapo.locationId&&text(sapo.storeHost)&&text(sapo.apiKey)&&text(sapo.apiSecret))return config;
    if(!text(sapo.storeHost)||!text(sapo.apiKey)||!text(sapo.apiSecret)){
      throw new Error('Chưa có thông tin kết nối Sapo đã lưu.');
    }

    await sapoFetch(sapo,'/admin/store.json');
    const locationsData=await sapoFetch(sapo,'/admin/locations.json');
    const locations=Array.isArray(locationsData&&locationsData.locations)?locationsData.locations:Array.isArray(locationsData&&locationsData.data)?locationsData.data:[];
    if(!locations.length)throw new Error('Kết nối được Sapo nhưng không đọc được chi nhánh.');

    let location=null;
    if(Number(sapo.locationId))location=locations.find(x=>Number(x&&x.id)===Number(sapo.locationId))||null;
    if(!location&&text(sapo.locationName)){
      const wanted=text(sapo.locationName).toLowerCase();
      location=locations.find(x=>text(x&&x.name).toLowerCase()===wanted)||null;
    }
    if(!location&&locations.length===1)location=locations[0];
    if(!location)throw new Error('Có nhiều chi nhánh Sapo; cần chọn chi nhánh một lần trước khi đẩy tồn.');

    const verified={
      ...sapo,
      storeHost:storeHost(sapo.storeHost),
      locationId:Number(location.id),
      locationName:text(location.name),
      verifiedAt:Date.now()
    };
    const next={...config,sapo:verified};
    await chrome.storage.local.set({[CONFIG_KEY]:next});
    return next;
  }

  function isFatalPushError(message){
    const s=text(message);
    return /mất xác minh|chưa xác minh|api key|api secret|tên shop sapo|sapo http (401|403|408|429|5\d\d)|failed to fetch|networkerror|err_internet|err_network|quá nhiều yêu cầu|rate limit/i.test(s);
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
      finishedAt:Number(queue&&queue.finishedAt||0),source:text(queue&&queue.source)||'manual',...extra
    };
  }

  function staleLegacy403Queue(queue){
    if(!queue||queue.source!=='manual'||queue.manualPaused!==true)return false;
    const ts=Number(queue.startedAt||queue.createdAt||0);
    if(!ts||ts>=LEGACY_STOCK_QUEUE_CUTOFF)return false;
    if(Number(queue.index||0)!==0||Number(queue.success||0)!==0)return false;
    const errors=Array.isArray(queue.errors)?queue.errors:[];
    const last=errors.length?errors[errors.length-1]:null;
    return /sapo http 403:\s*access_denied/i.test(text(last&&last.error));
  }

  function sourceScanMap(entries){
    const result={};
    for(const entry of Array.isArray(entries)?entries:[]){
      const id=text(entry&&entry.profileId);
      if(id)result[id]=Number(entry&&entry.scannedAt||0);
    }
    return result;
  }

  async function clearConsumedManualCache(queue){
    const scans=queue&&queue.sourceScans&&typeof queue.sourceScans==='object'?queue.sourceScans:{};
    if(!Object.keys(scans).length)return;
    const s=await chrome.storage.local.get(BATCH_KEY);
    const pending=s[BATCH_KEY]&&typeof s[BATCH_KEY]==='object'?{...s[BATCH_KEY]}:{};
    let changed=false;
    for(const [profileId,scannedAt] of Object.entries(scans)){
      const entry=pending[profileId];
      if(entry&&Number(entry.scannedAt||0)===Number(scannedAt||0)){
        // Preserve the exported snapshot for re-download. Mark it as already
        // pushed so an old scan cannot be sent again by accident.
        pending[profileId]={...entry,lastSapoPushedAt:Number(queue.finishedAt||Date.now()),lastSapoPushQueueId:String(queue.id||'')};
        changed=true;
      }
    }
    if(changed)await chrome.storage.local.set({[BATCH_KEY]:pending});
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
    const variantId=Number(row&&row.variantId)||0;
    const skuKey=resolver.normSku(row&&row.sku)||'no-sku';
    const mapKey=`${storeHost(sapo.storeHost)}|${Number(sapo.locationId)}|${variantId?`v:${variantId}`:`s:${skuKey}`}`;
    if(map[mapKey]&&variantId)return{itemId:Number(map[mapKey]),variantId,method:'cache'};
    const attempts=[];

    if(Number(row.variantId)){
      try{
        const item=await tryInventoryQuery(sapo,row,{variant_id:String(row.variantId)},'variant');
        if(item){map[mapKey]=Number(item.id);return{itemId:Number(item.id),variantId:Number(item.variant_id)||variantId,method:'variant_id'};}
      }catch(err){attempts.push(err&&err.message||String(err));}
      try{
        const variantData=await sapoFetch(sapo,`/admin/variants/${Number(row.variantId)}.json`);
        const itemId=resolver.variantInventoryItemId(variantData);
        if(itemId){map[mapKey]=itemId;return{itemId,variantId,method:'variant.inventory_item_id'};}
      }catch(err){attempts.push(err&&err.message||String(err));}
    }

    if(text(row.sku)){
      try{
        const item=await tryInventoryQuery(sapo,row,{sku:text(row.sku)},'sku');
        if(item){map[mapKey]=Number(item.id);return{itemId:Number(item.id),variantId:Number(item.variant_id)||variantId,method:'sku'};}
      }catch(err){attempts.push(err&&err.message||String(err));}
    }

    if(Number(row.productId)){
      try{
        const item=await tryInventoryQuery(sapo,row,{product_id:String(row.productId)});
        if(item){map[mapKey]=Number(item.id);return{itemId:Number(item.id),variantId:Number(item.variant_id)||variantId,method:'product_id'};}
      }catch(err){attempts.push(err&&err.message||String(err));}
    }

    let skuFallback=null;
    for(let page=1;page<=MAX_LIST_PAGES;page+=1){
      try{
        const q=new URLSearchParams({limit:String(LIST_PAGE_LIMIT),page:String(page)});
        const data=await sapoFetch(sapo,`/admin/inventory_items.json?${q.toString()}`);
        const candidates=resolver.inventoryCandidates(data);
        const exact=findExactVariant(candidates,row);
        if(exact&&Number(exact.id)){map[mapKey]=Number(exact.id);return{itemId:Number(exact.id),variantId:Number(exact.variant_id)||variantId,method:`list-variant-page-${page}`};}
        if(!skuFallback)skuFallback=findSkuFallback(candidates,row);
        if(candidates.length<LIST_PAGE_LIMIT)break;
      }catch(err){attempts.push(err&&err.message||String(err));break;}
    }
    if(skuFallback&&Number(skuFallback.id)){
      map[mapKey]=Number(skuFallback.id);
      return{itemId:Number(skuFallback.id),variantId:Number(skuFallback.variant_id)||variantId,method:'list-sku-fallback'};
    }

    const extra=attempts.length?` • API: ${attempts[attempts.length-1]}`:'';
    throw new Error(`Không tìm thấy inventory item cho SKU ${text(row.sku)||'—'} / variant ${Number(row.variantId)||'—'}${extra}`);
  }

  function variantFrom(data){
    if(data&&data.variant&&typeof data.variant==='object')return data.variant;
    if(data&&data.data&&data.data.variant&&typeof data.data.variant==='object')return data.data.variant;
    if(data&&data.data&&typeof data.data==='object'&&!Array.isArray(data.data))return data.data;
    return null;
  }

  async function resolveVariantIdForStock(sapo,row,resolved){
    const direct=Number(row&&row.variantId)||Number(resolved&&resolved.variantId)||0;
    if(direct)return direct;
    const sku=text(row&&row.sku);
    if(!sku)return 0;
    try{
      const item=await tryInventoryQuery(sapo,row,{sku},'sku');
      if(item&&Number(item.variant_id))return Number(item.variant_id);
    }catch(_){}
    try{
      const q=new URLSearchParams({sku,limit:'50'});
      const data=await sapoFetch(sapo,`/admin/variants.json?${q.toString()}`);
      const list=Array.isArray(data&&data.variants)?data.variants:Array.isArray(data&&data.data)?data.data:[];
      const wanted=resolver.normSku(sku);
      const hit=list.find(v=>resolver.normSku(v&&v.sku)===wanted)||list[0];
      return Number(hit&&hit.id)||0;
    }catch(_){return 0;}
  }

  async function writeStockWith403Fallback(sapo,row,resolved){
    try{
      await sapoFetch(sapo,`/admin/inventory_items/${Number(resolved.itemId)}/locations/${Number(sapo.locationId)}.json`,{
        method:'PUT',
        body:{inventory_level:{available:Number(row.stock)}}
      });
      return{method:`${resolved.method}:inventory-location`,variantId:Number(row&&row.variantId)||Number(resolved&&resolved.variantId)||0};
    }catch(error){
      const message=error&&error.message||String(error);
      if(!/Sapo HTTP 403:\s*access_denied/i.test(message))throw error;
    }

    const variantId=await resolveVariantIdForStock(sapo,row,resolved);
    if(!variantId)throw new Error(`Sapo HTTP 403: access_denied • không tìm được variant ID để fallback cho SKU ${text(row&&row.sku)||'—'}`);

    const data=await sapoFetch(sapo,`/admin/variants/${variantId}.json`,{
      method:'PUT',
      body:{
        variant:{
          id:variantId,
          inventory_management:'bizweb',
          inventory_quantity:Number(row.stock)
        }
      }
    });
    const updated=variantFrom(data);
    const actual=Number(updated&&updated.inventory_quantity);
    if(Number.isFinite(actual)&&actual!==Number(row.stock)){
      throw new Error(`SKU ${text(row&&row.sku)||'—'}: Sapo trả tồn ${actual}, cần ${Number(row.stock)}.`);
    }
    return{method:`${resolved.method}:variant-fallback-403`,variantId};
  }

  function selectedPendingEntries(pending,profileIds){
    const ids=Array.isArray(profileIds)?profileIds.map(String).filter(Boolean):[];
    const selected=(ids.length?ids.map(id=>pending[id]):Object.values(pending)).filter(Boolean);
    const available=selected.filter(entry=>!entry.lastSapoPushQueueId
      ||Number(entry.lastSapoPushedAt||0)<Number(entry.scannedAt||0));
    if(!available.length)throw new Error('Tất cả hồ sơ đã được đẩy lên Sapo. Hãy quét lại dữ liệu mới trước khi đẩy tiếp.');
    return available;
  }

  function buildPreviewSnapshot(entries,config,priorQueue){
    return previewCore.build(entries,config,priorQueue,{quality,batch,branchCore,excelSku});
  }

  function validatePausedQueue(queue,preview,config){
    if(!queue||queue.source!=='manual'||queue.manualPaused!==true)return;
    if(Number(queue.locationId)!==Number(config.sapo.locationId)
      ||text(queue.host).toLowerCase()!==storeHost(config.sapo.storeHost)){
      throw new Error('Hàng đợi Sapo cũ thuộc kho hoặc shop khác; không được tiếp tục.');
    }
    const intended=new Map((preview.rows||[]).map(row=>[previewCore.normSku(row.sku),Number(row.stock)]));
    const remaining=(queue.rows||[]).slice(Number(queue.index||0));
    for(const row of remaining){
      const sku=previewCore.normSku(row&&row.sku);
      if(!sku||!intended.has(sku)||intended.get(sku)!==Number(row.stock)){
        throw new Error('Hàng đợi Sapo đã tạm dừng khác số tồn quét hiện tại tại SKU '+text(row&&row.sku)+'. Hãy hủy hàng đợi cũ trước khi đẩy dữ liệu mới.');
      }
    }
  }

  async function prepareManualPreview(profileIds){
    let config=await ensureVerifiedSapo(await readConfig());
    const state=await chrome.storage.local.get([BATCH_KEY,SAPO_QUEUE_KEY,CYCLE_KEY]);
    if(state[CYCLE_KEY]&&state[CYCLE_KEY].running)throw new Error('Đang quét tự động; không thể xem trước tồn Sapo.');
    const current=state[SAPO_QUEUE_KEY];
    if(current&&['running','queued'].includes(current.status)&&current.manualPaused!==true)
      throw new Error('Đang có lượt đẩy Sapo. Chờ kết thúc trước khi chuẩn bị lượt khác.');
    const pending=state[BATCH_KEY]&&typeof state[BATCH_KEY]==='object'?state[BATCH_KEY]:{};
    const selected=selectedPendingEntries(pending,profileIds);
    const preview=buildPreviewSnapshot(selected,config,current);
    validatePausedQueue(current,preview,config);
    const token=String(Date.now())+'-'+Math.random().toString(36).slice(2);
    await chrome.storage.local.set({[PREVIEW_KEY]:{
      token,signature:preview.signature,at:Date.now()
    }});
    const {signature,...publicPreview}=preview;
    return{...publicPreview,token,expiresInMinutes:10};
  }

  async function enqueueOrResume(profileIds,previewToken){
    let config=await readConfig();
    config=await ensureVerifiedSapo(config);

    const state=await chrome.storage.local.get([SAPO_QUEUE_KEY,CYCLE_KEY,BATCH_KEY,PREVIEW_KEY]);
    let existing=state[SAPO_QUEUE_KEY];
    const cycle=state[CYCLE_KEY];
    if(staleLegacy403Queue(existing)){
      await chrome.alarms.clear(MANUAL_ALARM).catch(()=>{});
      await chrome.alarms.clear(AUTO_PUSH_ALARM).catch(()=>{});
      await chrome.storage.local.remove(SAPO_QUEUE_KEY);
      existing=null;
    }
    if(cycle&&cycle.running)throw new Error('Đang có lượt quét tự động chạy. Chờ quét xong rồi đẩy Sapo thủ công.');
    const pending=state[BATCH_KEY]&&typeof state[BATCH_KEY]==='object'?state[BATCH_KEY]:{};
    const selected=selectedPendingEntries(pending,profileIds);
    const proposed=buildPreviewSnapshot(selected,config,existing);
    validatePausedQueue(existing,proposed,config);
    const approved=state[PREVIEW_KEY];
    if(!approved||!previewToken||String(approved.token)!==String(previewToken)
       ||Date.now()-Number(approved.at||0)>PREVIEW_TTL_MS
       ||approved.signature!==proposed.signature){
      throw new Error('Dữ liệu hoặc cấu hình kho đã thay đổi, hoặc bản xem trước đã hết hạn. Bấm XEM TRƯỚC SAPO rồi xác nhận lại.');
    }
    // One-time preflight token; prevents accidental reuse of an old preview.
    await chrome.storage.local.remove(PREVIEW_KEY);

    if(existing&&existing.source==='manual'&&existing.status==='running'&&existing.manualPaused===true){
      // Do not resume a queue created before scan-quality validation existed.
      if(existing.qualityValidated!==true)throw new Error('Queue cũ chưa xác minh chất lượng quét. Hãy quét lại trước khi tiếp tục đẩy Sapo.');
      const oldErrors=Array.isArray(existing.errors)?existing.errors:[];
      if(oldErrors.length){
        existing.retryHistory=Array.isArray(existing.retryHistory)?existing.retryHistory:[];
        existing.retryHistory.push({at:Date.now(),index:Number(existing.index||0),errors:oldErrors.map(e=>({...e}))});
      }
      existing.errors=[];
      existing.manualPaused=false;
      await chrome.storage.local.set({[SAPO_QUEUE_KEY]:existing});
      await chrome.alarms.clear(AUTO_PUSH_ALARM);
      await writePushStatus(pushState(existing,'running',config));
      chrome.alarms.create(MANUAL_ALARM,{when:Date.now()+250});
      return{resumed:true,total:existing.total,index:existing.index};
    }
    if(existing&&['running','queued'].includes(existing.status))throw new Error('Đang có một lượt ghi Sapo khác chạy. Chờ lượt hiện tại hoàn tất.');

    const ids=Array.isArray(profileIds)?profileIds.map(String).filter(Boolean):[];
    const entries=selected;
    if(!entries.length)throw new Error('Chưa có kết quả quét thủ công để đẩy lên Sapo.');
    if(entries.some(entry=>!quality.trustedEntry(entry))){
      throw new Error('Kết quả quét còn thiếu màu/size/SKU hoặc chưa xác minh. Không đẩy Sapo; hãy quét lại sản phẩm lỗi.');
    }
    // Sapo writes still require a verified location ID from its API.
    // Do not treat the HTML warehouse label used by Excel as API permission.
    const normalizedEntries=entries.map(entry=>({...entry,branch:branchCore.resolve(entry,config)}));
    const combined=batch.combineEntries(normalizedEntries);
    excelSku.validate(combined.rows);
    if(!combined.rows.length)throw new Error('Kết quả quét chưa có dòng tồn kho hợp lệ.');

    const startedAt=Date.now();
    const queue={
      id:`manual-push-${startedAt}`,source:'manual',manualPaused:false,status:'running',createdAt:startedAt,startedAt,
      host:storeHost(config.sapo.storeHost),locationId:Number(config.sapo.locationId),locationName:text(config.sapo.locationName),
      rows:combined.rows,index:0,total:combined.rows.length,success:0,successRows:[],errors:[],profileCount:combined.profileCount,profileIds:ids,
      qualityValidated:true,
      sourceScans:sourceScanMap(entries)
    };
    await chrome.alarms.clear(AUTO_PUSH_ALARM);
    await chrome.storage.local.set({[SAPO_QUEUE_KEY]:queue});
    await writePushStatus(pushState(queue,'queued',config));
    chrome.alarms.create(MANUAL_ALARM,{when:Date.now()+250});
    return{resumed:false,total:queue.total,index:0};
  }

  async function processManualQueue(){
    // Chrome alarms and a manual trigger can overlap. Never run two
    // competing writers against the same queue.
    if(pushInFlight)return;
    pushInFlight=true;
    try{
      const s=await chrome.storage.local.get([SAPO_QUEUE_KEY,SAPO_MAP_KEY,CONFIG_KEY]);
      const queue=s[SAPO_QUEUE_KEY],config=autoCore.normalizeConfig(s[CONFIG_KEY]);
      if(!queue||!['manual','auto'].includes(queue.source)||queue.status!=='running'||queue.manualPaused===true)return;
    if(queue.source==='auto'&&!config.autoPushSapo){
      queue.manualPaused=true;
      await chrome.storage.local.set({[SAPO_QUEUE_KEY]:queue});
      await writePushStatus(pushState(queue,'manual-error',config,{error:'Tự động đã tắt; đã dừng ghi Sapo.'}));
      return;
    }
      if(queue.qualityValidated!==true){
        queue.manualPaused=true;
        queue.status='blocked-quality';
        queue.errors=Array.isArray(queue.errors)?queue.errors:[];
        queue.errors.push({at:Date.now(),index:queue.index,error:'Queue cũ chưa xác minh đủ nguồn, màu, size và SKU.'});
        await chrome.storage.local.set({[SAPO_QUEUE_KEY]:queue});
        await writePushStatus({status:'manual-error',source:'manual',error:queue.errors[queue.errors.length-1].error});
        return;
      }

      queue.successRows=Array.isArray(queue.successRows)?queue.successRows:[];
      queue.errors=Array.isArray(queue.errors)?queue.errors:[];
      queue.skippedRows=Array.isArray(queue.skippedRows)?queue.skippedRows:[];
      queue.failed=queue.skippedRows.length;
      queue.success=queue.successRows.length;
      if(!config.sapo||!config.sapo.verifiedAt||!config.sapo.locationId
        ||!text(config.sapo.storeHost)||!text(config.sapo.apiKey)||!text(config.sapo.apiSecret)){
        queue.manualPaused=true;
        queue.errors.push({at:Date.now(),index:queue.index,error:'Mất xác minh hoặc thiếu API key/secret Sapo.'});
        await chrome.storage.local.set({[SAPO_QUEUE_KEY]:queue});
        await writePushStatus(pushState(queue,'manual-error',config,{error:'Mất kết nối xác minh Sapo.'}));
        return;
      }

      const map=s[SAPO_MAP_KEY]&&typeof s[SAPO_MAP_KEY]==='object'?s[SAPO_MAP_KEY]:{};
      const completed=new Set([
        ...queue.successRows.map(x=>Number(x.index)),
        ...queue.skippedRows.map(x=>Number(x.index))
      ]);
      const advance=()=>{
        while(queue.index<queue.total&&completed.has(Number(queue.index)))queue.index+=1;
      };
      advance();
      const end=Math.min(queue.total,queue.index+PUSH_CHUNK);
      for(let start=queue.index;start<end;start+=MAX_PARALLEL_SKUS){
        const indices=[];
        for(let i=start;i<Math.min(start+MAX_PARALLEL_SKUS,end);i++){
          if(!completed.has(i))indices.push(i);
        }
        const results=await Promise.all(indices.map(async index=>{
          const row=queue.rows[index];
          try{
            const resolved=await resolveInventoryItem(config.sapo,row,map);
            const written=await writeStockWith403Fallback(config.sapo,row,resolved);
            return{kind:'success',index,row,resolved,written};
          }catch(err){
            const message=err&&err.message||String(err);
            return{kind:isFatalPushError(message)?'fatal':'skipped',index,row,error:message};
          }
        }));

        let fatal=null;
        for(const result of results){
          if(result.kind==='success'){
            if(completed.has(result.index))continue;
            queue.successRows.push({
              index:result.index,sku:text(result.row.sku),
              variantId:Number(result.written.variantId)||Number(result.row.variantId)||0,
              productId:Number(result.row.productId)||0,
              stock:Number(result.row.stock),itemId:result.resolved.itemId,
              method:result.written.method,at:Date.now()
            });
            completed.add(result.index);
          }else{
            const error={
              at:Date.now(),index:result.index,sku:text(result.row&&result.row.sku),
              variantId:Number(result.row&&result.row.variantId)||0,
              stock:Number(result.row&&result.row.stock),error:result.error
            };
            queue.errors.push(error);
            if(result.kind==='fatal'){
              if(!fatal)fatal=error;
            }else{
              // Lỗi riêng một SKU không được làm dừng cả queue.
              error.skipped=true;error.skippedAt=Date.now();
              queue.skippedRows.push({...error});
              completed.add(result.index);
            }
          }
        }
        queue.success=queue.successRows.length;
        queue.failed=queue.skippedRows.length;
        advance();

        // An in-flight group cannot be unsent. Respect cancellation before
        // scheduling another group and preserve the results already written.
        const latest=(await chrome.storage.local.get(SAPO_QUEUE_KEY))[SAPO_QUEUE_KEY];
        const cancelled=latest&&latest.id===queue.id&&latest.status==='cancelled';
        if(cancelled){queue.status='cancelled';queue.manualPaused=true;}
        if(fatal)queue.manualPaused=true;
        // Persist one checkpoint per bounded group instead of per SKU. On
        // worker restart, any uncheckpointed absolute SET may be repeated
        // safely, while recorded success indices are skipped on resume.
        await chrome.storage.local.set({[SAPO_MAP_KEY]:map,[SAPO_QUEUE_KEY]:queue});
        if(cancelled){
          await writePushStatus(pushState(queue,'cancelled',config));
          return;
        }
        if(fatal){
          await writePushStatus(pushState(queue,'manual-error',config,{error:fatal.error}));
          return;
        }
      }

      if(queue.index>=queue.total){
        queue.status=queue.failed>0?'done-with-errors':'done';
        queue.manualPaused=false;
        queue.finishedAt=Date.now();
        await chrome.storage.local.set({[SAPO_MAP_KEY]:map,[SAPO_QUEUE_KEY]:queue});
        if(queue.failed===0){
          try{await clearConsumedManualCache(queue);}catch{}
        }
        await writePushStatus(pushState(queue,queue.status,config));
        return;
      }

      await writePushStatus(pushState(queue,'running',config));
      chrome.alarms.create(MANUAL_ALARM,{when:Date.now()+80});
    }finally{
      pushInFlight=false;
    }
  }

  async function cancelManualPush(){
    try{await chrome.alarms.clear(MANUAL_ALARM);}catch(_){}
    const s=await chrome.storage.local.get(SAPO_QUEUE_KEY);
    const queue=s[SAPO_QUEUE_KEY]&&typeof s[SAPO_QUEUE_KEY]==='object'?s[SAPO_QUEUE_KEY]:null;
    if(queue&&queue.source==='manual'){
      queue.status='cancelled';
      queue.manualPaused=true;
      queue.cancelledAt=Date.now();
      await chrome.storage.local.set({[SAPO_QUEUE_KEY]:queue});
      const config=await readConfig().catch(()=>({}));
      await writePushStatus(pushState(queue,'cancelled',config));
    }
    return queue;
  }

  async function enqueueVerifiedAutoCycle(cycle){
    const config=await readConfig();
    if(!config.autoPushSapo)throw new Error('Lượt này chưa được bật tùy chọn đẩy Sapo.');
    const sapo=config.sapo||{};
    if(!sapo.verifiedAt||!sapo.locationId||!text(sapo.apiKey)||!text(sapo.apiSecret))
      throw new Error('Cần xác minh API, quyền ghi tồn và kho Sapo trước khi bật tự đẩy.');
    if(!cycle||cycle.phase!=='ready-to-push'||!Array.isArray(cycle.scans)||!cycle.scans.length)
      throw new Error('Chưa có chu kỳ quét hoàn tất để ghi Sapo.');
    const state=await chrome.storage.local.get([BATCH_KEY,SAPO_QUEUE_KEY,CONFIG_KEY]);
    const active=state[SAPO_QUEUE_KEY];
    if(active&&['running','queued'].includes(active.status))
      throw new Error('Đang có hàng đợi Sapo khác. Không được ghi đè.');
    const current=autoCore.normalizeConfig(state[CONFIG_KEY]);
    if(!current.autoPushSapo)throw new Error('Tùy chọn đẩy Sapo đã bị tắt.');
    if(cycle.scans.length!==cycle.profileIds.length
       ||current.selectedProfileIds.length!==cycle.profileIds.length
       ||current.selectedProfileIds.some(id=>!cycle.profileIds.includes(String(id))))
      throw new Error('Danh mục tự động đã thay đổi sau khi quét.');
    const cache=state[BATCH_KEY]&&typeof state[BATCH_KEY]==='object'?state[BATCH_KEY]:{};
    const entries=cycle.scans.map(item=>{
      const entry=cache[item.profileId];
      if(!entry||entry.auto!==true||entry.autoCycleId!==cycle.id
         ||entry.jobId!==item.jobId||Number(entry.scannedAt)!==Number(item.scannedAt)
         ||entry.partial||!quality.trustedEntry(entry))
        throw new Error('Bản quét đã thay đổi hoặc chưa đủ chất lượng: '+text(item.profileId));
      return entry;
    });
    const normalized=entries.map(e=>({...e,branch:branchCore.resolve(e,current)}));
    for(const entry of normalized)excelSku.validate(entry.rows);
    const combined=batch.combineEntries(normalized);
    excelSku.validate(combined.rows);
    if(combined.duplicateSame.length)
      throw new Error('SKU trùng giữa các danh mục; cần kiểm tra thủ công trước khi tự ghi.');
    const now=Date.now();
    const queue={
      id:'auto-push-'+cycle.id,source:'auto',autoCycleId:cycle.id,
      manualPaused:false,status:'running',qualityValidated:true,
      createdAt:now,startedAt:now,host:storeHost(sapo.storeHost),
      locationId:Number(sapo.locationId),locationName:text(sapo.locationName),
      rows:combined.rows,index:0,total:combined.rows.length,
      success:0,successRows:[],errors:[],failed:0,skippedRows:[],
      profileIds:cycle.profileIds,profileCount:entries.length,sourceScans:sourceScanMap(entries)
    };
    await chrome.storage.local.set({[SAPO_QUEUE_KEY]:queue});
    await writePushStatus(pushState(queue,'queued',current));
    chrome.alarms.create(MANUAL_ALARM,{when:Date.now()+300});
    return{queueId:queue.id,total:queue.total};
  }

  async function resumeAutoQueue(cycleId){
    const config=await readConfig();
    if(!config.autoPushSapo)throw new Error('Tùy chọn đẩy Sapo đã tắt.');
    const data=await chrome.storage.local.get(SAPO_QUEUE_KEY);
    const queue=data[SAPO_QUEUE_KEY];
    if(!queue||queue.source!=='auto'||queue.autoCycleId!==cycleId||!queue.manualPaused)
      throw new Error('Không có hàng đợi tự động phù hợp để tiếp tục.');
    if(storeHost(config.sapo&&config.sapo.storeHost)!==queue.host
       ||Number(config.sapo&&config.sapo.locationId)!==Number(queue.locationId)
       ||!config.sapo.verifiedAt)
      throw new Error('Kho/ứng dụng Sapo đã thay đổi. Không thể tiếp tục hàng đợi cũ.');
    queue.manualPaused=false;
    queue.status='running';
    queue.errors=[];
    await chrome.storage.local.set({[SAPO_QUEUE_KEY]:queue});
    chrome.alarms.create(MANUAL_ALARM,{when:Date.now()+300});
    return{index:queue.index,total:queue.total};
  }

  globalThis.DHLSapoAutoBridge={enqueueVerifiedAutoCycle,resumeAutoQueue};

  chrome.alarms.onAlarm.addListener(alarm=>{
    if(alarm.name===MANUAL_ALARM)processManualQueue().catch(async err=>{
      const config=await readConfig().catch(()=>({}));
      await writePushStatus({status:'manual-error',error:err&&err.message||String(err),source:'manual',shop:text(config&&config.sapo&&config.sapo.storeHost),locationName:text(config&&config.sapo&&config.sapo.locationName)}).catch(()=>{});
    });
  });

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(!message)return;
    if(message.type==='DHL_SAPO_CONNECT'){
      connectSapo(message).then(result=>sendResponse({ok:true,result}))
        .catch(error=>sendResponse({ok:false,error:error&&error.message||String(error)}));
      return true;
    }
    if(message.type==='DHL_SAPO_PREVIEW_MANUAL'){
      prepareManualPreview(message.profileIds||[]).then(preview=>sendResponse({ok:true,preview})).catch(err=>sendResponse({ok:false,error:err&&err.message||String(err)}));
      return true;
    }
    if(message.type==='DHL_SAPO_PUSH_MANUAL'){
      enqueueOrResume(message.profileIds||[],message.previewToken).then(result=>sendResponse({ok:true,result})).catch(err=>sendResponse({ok:false,error:err&&err.message||String(err)}));
      return true;
    }
    if(message.type==='DHL_SAPO_PUSH_CANCEL'){
      cancelManualPush().then(queue=>sendResponse({ok:true,queue})).catch(err=>sendResponse({ok:false,error:err&&err.message||String(err)}));
      return true;
    }
  });
})();
