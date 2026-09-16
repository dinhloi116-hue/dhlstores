(() => {
  'use strict';

  const xlsx=globalThis.DHLXlsxLite;
  const stockImport=globalThis.DHLStockImportCore;
  const batch=globalThis.DHLBatchStockCore;
  if(!xlsx||!stockImport||!batch)return;

  const BATCH_KEY='dhlPendingStockBatchV1';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const text=(v)=>String(v==null?'':v).trim();

  function setStatus(message,kind=''){
    const el=document.getElementById('autoStatusLine');
    if(!el)return;
    el.textContent=message;
    el.className=`auto-status ${kind}`;
  }

  function download(bytes,fileName){
    const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=fileName;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2500);
  }

  function fileStamp(){
    const d=new Date();
    const p=(n)=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
  }

  async function selectedEntries(){
    const s=await chrome.storage.local.get([BATCH_KEY,CONFIG_KEY]);
    const pending=s[BATCH_KEY]&&typeof s[BATCH_KEY]==='object'?s[BATCH_KEY]:{};
    const cfg=s[CONFIG_KEY]&&typeof s[CONFIG_KEY]==='object'?s[CONFIG_KEY]:{};
    const ids=Array.isArray(cfg.selectedProfileIds)?cfg.selectedProfileIds.map(String):[];
    const entries=ids.length?ids.map(id=>pending[id]).filter(Boolean):Object.values(pending);
    return entries;
  }

  async function exportExcel(){
    const btn=document.getElementById('autoExcelDownloadBtn');
    if(btn){btn.disabled=true;btn.textContent='ĐANG TẠO EXCEL...';}
    try{
      const entries=await selectedEntries();
      if(!entries.length)throw new Error('Chưa có kết quả quét tự động để tạo Excel. Hãy chạy quét trước.');
      const combined=batch.combineEntries(entries);
      if(!combined.rows.length)throw new Error('Kết quả quét chưa có dòng tồn kho hợp lệ.');
      const out=stockImport.buildOfficialInventoryWorkbook(xlsx,combined.rows,combined.branch);
      if(out.templateSignature!=='SAPO-INVENTORY-TEMPLATE-V2')throw new Error('Bộ tạo file nhập tồn chưa đúng phiên bản.');
      download(out.bytes,`SAPO_TON_KHO_TU_DONG_${fileStamp()}.xlsx`);
      setStatus(`Đã tải file Excel: ${combined.profileCount} hồ sơ • ${out.rows} dòng. Cache và hàng đợi Sapo vẫn được giữ nguyên.`,'ok');
    }catch(error){
      setStatus(`Lỗi tải Excel: ${error.message||String(error)}`,'bad');
    }finally{
      if(btn){btn.disabled=false;btn.textContent='TẢI FILE EXCEL';}
    }
  }

  function injectStyle(){
    if(document.getElementById('autoExcelStyle'))return;
    const style=document.createElement('style');
    style.id='autoExcelStyle';
    style.textContent=`
      .auto-output-choice{display:grid;grid-template-columns:minmax(0,1fr) 128px;gap:8px;align-items:center;margin-top:8px}
      .auto-output-choice .auto-inline{margin-top:0!important}
      #autoExcelDownloadBtn{min-height:38px;padding:7px 9px;font-size:10px;font-weight:900;white-space:nowrap}
      @media(max-width:390px){.auto-output-choice{grid-template-columns:1fr}.auto-output-choice #autoExcelDownloadBtn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function mount(){
    const cb=document.getElementById('autoPushSapo');
    if(!cb)return false;
    if(document.getElementById('autoExcelDownloadBtn'))return true;
    const label=cb.closest('label');
    if(!label||!label.parentElement)return false;

    const wrap=document.createElement('div');
    wrap.className='auto-output-choice';
    label.insertAdjacentElement('beforebegin',wrap);
    wrap.appendChild(label);

    const btn=document.createElement('button');
    btn.id='autoExcelDownloadBtn';
    btn.type='button';
    btn.className='secondary';
    btn.textContent='TẢI FILE EXCEL';
    btn.title='Tải file nhập tồn kho Excel từ kết quả quét tự động hiện có. Không xóa cache và không ảnh hưởng hàng đợi Sapo.';
    btn.addEventListener('click',exportExcel);
    wrap.appendChild(btn);
    return true;
  }

  function install(){
    injectStyle();
    mount();
    const observer=new MutationObserver(()=>mount());
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
