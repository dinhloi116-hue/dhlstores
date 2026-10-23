(() => {
  'use strict';

  const xlsx=globalThis.DHLXlsxLite;
  const stockImport=globalThis.DHLStockImportCore;
  const batch=globalThis.DHLBatchStockCore;
  if(!xlsx||!stockImport||!batch)return;

  const BATCH_KEY='dhlPendingStockBatchV1';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const CYCLE_KEY='dhlAutoSyncCycleV1';
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
    const s=await chrome.storage.local.get([BATCH_KEY,CONFIG_KEY,CYCLE_KEY]);
    const pending=s[BATCH_KEY]&&typeof s[BATCH_KEY]==='object'?s[BATCH_KEY]:{};
    const cfg=s[CONFIG_KEY]&&typeof s[CONFIG_KEY]==='object'?s[CONFIG_KEY]:{};
    const cycle=s[CYCLE_KEY]&&typeof s[CYCLE_KEY]==='object'?s[CYCLE_KEY]:null;
    const ids=Array.isArray(cfg.selectedProfileIds)?cfg.selectedProfileIds.map(String).filter(Boolean):[];

    if(!ids.length)throw new Error('Chưa chọn hồ sơ nào cho chế độ tự động.');
    if(!cycle||!cycle.id)throw new Error('Chưa có lượt quét tự động hoàn tất để tạo Excel.');
    if(cycle.running)throw new Error('Lượt quét tự động đang chạy. Chờ quét xong rồi tải Excel.');
    if(Array.isArray(cycle.errors)&&cycle.errors.length)throw new Error(`Lượt quét tự động gần nhất có ${cycle.errors.length} hồ sơ lỗi. Hãy chạy lại trước khi tải Excel.`);

    const resultByProfile=new Map((Array.isArray(cycle.results)?cycle.results:[]).map(r=>[String(r&&r.profileId||''),r]));
    const entries=[];
    const missing=[];
    for(const id of ids){
      const entry=pending[id];
      const result=resultByProfile.get(id);
      const sameScan=entry&&result&&Number(entry.scannedAt||0)===Number(result.scannedAt||0);
      if(entry&&entry.auto===true&&sameScan&&Array.isArray(entry.rows)&&entry.rows.length)entries.push(entry);
      else missing.push(id);
    }
    if(missing.length)throw new Error(`Lượt quét gần nhất chưa có đủ dữ liệu mới cho ${missing.length}/${ids.length} hồ sơ. Hãy chạy lại trước khi tải Excel.`);
    return entries;
  }

  async function exportExcel(){
    const btn=document.getElementById('autoExcelDownloadBtn');
    if(btn){btn.disabled=true;btn.textContent='ĐANG TẠO EXCEL...';}
    try{
      const entries=await selectedEntries();
      if(!entries.length)throw new Error('Chưa có kết quả quét tự động để tạo Excel. Hãy chạy quét tự động trước.');
      const combined=batch.combineEntries(entries);
      if(!combined.rows.length)throw new Error('Kết quả quét tự động chưa có dòng tồn kho hợp lệ.');
      const out=stockImport.buildOfficialInventoryWorkbook(xlsx,combined.rows,combined.branch);
      if(out.templateSignature!=='SAPO-INVENTORY-TEMPLATE-V3')throw new Error('Bộ tạo file nhập tồn chưa đúng phiên bản.');
      download(out.bytes,`SAPO_TON_KHO_TU_DONG_${fileStamp()}.xlsx`);
      setStatus(`Đã tải file Excel tự động: ${combined.profileCount} hồ sơ • ${out.rows} dòng. Cache và hàng đợi Sapo vẫn được giữ nguyên.`,'ok');
    }catch(error){
      setStatus(`Lỗi tải Excel tự động: ${error.message||String(error)}`,'bad');
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
    btn.title='Chỉ tải dữ liệu thuộc đúng lượt quét tự động gần nhất đã hoàn tất. Không dùng cache quét thủ công và không ảnh hưởng hàng đợi Sapo.';
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
