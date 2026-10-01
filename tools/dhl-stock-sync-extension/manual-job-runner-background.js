(() => {
  'use strict';

  const xlsx=globalThis.DHLXlsxLite;
  const matcher=globalThis.DHLMatchCore;
  const autoCore=globalThis.DHLAutoSyncCore;
  const rules=globalThis.DHLShopRules;
  if(!xlsx||!matcher||!autoCore||!rules)return;

  const PROFILE_KEY='dhlSavedStockProfilesV1';
  const SELECTED_KEY='dhlSelectedStockProfileId';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const JOB_KEY='dhlManualScanJobV2';
  const BATCH_KEY='dhlManualPendingStockBatchV1';
  const ALARM='dhl-manual-scan-step';
  const MAX_ERRORS=100;

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

  async function ensureJobTab(job){
    // Ưu tiên dùng chính tab nguồn người dùng đã mở. Không reload/clone nếu không cần.
    const preferredId=Number(job&&job.sourceTabId)||0;
    if(preferredId){
      try{
        const tab=await chrome.tabs.get(preferredId);
        if(tab&&isCategoryUrl(tab.url)&&sourceKey(tab.url)===sourceKey(job.sourceUrl)){
          job.tabId=preferredId;
          job.ownsTab=false;
          return tab;
        }
      }catch{}
    }

    if(job.tabId){
      try{
        const tab=await chrome.tabs.get(job.tabId);
        if(tab&&isCategoryUrl(tab.url)&&sourceKey(tab.url)===sourceKey(job.sourceUrl))return tab;
      }catch{}
    }

    // Chỉ tạo tab nền dự phòng nếu tab gốc đã bị đóng/đổi URL.
    const tab=await chrome.tabs.create({url:job.sourceUrl,active:false});
    await waitTabComplete(tab.id);
    await sleep(120);
    job.tabId=tab.id;
    job.ownsTab=true;
    await saveJob(job);
    return tab;
  }

  async function closeJobTab(job){
    if(!job||!job.tabId)return;
    if(job.ownsTab===true){
      try{await chrome.tabs.remove(job.tabId);}catch{}
    }
    job.tabId=0;
    job.ownsTab=false;
  }

  async function injectScanner(tabId){
    for(const file of ['stock-core.js','dom-stock-parser.js','match-core.js','content.js']){
      await chrome.scripting.executeScript({target:{tabId},files:[file]});
    }
    await sleep(180);
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
    const out=await chrome.scripting.executeScript({
      target:{tabId},
      func:()=>{
        const clean=(v)=>String(v==null?'':v).replace(/\s+/g,' ').trim();
        const pid=(v)=>{
          const s=String(v||'');
          const m=s.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i)||s.match(/[?&](?:psId|productId|id)=(\d+)/i);
          return m?Number(m[1]):0;
        };
        const imageUrl=(node)=>{
          if(!node)return'';
          const img=node.matches&&node.matches('img')?node:node.querySelector&&node.querySelector('img');
          if(!img)return'';
          return String(img.currentSrc||img.src||img.getAttribute('data-src')||img.getAttribute('data-original')||'').trim();
        };
        const seen=new Map();
        for(const a of document.querySelectorAll('a[href]')){
          let url;
          try{url=new URL(a.getAttribute('href'),location.href);}catch{continue;}
          if(url.host!==location.host)continue;
          const id=pid(url.href);if(!id)continue;
          let title=clean(a.textContent);
          const img=a.querySelector('img');
          if((!title||title.length<3)&&img)title=clean(img.alt||img.title);
          let card=a;
          for(let depth=0;depth<5&&card&&card!==document.body;depth+=1,card=card.parentElement){
            const t=clean(card.textContent);
            if((!title||title.length<3)&&t&&t.length<260)title=t;
            if(imageUrl(card))break;
          }
          if(!title||title.length>220)continue;
          const item={id,title,url:url.href,imageUrl:imageUrl(card||a)};
          const old=seen.get(id);
          if(!old||item.title.length>old.title.length)seen.set(id,item);
        }
        return{items:[...seen.values()],pageTitle:document.title,pageUrl:location.href};
      }
    });
    return(out&&out[0]&&out[0].result)||{items:[],pageTitle:'',pageUrl:''};
  }

  async function saveJob(job){
    job.updatedAt=Date.now();
    await chrome.storage.local.set({[JOB_KEY]:job});
  }

  async function readJob(){
    const stored=await chrome.storage.local.get(JOB_KEY);
    return stored[JOB_KEY]&&typeof stored[JOB_KEY]==='object'?stored[JOB_KEY]:null;
  }

  function scheduleNext(delay=250){
    chrome.alarms.create(ALARM,{when:Date.now()+Math.max(100,Number(delay||0))});
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

  async function prepareRows(profile,sourceResults){
    const legacy=await parseLegacyProfile(profile);
    if(legacy){
      return{
        prepared:autoCore.prepareRows(legacy.warehouseData,legacy.catalogData,sourceResults,matcher,rules),
        branch:text(legacy.warehouseData.warehouseBranchName||profile.branchName)
      };
    }
    const stored=await chrome.storage.local.get(CONFIG_KEY);
    const config=stored[CONFIG_KEY]&&typeof stored[CONFIG_KEY]==='object'?stored[CONFIG_KEY]:{};
    const branch=text(config&&config.sapo&&config.sapo.locationName)||text(profile&&profile.branchName);
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
        auto:false,
        partial:job.scope!=='all'||Number(job.index||0)<Number(job.total||0),
        jobId:job.id
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

  async function processStep(){
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

      while(job.running&&Number(job.index||0)<Number(job.total||0)&&processed<CHUNK_SIZE){
        const tab=await ensureJobTab(job);
        const descriptor=job.descriptors[job.index];

        job.currentProduct=text(descriptor&&descriptor.title)||`Sản phẩm ${job.index+1}`;
        job.currentStartedAt=Date.now();
        job.status='running';
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

        if(scanError){
          job.errors=Array.isArray(job.errors)?job.errors:[];
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
        job.results.push(result);
        job.index+=1;
        processed+=1;
        job.progress=`${job.index}/${job.total}`;
        job.lastCompletedProduct=text(descriptor&&descriptor.title);
        job.lastProductMs=Math.max(0,Date.now()-Number(job.currentStartedAt||Date.now()));
        const saved=await checkpoint(job);
        if(saved===false)return;

        if(job.stopAfterCurrent&&job.index<job.total){
          job.pausedAt=Date.now();
          await finalize(job,'paused');
          return;
        }
      }

      if(Number(job.index||0)>=Number(job.total||0)){
        await finalize(job);
        return;
      }

      // Chỉ nhường worker sau một chunk, thay vì sau từng sản phẩm.
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
      stopAfterCurrent:false,
      createdAt:Date.now(),startedAt:Date.now(),
      sourceTabId:Number(message.sourceTabId)||0,
      tabId:Number(message.sourceTabId)||0,
      ownsTab:false
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
    if(!job||job.status!=='paused')throw new Error('Không có lượt quét đang tạm dừng.');
    job.running=true;job.status='queued';job.stopAfterCurrent=false;job.resumedAt=Date.now();
    await saveJob(job);scheduleNext(150);return job;
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