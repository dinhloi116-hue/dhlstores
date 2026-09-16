(() => {
  'use strict';

  let scheduled=false;
  let arranging=false;

  function text(v){return String(v==null?'':v).trim();}

  function decorate(){
    const header=document.querySelector('header p');
    if(header)header.textContent='1) Chọn hồ sơ → 2) mở đúng tab nguồn → 3) quét → 4) tải Excel hoặc đẩy thẳng lên Sapo';

    const quick=document.getElementById('profileQuickTabs');
    const quickHint=quick&&quick.querySelector('small');
    if(quickHint)quickHint.innerHTML='<b>BƯỚC 1 — CHỌN HỒ SƠ CẦN QUÉT</b> — hồ sơ có dấu ✓ là đã sẵn sàng.';

    const kicker=document.querySelector('#uiV2Panel .ui-v2-kicker');
    if(kicker)kicker.textContent='BƯỚC 2 — QUÉT TAB NGUỒN';
    const smartTitle=document.querySelector('#uiV2Panel .ui-v2-title');
    if(smartTitle)smartTitle.textContent='Mở đúng tab nguồn rồi bấm đồng bộ';

    const activeName=document.getElementById('activeProfileName');
    const activeCard=activeName&&activeName.parentElement&&activeName.parentElement.parentElement;
    if(activeCard&&activeCard.parentElement?.id==='savedProfilesMode')activeCard.id='activeProfileCard';

    const batchTitle=document.getElementById('batchPendingTitle');
    if(batchTitle&&!/^BƯỚC 3/i.test(text(batchTitle.textContent))){
      batchTitle.textContent=`BƯỚC 3 — CHỌN ĐẦU RA${text(batchTitle.textContent)?` • ${text(batchTitle.textContent)}`:''}`;
    }

    const manualSummary=document.querySelector('#uiV2Manual > summary');
    if(manualSummary)manualSummary.textContent='Kiểm tra nâng cao / thao tác từng bước';

    const manage=document.getElementById('profileManageToggle');
    if(manage)manage.textContent='CẬP NHẬT / QUẢN LÝ HỒ SƠ (KHI CẦN)';
  }

  function reorder(){
    if(arranging)return;
    const host=document.getElementById('savedProfilesMode');
    if(!host)return;
    arranging=true;
    try{
      decorate();
      const expected=[
        document.getElementById('profileQuickTabs'),
        document.getElementById('activeProfileCard'),
        document.getElementById('uiV2Panel'),
        document.getElementById('profileStatus'),
        document.getElementById('batchPendingBox'),
        document.getElementById('sapoPushReportPanel'),
        document.getElementById('uiV3Dashboard'),
        document.getElementById('autoSyncPanel'),
        document.getElementById('uiV2Manual'),
        document.getElementById('stockHistoryPanel'),
        document.getElementById('profileManageToggle'),
        document.getElementById('profileManageBody')
      ].filter(node=>node&&node.parentElement===host);

      const wanted=new Set(expected);
      const current=[...host.children].filter(node=>wanted.has(node));
      const same=current.length===expected.length&&current.every((node,index)=>node===expected[index]);
      if(!same)for(const node of expected)host.appendChild(node);
    }finally{arranging=false;}
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      reorder();
    });
  }

  function install(){
    reorder();
    const observer=new MutationObserver(schedule);
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>{reorder();},700);
    setTimeout(()=>{reorder();},1800);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
