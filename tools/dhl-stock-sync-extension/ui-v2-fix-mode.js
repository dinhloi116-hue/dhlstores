(() => {
  'use strict';

  const STORAGE_KEY='dhlSavedStockProfilesV1';
  const SELECTED_KEY='dhlSelectedStockProfileId';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
  let running=false;
  const text=(v)=>String(v==null?'':v).trim();
  const plain=(v)=>text(v).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

  function groupKey(value){
    const p=plain(value);
    if(p.includes('tre em'))return'tre em';
    if(p.includes('wika'))return'wika';
    if(p.includes('strivend'))return'strivend';
    if(p==='hd'||p.includes('nguoi lon')||p.includes('adult'))return'hd';
    return p;
  }

  function labelFromCategoryTab(tab){
    if(!tab)return'';
    let u=null;
    try{u=new URL(tab.url||'');}catch{return'';}
    const path=String(u.pathname||'').toLowerCase();
    if(/-p\d+(?:\.html)?$/i.test(path))return'';
    const title=text(tab.title||'').replace(/\s*[|｜-]\s*aobongda.*$/i,'').trim();
    if(title&&plain(title)!=='aobongda')return title;
    const last=path.split('/').filter(Boolean).pop()||'';
    const slug=last.replace(/\.html$/i,'').replace(/-pc\d+$/i,'').replace(/[-_]+/g,' ').trim();
    if(!slug)return'';
    return slug.replace(/\b\w/g,ch=>ch.toUpperCase());
  }

  function detectGroup(tab){
    if(!tab)return{key:'',label:''};
    let path=''; try{path=new URL(tab.url||'').pathname.toLowerCase();}catch{}
    const hay=plain(`${tab.title||''} ${tab.url||''}`);
    if(/-p\d+(?:\.html)?$/i.test(path))return{key:'',label:''};
    if(path.includes('ao-tre-em')||path.includes('pc37502')||hay.includes('tre em'))return{key:'tre em',label:'Trẻ em'};
    if(hay.includes('wika'))return{key:'wika',label:'Wika'};
    if(hay.includes('strivend'))return{key:'strivend',label:'Strivend'};
    if(path.includes('/hd-pc36029')||/\bhd\b/.test(plain(tab.title||'')))return{key:'hd',label:'HD'};
    const label=labelFromCategoryTab(tab);
    return label?{key:`site:${plain(label)}`,label}:{key:'',label:''};
  }

  async function activeTab(){const [tab]=await chrome.tabs.query({active:true,currentWindow:true});return tab||null;}
  async function state(){const s=await chrome.storage.local.get([STORAGE_KEY,SELECTED_KEY]);return{profiles:Array.isArray(s[STORAGE_KEY])?s[STORAGE_KEY]:[],selectedId:text(s[SELECTED_KEY])};}
  function profileFor(profiles,key){return profiles.find(p=>groupKey(p&&p.name)===key)||null;}

  async function selectProfile(profile){
    if(!profile)return;
    const s=await state();
    if(s.selectedId===profile.id)return;
    const real=document.querySelector(`[data-profile-id="${CSS.escape(String(profile.id))}"]`);
    if(real){real.click();}
    else await chrome.storage.local.set({[SELECTED_KEY]:profile.id});
    const started=Date.now();
    while(Date.now()-started<2500){
      if(text(document.getElementById('activeProfileName')?.textContent)===text(profile.name))break;
      await sleep(80);
    }
  }

  function setBadge(label){const el=document.getElementById('uiV2DetectedTab');if(el)el.textContent=label?`Tab nguồn: ${label}`:'Tab nguồn: chưa nhận diện';}
  function setHint(msg){const el=document.getElementById('uiV2Hint');if(el)el.textContent=msg;}
  function setSmart(msg,kind=''){const el=document.getElementById('uiV2SmartState');if(!el)return;el.textContent=msg;el.className=`ui-v2-state${kind?` ${kind}`:''}`;}

  async function syncContext({select=true}={}){
    const tab=await activeTab();
    if(!tab||!String(tab.url||'').startsWith('https://si.aobongda.net/')){
      setBadge(''); setHint('Mở đúng tab danh mục trên web nguồn.');
      return{tab:null,group:{key:'',label:''},profile:null};
    }
    const group=detectGroup(tab); setBadge(group.label);
    const s=await state();
    const profile=group.key?profileFor(s.profiles,group.key):null;
    if(profile){
      if(select)await selectProfile(profile);
      setHint(`Tự nhận: ${profile.name}. Bấm ĐỒNG BỘ TAB ĐANG MỞ để quét popup và đồng bộ.`);
    }else if(group.label){
      setHint(`Đã nhận tab ${group.label}. Không cần tạo hồ sơ: bấm ĐỒNG BỘ TAB ĐANG MỞ để quét popup trực tiếp.`);
    }else setHint('Đây có vẻ là trang chi tiết hoặc trang không phải danh mục. Hãy mở một danh mục bất kỳ trên aobongda.net.');
    return{tab,group,profile};
  }

  function noReceiver(error){
    return /Receiving end does not exist|Could not establish connection/i.test(String(error&&error.message||error||''));
  }

  async function injectScanner(tabId){
    for(const file of ['stock-core.js','dom-stock-parser.js','match-core.js','content.js']){
      await chrome.scripting.executeScript({target:{tabId},files:[file]});
    }
    await sleep(180);
  }

  async function sendPopupScan(tabId,suppressedIds=[]){
    const message={type:'DHL_SCAN_HD_LIVE_POPUP_ONLY',hints:[],suppressedIds};
    try{
      return await chrome.tabs.sendMessage(tabId,message);
    }catch(error){
      if(!noReceiver(error))throw error;
      await injectScanner(tabId);
      return chrome.tabs.sendMessage(tabId,message);
    }
  }

  async function sourceOnlySync(ctx){
    if(!ctx||!ctx.tab||!ctx.tab.id)throw new Error('Không đọc được tab nguồn.');
    const label=text(ctx.group&&ctx.group.label)||'Nguồn';
    const policy=globalThis.DHLSourceZeroStockPolicy;
    const suppressedBefore=policy&&typeof policy.suppressedIds==='function'?await policy.suppressedIds():[];
    const sleeping=suppressedBefore.length;
    setSmart(`Đang quét ${label} • mở popup sản phẩm hoạt động${sleeping?` • ${sleeping} SP 0 tồn lâu chỉ kiểm tra nhanh`:''}...`,'working');

    const response=await sendPopupScan(ctx.tab.id,suppressedBefore);
    if(!response||!response.ok)throw new Error(response&&response.error||'Không nhận được dữ liệu quét tồn.');
    const results=Array.isArray(response.result)?response.result:[];
    if(!results.length)throw new Error('Không quét được sản phẩm nào trên tab này.');

    let policyResult={newlySuppressed:[],revived:[]};
    let outputResults=results;
    if(policy&&typeof policy.applyScan==='function'){
      policyResult=await policy.applyScan(results);
      if(typeof policy.filterForOutput==='function')outputResults=policy.filterForOutput(results,suppressedBefore);
    }

    if(!globalThis.DHLBatchStockCache||typeof globalThis.DHLBatchStockCache.cacheSourceOnly!=='function'){
      throw new Error('Bộ lưu cache chưa sẵn sàng. Hãy NẠP LẠI TOOL.');
    }

    let entry=null;
    if(outputResults.length){
      entry=await globalThis.DHLBatchStockCache.cacheSourceOnly(outputResults,label);
    }else if(typeof globalThis.DHLBatchStockCache.clearSourceOnly==='function'){
      await globalThis.DHLBatchStockCache.clearSourceOnly(label);
    }

    const s=await chrome.storage.local.get(CONFIG_KEY);
    const cfg=s[CONFIG_KEY]&&typeof s[CONFIG_KEY]==='object'?s[CONFIG_KEY]:{};
    const sapo=cfg.sapo&&typeof cfg.sapo==='object'?cfg.sapo:{};
    const shouldPush=Boolean(entry&&cfg.autoPushSapo===true&&sapo.verifiedAt&&sapo.locationId);
    const sleepText=policyResult.newlySuppressed&&policyResult.newlySuppressed.length?` • mới loại ${policyResult.newlySuppressed.length} SP 0 tồn đủ 10 ngày`:'';
    const reviveText=policyResult.revived&&policyResult.revived.length?` • khôi phục ${policyResult.revived.length} SP có hàng lại`:'';

    if(shouldPush&&globalThis.DHLManualSapoOutput&&typeof globalThis.DHLManualSapoOutput.pushManual==='function'){
      setSmart(`Quét xong ${label}: ${entry.rowCount} dòng${sleepText}${reviveText}. Đang đẩy tồn lên Sapo...`,'working');
      await globalThis.DHLManualSapoOutput.pushManual();
      setSmart(`Đã tạo hàng đợi đồng bộ ${label} lên Sapo • ${entry.rowCount} dòng${sleepText}${reviveText}.`,'ok');
    }else if(entry){
      setSmart(`Quét xong ${label}: ${entry.rowCount} dòng sẵn sàng${sleepText}${reviveText}. Chọn TẢI FILE EXCEL hoặc ĐẨY LÊN SAPO.`,'ok');
    }else{
      setSmart(`Quét xong ${label}: hiện không có sản phẩm hoạt động để xuất/đẩy${sleepText}${reviveText}.`,'ok');
    }
    return entry;
  }

  function waitScan(timeout=600000){
    return new Promise((resolve,reject)=>{
      const started=Date.now();
      const timer=setInterval(()=>{
        const status=text(document.getElementById('profileStatus')?.textContent);
        if(/LỖI QUÉT|LỖI LƯU CACHE|chưa ghép được|Hồ sơ chưa đủ SKU/i.test(status)){clearInterval(timer);reject(new Error(status));return;}
        if(/^ĐÃ LƯU CACHE\s+/i.test(status)||/^QUÉT XONG\s+/i.test(status)){clearInterval(timer);resolve(status);return;}
        if(Date.now()-started>timeout){clearInterval(timer);reject(new Error('Quét hoặc lưu cache quá lâu. Mở “Thao tác thủ công / kiểm tra” để thử riêng từng bước.'));}
      },250);
    });
  }

  async function runSmart(event){
    if(running)return;
    event.preventDefault(); event.stopImmediatePropagation();
    running=true;
    const btn=document.getElementById('uiV2SyncBtn'); const old=btn?btn.textContent:'';
    if(btn){btn.disabled=true;btn.textContent='ĐANG NHẬN TAB...';}
    try{
      const ctx=await syncContext({select:true});
      if(!ctx.tab)throw new Error('Hãy mở đúng tab danh mục nguồn trước.');
      if(!ctx.group||!ctx.group.label)throw new Error('Hãy mở một trang DANH MỤC bất kỳ trên si.aobongda.net.');
      if(btn)btn.textContent=`ĐANG QUÉT ${ctx.group.label.toUpperCase()}...`;
      // Luồng thủ công đơn giản nhất: không cần hồ sơ, quét popup trực tiếp từ tab hiện tại.
      await sourceOnlySync(ctx);
    }catch(error){setSmart(error.message||String(error),'error');}
    finally{running=false;if(btn){btn.disabled=false;btn.textContent=old||'ĐỒNG BỘ TAB ĐANG MỞ';}}
  }

  async function updateSyncButtonLabel(){
    const btn=document.getElementById('uiV2SyncBtn');
    if(!btn||running)return;
    const ctx=await syncContext({select:false}).catch(()=>null);
    if(ctx&&ctx.group&&ctx.group.label)btn.textContent=`ĐỒNG BỘ ${ctx.group.label.toUpperCase()}`;
    else btn.textContent='ĐỒNG BỘ TAB ĐANG MỞ';
  }

  async function fixQuickTabs(){
    const row=document.getElementById('profileQuickTabButtons'); if(!row)return;
    const s=await state();
    for(const button of [...row.querySelectorAll('button')]){
      const raw=text(button.textContent);
      if(raw.includes('HỒ SƠ KHÁC'))continue;
      const base=raw.replace(/\s*[+✓]\s*$/,'');
      const key=groupKey(base); if(!['hd','tre em','wika','strivend'].includes(key))continue;
      const profile=profileFor(s.profiles,key);
      if(!profile||button.dataset.aliasFixed===String(profile.id))continue;
      const clone=button.cloneNode(true);
      clone.dataset.aliasFixed=String(profile.id);
      clone.textContent=`${profile.name} ✓`;
      clone.title=`Chọn hồ sơ ${profile.name}`;
      clone.classList.add('ready');
      clone.addEventListener('click',()=>selectProfile(profile));
      button.replaceWith(clone);
    }
  }

  function install(){
    const attach=()=>{
      const btn=document.getElementById('uiV2SyncBtn');
      if(!btn||btn.dataset.aliasFix==='1')return false;
      btn.dataset.aliasFix='1';
      btn.addEventListener('click',runSmart,true);
      syncContext({select:true}).then(()=>updateSyncButtonLabel()).catch(()=>{});
      fixQuickTabs().catch(()=>{});
      return true;
    };
    if(!attach()){
      const obs=new MutationObserver(()=>{attach();fixQuickTabs().catch(()=>{});});
      obs.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>obs.disconnect(),15000);
    }
    const paint=new MutationObserver(()=>fixQuickTabs().catch(()=>{}));
    paint.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>paint.disconnect(),20000);
    chrome.tabs.onActivated.addListener(()=>setTimeout(()=>{syncContext({select:true}).then(()=>updateSyncButtonLabel()).catch(()=>{});},150));
    chrome.tabs.onUpdated.addListener((id,info,tab)=>{if(info.status==='complete'&&tab.active)setTimeout(()=>{syncContext({select:true}).then(()=>updateSyncButtonLabel()).catch(()=>{});},150);});
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes[STORAGE_KEY]||changes[SELECTED_KEY]))setTimeout(()=>{fixQuickTabs().catch(()=>{});syncContext({select:false}).catch(()=>{});},80);});
  }

  install();
})();
