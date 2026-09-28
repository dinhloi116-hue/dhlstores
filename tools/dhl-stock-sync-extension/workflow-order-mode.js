(() => {
  'use strict';

  let scheduled=false;
  let arranging=false;

  function text(v){return String(v==null?'':v).trim();}
  function setText(el,value){if(el&&el.textContent!==value)el.textContent=value;}
  function setHtml(el,value){if(el&&el.innerHTML!==value)el.innerHTML=value;}
  function show(el){if(el)el.style.display='';}
  function hide(el){if(el)el.style.display='none';}

  function installStyle(){
    if(document.getElementById('dhlCleanWorkflowStyle'))return;
    const style=document.createElement('style');
    style.id='dhlCleanWorkflowStyle';
    style.textContent=`
      body.ui-v2 main,main{max-width:520px;margin:0 auto}
      #savedProfilesMode{margin-top:8px!important;border-color:#86efac!important;background:#f0fdf4!important}
      #catalogMode{margin-top:12px!important;border-color:#93c5fd!important;background:#eff6ff!important}
      #savedProfilesMode>small:first-of-type,#catalogMode>span{line-height:1.45}
      #profileQuickTabs{margin-top:9px!important}
      #manualJobRunner{margin-top:10px!important}
      #batchPendingBox{margin-top:9px!important}
      #profileManageToggle{margin-top:10px!important;min-height:36px!important;font-size:10px!important}
      #profileStatus{font-size:10px!important;margin-top:7px!important}
      #catalogMode #catalogQuickTest{display:none!important}
      #catalogMode #toggleCatalogMaintenance,#catalogMode #catalogMaintenanceBody,
      #maintenancePopupStandardizeBox,#catalogScanDiagnostics{display:none!important}
      #uiV3Dashboard,#autoSyncPanel,#sapoPushReportPanel,#stockHistoryPanel,#uiV2Panel,#uiV2Manual{display:none!important}
      #activeProfileCard{display:none!important}
      #manualJobRunner .manual-head>span{display:none!important}
      #manualJobRunner .manual-head small{font-size:10px!important}
      #singleProductAddBox{margin-top:10px!important}
      footer{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function decorateStock(){
    const host=document.getElementById('savedProfilesMode');
    if(!host)return;

    const directTitle=[...host.children].find((el)=>el.tagName==='B');
    const directHint=[...host.children].find((el)=>el.tagName==='SMALL');
    setText(directTitle,'1. ĐỒNG BỘ TỒN KHO');
    setText(directHint,'Chọn hồ sơ → chọn phạm vi cần quét → CHẠY NỀN. Có thể chuyển sang tab khác làm việc; kết quả tự lưu theo từng sản phẩm.');

    const quick=document.getElementById('profileQuickTabs');
    const quickHint=quick&&quick.querySelector('small');
    setHtml(quickHint,'<b>CHỌN HỒ SƠ</b> — HD / Trẻ em / Wika / nhóm khác.');

    const runner=document.getElementById('manualJobRunner');
    if(runner){
      const title=runner.querySelector('.manual-head b');
      const hint=runner.querySelector('.manual-head small');
      setText(title,'QUÉT & ĐỒNG BỘ TỒN KHO');
      setText(hint,'Chạy ở tab nền, tự lưu sau từng sản phẩm. Không cần giữ panel mở.');
    }

    const manage=document.getElementById('profileManageToggle');
    setText(manage,'QUẢN LÝ / CẬP NHẬT HỒ SƠ');

    hide(document.getElementById('uiV3Dashboard'));
    hide(document.getElementById('autoSyncPanel'));
    hide(document.getElementById('sapoPushReportPanel'));
    hide(document.getElementById('stockHistoryPanel'));
    hide(document.getElementById('uiV2Panel'));
    hide(document.getElementById('uiV2Manual'));
    hide(document.getElementById('activeProfileCard'));

    show(quick);
    show(runner);
    show(document.getElementById('batchPendingBox'));
    show(document.getElementById('profileStatus'));
    show(manage);
  }

  function decorateCatalog(){
    const section=document.getElementById('catalogMode');
    if(!section)return;
    const title=section.querySelector(':scope > b');
    const desc=section.querySelector(':scope > span');
    setText(title,'2. THÊM SẢN PHẨM MỚI');
    setText(desc,'Thêm 1 sản phẩm đang mở hoặc quét toàn bộ sản phẩm mới của danh mục. SKU = Đường dẫn/Alias + Size.');

    const all=document.getElementById('scanCatalogSource');
    const excel=document.getElementById('exportCatalogSource');
    const direct=document.getElementById('catalogSapoCreateBtn');
    setText(all,'QUÉT TẤT CẢ SP MỚI');
    setText(excel,'TẠO EXCEL SP MỚI');
    if(direct)setText(direct,'ĐĂNG SP MỚI LÊN SAPO');

    hide(document.getElementById('catalogQuickTest'));
    hide(document.getElementById('toggleCatalogMaintenance'));
    hide(document.getElementById('catalogMaintenanceBody'));
    hide(document.getElementById('maintenancePopupStandardizeBox'));
    hide(document.getElementById('catalogScanDiagnostics'));
  }

  function reorder(){
    if(arranging)return;
    const host=document.getElementById('savedProfilesMode');
    if(!host)return;
    arranging=true;
    try{
      installStyle();
      decorateStock();
      decorateCatalog();

      const main=document.querySelector('main');
      const header=document.querySelector('main > header');
      const catalog=document.getElementById('catalogMode');

      setText(document.querySelector('header p'),'Đồng bộ tồn kho ở trên. Khi cần thêm sản phẩm mới, dùng khối bên dưới.');

      if(main&&host.parentElement===main){
        const anchor=header?header.nextSibling:main.firstChild;
        if(anchor!==host)main.insertBefore(host,anchor);
      }
      if(main&&catalog&&catalog.parentElement===main){
        if(host.nextSibling!==catalog)main.insertBefore(catalog,host.nextSibling);
      }

      const expected=[
        document.getElementById('profileQuickTabs'),
        document.getElementById('manualJobRunner'),
        document.getElementById('batchPendingBox'),
        document.getElementById('profileStatus'),
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
    setTimeout(reorder,500);
    setTimeout(reorder,1400);
    setTimeout(reorder,3000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();