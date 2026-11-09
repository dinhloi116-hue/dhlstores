(() => {
  'use strict';

  const xlsx=globalThis.DHLXlsxLite;
  const matcher=globalThis.DHLMatchCore;
  const autoCore=globalThis.DHLAutoSyncCore;
  const rules=globalThis.DHLShopRules;
  const historyCore=globalThis.DHLStockHistoryCore;
  const quality=globalThis.DHLScanQualityCore;
  const retryCore=globalThis.DHLManualScanRetryCore;
  const branchCore=globalThis.DHLStockBranchCore;
  if(!xlsx||!matcher||!autoCore||!rules||!historyCore||!quality||!retryCore||!branchCore)return;

  const PROFILE_KEY='dhlSavedStockProfilesV1';
  const SELECTED_KEY='dhlSelectedStockProfileId';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const JOB_KEY='dhlManualScanJobV2';
  const BATCH_KEY='dhlManualPendingStockBatchV1';
  const HISTORY_KEY='dhlStockScanHistoryV1';
  const REPORT_KEY='dhlManualStockReportV1';
  const ALARM='dhl-manual-scan-step';
  const MAX_ERRORS=100;
  const RETRY_COOLDOWN_MS=1400;

  const text=(v)=>String(v==null?'':v).trim();
  const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
  const plain=(v)=>text(v).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

  function base64ToBuffer(value){
    const binary=atob(String(value||''));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);
    return bytes.buffer;
  }

  function isCategoryUrl(value){
    try{
      const url=new URL(String(value||''));
      if(url.protocol!=='https:'||url.hostname!=='si.aobongda.net')return false;
      return !/-p\d+(?:\.html)?$/i.test(url.pathname);
    }catch{return false;}
  }

  function sourceKey(value){
    try{
      const u=new URL(String(value||''));
      return `${u.hostname}${u.pathname.replace(/\/+$/,'')||'/'}`.toLowerCase();
    }catch{return text(value).toLowerCase();}
  }

  function profileName(pageTitle,sourceUrl){
    const hay=plain(`${pageTitle||''} ${sourceUrl||''}`);
    if(hay.includes('tre em'))return'Trẻ em';
    if(hay.includes('wika'))return'Wika';
    if(hay.includes('strivend'))return'Strivend';
    if(/(^| )hd( |$)/.test(hay)||hay.includes('pc36029'))return'HD';

    let title=text(pageTitle).replace(/\s*[|\-–—]\s*(?:si\.?\s*aobongda|aobongda).*$/i,'').trim();
    if(title&&title.length<=70)return title;

    try{
      const u=new URL(sourceUrl);
      const slug=u.pathname.split('/').filter(Boolean).pop()||'Danh mục';
      title=slug.replace(/-?pc\d+$/i,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
      if(title)return title.replace(/\b\w/g,ch=>ch.toUpperCase());
    }catch{}
    return'Danh mục nguồn';
  }

  function makeProfileId(key){
    const slug=plain(key).replace(/\s+/g,'-').slice(0,70)||'source';
    return `tab-${slug}`;
  }

  async function getProfiles(){
    const stored=await chrome.storage.local.get([PROFILE_KEY,SELECTED_KEY]);
    return{
      profiles:Array.isArray(stored[PROFILE_KEY])?stored[PROFILE_KEY]:[],
      selectedId:text(stored[SELECTED_KEY])
    };
  }

  async function saveProfiles(profiles,selectedId){
    await chrome.storage.local.set({[PROFILE_KEY]:profiles,[SELECTED_KEY]:text(selectedId)});
  }

  async function ensureSourceProfile({profileId='',sourceUrl='',pageTitle='',productCount=0}={}){
    const state=await getProfiles();
    const key=sourceKey(sourceUrl);
    let profile=null;

    if(profileId)profile=state.profiles.find(p=>String(p&&p.id)===String(profileId))||null;
    if(!profile)profile=state.profiles.find(p=>text(p&&p.sourceKey)===key)||null;
    if(!profile)profile=state.profiles.find(p=>sourceKey(p&&p.lastSourceUrl)===key)||null;

    const now=Date.now();
    const name=profileName(pageTitle,sourceUrl);
    if(!profile){
      profile={
        id:makeProfileId(key),
        name,
        sourceOnly:true,
        sourceKey:key,
        lastSourceUrl:sourceUrl,
        pageTitle:text(pageTitle),
        productCount:Number(productCount||0),
        variantCount:0,
        createdAt:now,
        updatedAt:now,
        lastSourceAt:0
      };
      let suffix=1,base=profile.id;
      while(state.profiles.some(p=>String(p&&p.id)===profile.id)){
        suffix+=1;profile.id=`${base}-${suffix}`;
      }
      state.profiles.push(profile);
    }else{
      profile.name=name||text(profile.name)||'Danh mục nguồn';
      profile.sourceKey=key;
      profile.lastSourceUrl=sourceUrl||profile.lastSourceUrl||'';
      profile.pageTitle=text(pageTitle)||profile.pageTitle||'';
      if(productCount)profile.productCount=Number(productCount);
      profile.sourceOnly=!(profile.warehouseBase64&&profile.catalogBase64);
      profile.updatedAt=now;
    }

    await saveProfiles(state.profiles,profile.id);
    return profile;
  }

  async function saveProfileCheckpoint(profileId,patch){
    const stored=await chrome.storage.local.get(PROFILE_KEY);
    const profiles=Array.isArray(stored[PROFILE_KEY])?stored[PROFILE_KEY]:[];
    const profile=profiles.find(item=>String(item&&item.id)===String(profileId));
    if(!profile)return;
    Object.assign(profile,patch);
    await chrome.storage.local.set({[PROFILE_KEY]:profiles,[SELECTED_KEY]:profile.id});
  }

  async function parseLegacyProfile(profile){
    if(!profile||!profile.warehouseBase64||!profile.catalogBase64)return null;
    const warehouseData=await xlsx.parseSapoExport(base64ToBuffer(profile.warehouseBase64));
    const catalogData=await xlsx.parseSapoExport(base64ToBuffer(profile.catalogBase64));
    return{warehouseData,catalogData};
  }

  async function waitTabComplete(tabId,timeout=30000){
    const current=await chrome.tabs.get(tabId);
    if(current.status==='complete')return current;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Trang nguồn tải quá 30 giây.'));
      },timeout);
      function listener(id,info,tab){
        if(id===tabId&&info.status==='complete'){
          clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve(tab);
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  function sameCategoryPage(currentUrl,originalUrl){
    try{
      const current=new URL(String(currentUrl||''));
      const original=new URL(String(originalUrl||''));
      return isCategoryUrl(current.href)
        &&current.origin===original.origin
        &&current.pathname===original.pathname
        &&current.search===original.search;
    }catch{return false;}
  }

  async function ensureJobTab(job){
    // Quét trên ĐÚNG tab nguồn do người dùng chọn. Không tạo tab/cửa sổ sao chép.
    const sourceTabId=Number(job&&job.sourceTabId)||0;
    if(!sourceTabId)throw new Error('Không tìm thấy tab nguồn. Hãy mở danh mục và bấm ĐỒNG BỘ TAB NÀY lại.');
    let tab;
    try{tab=await chrome.tabs.get(sourceTabId);}
    catch(_){throw new Error('Tab nguồn đã bị đóng. Tool dừng để tránh quét nhầm trang.');}
    if(!tab||!sameCategoryPage(tab.url,job.sourceUrl)){
      throw new Error('Tab nguồn đã chuyển trang hoặc đổi danh mục. Tool dừng để tránh ghi tồn sai.');
    }
    if(!tab.active){
      throw new Error('Tab nguồn không còn được chọn. Hãy giữ tab nguồn đang mở trong suốt lượt quét.');
    }
    if(tab.status!=='complete'){
      await waitTabComplete(sourceTabId);
      tab=await chrome.tabs.get(sourceTabId);
      if(!sameCategoryPage(tab.url,job.sourceUrl)||!tab.active){
        throw new Error('Tab nguồn đã thay đổi trong lúc tải trang. Tool dừng an toàn.');
      }
    }
    const latest=await readJob();
    if(!latest||latest.id!==job.id||latest.running!==true||latest.status==='cancelled'){
      throw new Error('Lượt quét đã bị hủy trước khi mở popup.');
    }
    if(job.tabId!==sourceTabId||job.ownsTab||job.ownsWindow||job.scanWindowId){
      job.tabId=sourceTabId;
      job.ownsTab=false;
      job.ownsWindow=false;
      job.scanWindowId=0;
      await saveJob(job);
    }
    return tab;
  }

  async function closeJobTab(job){
    // Tab nguồn là của người dùng: hoàn thành/hủy quét KHÔNG được đóng tab.
    if(!job)return;
    job.tabId=0;
    job.ownsTab=false;
    job.scanWindowId=0;
    job.ownsWindow=false;
  }

  async function injectScanner(tabId){
    for(const file of ['stock-core.js','dom-stock-parser.js','match-core.js','visible-category-grid-core.js','content.js']){
      await chrome.scripting.executeScript({target:{tabId},files:[file]});
    }
    await sleep(80);
  }

  function noReceiver(error){
    return /Receiving end does not exist|Could not establish connection/i.test(String(error&&error.message?error.message:error||''));
  }

  async function sendFullPopupScan(tabId,descriptor){
    // Đồng bộ tồn bắt buộc đọc popup thật để lấy ĐỦ màu / size / tồn.
    // Không dùng API-first vì API có thể chỉ trả một biến thể đầu tiên (ví dụ chỉ size S).
    const message={type:'DHL_SCAN_ONE_DESCRIPTOR_POPUP_ONLY',descriptor,hints:[]};
    try{return await chrome.tabs.sendMessage(tabId,message);}
    catch(error){
      if(!noReceiver(error))throw error;
      await injectScanner(tabId);
      return chrome.tabs.sendMessage(tabId,message);
    }
  }

  async function discoverProducts(tabId){
    // The old page-wide anchor search silently picked up navigation and
    // unrelated links. Request the DOM-verified visible product grid instead.
    let response;
    try{response=await chrome.tabs.sendMessage(tabId,{type:'DHL_DISCOVER_VISIBLE_CATEGORY'});}
    catch(error){
      if(!noReceiver(error))throw error;
      await injectScanner(tabId);
      response=await chrome.tabs.sendMessage(tabId,{type:'DHL_DISCOVER_VISIBLE_CATEGORY'});
    }
    if(!response||response.ok!==true){
      throw new Error(response&&response.error
        ||'Chưa nạp bộ lọc lưới sản phẩm. Hãy F5 trang danh mục rồi thử lại.');
    }
    const found=response.result||{};
    if(found.discoveryMode!=='visible-category-grid'){
      throw new Error('Trang nguồn chưa dùng bộ lọc sản phẩm mới. Hãy F5 tab nguồn.');
    }
    const items=Array.isArray(found.items)?found.items:[];
    if(!items.length)throw new Error('Không thấy thẻ sản phẩm hợp lệ trên trang hiện tại.');
    return{...found,items};
  }

  async function saveJob(job){
    job.updatedAt=Date.now();
    await chrome.storage.local.set({[JOB_KEY]:job});
  }

  async function readJob(){
    const stored=await chrome.storage.local.get(JOB_KEY);
    return stored[JOB_KEY]&&typeof stored[JOB_KEY]==='object'?stored[JOB_KEY]:null;
  }

  // Chrome alarms tối thiểu ~30 giây: timer chạy nhanh; alarm chỉ dự phòng.
  function scheduleNext(delay=250){
    chrome.alarms.create(ALARM,{when:Date.now()+30000});
    setTimeout(()=>processStep().catch(()=>{}),Math.max(0,Number(delay||0)));
  }

  async function checkpoint(job){
    // Không cho worker cũ ghi đè job đã hủy hoặc một job mới vừa được bắt đầu.
    const current=await readJob();
    if(current){
      if(current.id!==job.id)return false;
      if(current.status==='cancelled'||current.running===false)return false;
    }

    const now=Date.now();
    job.updatedAt=now;

    const stored=await chrome.storage.local.get(PROFILE_KEY);
    const profiles=Array.isArray(stored[PROFILE_KEY])?stored[PROFILE_KEY]:[];
    const profile=profiles.find(item=>String(item&&item.id)===String(job.profileId));
    if(profile){
      Object.assign(profile,{
        lastSourceUrl:job.sourceUrl,
        lastSourceAt:now,
        pageTitle:text(job.pageTitle),
        productCount:Number(job.total||0),
        lastScanMode:job.scope,
        lastScanProgress:`${Math.min(job.index,job.total||0)}/${job.total||0}`,
        lastScanJobId:job.id
      });
    }

    await chrome.storage.local.set({
      [JOB_KEY]:job,
      [PROFILE_KEY]:profiles,
      [SELECTED_KEY]:job.profileId
    });
    return true;
  }

  function collectScanIssues(job,sourceResults,prepared){
    const issues=[];
    const seen=new Set();
    const push=(type,message,meta={})=>{
      const msg=text(message);
      if(!msg)return;
      const key=`${type}|${msg}|${text(meta.product)}|${text(meta.sku)}`;
      if(seen.has(key))return;
      seen.add(key);
      issues.push({type,message:msg,...meta});
    };

    for(const err of (Array.isArray(job&&job.errors)?job.errors:[])){
      push('scan-error',err&&err.error||'Lỗi quét sản phẩm',{
        product:text(err&&err.title),
        productId:Number(err&&err.id)||0
      });
    }

    for(const item of sourceResults||[]){
      const product=text(item&&item.parentName)||`#${Number(item&&item.parentId)||0}`;
      for(const err of (Array.isArray(item&&item.errors)?item.errors:[])){
        push('popup-error',err&&err.message||err&&err.error||String(err),{product});
      }
      const diag=item&&item.domDiagnostics||{};
      for(const missing of (Array.isArray(diag.missingSizes)?diag.missingSizes:[])){
        push('missing-size',`Không đọc được tồn size ${missing}`,{product});
      }
      for(const color of (Array.isArray(diag.unverifiedColors)?diag.unverifiedColors:[])){
        push('unverified-color',`Chưa xác minh được màu ${color}`,{product});
      }
      for(const color of (Array.isArray(diag.missingColorHints)?diag.missingColorHints:[])){
        push('missing-color',`Thiếu màu ${color}`,{product});
      }
      if(item&&item.complete===false&&!((diag.missingSizes||[]).length)&&!((diag.missingColorHints||[]).length)){
        push('partial-scan',`Quét chưa đầy đủ: ${text(item.stopReason)||'không rõ nguyên nhân'}`,{product});
      }
    }

    for(const name of (Array.isArray(prepared&&prepared.missingSku)?prepared.missingSku:[])){
      push('missing-sku',`Không dựng được SKU cho ${name}`,{product:text(name)});
    }
    return issues;
  }

  async function buildQuickReport(profile,job,sourceResults,prepared,forcedStatus=''){
    const stored=await chrome.storage.local.get([HISTORY_KEY,REPORT_KEY]);
    const history=stored[HISTORY_KEY]&&typeof stored[HISTORY_KEY]==='object'?stored[HISTORY_KEY]:{};
    const reports=stored[REPORT_KEY]&&typeof stored[REPORT_KEY]==='object'?stored[REPORT_KEY]:{};
    const list=Array.isArray(history[profile.id])?history[profile.id]:[];

    const snapshot=historyCore.snapshotFromSource(sourceResults,{
      profileId:profile.id,
      profileName:text(profile.name)||'Hồ sơ',
      sourceUrl:job.sourceUrl,
      at:Date.now(),
      matcher
    });
    const previous=list.length?list[list.length-1]:null;
    const issues=collectScanIssues(job,sourceResults,prepared);
    const scanQuality=quality.evaluate(job,sourceResults,prepared,issues,forcedStatus);
    const fullComparable=Boolean(
      scanQuality.ok &&
      snapshot.items.length &&
      job.scope==='all' &&
      Number(job.index||0)>=Number(job.total||0) &&
      job.stopAfterCurrent!==true
    );
    const diff=fullComparable&&previous?historyCore.compareSnapshots(previous,snapshot):null;

    if(fullComparable){
      list.push(snapshot);
      if(list.length>30)list.splice(0,list.length-30);
      history[profile.id]=list;
    }

    const report={
      profileId:profile.id,
      profileName:text(profile.name)||'Hồ sơ',
      jobId:job.id,
      sourceUrl:job.sourceUrl,
      at:Date.now(),
      snapshotAt:Number(snapshot.at||0),
      previousAt:Number(previous&&previous.at||0),
      firstSnapshot:fullComparable&&!previous,
      comparable:fullComparable,
      diff:diff?{
        changed:Number(diff.changed||0),
        increased:Number(diff.increased||0),
        decreased:Number(diff.decreased||0),
        restocked:Number(diff.restocked||0),
        soldOut:Number(diff.soldOut||0),
        added:Number(diff.added||0),
        missing:Number(diff.missing||0),
        net:Number(diff.net||0),
        oldTotal:Number(diff.oldTotal||0),
        newTotal:Number(diff.newTotal||0),
        changes:(diff.changes||[]).slice(0,300)
      }:null,
      issues,
      issueCount:issues.length,
      quality:scanQuality,
      rowCount:Number(prepared&&prepared.rows&&prepared.rows.length||0)
    };
    reports[profile.id]=report;
    await chrome.storage.local.set({[HISTORY_KEY]:history,[REPORT_KEY]:reports});
    return report;
  }

  async function prepareRows(profile,sourceResults){
    const legacy=await parseLegacyProfile(profile);
    const stored=await chrome.storage.local.get(CONFIG_KEY);
    const config=stored[CONFIG_KEY]&&typeof stored[CONFIG_KEY]==='object'?stored[CONFIG_KEY]:{};
    const profileBranch=legacy
      ?text(legacy.warehouseData.warehouseBranchName||profile&&profile.branchName)
      :text(profile&&profile.branchName);
    const branch=branchCore.resolve({
      profileName:profile&&profile.name,
      sourceUrl:profile&&profile.lastSourceUrl,
      branch:profileBranch,
      branchSource:legacy&&legacy.warehouseData.warehouseBranchName?'legacy-file':''
    },config);
    if(legacy){
      return{
        prepared:autoCore.prepareRows(legacy.warehouseData,legacy.catalogData,sourceResults,matcher,rules),
        branch
      };
    }
    return{
      prepared:autoCore.prepareRows({}, {variants:[]}, sourceResults, matcher, rules),
      branch
    };
  }

  async function finalize(job,forcedStatus=''){
    const state=await getProfiles();
    const profile=state.profiles.find(p=>String(p&&p.id)===String(job.profileId));
    if(!profile)throw new Error('Hồ sơ của tab nguồn không còn tồn tại.');

    const sourceResults=Array.isArray(job.results)?job.results.filter(x=>x&&typeof x==='object'):[];
    const built=await prepareRows(profile,sourceResults);
    const prepared=built.prepared;
    const branch=built.branch;

    job.rowCount=Number(prepared.rows.length||0);
    job.variantTotal=Number(prepared.sourceVariantCount||prepared.rows.length||0);
    job.needsSapoBranch=Boolean(prepared.rows.length&&!branch);

    const scannedVariantCount=sourceResults.reduce((sum,item)=>sum+(Array.isArray(item&&item.variants)?item.variants.length:0),0);
    if(!prepared.rows.length){
      job.running=false;
      job.status='output-error';
      job.finishedAt=Date.now();
      job.lastError=scannedVariantCount
        ? `Đã quét ${scannedVariantCount} biến thể nhưng không dựng được dòng tồn kho.`
        : 'Quét xong nhưng không đọc được biến thể size/tồn từ popup.';
      job.progress=`${Math.min(job.index,job.total||0)}/${job.total||0}`;
      await closeJobTab(job);
      await chrome.storage.local.set({
        [JOB_KEY]:job,
        dhlCatalogResults:Array.isArray(job.results)?job.results:[],
        dhlCatalogAt:Date.now(),
        dhlCatalogPageTitle:text(job.pageTitle),
        dhlCatalogPageUrl:text(job.sourceUrl),
        dhlCatalogSkuMode:'manual-background-popup-full'
      });
      await saveProfileCheckpoint(job.profileId,{
        lastScanProgress:job.progress,
        lastScanJobId:job.id,
        lastScanRowCount:0,
        lastScanFinishedAt:job.finishedAt,
        lastScanError:job.lastError
      });
      return;
    }

    const report=await buildQuickReport(profile,job,sourceResults,prepared,forcedStatus);

    if(prepared.rows.length){
      const stored=await chrome.storage.local.get(BATCH_KEY);
      const pending=stored[BATCH_KEY]&&typeof stored[BATCH_KEY]==='object'?stored[BATCH_KEY]:{};
      const entry={
        profileId:profile.id,
        profileName:text(profile.name)||'Hồ sơ',
        branch,
        sourceUrl:job.sourceUrl,
        scannedAt:Date.now(),
        variantTotal:Number(prepared.sourceVariantCount||prepared.rows.length),
        sourceProductCount:Number(prepared.sourceProductCount||sourceResults.length),
        generatedSkuCount:0,
        matchedSkuCount:Number(prepared.matchedSkuCount||0),
        sourceOnlySkuCount:Number(prepared.sourceOnlySkuCount||0),
        rowCount:prepared.rows.length,
        missingSkuCount:prepared.missingSku.length,
        rows:prepared.rows,
        qualityValidated:report.quality&&report.quality.ok===true,
        auto:false,
        partial:job.scope!=='all'||Number(job.index||0)<Number(job.total||0),
        jobId:job.id,
        report
      };
      await chrome.storage.local.set({[BATCH_KEY]:{...pending,[profile.id]:entry}});
    }

    job.running=false;
    job.status=forcedStatus||'done';
    job.finishedAt=Date.now();
    job.progress=`${Math.min(job.index,job.total||0)}/${job.total||0}`;
    await closeJobTab(job);
    await chrome.storage.local.set({
      [JOB_KEY]:job,
      dhlCatalogResults:Array.isArray(job.results)?job.results:[],
      dhlCatalogAt:Date.now(),
      dhlCatalogPageTitle:text(job.pageTitle),
      dhlCatalogPageUrl:text(job.sourceUrl),
      dhlCatalogSkuMode:'manual-background-popup-full'
    });
    await saveProfileCheckpoint(job.profileId,{
      name:profileName(job.pageTitle,job.sourceUrl),
      sourceOnly:!(profile.warehouseBase64&&profile.catalogBase64),
      sourceKey:sourceKey(job.sourceUrl),
      lastSourceUrl:job.sourceUrl,
      lastSourceAt:job.finishedAt,
      pageTitle:text(job.pageTitle),
      productCount:Number(job.total||0),
      variantCount:Number(job.variantTotal||0),
      lastScanMode:job.scope,
      lastScanProgress:job.progress,
      lastScanJobId:job.id,
      lastScanRowCount:Number(job.rowCount||0),
      lastScanFinishedAt:job.finishedAt,
      lastScanNeedsSapoBranch:job.needsSapoBranch
    });
    return job;
  }

  async function initializeJob(job){
    const tab=await ensureJobTab(job);
    const discovered=await discoverProducts(tab.id);
    let items=Array.isArray(discovered.items)?discovered.items:[];
    if(!items.length)throw new Error('Không tìm thấy sản phẩm trên trang nguồn.');

    if(job.scope==='selected'||job.scope==='one'){
      const selected=new Set((job.selectedIds||[]).map(Number).filter(Boolean));
      items=items.filter(item=>selected.has(Number(item.id)));
      if(job.scope==='one'&&items.length>1)items=items.slice(0,1);
      if(!items.length)throw new Error('Không tìm thấy sản phẩm đã chọn trên trang nguồn.');
    }

    job.descriptors=items;
    job.total=items.length;
    job.pageTitle=text(discovered.pageTitle);
    job.profileName=profileName(job.pageTitle,job.sourceUrl);
    job.status='running';
    job.retryQueue=[];
    job.retryCursor=0;
    job.retryPass=0;
    job.retryAttempts={};
    job.progress=`0/${job.total}`;
    await saveProfileCheckpoint(job.profileId,{
      name:job.profileName,
      pageTitle:job.pageTitle,
      productCount:job.total,
      sourceKey:sourceKey(job.sourceUrl),
      lastSourceUrl:job.sourceUrl
    });
    await checkpoint(job);
    return job;
  }

  let stepInFlight=false;
  async function processStep(){
    if(stepInFlight)return;
    stepInFlight=true;
    try{await runStep();}
    finally{stepInFlight=false;}
  }

  async function runStep(){
    let job=await readJob();
    if(!job||!job.running)return;

    // Xử lý nhiều SP liên tiếp trong cùng một lần worker thức dậy.
    // Vẫn checkpoint sau TỪNG SP để có thể resume chính xác.
    const CHUNK_SIZE=4;
    let processed=0;

    try{
      if(!Array.isArray(job.descriptors)||!job.descriptors.length)job=await initializeJob(job);

      const afterInit=await readJob();
      if(!afterInit||afterInit.id!==job.id||afterInit.running!==true||afterInit.status==='cancelled')return;
      job=afterInit;

      while(job.running&&processed<CHUNK_SIZE){
        const retrying=Number(job.index||0)>=Number(job.total||0);
        const retryQueue=Array.isArray(job.retryQueue)?job.retryQueue:[];
        if(retrying&&Number(job.retryCursor||0)>=retryQueue.length)break;
        const resultIndex=retrying?Number(retryQueue[Number(job.retryCursor||0)]):Number(job.index||0);
        const descriptor=job.descriptors[resultIndex];
        if(!descriptor)throw new Error('Không tìm thấy sản phẩm cần quét lại tại vị trí '+resultIndex);
        const tab=await ensureJobTab(job);

        job.currentProduct=text(descriptor&&descriptor.title)||`Sản phẩm ${resultIndex+1}`;
        job.currentStartedAt=Date.now();
        job.status=retrying?'retrying':'running';
        job.progress=`${job.index}/${job.total}`;
        let result=null,scanError=null;
        try{
          const response=await sendFullPopupScan(tab.id,descriptor);
          if(!response||!response.ok)throw new Error(response&&response.error?response.error:'Không nhận được dữ liệu nguồn.');
          result=response.result;
        }catch(error){
          scanError=error;
        }

        // Job có thể đã bị HỦY NGAY trong lúc content script đang chờ/đọc popup.
        // Luôn đọc lại storage trước khi ghi kết quả để response cũ không "sống lại".
        const latest=await readJob();
        if(!latest||latest.id!==job.id||latest.running!==true||latest.status==='cancelled'){
          return;
        }
        job=latest;
        if(retrying){
          job.retryAttempts=job.retryAttempts&&typeof job.retryAttempts==='object'?job.retryAttempts:{};
          job.retryAttempts[resultIndex]=Number(job.retryAttempts[resultIndex]||0)+1;
        }

        job.errors=Array.isArray(job.errors)?job.errors:[];
        // Only unresolved errors belong to the final report. Clear the
        // previous attempt's error if that product is being scanned again.
        job.errors=job.errors.filter(err=>Number(err&&err.id)!==Number(descriptor&&descriptor.id));
        if(scanError){
          job.errors.push({
            id:descriptor&&descriptor.id,
            title:descriptor&&descriptor.title,
            error:scanError.message||String(scanError),
            at:Date.now()
          });
          if(job.errors.length>MAX_ERRORS)job.errors.splice(0,job.errors.length-MAX_ERRORS);
          result={
            parentId:Number(descriptor&&descriptor.id)||0,
            parentName:text(descriptor&&descriptor.title),
            sourceUrl:text(descriptor&&descriptor.url),
            complete:false,
            scanError:scanError.message||String(scanError),
            colors:[]
          };
        }

        job.results=Array.isArray(job.results)?job.results:[];
        if(retrying){
          job.results[resultIndex]=retryCore.preferResult(job.results[resultIndex],result);
          job.retryCursor=Number(job.retryCursor||0)+1;
        }else{
          job.results[resultIndex]=result;
          job.index+=1;
        }
        processed+=1;
        job.progress=`${job.index}/${job.total}`;
        job.lastCompletedProduct=text(descriptor&&descriptor.title);
        job.lastProductMs=Math.max(0,Date.now()-Number(job.currentStartedAt||Date.now()));
        const variants=Array.isArray(result&&result.variants)?result.variants:[];
        if(!variants.length){
          if(!retrying)job.consecutiveEmpty=Number(job.consecutiveEmpty||0)+1;
          const firstError=result&&Array.isArray(result.errors)&&result.errors[0]
            ? text(result.errors[0].message||result.errors[0].error):'';
          job.lastPopupError=text(scanError&&scanError.message)
            ||firstError
            ||text(result&&result.scanError)
            ||text(result&&result.stopReason)
            ||'Popup không trả biến thể';
        }else{
          job.consecutiveEmpty=0;
          job.lastPopupError='';
        }

        const saved=await checkpoint(job);
        if(saved===false)return;

        // Do not abort on three early popup failures: they may be transient.
        // Continue collecting the category; every incomplete product enters
        // the bounded retry queue before any stock export is permitted.
        if(!retrying&&job.index<=3&&job.consecutiveEmpty>=3){
          job.lastError=`Các popup đầu chưa đọc được; tự quét lại sản phẩm lỗi sau lượt đầu. ${text(job.lastPopupError).slice(0,180)}`;
        }

        if(job.stopAfterCurrent){
          job.pausedAt=Date.now();
          await finalize(job,'paused');
          return;
        }
      }

      if(Number(job.index||0)>=Number(job.total||0)){
        const remaining=retryCore.incompleteIndexes(job.results,job.total);
        if(remaining.length){
          const existingQueue=Array.isArray(job.retryQueue)?job.retryQueue:[];
          const cursor=Number(job.retryCursor||0);
          // Complete the ongoing retry pass before planning another pass.
          if(existingQueue.length&&cursor<existingQueue.length){
            scheduleNext(80);
            return;
          }
          const next=retryCore.planNextPass(job);
          job.retryQueue=next.remaining;
          job.retryCursor=0;
          if(next.status==='paused'){
            job.currentProduct='';
            job.lastError=`Còn ${next.remaining.length} sản phẩm chưa đủ màu/size/tồn sau ${job.retryPass} lượt quét lại. Đã tạm dừng để tránh quét vô hạn; bấm TIẾP TỤC QUÉT LỖI để thử lại.`;
            await finalize(job,'retry-paused');
            return;
          }
          job.retryPass=next.pass;
          job.status='retrying';
          job.currentProduct='';
          await checkpoint(job);
          scheduleNext(RETRY_COOLDOWN_MS);
          return;
        }
        job.retryQueue=[];
        job.retryCursor=0;
        job.currentProduct='';
        await finalize(job);
        return;
      }

      // Tiếp tục ngay nhóm kế tiếp, không đợi Chrome alarm.
      scheduleNext(80);
    }catch(error){
      if(job){
        const current=await readJob().catch(()=>null);
        if(current&&current.id===job.id&&current.running===true&&current.status!=='cancelled'){
          job.running=false;
          job.status='error';
          job.lastError=error.message||String(error);
          job.failedAt=Date.now();
          await closeJobTab(job);
          await saveJob(job);
        }
      }
    }
  }

  async function startJob(message){
    const existing=await readJob();
    if(existing&&existing.running)throw new Error(`Đang có lượt quét ${existing.progress||''}. Hãy dừng hoặc chờ xong.`);

    const sourceUrl=text(message.sourceUrl);
    if(!isCategoryUrl(sourceUrl))throw new Error('Hãy mở đúng trang danh mục trên si.aobongda.net trước.');
    const sourceTabId=Number(message.sourceTabId)||0;
    if(!sourceTabId)throw new Error('Chưa xác định được tab nguồn để quét.');
    let sourceTab;
    try{sourceTab=await chrome.tabs.get(sourceTabId);}
    catch(_){throw new Error('Tab nguồn đã bị đóng. Mở lại danh mục rồi thử lại.');}
    if(!sourceTab||!sameCategoryPage(sourceTab.url,sourceUrl)||!sourceTab.active){
      throw new Error('Hãy chọn đúng tab danh mục nguồn đang mở trước khi đồng bộ.');
    }

    const profile=await ensureSourceProfile({
      profileId:text(message.profileId),
      sourceUrl,
      pageTitle:text(message.pageTitle),
      productCount:Number(message.productCount||0)
    });

    const scope=['all','selected','one'].includes(message.scope)?message.scope:'all';
    const selectedIds=[...new Set((Array.isArray(message.selectedIds)?message.selectedIds:[]).map(Number).filter(Boolean))];
    if((scope==='selected'||scope==='one')&&!selectedIds.length)throw new Error('Chưa chọn sản phẩm cần quét.');

    const job={
      id:`manual-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      running:true,status:'queued',
      profileId:profile.id,
      profileName:text(profile.name)||'Hồ sơ',
      sourceUrl,scope,selectedIds,
      descriptors:[],results:[],errors:[],
      index:0,total:0,progress:'0/0',
      retryQueue:[],retryCursor:0,retryPass:0,retryAttempts:{},
      stopAfterCurrent:false,
      createdAt:Date.now(),startedAt:Date.now(),
      sourceTabId,
      tabId:0,
      ownsTab:false,
      scanWindowId:0,
      ownsWindow:false,
      consecutiveEmpty:0
    };
    await saveJob(job);
    await saveProfileCheckpoint(profile.id,{lastSourceUrl:sourceUrl,lastManualScope:scope,lastScanJobId:job.id});
    scheduleNext(150);
    return job;
  }

  async function discoverSpecificTab(tabId){
    const tab=await chrome.tabs.get(Number(tabId));
    if(!tab||!tab.id||!isCategoryUrl(tab.url))throw new Error('Tab đã chọn không phải trang danh mục si.aobongda.net.');
    const result=await discoverProducts(tab.id);
    if(!result.items.length)throw new Error('Không tìm thấy sản phẩm trên tab đã chọn.');
    result.profileName=profileName(result.pageTitle,result.pageUrl);
    result.sourceKey=sourceKey(result.pageUrl);
    result.tabId=tab.id;
    result.tabTitle=text(tab.title);
    return result;
  }

  async function discoverActivePage(){
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab||!tab.id||!isCategoryUrl(tab.url))throw new Error('Hãy mở trang danh mục si.aobongda.net cần quét.');
    return discoverSpecificTab(tab.id);
  }

  async function listOpenSourceTabs(){
    const tabs=await chrome.tabs.query({});
    const state=await getProfiles();
    const profiles=Array.isArray(state.profiles)?state.profiles:[];
    return tabs
      .filter(tab=>tab&&tab.id&&isCategoryUrl(tab.url))
      .map(tab=>{
        const key=sourceKey(tab.url);
        const profile=profiles.find(p=>text(p&&p.sourceKey)===key||sourceKey(p&&p.lastSourceUrl)===key)||null;
        return{
          tabId:tab.id,
          windowId:tab.windowId,
          active:Boolean(tab.active),
          title:text(tab.title),
          url:text(tab.url),
          sourceKey:key,
          profileId:profile?text(profile.id):'',
          profileName:profile?text(profile.name):'',
          hasProfile:Boolean(profile)
        };
      });
  }

  async function requestStop(){
    const job=await readJob();
    if(!job||(!job.running&&job.status!=='queued'))return job;
    job.stopAfterCurrent=true;job.status='stopping';await saveJob(job);return job;
  }

  async function cancelNow(){
    const job=await readJob();
    if(!job)return null;

    try{await chrome.alarms.clear(ALARM);}catch(_){}

    // Báo content script hủy scan đang dở và đóng popup nếu còn mở.
    const targetTabId=Number(job.tabId||job.sourceTabId)||0;
    if(targetTabId){
      try{await chrome.tabs.sendMessage(targetTabId,{type:'DHL_CANCEL_POPUP_SCAN'});}catch(_){}
    }

    job.running=false;
    job.status='cancelled';
    job.stopAfterCurrent=false;
    job.cancelledAt=Date.now();
    job.currentProduct='';
    job.progress=`${Math.min(Number(job.index||0),Number(job.total||0))}/${Number(job.total||0)}`;
    await closeJobTab(job);
    await saveJob(job);
    return job;
  }

  async function resumeJob(){
    const job=await readJob();
    if(!job||!['paused','retry-paused','done','output-error'].includes(job.status))
      throw new Error('Không có lượt quét đã lưu để tiếp tục.');
    const tabId=Number(job.sourceTabId)||0;
    if(!tabId)throw new Error('Không còn tab nguồn của lượt quét cũ. Mở lại đúng danh mục để quét mới.');
    let tab;
    try{tab=await chrome.tabs.get(tabId);}
    catch(_){throw new Error('Tab nguồn của lượt quét trước đã đóng. Hãy mở lại danh mục và bắt đầu lượt mới.');}
    if(!tab||!tab.active||!sameCategoryPage(tab.url,job.sourceUrl))
      throw new Error('Chọn lại đúng tab và trang danh mục đã quét trước khi tiếp tục.');

    // Reconcile stored descriptors with the *actual visible grid* every time
    // the user resumes. An older build scanned every link on the page and
    // could accidentally save products from menus/other departments.
    const discovered=await discoverProducts(tabId);
    let visibleItems=discovered.items;
    if(job.scope==='selected'||job.scope==='one'){
      const selected=new Set((job.selectedIds||[]).map(Number).filter(Boolean));
      visibleItems=visibleItems.filter(item=>selected.has(Number(item.id)));
      if(job.scope==='one')visibleItems=visibleItems.slice(0,1);
    }
    if(!visibleItems.length)
      throw new Error('Không còn sản phẩm thuộc phạm vi đã chọn trong lưới đang hiển thị.');
    const oldItems=Array.isArray(job.descriptors)?job.descriptors:[];
    const oldResults=Array.isArray(job.results)?job.results:[];
    const savedById=new Map(oldItems.map((item,i)=>[Number(item&&item.id),oldResults[i]||null]));
    const visibleIds=new Set(visibleItems.map(item=>Number(item.id)));
    job.outsideGridRemoved=oldItems.filter(item=>!visibleIds.has(Number(item&&item.id)))
      .map(item=>({id:Number(item&&item.id)||0,title:text(item&&item.title)}));
    job.descriptors=visibleItems;
    job.results=visibleItems.map(item=>savedById.get(Number(item.id))||null);
    job.total=visibleItems.length;
    job.index=job.total;
    job.pageTitle=text(discovered.pageTitle);
    job.profileName=profileName(job.pageTitle,job.sourceUrl);
    job.errors=(Array.isArray(job.errors)?job.errors:[])
      .filter(err=>visibleIds.has(Number(err&&err.id)));
    const remaining=retryCore.incompleteIndexes(job.results,job.total);
    job.retryQueue=remaining;
    job.retryCursor=0;
    job.retryPass=remaining.length?1:0;
    job.retryAttempts={};
    job.lastError='';
    job.progress=`${job.index}/${job.total}`;
    job.running=true;
    job.status='queued';
    job.stopAfterCurrent=false;
    job.resumedAt=Date.now();
    await saveJob(job);
    scheduleNext(150);
    return job;
  }

  async function rebuildLastOutput(){
    const job=await readJob();
    if(!job||!Array.isArray(job.results)||!job.results.length)throw new Error('Không có lượt quét gần nhất để khôi phục đầu ra.');
    const state=await getProfiles();
    const profile=state.profiles.find(p=>String(p&&p.id)===String(job.profileId));
    if(!profile)throw new Error('Không tìm thấy hồ sơ của lượt quét gần nhất.');

    const sourceResults=job.results.filter(x=>x&&typeof x==='object');
    const built=await prepareRows(profile,sourceResults);
    const prepared=built.prepared;
    if(!prepared.rows.length)throw new Error('Lượt quét gần nhất chưa tạo được dòng tồn kho.');

    const stored=await chrome.storage.local.get(BATCH_KEY);
    const pending=stored[BATCH_KEY]&&typeof stored[BATCH_KEY]==='object'?stored[BATCH_KEY]:{};
    const entry={
      profileId:profile.id,
      profileName:text(profile.name)||'Hồ sơ',
      branch:text(built.branch),
      sourceUrl:job.sourceUrl,
      scannedAt:Number(job.finishedAt||job.updatedAt||Date.now()),
      variantTotal:Number(prepared.sourceVariantCount||prepared.rows.length),
      sourceProductCount:Number(prepared.sourceProductCount||sourceResults.length),
      generatedSkuCount:0,
      matchedSkuCount:Number(prepared.matchedSkuCount||0),
      sourceOnlySkuCount:Number(prepared.sourceOnlySkuCount||0),
      rowCount:prepared.rows.length,
      missingSkuCount:prepared.missingSku.length,
      rows:prepared.rows,
      auto:false,
      partial:job.scope!=='all'||Number(job.index||0)<Number(job.total||0),
      jobId:job.id,
      qualityValidated:false,
      recovered:true
    };
    await chrome.storage.local.set({[BATCH_KEY]:{...pending,[profile.id]:entry}});
    return entry;
  }

  chrome.alarms.onAlarm.addListener(alarm=>{
    if(alarm.name===ALARM)processStep().catch(()=>{});
  });

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(!message||!message.type)return;
    if(message.type==='DHL_MANUAL_JOB_DISCOVER'){
      discoverActivePage().then(result=>sendResponse({ok:true,result})).catch(error=>sendResponse({ok:false,error:error.message||String(error)}));return true;
    }
    if(message.type==='DHL_MANUAL_JOB_DISCOVER_TAB'){
      discoverSpecificTab(message.tabId).then(result=>sendResponse({ok:true,result})).catch(error=>sendResponse({ok:false,error:error.message||String(error)}));return true;
    }
    if(message.type==='DHL_MANUAL_JOB_LIST_TABS'){
      listOpenSourceTabs().then(tabs=>sendResponse({ok:true,tabs})).catch(error=>sendResponse({ok:false,error:error.message||String(error)}));return true;
    }
    if(message.type==='DHL_MANUAL_JOB_START'){
      startJob(message).then(job=>sendResponse({ok:true,job})).catch(error=>sendResponse({ok:false,error:error.message||String(error)}));return true;
    }
    if(message.type==='DHL_MANUAL_JOB_GET'){
      readJob().then(job=>sendResponse({ok:true,job})).catch(error=>sendResponse({ok:false,error:error.message||String(error)}));return true;
    }
    if(message.type==='DHL_MANUAL_JOB_STOP'){
      requestStop().then(job=>sendResponse({ok:true,job})).catch(error=>sendResponse({ok:false,error:error.message||String(error)}));return true;
    }
    if(message.type==='DHL_MANUAL_JOB_CANCEL_NOW'){
      cancelNow().then(job=>sendResponse({ok:true,job})).catch(error=>sendResponse({ok:false,error:error.message||String(error)}));return true;
    }
    if(message.type==='DHL_MANUAL_JOB_RESUME'){
      resumeJob().then(job=>sendResponse({ok:true,job})).catch(error=>sendResponse({ok:false,error:error.message||String(error)}));return true;
    }
    if(message.type==='DHL_MANUAL_JOB_REBUILD_OUTPUT'){
      rebuildLastOutput().then(entry=>sendResponse({ok:true,entry})).catch(error=>sendResponse({ok:false,error:error.message||String(error)}));return true;
    }
  });
})();