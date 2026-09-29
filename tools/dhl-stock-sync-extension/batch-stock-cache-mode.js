(() => {
  'use strict';

  const xlsx=globalThis.DHLXlsxLite;
  const stockImport=globalThis.DHLStockImportCore;
  const batch=globalThis.DHLBatchStockCore;
  if(!xlsx||!stockImport||!batch)return;

  const BATCH_KEY='dhlManualPendingStockBatchV1';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const text=(v)=>String(v==null?'':v).trim();
  const esc=(v)=>text(v).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

  async function entries(){
    const s=await chrome.storage.local.get(BATCH_KEY);
    const pending=s[BATCH_KEY]&&typeof s[BATCH_KEY]==='object'?s[BATCH_KEY]:{};
    return Object.values(pending)
      .filter(x=>x&&x.auto!==true&&Array.isArray(x.rows)&&x.rows.length)
      .sort((a,b)=>Number(a.scannedAt||0)-Number(b.scannedAt||0));
  }

  function download(bytes,fileName){
    const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=fileName;a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1800);
  }

  async function exportBatch(){
    const btn=document.getElementById('batchExportBtn');
    if(btn)btn.disabled=true;
    try{
      const list=await entries();
      if(!list.length)throw new Error('Chưa có kết quả quét để tạo Excel.');
      const stored=await chrome.storage.local.get(CONFIG_KEY);
      const config=stored[CONFIG_KEY]&&typeof stored[CONFIG_KEY]==='object'?stored[CONFIG_KEY]:{};
      const branch=text(config&&config.sapo&&config.sapo.locationName);
      const combined=batch.combineEntries(list.map(entry=>({...entry,branch:text(entry&&entry.branch)||branch})));
      const out=stockImport.buildOfficialInventoryWorkbook(xlsx,combined.rows,combined.branch);
      const d=new Date();
      const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      download(out.bytes,`SAPO_NHAP_TON_KHO_GOP_${stamp}.xlsx`);
      await chrome.storage.local.set({[BATCH_KEY]:{}});
      const status=document.getElementById('profileStatus');
      if(status){
        status.textContent=`Đã tạo Excel ${out.rows} dòng và dọn cache quét.`;
        status.style.color='#166534';
      }
    }catch(error){
      const status=document.getElementById('profileStatus');
      if(status){
        status.textContent=`Lỗi tạo Excel: ${error.message||String(error)}`;
        status.style.color='#b91c1c';
      }
    }finally{
      await renderBatchUi();
    }
  }

  async function clearBatch(){
    await chrome.storage.local.set({[BATCH_KEY]:{}});
    await renderBatchUi();
  }

  async function renderBatchUi(){
    const list=await entries();
    const rows=list.reduce((sum,x)=>sum+Number(x.rowCount||(x.rows||[]).length||0),0);
    const box=document.getElementById('batchPendingBox');
    if(!box)return;

    const title=document.getElementById('batchPendingTitle');
    const listEl=document.getElementById('batchPendingList');
    const btn=document.getElementById('batchExportBtn');

    if(title)title.textContent=list.length?`ĐẦU RA • ${list.length} hồ sơ • ${rows} dòng`:'ĐẦU RA';
    if(listEl)listEl.innerHTML=list.length
      ?list.map(x=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-top:1px solid #eef2f7"><span><b>${esc(x.profileName)}</b> • ${Number(x.rowCount||(x.rows||[]).length)} dòng</span><small>${new Date(Number(x.scannedAt||Date.now())).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</small></div>`).join('')
      :'<small>Quét xong một tab thì kết quả sẽ xuất hiện ở đây.</small>';
    if(btn){
      btn.textContent=list.length?`TẢI FILE EXCEL (${list.length})`:'TẢI FILE EXCEL';
      btn.disabled=!list.length;
    }
  }

  function mount(){
    const host=document.getElementById('savedProfilesMode');
    if(!host)return false;
    let box=document.getElementById('batchPendingBox');
    if(!box){
      box=document.createElement('div');
      box.id='batchPendingBox';
      box.style.cssText='margin-top:9px;padding:9px 10px;border:1px solid #bfdbfe;border-radius:9px;background:#eff6ff;color:#334155';
      box.innerHTML=`
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <b id="batchPendingTitle">ĐẦU RA</b>
          <button id="batchClearBtn" type="button" class="secondary" style="padding:5px 8px;font-size:10px">XÓA CACHE</button>
        </div>
        <div id="batchPendingList" style="margin-top:5px;font-size:11px"></div>
        <button id="batchExportBtn" type="button" class="success" style="width:100%;margin-top:9px;min-height:44px;font-size:12px;font-weight:800" disabled>TẢI FILE EXCEL</button>`;
      const status=document.getElementById('profileStatus');
      if(status)status.insertAdjacentElement('beforebegin',box);else host.appendChild(box);
      document.getElementById('batchClearBtn')?.addEventListener('click',clearBatch);
      document.getElementById('batchExportBtn')?.addEventListener('click',exportBatch);
    }
    renderBatchUi().catch(()=>{});
    return true;
  }

  globalThis.DHLBatchStockCache={renderBatchUi};

  if(mount()){
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&changes[BATCH_KEY])renderBatchUi().catch(()=>{});
    });
  }
})();