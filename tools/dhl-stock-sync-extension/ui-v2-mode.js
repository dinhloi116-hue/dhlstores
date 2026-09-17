(() => {
  'use strict';

  const STORAGE_KEY='dhlSavedStockProfilesV1';
  const SELECTED_KEY='dhlSelectedStockProfileId';
  let syncing=false;

  const text=(v)=>String(v==null?'':v).trim();
  const plain=(v)=>text(v).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

  function detectLabel(tab){
    if(!tab)return'';
    let path='';
    try{path=new URL(tab.url||'').pathname.toLowerCase();}catch{}
    const hay=plain(`${tab.title||''} ${tab.url||''}`);
    if(path.includes('/hd-pc36029')||/\bhd\b/.test(plain(tab.title||'')))return'HD';
    if(path.includes('ao-tre-em')||path.includes('pc37502')||hay.includes('tre em'))return'Trẻ em';
    if(hay.includes('wika'))return'Wika';
    if(hay.includes('strivend'))return'Strivend';
    return'';
  }

  async function activeTab(){
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    return tab||null;
  }

  async function savedState(){
    const stored=await chrome.storage.local.get([STORAGE_KEY,SELECTED_KEY]);
    return{
      profiles:Array.isArray(stored[STORAGE_KEY])?stored[STORAGE_KEY]:[],
      selectedId:text(stored[SELECTED_KEY])
    };
  }

  function profileByLabel(profiles,label){
    const target=plain(label);
    return profiles.find(p=>plain(p&&p.name)===target)||null;
  }

  async function chooseProfileForTab({quiet=false}={}){
    const tab=await activeTab();
    const badge=document.getElementById('uiV2DetectedTab');
    const hint=document.getElementById('uiV2Hint');
    if(!tab||!String(tab.url||'').startsWith('https://si.aobongda.net/')){
      if(badge)badge.textContent='Chưa ở web nguồn';
      if(hint&&!quiet)hint.textContent='Mở một tab danh mục trên si.aobongda.net để tool tự nhận nhóm.';
      return{tab,label:'',profile:null};
    }
    const label=detectLabel(tab);
    if(badge)badge.textContent=label?`Tab nguồn: ${label}`:'Tab nguồn: chưa nhận diện';
    const state=await savedState();
    let profile=label?profileByLabel(state.profiles,label):null;

    if(!profile&&label){
      if(hint&&!quiet)hint.textContent=`Đã nhận tab ${label}, nhưng hồ sơ ${label} chưa được lưu.`;
      return{tab,label,profile:null};
    }

    if(!profile){
      const source=plain(`${tab.title||''} ${tab.url||''}`);
      const candidates=state.profiles
        .filter(p=>plain(p&&p.name).length>=4&&source.includes(plain(p.name)))
        .sort((a,b)=>plain(b.name).length-plain(a.name).length);
      profile=candidates[0]||null;
    }

    if(profile&&profile.id!==state.selectedId){
      const button=document.querySelector(`[data-profile-id="${CSS.escape(String(profile.id))}"]`);
      if(button){button.click();await sleep(180);}else await chrome.storage.local.set({[SELECTED_KEY]:profile.id});
    }
    if(hint&&!quiet){
      hint.textContent=profile?`Tự nhận: ${profile.name}. Có thể bấm ĐỒNG BỘ TAB ĐANG MỞ.`:(label?'Hồ sơ tương ứng chưa có dữ liệu.':'Không nhận diện được nhóm từ tab hiện tại; hãy chọn hồ sơ thủ công.');
    }
    return{tab,label,profile};
  }

  function setSmartState(message,kind=''){
    const el=document.getElementById('uiV2SmartState');
    if(!el)return;
    el.textContent=message;
    el.className=`ui-v2-state${kind?` ${kind}`:''}`;
  }

  function waitForScanDone(timeoutMs=150000){
    return new Promise((resolve,reject)=>{
      const started=Date.now();
      const timer=setInterval(()=>{
        const status=text(document.getElementById('profileStatus')?.textContent);
        const exportBtn=document.getElementById('profileExportBtn');
        if(/LỖI QUÉT|chưa ghép được|Hồ sơ chưa đủ SKU/i.test(status)){
          clearInterval(timer);reject(new Error(status));return;
        }
        if(exportBtn&&!exportBtn.disabled&&/QUÉT XONG|Có thể tạo file nhập Sapo/i.test(status)){
          clearInterval(timer);resolve();return;
        }
        if(Date.now()-started>timeoutMs){clearInterval(timer);reject(new Error('Quét quá lâu. Bạn có thể mở mục Thao tác thủ công để thử riêng từng bước.'));}
      },300);
    });
  }

  async function smartSync(){
    if(syncing)return;
    syncing=true;
    const btn=document.getElementById('uiV2SyncBtn');
    const old=btn?btn.textContent:'';
    if(btn){btn.disabled=true;btn.textContent='ĐANG NHẬN TAB...';}
    try{
      const detected=await chooseProfileForTab();
      if(!detected.tab)throw new Error('Hãy mở đúng tab danh mục nguồn trước.');
      if(!detected.profile)throw new Error(detected.label?`Chưa có hồ sơ ${detected.label}. Hãy tạo/lưu hồ sơ này một lần.`:'Không tự nhận được hồ sơ. Hãy chọn hồ sơ ở thanh nhóm rồi thử lại.');

      const scan=document.getElementById('profileScanBtn');
      const exportBtn=document.getElementById('profileExportBtn');
      if(!scan||!exportBtn)throw new Error('Chưa tải xong bộ đồng bộ. Đóng/mở lại panel rồi thử lại.');

      setSmartState(`Đang quét ${detected.profile.name}...`,'working');
      if(btn)btn.textContent='ĐANG QUÉT KHO...';
      scan.click();
      await waitForScanDone();

      setSmartState('Quét xong. Đang tạo file nhập Sapo...','working');
      if(btn)btn.textContent='ĐANG TẠO FILE...';
      exportBtn.click();
      await sleep(500);
      const status=text(document.getElementById('profileStatus')?.textContent);
      if(/LỖI TẠO FILE/i.test(status))throw new Error(status);
      setSmartState(`Đã xong ${detected.profile.name}. File nhập Sapo đã được tạo.`,'ok');
    }catch(error){
      setSmartState(error.message||String(error),'error');
    }finally{
      syncing=false;
      if(btn){btn.disabled=false;btn.textContent=old||'ĐỒNG BỘ TAB ĐANG MỞ';}
    }
  }

  function decorateQuickTabs(){
    const row=document.getElementById('profileQuickTabButtons');
    if(!row)return;
    for(const button of row.querySelectorAll('button')){
      if(button.dataset.uiV2Decorated==='1')continue;
      button.dataset.uiV2Decorated='1';
      button.classList.add('ui-v2-profile-tab');
      if(!button.textContent.includes('+ HỒ SƠ KHÁC')){
        const hasData=!button.textContent.trim().endsWith('+');
        button.classList.toggle('ready',hasData);
      }
    }
  }

  function mount(){
    const host=document.getElementById('savedProfilesMode');
    if(!host||document.getElementById('uiV2Panel'))return false;
    document.body.classList.add('ui-v2');

    const panel=document.createElement('div');
    panel.id='uiV2Panel';
    panel.className='ui-v2-panel';
    panel.innerHTML=`
      <div class="ui-v2-topline">
        <div>
          <div class="ui-v2-kicker">ĐỒNG BỘ NHANH</div>
          <div class="ui-v2-title">Mở đúng tab nguồn rồi bấm 1 nút</div>
        </div>
        <span id="uiV2DetectedTab" class="ui-v2-badge">Đang nhận tab...</span>
      </div>
      <div id="uiV2Hint" class="ui-v2-hint">Tool sẽ tự nhận HD / Trẻ em / Wika / Strivend và chọn hồ sơ tương ứng.</div>
      <button id="uiV2SyncBtn" type="button" class="ui-v2-sync">ĐỒNG BỘ TAB ĐANG MỞ</button>
      <div id="uiV2SmartState" class="ui-v2-state">Chưa chạy.</div>`;

    const quick=document.getElementById('profileQuickTabs');
    if(quick&&quick.parentElement===host)host.insertBefore(panel,quick);
    else host.insertBefore(panel,host.firstChild);

    const scan=document.getElementById('profileScanBtn');
    const exportBtn=document.getElementById('profileExportBtn');
    if(scan&&exportBtn){
      const row=scan.parentElement;
      if(row&&!document.getElementById('uiV2Manual')){
        const details=document.createElement('details');
        details.id='uiV2Manual';
        details.className='ui-v2-manual';
        const summary=document.createElement('summary');
        summary.textContent='Thao tác thủ công / kiểm tra';
        details.appendChild(summary);
        row.parentElement.insertBefore(details,row);
        details.appendChild(row);
      }
    }

    const manage=document.getElementById('profileManageToggle');
    if(manage){manage.textContent='CẬP NHẬT / QUẢN LÝ HỒ SƠ';manage.classList.add('ui-v2-manage');}

    document.getElementById('uiV2SyncBtn')?.addEventListener('click',smartSync);
    decorateQuickTabs();
    chooseProfileForTab().catch(()=>{});
    return true;
  }

  function install(){
    if(!mount()){
      const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});
      observer.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>observer.disconnect(),8000);
    }
    const paint=new MutationObserver(()=>decorateQuickTabs());
    paint.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>paint.disconnect(),12000);

    chrome.tabs.onActivated.addListener(()=>setTimeout(()=>chooseProfileForTab({quiet:true}).catch(()=>{}),120));
    chrome.tabs.onUpdated.addListener((tabId,changeInfo,tab)=>{
      if(changeInfo.status==='complete'&&tab.active)setTimeout(()=>chooseProfileForTab({quiet:true}).catch(()=>{}),120);
    });
  }

  install();
})();
