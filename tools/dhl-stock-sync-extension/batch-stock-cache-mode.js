(() => {
  'use strict';

  const xlsx=globalThis.DHLXlsxLite;
  const stockImport=globalThis.DHLStockImportCore;
  const batch=globalThis.DHLBatchStockCore;
  if(!xlsx||!stockImport||!batch)return;

  const BATCH_KEY='dhlManualPendingStockBatchV1';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const REPORT_KEY='dhlManualStockReportV1';
  const QUEUE_KEY='dhlSapoPushQueueV1';
  const text=(v)=>String(v==null?'':v).trim();
  const esc=(v)=>text(v).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

  function changeTypeLabel(type){
    return({
      increased:'TĂNG',
      decreased:'GIẢM',
      restocked:'CÓ HÀNG LẠI',
      soldout:'HẾT HÀNG',
      added:'MỚI',
      missing:'KHÔNG CÒN THẤY'
    })[type]||text(type).toUpperCase();
  }

  function fmtDelta(value){
    const n=Number(value||0);
    return n>0?`+${n}`:`${n}`;
  }

  async function reportState(){
    const s=await chrome.storage.local.get([REPORT_KEY,QUEUE_KEY]);
    const reports=s[REPORT_KEY]&&typeof s[REPORT_KEY]==='object'?s[REPORT_KEY]:{};
    const latest=Object.values(reports)
      .filter(Boolean)
      .sort((a,b)=>Number(b&&b.at||0)-Number(a&&a.at||0))[0]||null;
    const queue=s[QUEUE_KEY]&&s[QUEUE_KEY].source==='manual'?s[QUEUE_KEY]:null;
    return{latest,queue};
  }

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

  async function renderQuickReports(){
    const box=document.getElementById('stockQuickReports');
    if(!box)return;
    const {latest,queue}=await reportState();

    if(!latest){
      box.innerHTML='<small>Chưa có báo cáo. Quét xong một tab sẽ tự tạo báo cáo lỗi và biến động.</small>';
      return;
    }

    const diff=latest.diff||null;
    const scanIssues=Array.isArray(latest.issues)?latest.issues:[];
    const queueRelevant=queue&&(
      !Array.isArray(queue.profileIds)||
      !queue.profileIds.length||
      queue.profileIds.map(String).includes(String(latest.profileId))
    )?queue:null;
    const pushErrors=queueRelevant&&Array.isArray(queueRelevant.errors)?queueRelevant.errors:[];
    const errors=[
      ...scanIssues.map(x=>({
        source:'QUÉT',
        label:text(x&&x.product)||text(x&&x.sku)||'—',
        message:text(x&&x.message)
      })),
      ...pushErrors.map(x=>({
        source:'SAPO',
        label:text(x&&x.sku)||`Dòng ${Number(x&&x.index||0)+1}`,
        message:text(x&&x.error)
      }))
    ];

    let quick='';
    if(latest.firstSnapshot){
      quick='<div class="quick-report-empty">Đã lưu mốc tồn đầu tiên. Lần quét toàn bộ tiếp theo sẽ có báo cáo tăng/giảm.</div>';
    }else if(latest.comparable===false){
      quick='<div class="quick-report-empty">Lượt quét này không phải toàn bộ danh mục hoàn tất nên không tạo so sánh tăng/giảm.</div>';
    }else if(diff){
      const changed=Number(diff.changed||0);
      quick=`
        <div class="quick-report-grid">
          <div><b>${Number(diff.increased||0)+Number(diff.restocked||0)}</b><span>Tăng / có lại</span></div>
          <div><b>${Number(diff.decreased||0)+Number(diff.soldOut||0)}</b><span>Giảm / hết</span></div>
          <div><b>${fmtDelta(diff.net)}</b><span>Chênh tổng</span></div>
        </div>
        <small style="display:block;margin-top:6px">Tổng tồn: ${Number(diff.oldTotal||0)} → ${Number(diff.newTotal||0)} • ${changed} SKU thay đổi</small>
        <details class="quick-report-details" ${changed&&changed<=8?'open':''}>
          <summary>CHI TIẾT TĂNG / GIẢM (${changed})</summary>
          <div class="quick-report-list">${changed
            ?(diff.changes||[]).map(change=>{
              const item=change.item||{};
              const name=[text(item.name),text(item.color),item.size?`Size ${text(item.size)}`:''].filter(Boolean).join(' • ');
              const before=change.before==null?'—':change.before;
              const after=change.after==null?'—':change.after;
              return `<div class="quick-report-row"><b>${esc(changeTypeLabel(change.type))}</b><span>${esc(name||item.sku||change.key)}</span><small>${before} → ${after}${change.before!=null&&change.after!=null?` (${fmtDelta(change.delta)})`:''}</small></div>`;
            }).join('')
            :'<small>Không có thay đổi tồn kho.</small>'}</div>
        </details>`;
    }else{
      quick='<div class="quick-report-empty">Chưa có mốc trước để so sánh.</div>';
    }

    const errorHtml=`
      <details class="quick-report-details error-report" ${errors.length?'open':''}>
        <summary>BÁO CÁO LỖI (${errors.length})</summary>
        <div class="quick-report-list">${errors.length
          ?errors.map(err=>`<div class="quick-report-row error"><b>${esc(err.source)}</b><span>${esc(err.label)}</span><small>${esc(err.message)}</small></div>`).join('')
          :'<small>Không phát hiện lỗi trong lần quét/đẩy gần nhất.</small>'}</div>
      </details>`;

    box.innerHTML=`
      <div class="quick-report-head"><b>BÁO CÁO NHANH</b><small>${esc(latest.profileName||'')}</small></div>
      ${quick}
      ${errorHtml}`;
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
    await renderQuickReports();
  }

  function mount(){
    const host=document.getElementById('savedProfilesMode');
    if(!host)return false;
    let box=document.getElementById('batchPendingBox');
    if(!box){
      box=document.createElement('div');
      box.id='batchPendingBox';
      box.style.cssText='margin-top:9px;padding:9px 10px;border:1px solid #bfdbfe;border-radius:9px;background:#eff6ff;color:#334155';
      if(!document.getElementById('batchQuickReportStyle')){
        const style=document.createElement('style');
        style.id='batchQuickReportStyle';
        style.textContent=`
          .quick-report-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:7px;padding-top:7px;border-top:1px solid #dbeafe}
          .quick-report-head small{color:#64748b;font-size:9px}
          .quick-report-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:7px}
          .quick-report-grid>div{padding:7px 5px;border:1px solid #dbeafe;border-radius:7px;background:#fff;text-align:center}
          .quick-report-grid b{display:block;font-size:14px}.quick-report-grid span{font-size:9px;color:#64748b}
          .quick-report-empty{margin-top:7px;padding:7px 8px;border-radius:7px;background:#fff;color:#64748b;font-size:10px}
          .quick-report-details{margin-top:7px;border-top:1px solid #dbeafe;padding-top:6px}
          .quick-report-details>summary{cursor:pointer;font-size:10px;font-weight:900}
          .quick-report-list{max-height:210px;overflow:auto;margin-top:5px}
          .quick-report-row{display:grid;grid-template-columns:auto 1fr auto;gap:6px;padding:5px 0;border-bottom:1px solid #eef2f7;font-size:9px;align-items:start}
          .quick-report-row>b{white-space:nowrap}.quick-report-row>span{min-width:0}.quick-report-row>small{text-align:right;color:#64748b}
          .quick-report-row.error{grid-template-columns:auto 1fr}.quick-report-row.error>small{grid-column:1/-1;text-align:left;color:#991b1b}
          .error-report>summary{color:#991b1b}
        `;
        document.head.appendChild(style);
      }
      box.innerHTML=`
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <b id="batchPendingTitle">ĐẦU RA</b>
          <button id="batchClearBtn" type="button" class="secondary" style="padding:5px 8px;font-size:10px">XÓA CACHE</button>
        </div>
        <div id="batchPendingList" style="margin-top:5px;font-size:11px"></div>
        <div id="stockQuickReports" style="margin-top:8px"></div>
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
      if(area==='local'&&(changes[BATCH_KEY]||changes[REPORT_KEY]||changes[QUEUE_KEY]))renderBatchUi().catch(()=>{});
    });
  }
})();