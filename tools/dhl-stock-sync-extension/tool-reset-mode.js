(() => {
  'use strict';

  const RESET_KEYS=[
    'dhlManualScanJobV2',
    'dhlManualPendingStockBatchV1',
    'dhlManualScanUiV2',
    'dhlSapoPushQueueV1',
    'dhlCatalogResults',
    'dhlCatalogAt',
    'dhlCatalogPageTitle',
    'dhlCatalogPageUrl',
    'dhlCatalogSkuMode',
    'dhlSapoProductCreateQueueV1',
    'dhlSapoProductCreateReportV1',
    'dhlManualPendingStockV1',
    'dhlManualPendingStockBatchV2'
  ];

  const ALARMS=[
    'dhl-manual-scan-step',
    'dhl-sapo-manual-push-queue',
    'dhl-sapo-push-queue',
    'dhl-sapo-product-create-step',
    'dhl-auto-stock-sync',
    'dhl-auto-stock-step'
  ];

  async function resetTool(){
    const btn=document.getElementById('resetToolBtn');
    if(btn){btn.disabled=true;btn.textContent='ĐANG LÀM MỚI...';}
    try{
      // Dừng scan/push đang chạy trước khi xóa cache.
      try{await chrome.runtime.sendMessage({type:'DHL_MANUAL_JOB_CANCEL_NOW'});}catch(_){}
      try{await chrome.runtime.sendMessage({type:'DHL_SAPO_PUSH_CANCEL'});}catch(_){}
      for(const name of ALARMS){try{await chrome.alarms.clear(name);}catch(_){}}

      // GIỮ dhlAutoSyncConfigV1 để không mất thông tin kết nối Sapo.
      await chrome.storage.local.remove(RESET_KEYS);

      location.reload();
    }catch(error){
      if(btn){btn.disabled=false;btn.textContent='LÀM MỚI TOOL';}
      const status=document.getElementById('profileStatus');
      if(status){
        status.style.display='block';
        status.style.color='#b91c1c';
        status.textContent='Lỗi làm mới: '+(error&&error.message||String(error));
      }
    }
  }

  function mount(){
    if(document.getElementById('resetToolBtn'))return;
    const header=document.querySelector('header');
    if(!header)return;
    const btn=document.createElement('button');
    btn.id='resetToolBtn';
    btn.type='button';
    btn.textContent='LÀM MỚI TOOL';
    btn.title='Xóa cache tạm và đưa giao diện về như mới. Giữ hồ sơ, lịch sử tồn kho và kết nối Sapo.';
    btn.style.cssText='margin-left:auto;min-height:30px;padding:5px 8px;border:1px solid #fca5a5;border-radius:8px;background:#fff1f2;color:#be123c;font-size:9px;font-weight:900;white-space:nowrap';
    btn.addEventListener('click',()=>{
      if(confirm('Dừng tác vụ đang chạy và xóa cache tạm? Hồ sơ, lịch sử tồn kho, báo cáo cũ và kết nối Sapo vẫn được giữ.'))resetTool();
    });
    header.appendChild(btn);
  }

  // Kết nối còn sống trong suốt thời gian Side Panel mở.
  // Đóng Side Panel tự báo service worker dọn cache nếu không có tác vụ chạy.
  let panelCleanupPort=null;
  function enableAutomaticCleanupOnClose(){
    try{panelCleanupPort=chrome.runtime.connect({name:'dhl-stock-sync-panel'});}catch(_){}
    window.addEventListener('pagehide',()=>{
      try{
        const pending=chrome.runtime.sendMessage({type:'DHL_PANEL_CLOSE_AUTO_CLEANUP'});
        if(pending&&typeof pending.catch==='function')pending.catch(()=>{});
      }catch(_){}
    },{once:true});
  }

  enableAutomaticCleanupOnClose();
  mount();
})();