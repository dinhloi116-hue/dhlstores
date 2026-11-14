(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v)?new Date(Number(v)).toLocaleString('vi-VN'):'—';
let state=null,updating=false;
async function send(message){
 const r=await chrome.runtime.sendMessage(message);
 if(!r||!r.ok)throw Error(r&&r.error||'Không kết nối được công cụ đồng bộ.');
 return r.result;
}
function notice(msg,bad=false){
 const el=$('savedTabsNotice');
 if(el){el.textContent=msg;el.style.color=bad?'#b91c1c':'#166534';}
}
function selectedIds(){
 return [...document.querySelectorAll('[data-auto-id]:checked')].map(el=>el.dataset.autoId);
}
function render(){
 if(!state)return;
 const c=state.config||{},run=state.cycle||{},push=state.push||{};
 const defaultAll=!(c.selectedProfileIds||[]).length;
 const selected=new Set(defaultAll?(state.profiles||[]).map(p=>p.id):c.selectedProfileIds);
 const profiles=(state.profiles||[]).map(p=>
   '<label class="dhl-auto-profile"><input type="checkbox" data-auto-id="'+esc(p.id)+'"'
   +(selected.has(p.id)?' checked':'')+'>'
   +'<span><b>'+esc(p.name||p.id)+'</b><small>'+esc(p.url)+'</small></span></label>').join('')
   ||'<p class="dhl-auto-warn">Chưa có tab nguồn đã lưu. Hãy quét từng danh mục thủ công một lần để tạo hồ sơ.</p>';
 const names={scan:'Đang quét',pushing:'Đang đẩy lên Sapo',done:'Đã quét và đẩy xong',
   'scan-only':'Quét xong (chưa đẩy Sapo)',failed:'Có lỗi – đã dừng',
   'push-paused':'Sapo tạm dừng',next:'Đang chuẩn bị',launching:'Đang mở tab nguồn',
   'ready-to-push':'Đang kiểm tra dữ liệu trước khi đẩy'};
 const heading=names[run.phase]||'Sẵn sàng đồng bộ';
 const count=(state.profiles||[]).length;
 $('scheduledStockPanel').innerHTML=
   '<div class="dhl-batch-head"><b>2. ĐỒNG BỘ CÁC TAB ĐÃ LƯU</b>'
   +'<small>Chạy khi bấm, không có lịch tự quét.</small></div>'
   +'<button id="savedTabsSyncNow" class="dhl-batch-run" type="button"'
   +(run.running||!count?' disabled':'')+'>ĐỒNG BỘ NGAY</button>'
   +'<details id="savedTabsDetails"><summary>Chọn danh mục cần quét ('+
     Number(selected.size)+'/'+count+') &amp; tùy chọn Sapo</summary>'
   +'<div class="dhl-auto-choose"><button id="savedTabsSelectAll" type="button">CHỌN TẤT CẢ</button>'
   +'<button id="savedTabsSelectNone" type="button">BỎ CHỌN</button></div>'
   +'<div class="dhl-auto-profiles">'+profiles+'</div>'
   +'<label class="dhl-auto-check"><input id="savedTabsPush" type="checkbox"'
   +(c.autoPushSapo?' checked':'')+(c.sapoConnected?'':' disabled')
   +'> Sau khi quét đủ TẤT CẢ tab, đẩy tồn trực tiếp lên Sapo</label>'
   +'<small>Kho Sapo: '+esc(c.locationName||'Chưa xác minh')
   +' · '+esc(c.storeHost||'Chưa kết nối')+'</small>'
   +(c.sapoConnected?'':'<p class="dhl-auto-warn">Muốn đẩy Sapo: xác minh API và kho trong mục ĐẦU RA. Nếu chưa kết nối, vẫn có thể quét tất cả tab và xuất Excel.</p>')
   +'</details>'
   +'<div class="dhl-auto-summary" role="status"><b>'+esc(heading)+'</b>'
   +'<div>'+Number(run.scanned||0)+'/'+(run.profileIds||[]).length+' danh mục quét xong'
   +(run.currentName?' · '+esc(run.currentName):'')+'</div>'
   +'<div>'+(push.total?'Đã ghi '+Number(push.success||0)+'/'+Number(push.total)+' SKU lên Sapo':'Chưa ghi tồn Sapo')+'</div>'
   +'<div>Lượt gần nhất: '+fmt(run.finishedAt||run.startedAt)+'</div>'
   +(run.error?'<p class="dhl-auto-warn">'+esc(run.error)+'</p>':'')
   +(run.phase==='push-paused'?'<button id="savedTabsResume" type="button">TIẾP TỤC ĐẨY SAPO</button>':'')
   +'</div><p id="savedTabsNotice" role="status"></p>';
 $('savedTabsSyncNow').addEventListener('click',runNow);
 $('savedTabsSelectAll').addEventListener('click',()=>{
   for(const el of document.querySelectorAll('[data-auto-id]'))el.checked=true;
 });
 $('savedTabsSelectNone').addEventListener('click',()=>{
   for(const el of document.querySelectorAll('[data-auto-id]'))el.checked=false;
 });
 $('savedTabsResume')?.addEventListener('click',async()=>{
   try{await send({type:'DHL_SCHEDULED_RESUME_PUSH'});await refresh();notice('Đã tiếp tục hàng đợi Sapo.');}
   catch(e){notice(e.message||String(e),true);}
 });
}
async function runNow(){
 const ids=selectedIds();
 const push=Boolean($('savedTabsPush')?.checked);
 if(!ids.length){notice('Hãy chọn ít nhất một danh mục nguồn.',true);return;}
 const button=$('savedTabsSyncNow');
 if(button)button.disabled=true;
 try{
   const result=await send({type:'DHL_SCHEDULED_RUN_NOW',profileIds:ids,pushToSapo:push});
   if(!result.started)throw Error('Không bắt đầu: '+(result.reason||'đang có tác vụ khác'));
   await refresh();
   notice('Đã bắt đầu. Tool sẽ lần lượt quét '+ids.length+' tab nguồn đã lưu.');
 }catch(e){
   notice(e.message||String(e),true);
   if(button&&button.isConnected)button.disabled=false;
 }
}
async function refresh(){
 if(updating)return;updating=true;
 try{
   const detailsOpen=$('savedTabsDetails')?.open;
   state=await send({type:'DHL_SCHEDULED_GET'});
   render();
   if(typeof detailsOpen==='boolean'&&$('savedTabsDetails'))$('savedTabsDetails').open=detailsOpen;
 }catch(e){notice(e.message||String(e),true);}
 finally{updating=false;}
}
function mount(){
 if($('scheduledStockPanel'))return;
 const main=document.querySelector('main');
 if(!main)return;
 const style=document.createElement('style');
 style.textContent=[
 '#scheduledStockPanel{border:1px solid #93c5fd;background:#eff6ff;border-radius:10px;padding:12px;margin-top:12px;font-size:11px}',
 '.dhl-batch-head{display:flex;flex-direction:column;gap:3px;margin-bottom:9px}',
 '.dhl-batch-head small{font-size:10px;color:#475569}',
 '.dhl-batch-run{width:100%;padding:13px 9px!important;background:#155e75!important;color:#fff!important;font-size:13px!important;font-weight:900!important;border:0!important;border-radius:8px!important}',
 '.dhl-batch-run:disabled{opacity:.48}',
 '#savedTabsDetails{margin:10px 0}',
 '#savedTabsDetails summary{font-weight:750;cursor:pointer;color:#1e40af}',
 '.dhl-auto-choose{display:flex;gap:8px;margin:8px 0}',
 '.dhl-auto-choose button{padding:6px 9px;border-radius:5px;border:1px solid #cbd5e1;background:#fff;font-size:10px}',
 '.dhl-auto-profiles{max-height:180px;overflow:auto;background:white;border:1px solid #cbd5e1;border-radius:6px}',
 '.dhl-auto-profile{display:flex;gap:8px;padding:8px;border-bottom:1px solid #e2e8f0}',
 '.dhl-auto-profile small{display:block;overflow-wrap:anywhere;color:#64748b;margin-top:3px;font-size:9px}',
 '.dhl-auto-check{display:flex;gap:7px;align-items:center;margin:10px 0;font-weight:750}',
 '.dhl-auto-summary{background:#fff;border:1px solid #dbeafe;border-radius:7px;padding:9px;line-height:1.7}',
 '.dhl-auto-summary button{padding:9px;background:#fff;border-radius:6px;border:1px solid #93c5fd}',
 '.dhl-auto-warn{background:#fff7ed;color:#9a3412;padding:7px;border-radius:5px}'
 ].join('');
 document.head.appendChild(style);
 const section=document.createElement('section');
 section.id='scheduledStockPanel';
 main.appendChild(section);
 refresh().catch(()=>{});
 chrome.storage.onChanged.addListener((changes,area)=>{
   if(area==='local'&&(changes.dhlScheduledStockCycleV1||changes.dhlAutoSyncConfigV1
     ||changes.dhlSavedStockProfilesV1||changes.dhlSapoPushQueueV1))refresh().catch(()=>{});
 });
}
mount();
})();