(() => {
  'use strict';

  const PROFILE_KEY='dhlSavedStockProfilesV1';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const STATUS_KEY='dhlAutoSyncStatusV1';
  let state={config:null,status:{},profiles:[],pushQueue:null};
  let ignoreConfigReloadUntil=0;
  let runtimeRefreshing=false;
  let configSaveChain=Promise.resolve();

  const text=(v)=>String(v==null?'':v).trim();
  const esc=(v)=>text(v).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const fmt=(ts)=>ts?new Date(Number(ts)).toLocaleString('vi-VN'):'—';

  function send(message){
    return new Promise((resolve,reject)=>{
      chrome.runtime.sendMessage(message,response=>{
        const err=chrome.runtime.lastError;
        if(err){reject(err);return;}
        if(!response){reject(new Error('Không nhận được phản hồi từ background.'));return;}
        resolve(response);
      });
    });
  }

  async function load(){
    const [remote,stored]=await Promise.all([
      send({type:'DHL_AUTO_GET_STATE'}),
      chrome.storage.local.get(PROFILE_KEY)
    ]);
    if(!remote.ok)throw new Error(remote.error||'Không đọc được cấu hình tự động.');
    state={config:remote.config||{},status:remote.status||{},pushQueue:remote.pushQueue||null,profiles:Array.isArray(stored[PROFILE_KEY])?stored[PROFILE_KEY]:[]};
    render();
  }

  async function refreshRuntime(){
    if(runtimeRefreshing)return;
    runtimeRefreshing=true;
    try{
      const remote=await send({type:'DHL_AUTO_GET_STATE'});
      if(!remote.ok)return;
      state.status=remote.status||{};
      state.pushQueue=remote.pushQueue||null;
      renderRuntime();
    }catch{}finally{runtimeRefreshing=false;}
  }

  function profileRows(){
    const cfg=state.config||{};
    const selected=new Set(cfg.selectedProfileIds||[]);
    return state.profiles.map(p=>{
      const id=String(p.id||'');
      const url=text((cfg.profileUrls||{})[id]||p.lastSourceUrl||'');
      return `<div class="auto-profile-row" data-profile-row="${esc(id)}">
        <label class="auto-check"><input type="checkbox" data-auto-profile="${esc(id)}" ${selected.has(id)?'checked':''}><span><b>${esc(p.name||'Hồ sơ')}</b><small>${Number(p.productCount||0)} SP • ${Number(p.variantCount||0)} biến thể</small></span></label>
        <input type="url" data-auto-url="${esc(id)}" value="${esc(url)}" placeholder="https://si.aobongda.net/danh-muc..." />
      </div>`;
    }).join('')||'<small>Chưa có hồ sơ. Tạo hồ sơ HD / Trẻ em trước.</small>';
  }

  function pushText(){
    const push=(state.status&&state.status.push)||{};
    if(push.status==='running'||push.status==='queued')return `Đang ghi Sapo: ${Number(push.done||0)}/${Number(push.total||0)} dòng`;
    if(push.status==='done')return `Đã ghi Sapo xong ${Number(push.total||0)} dòng lúc ${fmt(push.finishedAt)}`;
    if(push.status==='manual-error')return `Đẩy Sapo thủ công đang tạm dừng: ${Number(push.done||0)}/${Number(push.total||0)} dòng`;
    if(push.status==='error')return `Lỗi ghi Sapo: ${text(push.error)}`;
    return 'Chưa có lượt tự ghi Sapo.';
  }

  function runtimeStatusText(){
    const st=state.status||{};
    if(st.lastError)return{message:`Lỗi gần nhất: ${text(st.lastError)}`,kind:'bad'};
    if(st.running)return{message:`Đang chạy tự động ${text(st.progress||'')}${st.currentProfile?` • ${text(st.currentProfile)}`:''}`,kind:''};
    if(st.errors&&st.errors.length)return{message:`${st.errors.length} hồ sơ lỗi ở lượt gần nhất`,kind:'bad'};
    return{message:`${(st.results||[]).length} hồ sơ quét thành công ở lượt gần nhất`,kind:''};
  }

  function retryMarkup(){
    const push=(state.status&&state.status.push)||{};
    return push.status==='error'?'<button id="sapoRetryBtn" type="button" class="secondary auto-full">THỬ LẠI HÀNG ĐỢI SAPO</button>':'';
  }

  function renderRuntime(){
    const st=state.status||{};
    const last=document.getElementById('autoLastRun');
    const next=document.getElementById('autoNextRun');
    const push=document.getElementById('autoPushState');
    const statusLine=document.getElementById('autoStatusLine');
    const retrySlot=document.getElementById('autoRetrySlot');
    if(last)last.textContent=fmt(st.lastFinishedAt||st.lastRunAt);
    if(next)next.textContent=st.running?`Đang chạy ${text(st.progress||'')}`:`Lần tới: ${fmt(st.nextRunAt)}`;
    if(push)push.textContent=pushText();
    if(statusLine){
      const info=runtimeStatusText();
      if(statusLine.dataset.keepMessage!=='1'){
        statusLine.textContent=info.message;
        statusLine.className=`auto-status ${info.kind}`;
      }
    }
    if(retrySlot){
      const html=retryMarkup();
      if(retrySlot.innerHTML!==html){retrySlot.innerHTML=html;bindRetry();}
    }
  }

  function render(){
    const panel=document.getElementById('autoSyncPanel');
    if(!panel)return;
    const cfg=state.config||{};
    const st=state.status||{};
    const sapo=cfg.sapo||{};
    const verified=Boolean(sapo.verifiedAt&&sapo.locationId);
    panel.innerHTML=`
      <div class="auto-head">
        <div><b>TỰ ĐỘNG ĐỒNG BỘ</b><small>Cấu hình theo thứ tự từ trên xuống. Chrome mở là lịch vẫn chạy, không cần mở panel.</small></div>
        <span class="auto-badge">TÙY CHỌN</span>
      </div>

      <details class="auto-details" open>
        <summary>1. Chọn hồ sơ / tab nguồn cần tự quét</summary>
        <div id="autoProfiles">${profileRows()}</div>
        <label class="auto-inline"><input id="autoCloseTabs" type="checkbox" ${cfg.closeTabsAfterScan!==false?'checked':''}> Tự đóng tab nguồn sau khi quét</label>
      </details>

      <div class="auto-grid">
        <label><span>2. Chu kỳ quét</span><select id="autoInterval"><option value="1" ${Number(cfg.intervalHours)===1?'selected':''}>Mỗi 1 giờ</option><option value="2" ${Number(cfg.intervalHours)===2?'selected':''}>Mỗi 2 giờ</option><option value="3" ${Number(cfg.intervalHours)===3?'selected':''}>Mỗi 3 giờ</option></select></label>
        <div class="auto-state"><span>Lần gần nhất</span><b id="autoLastRun">${fmt(st.lastFinishedAt||st.lastRunAt)}</b><small id="autoNextRun">${st.running?`Đang chạy ${esc(st.progress||'')}`:`Lần tới: ${fmt(st.nextRunAt)}`}</small></div>
      </div>

      <details class="auto-details sapo-box">
        <summary>3. Đầu ra / Ứng dụng riêng Sapo ${verified?'✓':''}</summary>
        <small class="auto-note">Có thể tải Excel để kiểm tra hoặc tự ghi tồn thật lên Sapo. API Key/Secret chỉ lưu trong Chrome trên máy này.</small>
        <label><span>Shop Sapo</span><input id="sapoHost" type="text" value="${esc(sapo.storeHost||'')}" placeholder="ten-shop.mysapo.net" /></label>
        <div class="auto-grid">
          <label><span>API Key</span><input id="sapoKey" type="password" placeholder="${sapo.apiKey?'Đã lưu — để trống nếu giữ nguyên':'API Key'}" autocomplete="off" /></label>
          <label><span>API Secret</span><input id="sapoSecret" type="password" placeholder="${sapo.apiSecret?'Đã lưu — để trống nếu giữ nguyên':'API Secret'}" autocomplete="off" /></label>
        </div>
        <button id="sapoTestBtn" type="button" class="secondary auto-full">KIỂM TRA KẾT NỐI SAPO</button>
        <div class="auto-sapo-state ${verified?'ok':''}">${verified?`Đã xác minh: ${esc(sapo.locationName||'chi nhánh')} (#${Number(sapo.locationId)})`:'Chưa xác minh kết nối/chi nhánh.'}</div>
        <label class="auto-inline auto-danger"><input id="autoPushSapo" type="checkbox" ${cfg.autoPushSapo?'checked':''} ${verified?'':'disabled'}> Sau mỗi lượt quét thành công, tự ghi tồn thật lên Sapo</label>
        <small class="auto-note">Nếu bất kỳ hồ sơ nào quét lỗi, lượt đó sẽ KHÔNG tự ghi Sapo. Ghi theo hàng đợi để tránh quá giới hạn API.</small>
        <div id="autoPushState" class="auto-push-state">${esc(pushText())}</div>
        <div id="autoRetrySlot">${retryMarkup()}</div>
      </details>

      <div class="auto-actions">
        <button id="autoSaveBtn" type="button" class="primary">LƯU TOÀN BỘ CẤU HÌNH</button>
        <button id="autoRunNowBtn" type="button" class="secondary">CHẠY THỬ NGAY</button>
      </div>

      <div class="auto-enable-row">
        <div><b>4. Bật lịch tự động</b><small>Tích = lịch đang hoạt động. Bỏ tích = dừng lịch.</small></div>
        <label class="auto-switch"><input id="autoEnabled" type="checkbox" ${cfg.enabled?'checked':''}><span>${cfg.enabled?'ĐANG BẬT':'ĐANG TẮT'}</span></label>
      </div>
      <div id="autoStatusLine" class="auto-status ${runtimeStatusText().kind}">${esc(runtimeStatusText().message)}</div>`;
    bind();
  }

  function collectSelectedProfileIds(){
    return [...document.querySelectorAll('[data-auto-profile]')].filter(cb=>cb.checked).map(cb=>text(cb.dataset.autoProfile)).filter(Boolean);
  }

  function collectProfileUrls(){
    const urls={};
    for(const input of document.querySelectorAll('[data-auto-url]')){
      const id=text(input.dataset.autoUrl),url=text(input.value);
      if(id&&url)urls[id]=url;
    }
    return urls;
  }

  function collectConfig(){
    const oldSapo=(state.config&&state.config.sapo)||{};
    const typedKey=text(document.getElementById('sapoKey')?.value);
    const typedSecret=text(document.getElementById('sapoSecret')?.value);
    return{
      enabled:Boolean(document.getElementById('autoEnabled')?.checked),
      intervalHours:Number(document.getElementById('autoInterval')?.value||2),
      selectedProfileIds:collectSelectedProfileIds(),
      profileUrls:collectProfileUrls(),
      closeTabsAfterScan:Boolean(document.getElementById('autoCloseTabs')?.checked),
      autoPushSapo:Boolean(document.getElementById('autoPushSapo')?.checked),
      sapo:{
        ...oldSapo,
        storeHost:text(document.getElementById('sapoHost')?.value)||text(oldSapo.storeHost),
        apiKey:typedKey||text(oldSapo.apiKey),
        apiSecret:typedSecret||text(oldSapo.apiSecret)
      }
    };
  }

  function setStatus(message,kind='',keepMs=1800){
    const el=document.getElementById('autoStatusLine');if(!el)return;
    el.textContent=message;el.className=`auto-status ${kind}`;
    if(keepMs>0){
      el.dataset.keepMessage='1';
      setTimeout(()=>{if(el.isConnected){delete el.dataset.keepMessage;renderRuntime();}},keepMs);
    }
  }

  function syncControlsFromConfig(){
    const cfg=state.config||{};
    const enabled=document.getElementById('autoEnabled');
    if(enabled){enabled.checked=Boolean(cfg.enabled);updateEnabledLabel(enabled);}
    const push=document.getElementById('autoPushSapo');
    if(push)push.checked=Boolean(cfg.autoPushSapo);
  }

  async function persistPatchNow(patch,message){
    ignoreConfigReloadUntil=Date.now()+1200;
    const response=await send({type:'DHL_AUTO_SAVE_CONFIG',config:patch});
    if(!response.ok)throw new Error(response.error||'Không lưu được cấu hình.');
    state.config=response.config||state.config;
    syncControlsFromConfig();
    if(message)setStatus(message,'ok',1200);
    return state.config;
  }

  function persistPatch(patch,message='Đã tự lưu thay đổi.'){
    const run=()=>persistPatchNow(patch,message);
    const pending=configSaveChain.then(run,run);
    configSaveChain=pending.catch(()=>{});
    return pending;
  }

  async function save(showMessage=true){
    const btn=document.getElementById('autoSaveBtn');if(btn)btn.disabled=true;
    try{
      const config=await persistPatch(collectConfig(),showMessage?'Đã lưu toàn bộ cấu hình tự động.':'');
      return config;
    }catch(error){setStatus(error.message||String(error),'bad',2600);throw error;}
    finally{if(btn)btn.disabled=false;}
  }

  function updateEnabledLabel(cb){
    const span=cb&&cb.closest('.auto-switch')?.querySelector('span');
    if(span)span.textContent=cb.checked?'ĐANG BẬT':'ĐANG TẮT';
  }

  function bindImmediate(el,event,handler){
    if(!el)return;
    const key=`dhlImmediate${event}`;
    if(el.dataset[key]==='1')return;
    el.dataset[key]='1';
    el.addEventListener(event,handler);
  }

  function bindConfigControls(){
    const enabled=document.getElementById('autoEnabled');
    if(enabled&&enabled.dataset.dhlAutoEnabledBound!=='1'){
      enabled.dataset.dhlAutoEnabledBound='1';
      updateEnabledLabel(enabled);
      enabled.addEventListener('change',async()=>{
        const wanted=Boolean(enabled.checked);
        updateEnabledLabel(enabled);
        enabled.disabled=true;
        try{
          await persistPatch({enabled:wanted},wanted?'Đã BẬT lịch tự động.':'Đã TẮT lịch tự động.');
        }catch(error){
          enabled.checked=!wanted;updateEnabledLabel(enabled);
          setStatus(`Không lưu được trạng thái tự động: ${error.message||String(error)}`,'bad',3000);
        }finally{enabled.disabled=false;}
      });
    }

    const interval=document.getElementById('autoInterval');
    bindImmediate(interval,'change',()=>persistPatch({intervalHours:Number(interval.value||2)},'Đã lưu chu kỳ tự động.').catch(e=>setStatus(e.message||String(e),'bad',2600)));

    const close=document.getElementById('autoCloseTabs');
    bindImmediate(close,'change',()=>persistPatch({closeTabsAfterScan:Boolean(close.checked)},'Đã lưu tùy chọn đóng tab.').catch(e=>setStatus(e.message||String(e),'bad',2600)));

    const push=document.getElementById('autoPushSapo');
    bindImmediate(push,'change',()=>persistPatch({autoPushSapo:Boolean(push.checked)},push.checked?'Đã bật tự ghi tồn lên Sapo.':'Đã tắt tự ghi tồn lên Sapo.').catch(e=>setStatus(e.message||String(e),'bad',2600)));

    for(const cb of document.querySelectorAll('[data-auto-profile]')){
      bindImmediate(cb,'change',()=>persistPatch({selectedProfileIds:collectSelectedProfileIds()},'Đã lưu hồ sơ tự quét.').catch(e=>setStatus(e.message||String(e),'bad',2600)));
    }
    for(const input of document.querySelectorAll('[data-auto-url]')){
      bindImmediate(input,'change',()=>persistPatch({profileUrls:collectProfileUrls()},'Đã lưu URL nguồn.').catch(e=>setStatus(e.message||String(e),'bad',2600)));
    }
  }

  async function runNow(){
    const btn=document.getElementById('autoRunNowBtn');if(btn){btn.disabled=true;btn.textContent='ĐANG KHỞI ĐỘNG...';}
    try{
      await save(false);
      const response=await send({type:'DHL_AUTO_RUN_NOW'});
      if(!response.ok)throw new Error(response.error||'Không chạy được.');
      setStatus('Đã bắt đầu. Tool sẽ tự mở từng tab nguồn ở nền và quét lần lượt.','ok',2600);
      setTimeout(()=>refreshRuntime().catch(()=>{}),900);
    }catch(error){setStatus(error.message||String(error),'bad',3000);}
    finally{if(btn){btn.disabled=false;btn.textContent='CHẠY THỬ NGAY';}}
  }

  async function testSapo(){
    const btn=document.getElementById('sapoTestBtn');if(btn){btn.disabled=true;btn.textContent='ĐANG KIỂM TRA...';}
    try{
      const cfg=collectConfig();
      await persistPatch({...cfg,autoPushSapo:false},'');
      const response=await send({type:'DHL_SAPO_TEST',sapo:cfg.sapo});
      if(!response.ok)throw new Error(response.error||'Không kết nối được Sapo.');
      setStatus(`Sapo OK: ${response.storeName} • chi nhánh ${response.location.name}.`,'ok',2500);
      await load();
    }catch(error){setStatus(`Sapo: ${error.message||String(error)}`,'bad',3200);}
    finally{if(btn){btn.disabled=false;btn.textContent='KIỂM TRA KẾT NỐI SAPO';}}
  }

  function bindRetry(){
    document.getElementById('sapoRetryBtn')?.addEventListener('click',async()=>{
      const r=await send({type:'DHL_SAPO_RETRY_PUSH'});
      setStatus(r.ok?'Đã cho hàng đợi Sapo chạy lại.':r.error||'Không chạy lại được.',r.ok?'ok':'bad',2600);
      setTimeout(()=>refreshRuntime().catch(()=>{}),500);
    });
  }

  function bind(){
    document.getElementById('autoSaveBtn')?.addEventListener('click',()=>save(true).catch(()=>{}));
    document.getElementById('autoRunNowBtn')?.addEventListener('click',runNow);
    document.getElementById('sapoTestBtn')?.addEventListener('click',testSapo);
    bindRetry();
    bindConfigControls();
  }

  function injectStyle(){
    if(document.getElementById('autoSyncStyle'))return;
    const style=document.createElement('style');style.id='autoSyncStyle';
    style.textContent=`
      #autoSyncPanel{margin-top:12px;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#0f172a}
      .auto-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.auto-head small{display:block;margin-top:3px;color:#64748b;font-size:11px}.auto-badge{padding:4px 7px;border-radius:999px;background:#f1f5f9;color:#64748b;font-size:9px;font-weight:900;white-space:nowrap}.auto-switch{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800;white-space:nowrap}.auto-switch input{width:16px;height:16px}
      .auto-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.auto-grid label,.auto-details>label{font-size:11px;font-weight:700;color:#475569}.auto-grid input,.auto-grid select,.auto-details>label>input{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a}
      .auto-state{padding:8px;border:1px solid #e2e8f0;border-radius:8px;display:grid;gap:2px}.auto-state span{font-size:9px;font-weight:800;color:#64748b}.auto-state b{font-size:11px}.auto-state small{font-size:10px;color:#64748b}
      .auto-details{margin-top:10px;border:1px solid #e2e8f0;border-radius:9px;padding:0 9px 9px}.auto-details summary{cursor:pointer;padding:9px 0;font-size:11px;font-weight:800}.auto-profile-row{padding:8px 0;border-top:1px solid #f1f5f9}.auto-check{display:flex;gap:7px;align-items:flex-start;font-size:11px}.auto-check input{margin-top:2px}.auto-check span{display:grid;gap:1px}.auto-check small{color:#64748b}.auto-profile-row>input{width:100%;box-sizing:border-box;margin-top:6px;padding:7px;border:1px solid #cbd5e1;border-radius:7px;font-size:11px}
      .auto-inline{display:flex!important;align-items:center;gap:6px;margin-top:8px;font-size:11px!important}.auto-inline input{width:auto!important;margin:0!important}.auto-actions{display:flex;gap:8px;margin-top:10px}.auto-actions button{flex:1;min-height:40px}.auto-enable-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:10px;border:1px solid #bfdbfe;border-radius:9px;background:#eff6ff}.auto-enable-row>div{display:grid;gap:2px}.auto-enable-row b{font-size:11px}.auto-enable-row small{font-size:9px;color:#64748b}.auto-status{margin-top:8px;padding:8px;border-radius:8px;background:#f8fafc;font-size:11px;color:#475569}.auto-status.ok{background:#f0fdf4;color:#166534}.auto-status.bad{background:#fef2f2;color:#b91c1c}
      .sapo-box{border-color:#bfdbfe;background:#f8fbff}.auto-note{display:block;color:#64748b;font-size:10px;line-height:1.4;margin-bottom:8px}.auto-full{width:100%;margin-top:8px}.auto-sapo-state,.auto-push-state{margin-top:7px;padding:7px;border-radius:7px;background:#fff;border:1px solid #e2e8f0;font-size:10px}.auto-sapo-state.ok{color:#166534;border-color:#bbf7d0}.auto-danger{font-weight:800!important;color:#991b1b!important}
      @media(max-width:390px){.auto-grid{grid-template-columns:1fr}.auto-enable-row{align-items:flex-start;flex-direction:column}.auto-switch{align-self:flex-end}}
    `;document.head.appendChild(style);
  }

  function mount(){
    if(document.getElementById('autoSyncPanel'))return true;
    const host=document.getElementById('savedProfilesMode');if(!host)return false;
    const panel=document.createElement('section');panel.id='autoSyncPanel';
    const history=document.getElementById('stockHistoryPanel');
    if(history&&history.parentElement===host)history.insertAdjacentElement('beforebegin',panel);else host.appendChild(panel);
    return true;
  }

  function install(){
    injectStyle();
    const ready=()=>{if(!mount())return false;load().catch(error=>{const p=document.getElementById('autoSyncPanel');if(p)p.textContent=`Lỗi tự động: ${error.message||String(error)}`;});return true;};
    if(!ready()){
      const obs=new MutationObserver(()=>{if(ready())obs.disconnect();});obs.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>obs.disconnect(),15000);
    }
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area!=='local')return;
      if(changes[PROFILE_KEY]){setTimeout(()=>load().catch(()=>{}),120);return;}
      if(changes[CONFIG_KEY]&&Date.now()>ignoreConfigReloadUntil){setTimeout(()=>load().catch(()=>{}),120);return;}
      if(changes[STATUS_KEY])setTimeout(()=>refreshRuntime().catch(()=>{}),80);
    });
    setInterval(()=>{if(document.getElementById('autoSyncPanel'))refreshRuntime().catch(()=>{});},10000);
  }

  install();
})();
