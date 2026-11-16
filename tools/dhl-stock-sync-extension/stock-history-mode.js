(() => {
  'use strict';

  const core=globalThis.DHLStockHistoryCore;
  const matcher=globalThis.DHLMatchCore;
  if(!core||!matcher||typeof matcher.matchSapoProducts!=='function')return;

  const HISTORY_KEY='dhlStockScanHistoryV1';
  const PROFILE_KEY='dhlSavedStockProfilesV1';
  const SELECTED_KEY='dhlSelectedStockProfileId';
  const MAX_PER_PROFILE=60;
  let latestSource=[];
  let latestSourceAt=0;
  let lastRecordedSignature='';
  let lastRecordedAt=0;
  let compareOldId='';
  let compareNewId='';

  const text=(v)=>String(v==null?'':v).trim();
  const esc=(v)=>text(v).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const fmtTime=(ts)=>ts?new Date(ts).toLocaleString('vi-VN'):'—';
  const fmtDelta=(n)=>n>0?`+${n}`:`${n}`;

  // Chỉ quan sát dữ liệu mà matcher cũ đang dùng; không thay đổi kết quả ghép.
  const originalMatch=matcher.matchSapoProducts.bind(matcher);
  if(!matcher.__stockHistoryWrapped){
    matcher.matchSapoProducts=function(sapoProducts,sourceResults,options){
      if(Array.isArray(sourceResults)&&sourceResults.length){
        latestSource=sourceResults;
        latestSourceAt=Date.now();
      }
      return originalMatch(sapoProducts,sourceResults,options);
    };
    matcher.__stockHistoryWrapped=true;
  }

  async function loadAll(){
    const stored=await chrome.storage.local.get([HISTORY_KEY,PROFILE_KEY,SELECTED_KEY]);
    return{
      history:stored[HISTORY_KEY]&&typeof stored[HISTORY_KEY]==='object'?stored[HISTORY_KEY]:{},
      profiles:Array.isArray(stored[PROFILE_KEY])?stored[PROFILE_KEY]:[],
      selectedId:text(stored[SELECTED_KEY])
    };
  }

  function signature(snapshot){
    return (snapshot.items||[]).map(x=>`${x.key}:${x.stock}`).join('|');
  }

  async function selectedContext(){
    const state=await loadAll();
    const profile=state.profiles.find(p=>String(p&&p.id)===state.selectedId)||null;
    return{...state,profile};
  }

  async function currentTabUrl(){
    try{
      const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
      return text(tab&&tab.url);
    }catch{return'';}
  }

  async function recordLatestScan(){
    if(!latestSource.length||Date.now()-latestSourceAt>20000)return;
    const state=await selectedContext();
    if(!state.profile)return;
    const snap=core.snapshotFromSource(latestSource,{
      profileId:state.profile.id,
      profileName:state.profile.name,
      sourceUrl:await currentTabUrl(),
      at:Date.now(),
      matcher
    });
    if(!snap.items.length)return;
    const sig=signature(snap);
    // Một lần quét có thể gọi matcher vài lần; chỉ lưu 1 snapshot trong 20 giây.
    if(sig===lastRecordedSignature&&Date.now()-lastRecordedAt<20000)return;
    lastRecordedSignature=sig;
    lastRecordedAt=Date.now();

    const list=Array.isArray(state.history[state.profile.id])?state.history[state.profile.id]:[];
    list.push(snap);
    if(list.length>MAX_PER_PROFILE)list.splice(0,list.length-MAX_PER_PROFILE);
    state.history[state.profile.id]=list;
    await chrome.storage.local.set({[HISTORY_KEY]:state.history});
    compareNewId=snap.id;
    compareOldId=list.length>1?list[list.length-2].id:'';
    render().catch(()=>{});
  }

  function findSnapshot(list,id){return list.find(x=>String(x&&x.id)===String(id))||null;}

  function typeLabel(type){
    return({soldout:'HẾT HÀNG',restocked:'CÓ HÀNG LẠI',decreased:'GIẢM',increased:'TĂNG',added:'MỚI XUẤT HIỆN',missing:'KHÔNG CÒN THẤY'})[type]||type;
  }

  function rowText(change){
    const item=change.item||{};
    const parts=[text(item.name),text(item.color),item.size?`Size ${item.size}`:''].filter(Boolean).join(' • ');
    const before=change.before==null?'—':change.before;
    const after=change.after==null?'—':change.after;
    return `${typeLabel(change.type)} | ${parts} | ${before} → ${after}${change.before!=null&&change.after!=null?` (${fmtDelta(change.delta)})`:''}`;
  }

  function reportText(profile,oldSnap,newSnap,diff){
    const lines=[];
    lines.push('DHL STOCK SYNC - BÁO CÁO BIẾN ĐỘNG TỒN KHO');
    lines.push(`Hồ sơ: ${profile&&profile.name||newSnap.profileName||''}`);
    lines.push(`Mốc cũ: ${fmtTime(oldSnap.at)}`);
    lines.push(`Mốc mới: ${fmtTime(newSnap.at)}`);
    lines.push(`Tổng tồn: ${diff.oldTotal} → ${diff.newTotal} (${fmtDelta(diff.net)})`);
    lines.push(`Biến thể thay đổi: ${diff.changed}`);
    lines.push(`Tăng: ${diff.increased} | Giảm: ${diff.decreased} | Có hàng lại: ${diff.restocked} | Hết hàng: ${diff.soldOut} | Mới: ${diff.added} | Không còn thấy: ${diff.missing}`);
    lines.push('');
    if(!diff.changes.length)lines.push('Không có thay đổi tồn kho giữa hai mốc.');
    else diff.changes.forEach((c,i)=>lines.push(`${i+1}. ${rowText(c)}`));
    return lines.join('\r\n');
  }

  function downloadTxt(content,name){
    const blob=new Blob(['\ufeff'+content],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function ensureUi(){
    if(document.getElementById('stockHistoryPanel'))return document.getElementById('stockHistoryPanel');
    const host=document.getElementById('savedProfilesMode');
    if(!host)return null;
    const panel=document.createElement('section');
    panel.id='stockHistoryPanel';
    panel.innerHTML=`
      <div class="stock-history-head">
        <div><b>BIẾN ĐỘNG TỒN KHO</b><small>Lưu từng lần quét và tự so với lần trước</small></div>
        <span id="stockHistoryCount" class="stock-history-badge">0 mốc</span>
      </div>
      <div id="stockHistorySummary" class="stock-history-summary">Chưa có lịch sử quét cho hồ sơ này.</div>
      <div id="stockHistoryStats" class="stock-history-stats"></div>
      <div class="stock-history-compare">
        <label>Mốc cũ<select id="stockHistoryOld"></select></label>
        <label>Mốc mới<select id="stockHistoryNew"></select></label>
      </div>
      <div id="stockHistoryChanges" class="stock-history-changes"></div>
      <div class="stock-history-actions">
        <button id="stockHistoryReport" type="button" class="secondary">TẢI BÁO CÁO .TXT</button>
      </div>`;
    const status=document.getElementById('profileStatus');
    if(status&&status.parentElement===host)status.insertAdjacentElement('afterend',panel);
    else host.appendChild(panel);

    const style=document.createElement('style');
    style.textContent=`
      #stockHistoryPanel{margin-top:12px;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff}
      .stock-history-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.stock-history-head small{display:block;margin-top:3px;color:#64748b}
      .stock-history-badge{padding:4px 8px;border-radius:999px;background:#e2e8f0;font-size:12px;font-weight:700;white-space:nowrap}
      .stock-history-summary{margin-top:10px;padding:9px 10px;border-radius:9px;background:#f8fafc;font-weight:700}
      .stock-history-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}.stock-history-stat{padding:7px;border:1px solid #e2e8f0;border-radius:8px;text-align:center}.stock-history-stat b{display:block;font-size:16px}.stock-history-stat span{font-size:11px;color:#64748b}
      .stock-history-compare{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.stock-history-compare label{font-size:11px;font-weight:700;color:#475569}.stock-history-compare select{display:block;width:100%;margin-top:3px;padding:7px;border:1px solid #cbd5e1;border-radius:7px;background:white}
      .stock-history-changes{margin-top:9px;max-height:270px;overflow:auto}.stock-history-row{padding:7px 8px;border-bottom:1px solid #f1f5f9;font-size:12px}.stock-history-row strong{display:inline-block;min-width:86px}.stock-history-row.soldout strong,.stock-history-row.decreased strong{color:#b91c1c}.stock-history-row.restocked strong,.stock-history-row.increased strong{color:#15803d}.stock-history-row.added strong{color:#0369a1}.stock-history-row.missing strong{color:#92400e}
      .stock-history-actions{display:flex;gap:8px;margin-top:9px}.stock-history-actions button{flex:1}
    `;
    document.head.appendChild(style);

    document.getElementById('stockHistoryOld').addEventListener('change',e=>{compareOldId=e.target.value;render().catch(()=>{});});
    document.getElementById('stockHistoryNew').addEventListener('change',e=>{compareNewId=e.target.value;render().catch(()=>{});});
    document.getElementById('stockHistoryReport').addEventListener('click',async()=>{
      const state=await selectedContext();const list=state.profile?(state.history[state.profile.id]||[]):[];
      const oldSnap=findSnapshot(list,compareOldId),newSnap=findSnapshot(list,compareNewId);
      if(!oldSnap||!newSnap)return;
      const diff=core.compareSnapshots(oldSnap,newSnap);
      const stamp=new Date(newSnap.at).toISOString().slice(0,10);
      const safe=text(state.profile.name).replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_');
      downloadTxt(reportText(state.profile,oldSnap,newSnap,diff),`BIEN_DONG_TON_KHO_${safe}_${stamp}.txt`);
    });
    return panel;
  }

  async function render(){
    const panel=ensureUi();if(!panel)return;
    const state=await selectedContext();
    const list=state.profile&&Array.isArray(state.history[state.profile.id])?state.history[state.profile.id]:[];
    document.getElementById('stockHistoryCount').textContent=`${list.length} mốc`;
    const oldSel=document.getElementById('stockHistoryOld'),newSel=document.getElementById('stockHistoryNew');
    if(!list.length){
      document.getElementById('stockHistorySummary').textContent='Chưa có lịch sử. Lần quét tiếp theo sẽ được lưu làm mốc đầu tiên.';
      document.getElementById('stockHistoryStats').innerHTML='';
      document.getElementById('stockHistoryChanges').innerHTML='';
      oldSel.innerHTML='<option value="">Chưa có</option>';newSel.innerHTML='<option value="">Chưa có</option>';
      document.getElementById('stockHistoryReport').disabled=true;return;
    }
    const reversed=[...list].reverse();
    const options=reversed.map((s,i)=>`<option value="${esc(s.id)}">${i===0?'Mới nhất — ':''}${esc(fmtTime(s.at))} • ${s.itemCount} biến thể • tổng ${s.totalStock}</option>`).join('');
    oldSel.innerHTML=options;newSel.innerHTML=options;
    if(!compareNewId||!findSnapshot(list,compareNewId))compareNewId=list[list.length-1].id;
    if(!compareOldId||!findSnapshot(list,compareOldId))compareOldId=list.length>1?list[list.length-2].id:list[list.length-1].id;
    oldSel.value=compareOldId;newSel.value=compareNewId;
    const oldSnap=findSnapshot(list,compareOldId),newSnap=findSnapshot(list,compareNewId);
    const diff=core.compareSnapshots(oldSnap,newSnap);
    const summary=document.getElementById('stockHistorySummary');
    if(list.length===1)summary.textContent=`Đã lưu mốc đầu tiên ${fmtTime(newSnap.at)}. Quét lần sau tool sẽ tự báo biến động.`;
    else summary.textContent=diff.changed?`So với ${fmtTime(oldSnap.at)}: ${diff.changed} biến thể thay đổi • tổng tồn ${diff.oldTotal} → ${diff.newTotal} (${fmtDelta(diff.net)})`:`Không có thay đổi so với ${fmtTime(oldSnap.at)}.`;
    document.getElementById('stockHistoryStats').innerHTML=`
      <div class="stock-history-stat"><b>${diff.increased+diff.restocked}</b><span>Tăng / có lại</span></div>
      <div class="stock-history-stat"><b>${diff.decreased+diff.soldOut}</b><span>Giảm / hết hàng</span></div>
      <div class="stock-history-stat"><b>${fmtDelta(diff.net)}</b><span>Chênh tổng tồn</span></div>
      <div class="stock-history-stat"><b>${diff.restocked}</b><span>0 → có hàng</span></div>
      <div class="stock-history-stat"><b>${diff.soldOut}</b><span>có → 0</span></div>
      <div class="stock-history-stat"><b>${diff.added+diff.missing}</b><span>Mới / không còn thấy</span></div>`;
    const changes=document.getElementById('stockHistoryChanges');
    changes.innerHTML=diff.changes.length?diff.changes.map(c=>{
      const item=c.item||{};const before=c.before==null?'—':c.before,after=c.after==null?'—':c.after;
      return `<div class="stock-history-row ${esc(c.type)}"><strong>${esc(typeLabel(c.type))}</strong> ${esc(item.name)}${item.color?` • ${esc(item.color)}`:''}${item.size?` • Size ${esc(item.size)}`:''}<br><span>${before} → ${after}${c.before!=null&&c.after!=null?` (${fmtDelta(c.delta)})`:''}</span></div>`;
    }).join(''):'<div class="stock-history-row">Không có thay đổi giữa hai mốc đã chọn.</div>';
    document.getElementById('stockHistoryReport').disabled=!(oldSnap&&newSnap);
  }

  function observeScanStatus(){
    const attach=()=>{
      const status=document.getElementById('profileStatus');
      if(!status||status.dataset.stockHistoryObserved==='1')return false;
      status.dataset.stockHistoryObserved='1';
      let previous=text(status.textContent);
      const observer=new MutationObserver(()=>{
        const current=text(status.textContent);
        if(current===previous)return;previous=current;
        if(/^QUÉT XONG\b/i.test(current))setTimeout(()=>recordLatestScan().catch(()=>{}),60);
      });
      observer.observe(status,{childList:true,subtree:true,characterData:true});
      return true;
    };
    if(!attach()){
      const observer=new MutationObserver(()=>{if(attach()){ensureUi();render().catch(()=>{});}});
      observer.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>observer.disconnect(),15000);
    }
  }

  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&(changes[HISTORY_KEY]||changes[SELECTED_KEY]))render().catch(()=>{});
  });
  observeScanStatus();
  const boot=new MutationObserver(()=>{if(ensureUi()){render().catch(()=>{});}});
  boot.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>boot.disconnect(),12000);
  ensureUi();render().catch(()=>{});
})();
