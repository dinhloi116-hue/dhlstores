(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v)?new Date(Number(v)).toLocaleString('vi-VN'):'—';
let state=null,updating=false;
async function send(message){
 const r=await chrome.runtime.sendMessage(message);
 if(!r||!r.ok)throw Error(r&&r.error||'Không kết nối được tác vụ tự động.');
 return r.result;
}
function notice(msg,bad=false){const el=$('scheduledNotice');if(el){el.textContent=msg;el.style.color=bad?'#b91c1c':'#166534';}}
function render(){
 if(!state)return;
 const c=state.config||{},run=state.cycle||{},push=state.push||{},sel=new Set(c.selectedProfileIds||[]);
 const profiles=(state.profiles||[]).map(p=>
   '<label class="dhl-auto-profile"><input type="checkbox" data-auto-id="'+esc(p.id)+'"'+(sel.has(p.id)?' checked':'')+'>'
   +'<span><b>'+esc(p.name||p.id)+'</b><small>'+esc(p.url)+'</small></span></label>').join('')
   ||'<p class="dhl-auto-warn">Chưa có hồ sơ nguồn đã lưu. Hãy quét thủ công các tab HD, DK, trẻ em… một lần trước.</p>';
 const options=[1,2,3,6,12,24].map(n=>'<option value="'+n+'"'+(Number(c.intervalHours)===n?' selected':'')+'>Mỗi '+n+' giờ</option>').join('');
 const names={scan:'Đang quét',pushing:'Đang đẩy Sapo',done:'Hoàn tất',
   'scan-only':'Quét xong (không đẩy)',failed:'Lỗi – không đẩy Sapo',
   'push-paused':'Sapo tạm dừng',next:'Đang chuẩn bị',launching:'Đang mở danh mục'};
 const heading=names[run.phase]||'Chưa chạy';
 $('scheduledStockPanel').innerHTML=
   '<details id="scheduledDetails"><summary><b>3. TỰ ĐỘNG QUÉT & ĐẨY SAPO</b> · '+(c.enabled?'BẬT':'TẮT')+'</summary>'
   +'<p>Chọn danh mục nguồn đã lưu. Bộ quét và nút đẩy thủ công vẫn hoạt động riêng.</p>'
   +'<div class="dhl-auto-profiles">'+profiles+'</div>'
   +'<label>Chu kỳ <select id="scheduledHours">'+options+'</select></label>'
   +'<label class="dhl-auto-check"><input id="scheduledEnabled" type="checkbox"'+(c.enabled?' checked':'')+'> Bật tự quét theo lịch</label>'
   +'<label class="dhl-auto-check"><input id="scheduledPush" type="checkbox"'
   +(c.autoPushSapo?' checked':'')+(c.sapoConnected?'':' disabled')
   +'> Tự đẩy Sapo sau khi TẤT CẢ danh mục quét đạt</label>'
   +'<small>Kho: '+esc(c.locationName||'Chưa xác minh')+' · '+esc(c.storeHost||'Chưa kết nối')+'</small>'
   +(c.sapoConnected?'':'<p class="dhl-auto-warn">Cần xác minh API và kho Sapo ở mục ĐẦU RA trước khi bật tự đẩy.</p>')
   +'<div class="dhl-auto-buttons"><button id="scheduledSave" type="button">LƯU CẤU HÌNH</button>'
   +'<button id="scheduledRun" type="button"'+(c.enabled&&!run.running?'':' disabled')+'>QUÉT NGAY</button></div>'
   +'<div class="dhl-auto-summary"><b>'+esc(heading)+'</b><div>'+Number(run.scanned||0)+'/'+(run.profileIds||[]).length+' danh mục'
   +(run.currentName?' · '+esc(run.currentName):'')+'</div>'
   +'<div>'+(push.total?'Sapo '+Number(push.success||0)+'/'+Number(push.total)+' SKU':'Chưa đẩy Sapo')+'</div>'
   +'<div>Gần nhất: '+fmt(run.finishedAt||run.startedAt)+' · Lượt tới: '+fmt(state.nextRunAt)+'</div>'
   +(run.error?'<p class="dhl-auto-warn">'+esc(run.error)+'</p>':'')
   +(run.phase==='push-paused'?'<button id="scheduledResume" type="button">TIẾP TỤC ĐẨY SAPO</button>':'')
   +'</div><p id="scheduledNotice" role="status"></p></details>';
 $('scheduledSave').addEventListener('click',save);
 $('scheduledRun').addEventListener('click',async()=>{
   try{const r=await send({type:'DHL_SCHEDULED_RUN_NOW'});
     if(!r.started)throw Error('Chưa chạy: '+(r.reason||'đang bận'));
     await refresh();notice('Đã bắt đầu quét.');
   }catch(e){notice(e.message,true);}
 });
 $('scheduledResume')?.addEventListener('click',async()=>{
   try{await send({type:'DHL_SCHEDULED_RESUME_PUSH'});await refresh();notice('Đã tiếp tục.');}
   catch(e){notice(e.message,true);}
 });
}
async function save(){
 const ids=[...document.querySelectorAll('[data-auto-id]:checked')].map(x=>x.dataset.autoId);
 try{
   await send({type:'DHL_SCHEDULED_CONFIGURE',profileIds:ids,
     intervalHours:Number($('scheduledHours').value),
     enabled:$('scheduledEnabled').checked,autoPushSapo:$('scheduledPush').checked});
   await refresh();notice('Đã lưu cấu hình.');
 }catch(e){notice(e.message,true);}
}
async function refresh(){
 if(updating)return;updating=true;
 try{const open=$('scheduledDetails')?.open;state=await send({type:'DHL_SCHEDULED_GET'});render();
   if(typeof open==='boolean')$('scheduledDetails').open=open;
 }catch(e){notice(e.message,true);}
 finally{updating=false;}
}
function mount(){
 if($('scheduledStockPanel'))return;
 const main=document.querySelector('main');if(!main)return;
 const style=document.createElement('style');
 style.textContent=[
 '#scheduledStockPanel{border:1px solid #93c5fd;background:#eff6ff;border-radius:10px;padding:12px;margin-top:12px;font-size:11px}',
 '#scheduledStockPanel summary{font-weight:800;cursor:pointer}',
 '#scheduledStockPanel p{line-height:1.5}',
 '.dhl-auto-profiles{max-height:190px;overflow:auto;margin:8px 0;background:white;border:1px solid #cbd5e1;border-radius:6px}',
 '.dhl-auto-profile{display:flex;gap:8px;padding:8px;border-bottom:1px solid #e2e8f0}',
 '.dhl-auto-profile small{display:block;overflow-wrap:anywhere;color:#64748b;margin-top:3px;font-size:9px}',
 '#scheduledHours{width:100%;padding:7px;margin:6px 0;border:1px solid #cbd5e1;background:white;border-radius:6px}',
 '.dhl-auto-check{display:flex;gap:7px;margin:7px 0;align-items:center;font-weight:700}',
 '.dhl-auto-buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0}',
 '.dhl-auto-buttons button,.dhl-auto-summary button{padding:9px 4px;border:1px solid #93c5fd;border-radius:6px;background:white;font-weight:800;font-size:10px}',
 '.dhl-auto-buttons button:first-child{background:#1e40af;color:white}',
 '.dhl-auto-buttons button:disabled{opacity:.5}',
 '.dhl-auto-summary{background:white;border-radius:7px;padding:9px;line-height:1.7}',
 '.dhl-auto-warn{background:#fff7ed;color:#9a3412;padding:6px;border-radius:5px}'
 ].join('');
 document.head.appendChild(style);
 const section=document.createElement('section');section.id='scheduledStockPanel';main.appendChild(section);
 refresh().catch(()=>{});
 chrome.storage.onChanged.addListener((changes,area)=>{
   if(area==='local'&&(changes.dhlScheduledStockCycleV1||changes.dhlAutoSyncConfigV1
     ||changes.dhlSavedStockProfilesV1||changes.dhlSapoPushQueueV1))
     refresh().catch(()=>{});
 });
}
mount();
})();