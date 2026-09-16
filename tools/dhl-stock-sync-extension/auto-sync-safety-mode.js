(() => {
  'use strict';

  let disablePersistedForCurrentEdit=false;

  function persistPushDisabled(){
    if(disablePersistedForCurrentEdit)return;
    disablePersistedForCurrentEdit=true;
    try{
      chrome.runtime.sendMessage({type:'DHL_AUTO_SAVE_CONFIG',config:{autoPushSapo:false}},()=>{void chrome.runtime.lastError;});
    }catch{}
  }

  function lockPush(message='Thông tin Sapo đã thay đổi — cần KIỂM TRA KẾT NỐI lại.'){
    const cb=document.getElementById('autoPushSapo');
    const wasEnabled=Boolean(cb&&cb.checked);
    if(cb){cb.checked=false;cb.disabled=true;}
    const state=document.querySelector('#autoSyncPanel .auto-sapo-state');
    if(state){state.textContent=message;state.classList.remove('ok');}
    if(wasEnabled)persistPushDisabled();
  }

  function bind(){
    for(const id of ['sapoHost','sapoKey','sapoSecret']){
      const input=document.getElementById(id);
      if(!input||input.dataset.sapoSafetyBound==='1')continue;
      input.dataset.sapoSafetyBound='1';
      input.addEventListener('input',()=>lockPush());
      input.addEventListener('change',()=>lockPush());
      input.addEventListener('focus',()=>{disablePersistedForCurrentEdit=false;});
    }
  }

  const observer=new MutationObserver(bind);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  bind();
})();
