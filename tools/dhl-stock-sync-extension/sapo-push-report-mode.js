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
      .spr-badge.ok{background:#dcfce7;color:#166534}.spr-badge.bad{background:#fee2e2;color:#991b1b}.spr-badge.run{background:#dbeafe;color:#1d4ed8}
      .spr-main{margin-top:9px;padding:10px;border-radius:9px;background:#f8fafc;font-size:12px;font-weight:800}.spr-main.ok{background:#f0fdf4;color:#166534}.spr-main.bad{background:#fef2f2;color:#991b1b}.spr-main.run{background:#eff6ff;color:#1d4ed8}
      .spr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}.spr-stat{border:1px solid #e2e8f0;border-radius:8px;padding:7px;text-align:center}.spr-stat b{display:block;font-size:16px}.spr-stat span{font-size:9px;color:#64748b}
      .spr-detail{margin-top:8px;font-size:10px;color:#475569;line-height:1.45}.spr-error{margin-top:7px;padding:8px;border:1px solid #fecaca;border-radius:8px;background:#fff7f7;color:#991b1b;font-size:10px;word-break:break-word}.spr-actions{display:flex;gap:7px;margin-top:9px}.spr-actions button{flex:1;min-height:36px}
    `;document.head.appendChild(style);return panel;
  }

  function statusInfo(q){
    if(!q)return{label:'CHƯA CÓ',kind:'',main:'Chưa có lượt ghi tồn kho nào lên Sapo.'};
    const done=Number(q.success||0),total=Number(q.total||0);
    if(q.status==='done'&&total>0&&done>=total)return{label:'THÀNH CÔNG',kind:'ok',main:`ĐÃ NẠP TỒN KHO LÊN SAPO THÀNH CÔNG ${done}/${total} DÒNG`};
    if(q.status==='running'||q.status==='queued')return{label:'ĐANG NẠP',kind:'run',main:`ĐANG NẠP TỒN KHO LÊN SAPO: ${done}/${total} DÒNG`};
    if(q.status==='paused')return{label:'CHƯA HOÀN TẤT',kind:'bad',main:`NẠP SAPO CHƯA HOÀN TẤT: ${done}/${total} DÒNG THÀNH CÔNG`};
    if(q.status==='failed'||q.status==='error')return{label:'THẤT BẠI',kind:'bad',main:`NẠP SAPO THẤT BẠI: ${done}/${total} DÒNG THÀNH CÔNG`};
    return{label:'CHƯA HOÀN TẤT',kind:'bad',main:`NẠP SAPO CHƯA HOÀN TẤT: ${done}/${total} DÒNG`};
  }

  function reportText(q){
    const total=Number(q&&q.total||0),success=Number(q&&q.success||0),remaining=Math.max(0,total-success);
    const errors=Array.isArray(q&&q.errors)?q.errors:[],info=statusInfo(q);
    const lines=[];lines.push('DHL STOCK SYNC - BÁO CÁO GHI TỒN KHO SAPO');
    lines.push(`Queue ID: ${text(q&&q.id)||'—'}`);
    lines.push(`Shop: ${text(q&&q.host)||'—'}`);
    lines.push(`Chi nhánh: ${text(q&&q.locationName)||'—'}`);
    lines.push(`Bắt đầu: ${fmt(q&&q.startedAt||q&&q.createdAt)}`);
    lines.push(`Kết thúc: ${fmt(q&&q.finishedAt)}`);
    lines.push(`Trạng thái: ${info.label}`);
    lines.push(`Tổng dòng: ${total}`);
    lines.push(`Đã nạp thành công: ${success}`);
    lines.push(`Còn lại: ${remaining}`);
    lines.push(`Số lỗi ghi nhận: ${errors.length}`);lines.push('');
    const okRows=Array.isArray(q&&q.successRows)?q.successRows:[];
    if(okRows.length){lines.push('DÒNG ĐÃ GHI THÀNH CÔNG:');okRows.forEach((r,i)=>lines.push(`${i+1}. Index ${Number(r.index||0)} | SKU ${text(r.sku)||'—'} | variant ${r.variantId||'—'} | tồn ${r.stock} | ${fmt(r.at)}`));lines.push('');}
    if(errors.length){lines.push('LỖI / LỊCH SỬ THỬ LẠI:');errors.forEach((e,i)=>lines.push(`${i+1}. Index ${Number(e.index||0)} | SKU ${text(e.sku)||'—'} | variant ${e.variantId||'—'} | tồn ${Number.isFinite(Number(e.stock))?Number(e.stock):'—'} | ${text(e.error)} | ${fmt(e.at)}`));}
    return lines.join('\r\n');
  }

  function downloadReport(){
    if(!lastQueue)return;const blob=new Blob(['\ufeff'+reportText(lastQueue)],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    const stamp=new Date(lastQueue.finishedAt||lastQueue.createdAt||Date.now()).toISOString().replace(/[:T]/g,'-').slice(0,16);a.href=url;a.download=`BAO_CAO_NAP_TON_SAPO_${stamp}.txt`;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }

  function render(q){
    lastQueue=q||null;const panel=ensurePanel();if(!panel)return;const info=statusInfo(q),done=Number(q&&q.success||0),total=Number(q&&q.total||0),remaining=Math.max(0,total-done),errors=Array.isArray(q&&q.errors)?q.errors:[];
    const lastError=errors.length?errors[errors.length-1]:null;
    panel.innerHTML=`<div class="spr-head"><b>BÁO CÁO NẠP TỒN SAPO</b><span class="spr-badge ${info.kind}">${esc(info.label)}</span></div>
      <div class="spr-main ${info.kind}">${esc(info.main)}</div>
      <div class="spr-grid"><div class="spr-stat"><b>${done}</b><span>ĐÃ GHI OK</span></div><div class="spr-stat"><b>${remaining}</b><span>CÒN LẠI</span></div><div class="spr-stat"><b>${errors.length}</b><span>LỖI/THỬ LẠI</span></div></div>
      <div class="spr-detail">Shop: <b>${esc(q&&q.host||'—')}</b><br>Chi nhánh: <b>${esc(q&&q.locationName||'—')}</b> • Bắt đầu: ${esc(fmt(q&&q.startedAt||q&&q.createdAt))}${q&&q.finishedAt?` • Xong: ${esc(fmt(q.finishedAt))}`:''}</div>
      ${lastError?`<div class="spr-error"><b>Lỗi gần nhất:</b> ${esc(lastError.error)}<br>SKU: ${esc(lastError.sku||'—')} • variant: ${esc(lastError.variantId||'—')} • tồn định ghi: ${esc(Number.isFinite(Number(lastError.stock))?Number(lastError.stock):'—')}</div>`:''}
      <div class="spr-actions"><button id="sapoPushReportDownload" type="button" class="secondary" ${q?'':'disabled'}>TẢI BÁO CÁO NẠP SAPO (.TXT)</button></div>`;
    document.getElementById('sapoPushReportDownload')?.addEventListener('click',downloadReport);
  }

  async function refresh(){
    try{const r=await send({type:'DHL_AUTO_GET_STATE'});if(r&&r.ok)render(r.pushQueue||null);}catch{}
  }

  const observer=new MutationObserver(()=>{if(!document.getElementById('sapoPushReportPanel'))refresh();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.dhlSapoPushQueueV1||changes.dhlAutoSyncStatusV1))refresh();});
  setInterval(refresh,2500);refresh();
})();
