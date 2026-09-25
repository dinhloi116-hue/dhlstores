(() => {
  'use strict';

  let scheduled=false;
  let arranging=false;

  function text(v){return String(v==null?'':v).trim();}
  function setText(el,value){if(el&&el.textContent!==value)el.textContent=value;}
  function setHtml(el,value){if(el&&el.innerHTML!==value)el.innerHTML=value;}

  function decorate(){
    setText(document.querySelector('header p'),'Thêm 1 SP mới: mở popup nguồn → quét 1 SP → đăng Sapo. Đồng bộ tồn: chọn hồ sơ → quét tab → xuất/đẩy tồn.');

    const quick=document.getElementById('profileQuickTabs');
    const quickHint=quick&&quick.querySelector('small');
    setHtml(quickHint,'<b>BƯỚC 1 — CHỌN HỒ SƠ CẦN QUÉT</b> — hồ sơ có dấu ✓ là đã sẵn sàng.');

    setText(document.querySelector('#uiV2Panel .ui-v2-kicker'),'BƯỚC 2 — QUÉT TAB NGUỒN');
    setText(document.querySelector('#uiV2Panel .ui-v2-title'),'Mở đúng tab nguồn rồi bấm đồng bộ');

    const activeName=document.getElementById('activeProfileName');
    const activeCard=activeName&&activeName.parentElement&&activeName.parentElement.parentElement;
    if(activeCard&&activeCard.parentElement?.id==='savedProfilesMode'&&activeCard.id!=='activeProfileCard')activeCard.id='activeProfileCard';

    const batchTitle=document.getElementById('batchPendingTitle');
    if(batchTitle&&!/^BƯỚC 3/i.test(text(batchTitle.textContent))){
      setText(batchTitle,`BƯỚC 3 — CHỌN ĐẦU RA${text(batchTitle.textContent)?` • ${text(batchTitle.textContent)}`:''}`);
    }

    setText(document.querySelector('#uiV2Manual > summary'),'Kiểm tra nâng cao / thao tác từng bước');
    setText(document.getElementById('profileManageToggle'),'CẬP NHẬT / QUẢN LÝ HỒ SƠ (KHI CẦN)');
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
    setTimeout(reorder,700);
    setTimeout(reorder,1800);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
