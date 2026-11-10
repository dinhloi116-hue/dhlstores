(() => {
  'use strict';

  const BATCH_KEY='dhlManualPendingStockBatchV1';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const QUEUE_KEY='dhlSapoPushQueueV1';
  const JOB_KEY='dhlManualScanJobV2';
  const quality=globalThis.DHLScanQualityCore;
  let recovering=false;
  let rebuildAttempted=false;
  let rebuildReceiverError='';
  let pendingPreview=null;
  let pendingPreviewAt=0;

  const text=(v)=>String(v==null?'':v).trim();
  const esc=(v)=>text(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const setText=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value;};

  async function send(message){
    // Use Chrome's Promise-only messaging API. Promise rejection is explicitly
    // awaited/caught by the caller, avoiding unchecked callback lastError when
    // the MV3 worker is unavailable or the extension was just reloaded.
    let response;
    try{
      response=await chrome.runtime.sendMessage(message);
    }catch(error){
      const detail=String(error&&error.message||error);
      if(/Receiving end does not exist|Could not establish connection|Extension context invalidated/i.test(detail)){
        throw new Error('Không kết nối được tiến trình nền DHL STOCK SYNC. Đóng/mở lại Side Panel hoặc Reload extension; dữ liệu quét chưa bị xóa.');
      }
      throw error;
    }
    if(!response)throw new Error('Background chưa phản hồi lệnh '+String(message&&message.type||'')+'.');
    return response;
  }

  async function readState(){
    const s=await chrome.storage.local.get([BATCH_KEY,CONFIG_KEY,QUEUE_KEY,JOB_KEY]);
    const pending=s[BATCH_KEY]&&typeof s[BATCH_KEY]==='object'?s[BATCH_KEY]:{};
    const config=s[CONFIG_KEY]&&typeof s[CONFIG_KEY]==='object'?s[CONFIG_KEY]:{};
    const queue=s[QUEUE_KEY]&&typeof s[QUEUE_KEY]==='object'?s[QUEUE_KEY]:null;
    const job=s[JOB_KEY]&&typeof s[JOB_KEY]==='object'?s[JOB_KEY]:null;
    const exportEntries=Object.values(pending).filter(x=>x&&x.auto!==true&&Array.isArray(x.rows)&&x.rows.length);
    const manualEntries=exportEntries.filter(entry=>!entry.lastSapoPushQueueId
      ||Number(entry.lastSapoPushedAt||0)<Number(entry.scannedAt||0));
    return{config,queue,job,manualEntries,exportEntries};
  }

  function setState(message,kind=''){
    const el=document.getElementById('manualSapoOutputState');
    if(!el)return;
    el.textContent=text(message);
    el.className=`manual-output-state ${kind}`.trim();
  }

  function clearPreview(){
    pendingPreview=null;
    pendingPreviewAt=0;
    const box=document.getElementById('manualSapoPreview');
    if(box){box.hidden=true;box.innerHTML='';}
  }

  function renderPreview(preview){
    const box=document.getElementById('manualSapoPreview');
    if(!box)return;
    const sum=preview.summary||{};
    const last=sum.recordedAt?new Date(sum.recordedAt).toLocaleString('vi-VN'):'chưa có';
    const lines=(preview.rows||[]).map(row=>{
      const before=row.oldStock===null?'—':row.oldStock;
      const delta=row.delta===null?'chưa có mốc':(row.delta>0?'+'+row.delta:row.delta);
      const emphasis=row.risk==='sold-out'?' style="color:#b91c1c;font-weight:800"':'';
      return `<div class="sapo-preview-line"><span>${esc(row.sku)}</span><span>${before}</span><span${emphasis}>${Number(row.stock)}</span><span>${esc(delta)}</span></div>`;
    }).join('');
    box.innerHTML=`
      <div style="font-weight:900;margin:8px 0 5px">XEM TRƯỚC ĐẨY TỒN — ${Number(sum.count||0)} SKU</div>
      <div>${Number(sum.zero||0)} SKU hết hàng • ${Number(sum.changed||0)} SKU đổi so với lần đẩy đã lưu • ${Number(sum.unknown||0)} SKU chưa có mốc</div>
      <small>Kho: ${esc(preview.locationName||preview.branch)}. Cột "Mốc trước" là dữ liệu đã ghi nhận ở lần đẩy trước (${esc(last)}), <b>KHÔNG phải số tồn Sapo đang đọc trực tiếp</b>. Kiểm tra lại trên Sapo nếu có thay đổi ngoài tool.</small>
      <div class="sapo-preview-line sapo-preview-heading"><span>SKU</span><span>Mốc trước</span><span>Sẽ ghi</span><span>Chênh</span></div>
      <div class="sapo-preview-scroller">${lines}</div>
      <button id="manualSapoPreviewCancel" type="button" class="secondary">HỦY XEM TRƯỚC</button>`;
    box.hidden=false;
    box.querySelector('#manualSapoPreviewCancel')?.addEventListener('click',()=>{
      clearPreview();
      refresh().catch(()=>{});
    });
  }

  async function pushManual(){
    const btn=document.getElementById('manualSapoPushBtn');
    if(btn){btn.disabled=true;setText(btn,'ĐANG KIỂM TRA...');}
    try{
      const s=await readState();
      const profileIds=s.manualEntries.map(x=>String(x.profileId||'')).filter(Boolean);
      if(!profileIds.length)throw new Error('Chưa có kết quả quét để đẩy lên Sapo.');
      if(!quality||s.manualEntries.some(entry=>!quality.trustedEntry(entry))){
        throw new Error('Lượt quét còn lỗi hoặc chưa được xác minh đủ. Không được đẩy tồn lên Sapo.');
      }
      if(pendingPreview&&Date.now()-pendingPreviewAt>10*60*1000)clearPreview();
      if(!pendingPreview){
        const response=await send({type:'DHL_SAPO_PREVIEW_MANUAL',profileIds});
        if(!response.ok)throw new Error(response.error||'Không thể xem trước tồn kho.');
        pendingPreview=response.preview;
        pendingPreviewAt=Date.now();
        renderPreview(pendingPreview);
        setState('Kiểm tra đầy đủ SKU và tồn dự kiến bên dưới, rồi bấm XÁC NHẬN ĐẨY. Chưa có dữ liệu nào được gửi lên Sapo.','bad');
        return;
      }
      // The worker checks a one-time token and recomputes every SKU+stock.
      // Changed data, expired token or a different warehouse aborts the write.
      const token=pendingPreview.token;
      const response=await send({type:'DHL_SAPO_PUSH_MANUAL',profileIds,previewToken:token});
      if(!response.ok)throw new Error(response.error||'Không bắt đầu được lượt đẩy Sapo.');
      clearPreview();
      setState('Đã xác nhận bản xem trước và bắt đầu đẩy tồn Sapo.','ok');
    }catch(error){
      clearPreview();
      setState(error.message||String(error),'bad');
    }finally{
      await refresh().catch(()=>{});
    }
  }

  async function connectSapo(){
    const button=document.getElementById('manualSapoConnectBtn');
    const status=document.getElementById('manualSapoConnectStatus');
    const host=document.getElementById('manualSapoHostInput');
    const key=document.getElementById('manualSapoApiKeyInput');
    const secret=document.getElementById('manualSapoApiSecretInput');
    const location=document.getElementById('manualSapoLocationSelect');
    if(button)button.disabled=true;
    if(status)status.textContent='Đang kiểm tra API và danh sách kho Sapo...';
    try{
      const response=await send({
        type:'DHL_SAPO_CONNECT',
        storeHost:text(host&&host.value),
        apiKey:text(key&&key.value),
        apiSecret:text(secret&&secret.value),
        locationId:Number(location&&!location.hidden&&location.value)||0
      });
      if(!response.ok)throw new Error(response.error||'Không thể kết nối Sapo.');
      const result=response.result||{};
      if(result.needsLocation){
        if(!location)throw new Error('Thiếu bộ chọn kho Sapo.');
        location.innerHTML='<option value="">Chọn đúng kho trước khi đồng bộ</option>'
          +(result.locations||[]).map(x=>`<option value="${Number(x.id)}">${esc(x.name)}</option>`).join('');
        location.hidden=false;
        location.required=true;
        if(status)status.textContent='Shop có nhiều kho. Chọn kho cần ghi tồn rồi bấm KẾT NỐI.';
        return;
      }
      if(!result.connected)throw new Error('Sapo chưa xác nhận kết nối.');
      if(key)key.value='';
      if(secret)secret.value='';
      if(location){location.hidden=true;location.innerHTML='';}
      if(status)status.textContent='Đã xác minh kết nối với kho '+text(result.locationName)+'.';
      const details=document.getElementById('manualSapoConnection');
      if(details)details.open=false;
      clearPreview();
      await refresh();
    }catch(error){
      if(status)status.textContent='Không kết nối được: '+String(error&&error.message||error);
    }finally{if(button)button.disabled=false;}
  }

  async function cancelPush(){
    const btn=document.getElementById('manualSapoCancelBtn');
    if(btn){btn.disabled=true;setText(btn,'ĐANG DỪNG...');}
    try{
      const response=await send({type:'DHL_SAPO_PUSH_CANCEL'});
      if(!response.ok)throw new Error(response.error||'Không dừng được lượt đẩy.');
      setState('Đã dừng đẩy Sapo. Cache quét vẫn được giữ nguyên.','ok');
    }catch(error){
      setState(error.message||String(error),'bad');
    }finally{
      await refresh().catch(()=>{});
    }
  }

  function injectStyle(){
    if(document.getElementById('manualSapoOutputStyle'))return;
    const style=document.createElement('style');
    style.id='manualSapoOutputStyle';
    style.textContent=`
      .manual-output-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}
      .manual-output-actions button{width:100%;min-height:42px;margin-top:0!important;font-size:11px;font-weight:900}
      #manualSapoPushBtn{background:#0f172a;color:#fff;border-color:#0f172a}
      #manualSapoCancelBtn{margin-top:7px;width:100%;min-height:34px;font-size:10px;font-weight:800}
      .manual-output-state{margin-top:7px;padding:7px 8px;border-radius:7px;background:#f8fafc;color:#475569;font-size:10px;line-height:1.4}
      .manual-output-state.ok{background:#f0fdf4;color:#166534}.manual-output-state.bad{background:#fef2f2;color:#991b1b}
      #manualSapoProgress{height:6px;margin-top:6px;border-radius:999px;overflow:hidden;background:#e2e8f0}
      #manualSapoProgressFill{height:100%;width:0;border-radius:inherit;background:#0f172a;transition:width .18s ease}
      #manualSapoPreview{font-size:10px;border:1px solid #cbd5e1;border-radius:7px;padding:8px;margin-top:8px;background:#fff}
      #manualSapoPreview small{display:block;color:#475569;margin:6px 0;line-height:1.45}
      .sapo-preview-scroller{max-height:240px;overflow:auto}
      .sapo-preview-line{display:grid;grid-template-columns:minmax(0,3fr) 1fr 1fr 1fr;gap:4px;padding:5px 2px;border-top:1px solid #e2e8f0;align-items:center}
      .sapo-preview-line span{word-break:break-word}
      .sapo-preview-heading{font-weight:800;background:#f1f5f9}
      #manualSapoPreviewCancel{margin-top:8px;width:100%}
      #manualSapoConnection{margin-top:8px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;padding:8px;font-size:11px}
      #manualSapoConnection summary{font-weight:800;cursor:pointer}
      .manual-sapo-fields{display:grid;gap:7px;margin-top:9px}
      .manual-sapo-fields label{font-size:10px;font-weight:750;color:#334155}
      .manual-sapo-fields input,.manual-sapo-fields select{width:100%;margin-top:3px;min-height:32px;padding:6px 7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box}
      #manualSapoConnectBtn{min-height:35px;width:100%;font-size:11px;font-weight:850}
      #manualSapoConnectStatus{margin:7px 0 0;line-height:1.4;color:#475569}
    `;
    document.head.appendChild(style);
  }

  function mount(){
    const box=document.getElementById('batchPendingBox');
    const excel=document.getElementById('batchExportBtn');
    if(!box||!excel)return false;
    if(document.getElementById('manualSapoPushBtn'))return true;
    injectStyle();

    const actions=document.createElement('div');
    actions.className='manual-output-actions';
    excel.insertAdjacentElement('beforebegin',actions);
    actions.appendChild(excel);

    const push=document.createElement('button');
    push.id='manualSapoPushBtn';
    push.type='button';
    push.className='primary';
    push.textContent='ĐẨY LÊN SAPO';
    push.addEventListener('click',pushManual);
    actions.appendChild(push);

    const cancel=document.createElement('button');
    cancel.id='manualSapoCancelBtn';
    cancel.type='button';
    cancel.className='secondary';
    cancel.textContent='DỪNG ĐẨY SAPO';
    cancel.hidden=true;
    cancel.addEventListener('click',cancelPush);
    actions.insertAdjacentElement('afterend',cancel);

    const connection=document.createElement('details');
    connection.id='manualSapoConnection';
    connection.innerHTML=`
      <summary>KẾT NỐI / ĐỔI KHO SAPO</summary>
      <div class="manual-sapo-fields">
        <label>Địa chỉ shop Sapo<input id="manualSapoHostInput" type="text" placeholder="ten-shop.mysapo.net" autocomplete="off"></label>
        <label>API key<input id="manualSapoApiKeyInput" type="password" placeholder="Để trống nếu đã lưu" autocomplete="new-password"></label>
        <label>API secret<input id="manualSapoApiSecretInput" type="password" placeholder="Để trống nếu đã lưu" autocomplete="new-password"></label>
        <label>Kho Sapo<select id="manualSapoLocationSelect" hidden></select></label>
        <button id="manualSapoConnectBtn" type="button" class="primary">KẾT NỐI & XÁC MINH KHO</button>
      </div>
      <p id="manualSapoConnectStatus">Thông tin chỉ lưu trong Chrome của extension; không đưa API key/secret lên GitHub.</p>`;
    cancel.insertAdjacentElement('afterend',connection);
    connection.querySelector('#manualSapoConnectBtn')?.addEventListener('click',connectSapo);

    const note=document.createElement('div');
    note.id='manualSapoOutputState';
    note.className='manual-output-state';
    connection.insertAdjacentElement('afterend',note);

    const previewBox=document.createElement('div');
    previewBox.id='manualSapoPreview';
    previewBox.hidden=true;
    note.insertAdjacentElement('afterend',previewBox);

    const progress=document.createElement('div');
    progress.id='manualSapoProgress';
    progress.hidden=true;
    progress.innerHTML='<div id="manualSapoProgressFill"></div>';
    previewBox.insertAdjacentElement('afterend',progress);
    return true;
  }

  async function refresh(){
    if(!mount())return;
    let s=await readState();

    if(!s.exportEntries.length&&!recovering&&!rebuildAttempted&&s.job
      &&['done','paused'].includes(s.job.status)
      &&Array.isArray(s.job.results)&&s.job.results.length){
      recovering=true;
      rebuildAttempted=true;
      try{
        const rebuilt=await send({type:'DHL_MANUAL_JOB_REBUILD_OUTPUT'});
        if(rebuilt&&rebuilt.ok){
          s=await readState();
          rebuildReceiverError='';
        }else{
          rebuildReceiverError=String(rebuilt&&rebuilt.error||'Background chưa thể khôi phục kết quả quét.');
        }
      }catch(error){
        rebuildReceiverError=String(error&&error.message||error);
      }finally{recovering=false;}
    }
    if(s.exportEntries.length){
      rebuildAttempted=false;
      rebuildReceiverError='';
    }

    const excel=document.getElementById('batchExportBtn');
    const push=document.getElementById('manualSapoPushBtn');
    const cancel=document.getElementById('manualSapoCancelBtn');
    const progress=document.getElementById('manualSapoProgress');
    const progressFill=document.getElementById('manualSapoProgressFill');
    const sapo=s.config&&s.config.sapo||{};
    const verified=Boolean(sapo.verifiedAt&&sapo.locationId);
    const hasCredentials=Boolean(text(sapo.storeHost)&&text(sapo.apiKey)&&text(sapo.apiSecret));
    const hostInput=document.getElementById('manualSapoHostInput');
    if(hostInput&&document.activeElement!==hostInput&&!hostInput.value){
      hostInput.value=text(sapo.storeHost);
    }
    const count=s.manualEntries.length;
    const rows=s.manualEntries.reduce((sum,x)=>sum+Number(x.rowCount||(x.rows||[]).length||0),0);
    const queue=s.queue&&s.queue.source==='manual'?s.queue:null;
    const busy=Boolean(queue&&queue.status==='running'&&queue.manualPaused!==true);
    const allVerified=Boolean(count&&quality&&s.manualEntries.every(entry=>quality.trustedEntry(entry)));
    if(pendingPreview&&Date.now()-pendingPreviewAt>10*60*1000)clearPreview();

    if(excel)setText(excel,s.exportEntries.length?`TẢI FILE EXCEL (${s.exportEntries.length})`:'TẢI FILE EXCEL');

    if(push){
      setText(push,pendingPreview
        ?`XÁC NHẬN ĐẨY (${Number(pendingPreview.summary&&pendingPreview.summary.count||rows)} SKU)`
        :(rows?`XEM TRƯỚC SAPO (${rows} DÒNG)`:'XEM TRƯỚC SAPO'));
      push.disabled=!allVerified||busy||!hasCredentials;
      push.title=!hasCredentials?'Mở KẾT NỐI / ĐỔI KHO SAPO, nhập API key và secret để kích hoạt đẩy trực tiếp.'
        :!allVerified?'Kết quả quét cần đủ SKU/size/màu.':'Xem trước rồi xác nhận để đẩy trực tiếp.';
    }
    if(cancel){
      cancel.hidden=!busy;
      cancel.disabled=false;
      setText(cancel,'DỪNG ĐẨY SAPO');
    }

    if(progress&&progressFill){
      const total=Number(queue&&queue.total||0),done=Number(queue&&queue.index||0);
      const visible=Boolean(queue&&total>0);
      progress.hidden=!visible;
      progressFill.style.width=visible?`${Math.max(0,Math.min(100,Math.round((done/total)*100)))}%`:'0%';
    }

    if(busy){
      const total=Number(queue.total||0),done=Number(queue.index||0),success=Number(queue.success||0),failed=Number(queue.failed||0);
      setState(`Đang đẩy nhanh ${done}/${total} • thành công ${success}${failed?` • lỗi ${failed}`:''}.`,'ok');
    }else if(pendingPreview){
      setState('Đang xem trước. Chỉ ghi Sapo sau khi bạn bấm XÁC NHẬN ĐẨY.','bad');
    }else if(queue&&queue.status==='done-with-errors'){
      const total=Number(queue.total||0),success=Number(queue.success||0),failed=Number(queue.failed||0);
      setState(`Đã chạy hết ${total} dòng • thành công ${success} • lỗi ${failed}. Cache vẫn giữ để có thể đẩy lại hoặc tải Excel.`,'bad');
    }else if(queue&&queue.status==='done'){
      const total=Number(queue.total||0);
      setState(`Đã đẩy xong ${total}/${total} dòng lên Sapo.`,'ok');
    }else if(queue&&queue.status==='cancelled'){
      setState('Đã dừng đẩy Sapo. Cache vẫn còn để tải Excel hoặc đẩy lại.','ok');
    }else if(!count&&rebuildReceiverError){
      setState(rebuildReceiverError,'bad');
    }else if(!count){
      setState('Quét xong một tab thì có thể tải Excel hoặc đẩy lên Sapo.');
    }else if(!allVerified){
      setState('Đang khóa đầu ra: có sản phẩm thiếu size/màu/SKU hoặc chưa được xác minh. Quét lại các sản phẩm lỗi trước khi xuất hoặc đẩy Sapo.','bad');
    }else if(verified||hasCredentials){
      setState(`${count} hồ sơ • ${rows} dòng sẵn sàng. Xem trước và xác nhận trước khi đẩy Sapo.`,'ok');
    }else{
      setState('Đã có dữ liệu quét. Mở KẾT NỐI / ĐỔI KHO SAPO bên dưới, nhập API key + secret và xác minh kho để bật nút đẩy trực tiếp.','bad');
      const connection=document.getElementById('manualSapoConnection');
      if(connection)connection.open=true;
    }
  }

  if(mount()){
    refresh().catch(()=>{});
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&(changes[BATCH_KEY]||changes[CONFIG_KEY])){
        // Any changed scan or Sapo configuration invalidates the old preview.
        clearPreview();
      }
      if(area==='local'&&(changes[BATCH_KEY]||changes[CONFIG_KEY]||changes[QUEUE_KEY]))refresh().catch(()=>{});
    });
  }
})();