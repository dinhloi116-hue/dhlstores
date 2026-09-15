(() => {
  'use strict';

  const DRAFT_KEY='dhlAutoSyncSapoDraftV1';
  let applying=false;

  const text=(v)=>String(v==null?'':v);

  async function readDraft(){
    try{
      const stored=await chrome.storage.session.get(DRAFT_KEY);
      const draft=stored&&stored[DRAFT_KEY];
      return draft&&typeof draft==='object'?draft:{};
    }catch{return{};}
  }

  async function writeDraft(){
    if(applying)return;
    const host=document.getElementById('sapoHost');
    const key=document.getElementById('sapoKey');
    const secret=document.getElementById('sapoSecret');
    if(!host&&!key&&!secret)return;
    try{
      const previous=await readDraft();
      const next={
        storeHost:host?text(host.value):text(previous.storeHost),
        apiKey:key?text(key.value):text(previous.apiKey),
        apiSecret:secret?text(secret.value):text(previous.apiSecret),
        updatedAt:Date.now()
      };
      await chrome.storage.session.set({[DRAFT_KEY]:next});
    }catch{}
  }

  function bindInput(el){
    if(!el||el.dataset.dhlStickyBound==='1')return;
    el.dataset.dhlStickyBound='1';
    el.addEventListener('input',()=>{writeDraft().catch(()=>{});});
    el.addEventListener('change',()=>{writeDraft().catch(()=>{});});
  }

  async function apply(){
    if(applying)return;
    const box=document.querySelector('details.sapo-box');
    if(!box)return;
    applying=true;
    try{
      // Người dùng đang phải chuyển tab để copy API Key/Secret, vì vậy khu Sapo luôn mở.
      box.open=true;
      if(box.dataset.dhlStickyToggleBound!=='1'){
        box.dataset.dhlStickyToggleBound='1';
        box.addEventListener('toggle',()=>{
          if(!box.open)requestAnimationFrame(()=>{box.open=true;});
        });
      }

      const draft=await readDraft();
      const host=document.getElementById('sapoHost');
      const key=document.getElementById('sapoKey');
      const secret=document.getElementById('sapoSecret');

      // Chỉ phục hồi draft khi DOM mới/rerender chưa có nội dung người dùng.
      if(host&&draft.storeHost&&(!host.value||host.value==='ten-shop.mysapo.net'))host.value=draft.storeHost;
      if(key&&draft.apiKey&&!key.value)key.value=draft.apiKey;
      if(secret&&draft.apiSecret&&!secret.value)secret.value=draft.apiSecret;

      bindInput(host);bindInput(key);bindInput(secret);
    }finally{applying=false;}
  }

  const observer=new MutationObserver(()=>{apply().catch(()=>{});});
  const start=()=>{
    const panel=document.getElementById('autoSyncPanel');
    if(panel)observer.observe(panel,{childList:true,subtree:true});
    apply().catch(()=>{});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
