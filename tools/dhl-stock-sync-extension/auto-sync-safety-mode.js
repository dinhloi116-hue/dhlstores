(() => {
  'use strict';

  function lockPush(message='Thông tin Sapo đã thay đổi — cần KIỂM TRA KẾT NỐI lại.'){
    const cb=document.getElementById('autoPushSapo');
    if(cb){cb.checked=false;cb.disabled=true;}
    const state=document.querySelector('#autoSyncPanel .auto-sapo-state');
    if(state){state.textContent=message;state.classList.remove('ok');}
  }

  function bind(){
    for(const id of ['sapoHost','sapoKey','sapoSecret']){
      const input=document.getElementById(id);
      if(!input||input.dataset.sapoSafetyBound==='1')continue;
      input.dataset.sapoSafetyBound='1';
      input.addEventListener('input',()=>lockPush());
      input.addEventListener('change',()=>lockPush());
    }
  }

  const observer=new MutationObserver(bind);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  bind();
})();
