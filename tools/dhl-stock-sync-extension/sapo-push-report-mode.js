(() => {
  'use strict';

  let lastQueue=null;
  const text=(v)=>String(v==null?'':v).trim();
  const esc=(v)=>text(v).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const fmt=(ts)=>ts?new Date(Number(ts)).toLocaleString('vi-VN'):'—';

  function send(message){
    return new Promise((resolve,reject)=>{
      chrome.runtime.sendMessage(message,response=>{
        const err=chrome.runtime.lastError;if(err){reject(err);return;}
        if(!response){reject(new Error('Không nhận được phản hồi.'));return;}
        resolve(response);
      });
    });
  }

  function ensurePanel(){
    let panel=document.getElementById('sapoPushReportPanel');
    if(panel)return panel;
    const auto=document.getElementById('autoSyncPanel');if(!auto)return null;
    panel=document.createElement('section');panel.id='sapoPushReportPanel';
    auto.insertAdjacentElement('afterend',panel);
    const style=document.createElement('style');style.id='sapoPushReportStyle';style.textContent=`
      #sapoPushReportPanel{margin-top:12px;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#0f172a}
      .spr-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.spr-head b{font-size:12px}.spr-badge{padding:5px 8px;border-radius:999px;font-size:10px;font-weight:900;background:#e2e8f0;color:#334155}
      .spr-badge.ok{background:#dcfce7;color:#166534}.spr-badge.warn{background:#fef3c7;color:#92400e}.spr-badge.bad{background:#fee2e2;color:#991b1b}.spr-badge.run{background:#dbeafe;color:#1d4ed8}
      .spr-main{margin-top:9px;padding:10px;border-radius:9px;background:#f8fafc;font-size:12px;font-weight:800}.spr-main.ok{background:#f0fdf4;color:#166534}.spr-main.warn{background:#fffbeb;color:#92400e}.spr-main.bad{background:#fef2f2;color:#991b1b}.spr-main.run{background:#eff6ff;color:#1d4ed8}
      .spr-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.spr-stat{border:1px solid #e2e8f0;border-radius:8px;padding:7px;text-align:center}.spr-stat b{display:block;font-size:16px}.spr-stat span{font-size:9px;color:#64748b}
      .spr-detail{margin-top:8px;font-size:10px;color:#475569;line-height:1.45}.spr-error{margin-top:7px;padding:8px;border:1px solid #fecaca;border-radius:8px;background:#fff7f7;color:#991b1b;font-size:10px;word-break:break-word}.spr-actions{display:flex;gap:7px;margin-top:9px}.spr-actions button{flex:1;min-height:36px}
    `;document.head.appendChild(style);return panel;
  }

  function skippedRows(q){
    if(Array.isArray(q&&q.skippedRows))return q.skippedRows;
    return (Array.isArray(q&&q.errors)?q.errors:[]).filter(e=>e&&e.skipped===true);
  }

  function statusInfo(q){
    if(!q)return{label:'CHƯA CÓ',kind:'',main:'Chưa có lượt ghi tồn kho nào lên Sapo.'};
    const processed=Number(q.index||0),success=Number(q.success||0),total=Number(q.total||0),skipped=skippedRows(q).length;
    if(q.source==='manual'&&q.manualPaused===true)return{label:'CHƯA HOÀN TẤT',kind:'bad',main:`ĐẨY SAPO ĐANG TẠM DỪNG DO LỖI HỆ THỐNG: đã xử lý ${processed}/${total}`};
    if(q.status==='done'&&processed>=total){
      if(skipped>0)return{label:'HOÀN TẤT CÓ LỖI',kind:'warn',main:`ĐÃ XỬ LÝ ${processed}/${total} DÒNG • THÀNH CÔNG ${success} • BỎ QUA ${skipped}`};
      return{label:'THÀNH CÔNG',kind:'ok',main:`ĐÃ NẠP TỒN KHO LÊN SAPO THÀNH CÔNG ${success}/${total} DÒNG`};
    }
    if(q.status==='running'||q.status==='queued')return{label:'ĐANG NẠP',kind:'run',main:`ĐANG NẠP SAPO: đã xử lý ${processed}/${total} • thành công ${success} • bỏ qua ${skipped}`};
    if(q.status==='paused')return{label:'CHƯA HOÀN TẤT',kind:'bad',main:`NẠP SAPO CHƯA HOÀN TẤT: đã xử lý ${processed}/${total}`};
    if(q.status==='failed'||q.status==='error')return{label:'THẤT BẠI',kind:'bad',main:`NẠP SAPO THẤT BẠI: đã xử lý ${processed}/${total}`};
    return{label:'CHƯA HOÀN TẤT',kind:'bad',main:`NẠP SAPO CHƯA HOÀN TẤT: đã xử lý ${processed}/${total}`};
  }

  function reportText(q){
    const total=Number(q&&q.total||0),processed=Number(q&&q.index||0),success=Number(q&&q.success||0),remaining=Math.max(0,total-processed);
    const errors=Array.isArray(q&&q.errors)?q.errors:[],skipped=skippedRows(q),info=statusInfo(q),lines=[];
    lines.push('DHL STOCK SYNC - BÁO CÁO GHI TỒN KHO SAPO');
    lines.push(`Nguồn: ${q&&q.source==='manual'?'Quét thủ công':'Tự động'}`);
    lines.push(`Queue ID: ${text(q&&q.id)||'—'}`);
    lines.push(`Shop: ${text(q&&q.host)||'—'}`);
    lines.push(`Chi nhánh: ${text(q&&q.locationName)||'—'}`);
    lines.push(`Bắt đầu: ${fmt(q&&q.startedAt||q&&q.createdAt)}`);
    lines.push(`Kết thúc: ${fmt(q&&q.finishedAt)}`);
    lines.push(`Trạng thái: ${info.label}`);
    lines.push(`Tổng dòng: ${total}`);
    lines.push(`Đã xử lý: ${processed}`);
    lines.push(`Đã nạp thành công: ${success}`);
    lines.push(`Đã bỏ qua do lỗi dòng: ${skipped.length}`);
    lines.push(`Còn lại: ${remaining}`);
    lines.push(`Số lỗi ghi nhận: ${errors.length}`);lines.push('');
    const okRows=Array.isArray(q&&q.successRows)?q.successRows:[];
    if(okRows.length){lines.push('DÒNG ĐÃ GHI THÀNH CÔNG:');okRows.forEach((r,i)=>lines.push(`${i+1}. Index ${Number(r.index||0)} | SKU ${text(r.sku)||'—'} | variant ${r.variantId||'—'} | tồn ${r.stock} | ${fmt(r.at)}`));lines.push('');}
    if(skipped.length){lines.push('DÒNG LỖI ĐÃ BỎ QUA:');skipped.forEach((e,i)=>lines.push(`${i+1}. Index ${Number(e.index||0)} | SKU ${text(e.sku)||'—'} | variant ${e.variantId||'—'} | tồn ${Number.isFinite(Number(e.stock))?Number(e.stock):'—'} | ${text(e.error)} | ${fmt(e.skippedAt||e.at)}`));lines.push('');}
    if(errors.length){lines.push('LỊCH SỬ LỖI / THỬ LẠI:');errors.forEach((e,i)=>lines.push(`${i+1}. Index ${Number(e.index||0)} | SKU ${text(e.sku)||'—'} | variant ${e.variantId||'—'} | tồn ${Number.isFinite(Number(e.stock))?Number(e.stock):'—'} | ${text(e.error)} | ${fmt(e.at)}`));}
    return lines.join('\r\n');
  }

  function downloadReport(){
    if(!lastQueue)return;const blob=new Blob(['\ufeff'+reportText(lastQueue)],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    const stamp=new Date(lastQueue.finishedAt||lastQueue.createdAt||Date.now()).toISOString().replace(/[:T]/g,'-').slice(0,16);a.href=url;a.download=`BAO_CAO_NAP_TON_SAPO_${stamp}.txt`;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }

  function render(q){
    lastQueue=q||null;const panel=ensurePanel();if(!panel)return;
    const info=statusInfo(q),processed=Number(q&&q.index||0),success=Number(q&&q.success||0),total=Number(q&&q.total||0),remaining=Math.max(0,total-processed),skipped=skippedRows(q),errors=Array.isArray(q&&q.errors)?q.errors:[];
    const lastError=errors.length?errors[errors.length-1]:null;
    panel.innerHTML=`<div class="spr-head"><b>BÁO CÁO NẠP TỒN SAPO</b><span class="spr-badge ${info.kind}">${esc(info.label)}</span></div>
      <div class="spr-main ${info.kind}">${esc(info.main)}</div>
      <div class="spr-grid"><div class="spr-stat"><b>${success}</b><span>ĐÃ GHI OK</span></div><div class="spr-stat"><b>${skipped.length}</b><span>ĐÃ BỎ QUA</span></div><div class="spr-stat"><b>${remaining}</b><span>CÒN LẠI</span></div><div class="spr-stat"><b>${processed}</b><span>ĐÃ XỬ LÝ</span></div></div>
      <div class="spr-detail">Nguồn: <b>${q&&q.source==='manual'?'Quét thủ công':'Tự động'}</b><br>Shop: <b>${esc(q&&q.host||'—')}</b><br>Chi nhánh: <b>${esc(q&&q.locationName||'—')}</b> • Bắt đầu: ${esc(fmt(q&&q.startedAt||q&&q.createdAt))}${q&&q.finishedAt?` • Xong: ${esc(fmt(q.finishedAt))}`:''}</div>
      ${lastError?`<div class="spr-error"><b>Lỗi gần nhất${lastError.skipped?' — ĐÃ BỎ QUA':''}:</b> ${esc(lastError.error)}<br>SKU: ${esc(lastError.sku||'—')} • variant: ${esc(lastError.variantId||'—')} • tồn định ghi: ${esc(Number.isFinite(Number(lastError.stock))?Number(lastError.stock):'—')}</div>`:''}
      <div class="spr-actions"><button id="sapoPushReportDownload" type="button" class="secondary" ${q?'':'disabled'}>TẢI BÁO CÁO NẠP SAPO (.TXT)</button></div>`;
    document.getElementById('sapoPushReportDownload')?.addEventListener('click',downloadReport);
  }

  async function refresh(){
    try{const r=await send({type:'DHL_AUTO_GET_STATE'});if(r&&r.ok)render(r.pushQueue||null);}catch{}
  }

  const observer=new MutationObserver(()=>{if(!document.getElementById('sapoPushReportPanel'))refresh();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.dhlSapoPushQueueV1||changes.dhlAutoSyncStatusV1))refresh();});
  setInterval(refresh,1800);refresh();
})();
