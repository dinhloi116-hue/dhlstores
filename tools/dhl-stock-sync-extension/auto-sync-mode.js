(() => {
  'use strict';

  const PROFILE_KEY='dhlSavedStockProfilesV1';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const STATUS_KEY='dhlAutoSyncStatusV1';
  let state={config:null,status:{},profiles:[],pushQueue:null};

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
    if(push.status==='error')return `Lỗi ghi Sapo: ${text(push.error)}`;
    return 'Chưa có lượt tự ghi Sapo.';
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
        <div><b>TỰ ĐỘNG ĐỒNG BỘ</b><small>Chrome mở là tool tự quét theo lịch, không cần mở panel.</small></div>
        <label class="auto-switch"><input id="autoEnabled" type="checkbox" ${cfg.enabled?'checked':''}><span>${cfg.enabled?'ĐANG BẬT':'ĐANG TẮT'}</span></label>
      </div>

      <div class="auto-grid">
        <label><span>Chu kỳ</span><select id="autoInterval"><option value="1" ${Number(cfg.intervalHours)===1?'selected':''}>Mỗi 1 giờ</option><option value="2" ${Number(cfg.intervalHours)===2?'selected':''}>Mỗi 2 giờ</option><option value="3" ${Number(cfg.intervalHours)===3?'selected':''}>Mỗi 3 giờ</option></select></label>
        <div class="auto-state"><span>Lần gần nhất</span><b>${fmt(st.lastFinishedAt||st.lastRunAt)}</b><small>${st.running?`Đang chạy ${esc(st.progress||'')}`:`Lần tới: ${fmt(st.nextRunAt)}`}</small></div>
      </div>

      <details class="auto-details" open>
        <summary>Chọn hồ sơ / tab nguồn cần tự quét</summary>
        <div id="autoProfiles">${profileRows()}</div>
        <label class="auto-inline"><input id="autoCloseTabs" type="checkbox" ${cfg.closeTabsAfterScan!==false?'checked':''}> Tự đóng tab nguồn sau khi quét</label>
      </details>

      <div class="auto-actions">
        <button id="autoSaveBtn" type="button" class="primary">LƯU LỊCH TỰ ĐỘNG</button>
        <button id="autoRunNowBtn" type="button" class="secondary">CHẠY THỬ NGAY</button>
      </div>
      <div id="autoStatusLine" class="auto-status ${st.lastError?'bad':''}">${st.lastError?`Lỗi gần nhất: ${esc(st.lastError)}`:(st.errors&&st.errors.length?`${st.errors.length} hồ sơ lỗi ở lượt gần nhất`:`${(st.results||[]).length} hồ sơ quét thành công ở lượt gần nhất`)}</div>

      <details class="auto-details sapo-box">
        <summary>Tự ghi tồn kho lên Sapo ${verified?'✓':''}</summary>
        <small class="auto-note">Dùng Ứng dụng riêng Sapo. API Key/Secret chỉ lưu trong Chrome trên máy này, không đưa lên GitHub.</small>
        <label><span>Shop Sapo</span><input id="sapoHost" type="text" value="${esc(sapo.storeHost||'')}" placeholder="ten-shop.mysapo.net" /></label>
        <div class="auto-grid">
          <label><span>API Key</span><input id="sapoKey" type="password" placeholder="${sapo.apiKey?'Đã lưu — để trống nếu giữ nguyên':'API Key'}" autocomplete="off" /></label>
          <label><span>API Secret</span><input id="sapoSecret" type="password" placeholder="${sapo.apiSecret?'Đã lưu — để trống nếu giữ nguyên':'API Secret'}" autocomplete="off" /></label>
        </div>
        <button id="sapoTestBtn" type="button" class="secondary auto-full">KIỂM TRA KẾT NỐI SAPO</button>
        <div class="auto-sapo-state ${verified?'ok':''}">${verified?`Đã xác minh: ${esc(sapo.locationName||'chi nhánh')} (#${Number(sapo.locationId)})`:'Chưa xác minh kết nối/chi nhánh.'}</div>
        <label class="auto-inline auto-danger"><input id="autoPushSapo" type="checkbox" ${cfg.autoPushSapo?'checked':''} ${verified?'':'disabled'}> Sau mỗi lượt quét thành công, tự ghi tồn thật lên Sapo</label>
        <small class="auto-note">Nếu bất kỳ hồ sơ nào quét lỗi, lượt đó sẽ KHÔNG tự ghi Sapo. Ghi theo hàng đợi để tránh quá giới hạn API.</small>
        <div class="auto-push-state">${esc(pushText())}</div>
        ${(state.status&&state.status.push&&state.status.push.status==='error')?'<button id="sapoRetryBtn" type="button" class="secondary auto-full">THỬ LẠI HÀNG ĐỢI SAPO</button>':''}
      </details>`;
    bind();
  }

  function collectConfig(){
    const selected=[];const profileUrls={};
    for(const cb of document.querySelectorAll('[data-auto-profile]')){
      const id=cb.dataset.autoProfile;
      const url=text(document.querySelector(`[data-auto-url="${CSS.escape(id)}"]`)?.value);
      if(cb.checked)selected.push(id);
      if(url)profileUrls[id]=url;
    }
    const oldSapo=(state.config&&state.config.sapo)||{};
    const typedKey=text(document.getElementById('sapoKey')?.value);
    const typedSecret=text(document.getElementById('sapoSecret')?.value);
    return{
      enabled:Boolean(document.getElementById('autoEnabled')?.checked),
      intervalHours:Number(document.getElementById('autoInterval')?.value||2),
      selectedProfileIds:selected,
      profileUrls,
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

  async function save(showMessage=true){
    const btn=document.getElementById('autoSaveBtn');if(btn)btn.disabled=true;
    try{
      const response=await send({type:'DHL_AUTO_SAVE_CONFIG',config:collectConfig()});
      if(!response.ok)throw new Error(response.error||'Không lưu được cấu hình.');
      state.config=response.config;
      if(showMessage)setStatus('Đã lưu lịch tự động.','ok');
      setTimeout(()=>load().catch(()=>{}),250);
      return response.config;
    }catch(error){setStatus(error.message||String(error),'bad');throw error;}
    finally{if(btn)btn.disabled=false;}
  }

  function setStatus(message,kind=''){
    const el=document.getElementById('autoStatusLine');if(!el)return;
    el.textContent=message;el.className=`auto-status ${kind}`;
  }

  async function runNow(){
    const btn=document.getElementById('autoRunNowBtn');if(btn){btn.disabled=true;btn.textContent='ĐANG KHỞI ĐỘNG...';}
    try{
      await save(false);
      const response=await send({type:'DHL_AUTO_RUN_NOW'});
      if(!response.ok)throw new Error(response.error||'Không chạy được.');
      setStatus('Đã bắt đầu. Tool sẽ tự mở từng tab nguồn ở nền và quét lần lượt.','ok');
      setTimeout(()=>load().catch(()=>{}),900);
    }catch(error){setStatus(error.message||String(error),'bad');}
    finally{if(btn){btn.disabled=false;btn.textContent='CHẠY THỬ NGAY';}}
  }

  async function testSapo(){
    const btn=document.getElementById('sapoTestBtn');if(btn){btn.disabled=true;btn.textContent='ĐANG KIỂM TRA...';}
    try{
      const cfg=collectConfig();
      await send({type:'DHL_AUTO_SAVE_CONFIG',config:{...cfg,autoPushSapo:false}});
      const response=await send({type:'DHL_SAPO_TEST',sapo:cfg.sapo});
      if(!response.ok)throw new Error(response.error||'Không kết nối được Sapo.');
      setStatus(`Sapo OK: ${response.storeName} • chi nhánh ${response.location.name}.`,'ok');
      await load();
    }catch(error){setStatus(`Sapo: ${error.message||String(error)}`,'bad');}
    finally{if(btn){btn.disabled=false;btn.textContent='KIỂM TRA KẾT NỐI SAPO';}}
  }

  function bind(){
    document.getElementById('autoSaveBtn')?.addEventListener('click',()=>save(true).catch(()=>{}));
    document.getElementById('autoRunNowBtn')?.addEventListener('click',runNow);
    document.getElementById('sapoTestBtn')?.addEventListener('click',testSapo);
    document.getElementById('sapoRetryBtn')?.addEventListener('click',async()=>{const r=await send({type:'DHL_SAPO_RETRY_PUSH'});setStatus(r.ok?'Đã cho hàng đợi Sapo chạy lại.':r.error||'Không chạy lại được.',r.ok?'ok':'bad');});
  }

  function injectStyle(){
    if(document.getElementById('autoSyncStyle'))return;
    const style=document.createElement('style');style.id='autoSyncStyle';
    style.textContent=`
      #autoSyncPanel{margin-top:12px;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#0f172a}
      .auto-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.auto-head small{display:block;margin-top:3px;color:#64748b;font-size:11px}.auto-switch{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800;white-space:nowrap}.auto-switch input{width:16px;height:16px}
      .auto-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.auto-grid label,.auto-details>label{font-size:11px;font-weight:700;color:#475569}.auto-grid input,.auto-grid select,.auto-details>label>input{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a}
      .auto-state{padding:8px;border:1px solid #e2e8f0;border-radius:8px;display:grid;gap:2px}.auto-state span{font-size:9px;font-weight:800;color:#64748b}.auto-state b{font-size:11px}.auto-state small{font-size:10px;color:#64748b}
      .auto-details{margin-top:10px;border:1px solid #e2e8f0;border-radius:9px;padding:0 9px 9px}.auto-details summary{cursor:pointer;padding:9px 0;font-size:11px;font-weight:800}.auto-profile-row{padding:8px 0;border-top:1px solid #f1f5f9}.auto-check{display:flex;gap:7px;align-items:flex-start;font-size:11px}.auto-check input{margin-top:2px}.auto-check span{display:grid;gap:1px}.auto-check small{color:#64748b}.auto-profile-row>input{width:100%;box-sizing:border-box;margin-top:6px;padding:7px;border:1px solid #cbd5e1;border-radius:7px;font-size:11px}
      .auto-inline{display:flex!important;align-items:center;gap:6px;margin-top:8px;font-size:11px!important}.auto-inline input{width:auto!important;margin:0!important}.auto-actions{display:flex;gap:8px;margin-top:10px}.auto-actions button{flex:1;min-height:40px}.auto-status{margin-top:8px;padding:8px;border-radius:8px;background:#f8fafc;font-size:11px;color:#475569}.auto-status.ok{background:#f0fdf4;color:#166534}.auto-status.bad{background:#fef2f2;color:#b91c1c}
      .sapo-box{border-color:#bfdbfe;background:#f8fbff}.auto-note{display:block;color:#64748b;font-size:10px;line-height:1.4;margin-bottom:8px}.auto-full{width:100%;margin-top:8px}.auto-sapo-state,.auto-push-state{margin-top:7px;padding:7px;border-radius:7px;background:#fff;border:1px solid #e2e8f0;font-size:10px}.auto-sapo-state.ok{color:#166534;border-color:#bbf7d0}.auto-danger{font-weight:800!important;color:#991b1b!important}
      @media(max-width:390px){.auto-grid{grid-template-columns:1fr}}
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
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes[CONFIG_KEY]||changes[STATUS_KEY]||changes[PROFILE_KEY]))setTimeout(()=>load().catch(()=>{}),120);});
    setInterval(()=>{if(document.getElementById('autoSyncPanel'))load().catch(()=>{});},15000);
  }

  install();
})();
