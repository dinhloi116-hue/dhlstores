(() => {
  'use strict';

  const STORAGE_KEY='dhlSavedStockProfilesV1';
  const SELECTED_KEY='dhlSelectedStockProfileId';
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

  function detectGroup(tab){
    if(!tab)return{key:'',label:''};
    let path=''; try{path=new URL(tab.url||'').pathname.toLowerCase();}catch{}
    const hay=plain(`${tab.title||''} ${tab.url||''}`);
    if(path.includes('ao-tre-em')||path.includes('pc37502')||hay.includes('tre em'))return{key:'tre em',label:'Trẻ em'};
    if(hay.includes('wika'))return{key:'wika',label:'Wika'};
    if(hay.includes('strivend'))return{key:'strivend',label:'Strivend'};
    if(path.includes('/hd-pc36029')||/\bhd\b/.test(plain(tab.title||'')))return{key:'hd',label:'HD'};
    return{key:'',label:''};
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
      setHint(`Tự nhận: ${profile.name}. Có thể bấm ĐỒNG BỘ TAB ĐANG MỞ.`);
    }else if(group.label){
      setHint(`Đã nhận tab ${group.label}, nhưng chưa có hồ sơ đúng nhóm này.`);
    }else setHint('Không nhận diện được nhóm từ tab hiện tại; hãy chọn hồ sơ thủ công.');
    return{tab,group,profile};
  }

  function waitScan(timeout=150000){
    return new Promise((resolve,reject)=>{
      const started=Date.now();
      const timer=setInterval(()=>{
        const status=text(document.getElementById('profileStatus')?.textContent);
        const exportBtn=document.getElementById('profileExportBtn');
        if(/LỖI QUÉT|chưa ghép được|Hồ sơ chưa đủ SKU/i.test(status)){clearInterval(timer);reject(new Error(status));return;}
        if(exportBtn&&!exportBtn.disabled&&/QUÉT XONG|Có thể tạo file nhập Sapo/i.test(status)){clearInterval(timer);resolve();return;}
        if(Date.now()-started>timeout){clearInterval(timer);reject(new Error('Quét quá lâu. Mở “Thao tác thủ công / kiểm tra” để thử riêng từng bước.'));}
      },300);
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
      if(!ctx.profile)throw new Error(ctx.group.label?`Chưa có hồ sơ ${ctx.group.label}. Hãy tạo hồ sơ này một lần.`:'Không tự nhận được hồ sơ từ tab đang mở.');
      const scan=document.getElementById('profileScanBtn'); const exp=document.getElementById('profileExportBtn');
      if(!scan||!exp)throw new Error('Bộ đồng bộ chưa tải xong. Đóng/mở lại panel rồi thử lại.');
      setSmart(`Đang quét ${ctx.profile.name}...`,'working'); if(btn)btn.textContent='ĐANG QUÉT KHO...';
      scan.click(); await waitScan();
      setSmart('Quét xong. Đang tạo file nhập Sapo...','working'); if(btn)btn.textContent='ĐANG TẠO FILE...';
      exp.click(); await sleep(550);
      const status=text(document.getElementById('profileStatus')?.textContent);
      if(/LỖI TẠO FILE/i.test(status))throw new Error(status);
      setSmart(`Đã xong ${ctx.profile.name}. File nhập Sapo đã được tạo.`,'ok');
    }catch(error){setSmart(error.message||String(error),'error');}
    finally{running=false;if(btn){btn.disabled=false;btn.textContent=old||'ĐỒNG BỘ TAB ĐANG MỞ';}}
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
      syncContext({select:true}).catch(()=>{});
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
    chrome.tabs.onActivated.addListener(()=>setTimeout(()=>syncContext({select:true}).catch(()=>{}),150));
    chrome.tabs.onUpdated.addListener((id,info,tab)=>{if(info.status==='complete'&&tab.active)setTimeout(()=>syncContext({select:true}).catch(()=>{}),150);});
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes[STORAGE_KEY]||changes[SELECTED_KEY]))setTimeout(()=>{fixQuickTabs().catch(()=>{});syncContext({select:false}).catch(()=>{});},80);});
  }

  install();
})();
