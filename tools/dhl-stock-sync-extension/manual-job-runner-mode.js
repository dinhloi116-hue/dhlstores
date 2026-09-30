(() => {
  'use strict';

  const JOB_KEY='dhlManualScanJobV2';
  const PROFILE_KEY='dhlSavedStockProfilesV1';
  const UI_KEY='dhlManualScanUiV2';

  let sourceTabs=[];
  let selectedTabId=0;
  let discovery=null;

  const $=(id)=>document.getElementById(id);
  const text=(v)=>String(v==null?'':v).trim();
  const esc=(v)=>text(v).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

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

  function sourceKey(value){
    try{
      const u=new URL(String(value||''));
      return `${u.hostname}${u.pathname.replace(/\/+$/,'')||'/'}`.toLowerCase();
    }catch{return text(value).toLowerCase();}
  }

  function isSourceCategoryUrl(value){
    try{
      const u=new URL(String(value||''));
      if(u.protocol!=='https:'||u.hostname!=='si.aobongda.net')return false;
      return !/-p\d+(?:\.html)?$/i.test(u.pathname);
    }catch{return false;}
  }

  function currentScope(){
    return text($('manualJobScope')&&$('manualJobScope').value)||'all';
  }

  function selectedTab(){
    return sourceTabs.find(tab=>Number(tab.tabId)===Number(selectedTabId))||null;
  }

  function setStatus(message,kind=''){
    const el=$('manualJobStatus');
    if(!el)return;
    el.textContent=text(message);
    el.className=`manual-job-status ${kind}`.trim();
  }

  function renderCurrentSource(){
    const tab=selectedTab();
    const name=$('currentSourceName');
    const meta=$('currentSourceMeta');
    const badge=$('currentSourceBadge');
    const start=$('manualStartBtn');

    if(!tab){
      if(name)name.textContent='Chưa có tab nguồn';
      if(meta)meta.textContent='Mở một danh mục trên si.aobongda.net.';
      if(badge){badge.textContent='CHƯA CHỌN';badge.className='current-source-badge empty';}
      if(start){start.disabled=true;start.textContent='ĐỒNG BỘ TAB NÀY';}
      return;
    }

    if(name)name.textContent=text(tab.title)||text(tab.profileName)||'Danh mục nguồn';
    if(meta)meta.textContent=text(tab.url);
    if(badge){
      badge.textContent=tab.hasProfile?'ĐÃ CÓ HỒ SƠ':'MỚI • TỰ TẠO HỒ SƠ';
      badge.className=`current-source-badge ${tab.hasProfile?'saved':'new'}`;
    }
    if(start&&!start.dataset.busy){
      start.disabled=false;
      start.textContent='ĐỒNG BỘ TAB NÀY';
    }
  }

  function renderAdvancedTabSelect(){
    const select=$('manualSourceSelect');
    if(!select)return;
    const old=Number(selectedTabId)||0;
    select.innerHTML=sourceTabs.length
      ?sourceTabs.map(tab=>`<option value="${Number(tab.tabId)}">${esc(tab.title||tab.profileName||tab.url)} ${tab.hasProfile?'• đã lưu':'• MỚI'}</option>`).join('')
      :'<option value="">Không có tab nguồn</option>';
    if(old&&sourceTabs.some(tab=>Number(tab.tabId)===old))select.value=String(old);
  }

  async function loadTabs({preferActive=true,preferTabId=0}={}){
    try{
      const [tabs,stored]=await Promise.all([
        chrome.tabs.query({}),
        chrome.storage.local.get(PROFILE_KEY)
      ]);
      const profiles=Array.isArray(stored[PROFILE_KEY])?stored[PROFILE_KEY]:[];
      sourceTabs=(Array.isArray(tabs)?tabs:[])
        .filter(tab=>tab&&tab.id&&isSourceCategoryUrl(tab.url))
        .map(tab=>{
          const key=sourceKey(tab.url);
          const profile=profiles.find(p=>text(p&&p.sourceKey)===key||sourceKey(p&&p.lastSourceUrl)===key)||null;
          return{
            tabId:Number(tab.id),
            windowId:Number(tab.windowId),
            active:Boolean(tab.active),
            title:text(tab.title),
            url:text(tab.url),
            sourceKey:key,
            profileId:profile?text(profile.id):'',
            profileName:profile?text(profile.name):'',
            hasProfile:Boolean(profile)
          };
        });

      let next=0;
      if(preferTabId&&sourceTabs.some(tab=>Number(tab.tabId)===Number(preferTabId)))next=Number(preferTabId);
      else if(preferActive){
        const active=sourceTabs.find(tab=>tab.active);
        if(active)next=Number(active.tabId);
      }
      if(!next&&selectedTabId&&sourceTabs.some(tab=>Number(tab.tabId)===Number(selectedTabId)))next=Number(selectedTabId);
      if(!next&&sourceTabs[0])next=Number(sourceTabs[0].tabId);

      if(Number(next)!==Number(selectedTabId)){
        selectedTabId=next;
        discovery=null;
        clearProductSelection();
      }

      renderCurrentSource();
      renderAdvancedTabSelect();
      return sourceTabs;
    }catch(error){
      sourceTabs=[];selectedTabId=0;discovery=null;
      renderCurrentSource();renderAdvancedTabSelect();
      setStatus(error.message||String(error),'bad');
      return[];
    }
  }

  function selectedIds(){
    return[...document.querySelectorAll('#manualProductList input[data-product-id]:checked')]
      .map(el=>Number(el.dataset.productId)).filter(Boolean);
  }

  function clearProductSelection(){
    const list=$('manualProductList');
    if(list)list.innerHTML='<small>Chọn chế độ quét một phần để tải danh sách sản phẩm.</small>';
    const count=$('manualSelectionCount');
    if(count)count.textContent='0/0 sản phẩm đã chọn';
  }

  function updateSelectionCount(){
    const total=discovery&&Array.isArray(discovery.items)?discovery.items.length:0;
    const count=selectedIds().length;
    const el=$('manualSelectionCount');
    if(el)el.textContent=`${count}/${total} sản phẩm đã chọn`;
  }

  function renderProducts(){
    const list=$('manualProductList');
    if(!list)return;
    const items=discovery&&Array.isArray(discovery.items)?discovery.items:[];
    if(!items.length){
      list.innerHTML='<small>Không tìm thấy sản phẩm trong tab này.</small>';
      updateSelectionCount();
      return;
    }

    const previous=new Set(selectedIds());
    list.innerHTML=items.map(item=>`
      <label class="manual-product-row">
        <input type="checkbox" data-product-id="${Number(item.id)||0}" ${previous.has(Number(item.id))?'checked':''}>
        <span><b>${esc(item.title||`SP ${item.id}`)}</b><small>#${Number(item.id)||0}</small></span>
      </label>`).join('');

    for(const input of list.querySelectorAll('input[data-product-id]')){
      input.addEventListener('change',()=>{
        if(currentScope()==='one'&&input.checked){
          for(const other of list.querySelectorAll('input[data-product-id]'))if(other!==input)other.checked=false;
        }
        updateSelectionCount();
      });
    }
    updateSelectionCount();
  }

  async function loadProductsForPartialScan(){
    if(currentScope()==='all')return;
    const tab=selectedTab();
    if(!tab){setStatus('Chưa có tab nguồn để đọc sản phẩm.','bad');return;}
    const box=$('manualPicker');
    if(box)box.dataset.loading='1';
    try{
      setStatus('Đang đọc danh sách sản phẩm của tab đã chọn...');
      const response=await send({type:'DHL_MANUAL_JOB_DISCOVER_TAB',tabId:tab.tabId});
      if(!response.ok)throw new Error(response.error||'Không đọc được sản phẩm.');
      discovery=response.result||null;
      renderProducts();
      setStatus(`Đã tải ${Array.isArray(discovery&&discovery.items)?discovery.items.length:0} sản phẩm.`,'ok');
    }catch(error){
      setStatus(error.message||String(error),'bad');
    }finally{
      if(box)delete box.dataset.loading;
    }
  }

  async function syncScopeUi(){
    const scope=currentScope();
    const picker=$('manualPicker');
    if(picker)picker.hidden=scope==='all';
    await chrome.storage.local.set({[UI_KEY]:{scope}}).catch(()=>{});
    if(scope!=='all')await loadProductsForPartialScan();
  }

  async function startJob(){
    const btn=$('manualStartBtn');
    if(btn){btn.dataset.busy='1';btn.disabled=true;btn.textContent='ĐANG KHỞI ĐỘNG...';}
    try{
      await loadTabs({preferActive:false});
      const tab=selectedTab();
      if(!tab)throw new Error('Chưa có tab danh mục nguồn để đồng bộ.');

      const scope=currentScope();
      let ids=[];
      if(scope!=='all'){
        if(!discovery||sourceKey(discovery.pageUrl)!==sourceKey(tab.url))await loadProductsForPartialScan();
        ids=selectedIds();
        if(!ids.length)throw new Error(scope==='one'?'Hãy chọn 1 sản phẩm.':'Hãy chọn ít nhất 1 sản phẩm.');
      }

      const response=await send({
        type:'DHL_MANUAL_JOB_START',
        sourceUrl:tab.url,
        sourceTabId:tab.tabId,
        pageTitle:tab.title,
        productCount:discovery&&Array.isArray(discovery.items)?discovery.items.length:0,
        scope,
        selectedIds:ids
      });
      if(!response.ok)throw new Error(response.error||'Không khởi động được lượt quét.');
      setStatus(`Đã chạy nền: ${text(tab.title)||text(tab.profileName)||'tab nguồn'}.`,'ok');
      await refreshJob();
    }catch(error){
      setStatus(error.message||String(error),'bad');
    }finally{
      if(btn){delete btn.dataset.busy;renderCurrentSource();}
    }
  }

  async function stopAfterCurrent(){
    try{
      const response=await send({type:'DHL_MANUAL_JOB_STOP'});
      if(!response.ok)throw new Error(response.error||'Không gửi được lệnh dừng.');
      setStatus('Sẽ dừng sau sản phẩm hiện tại. Phần đã quét vẫn được lưu.','ok');
    }catch(error){setStatus(error.message||String(error),'bad');}
  }

  async function resumeJob(){
    try{
      const response=await send({type:'DHL_MANUAL_JOB_RESUME'});
      if(!response.ok)throw new Error(response.error||'Không tiếp tục được lượt quét.');
      setStatus('Đã tiếp tục từ checkpoint.','ok');
    }catch(error){setStatus(error.message||String(error),'bad');}
  }

  function scopeLabel(scope){
    if(scope==='one')return'1 SP';
    if(scope==='selected')return'SP đã chọn';
    return'Toàn trang';
  }

  function renderJob(job){
    const progress=$('manualJobProgress');
    const start=$('manualStartBtn');
    const stop=$('manualStopBtn');
    const resume=$('manualResumeBtn');
    const running=Boolean(job&&job.running);
    const stopping=Boolean(job&&job.status==='stopping');
    const paused=Boolean(job&&job.status==='paused');

    if(start){
      if(running||stopping){start.disabled=true;start.textContent='ĐANG ĐỒNG BỘ...';}
      else{start.disabled=!selectedTab();start.textContent='ĐỒNG BỘ TAB NÀY';}
    }
    if(stop)stop.hidden=!(running||stopping);
    if(resume)resume.hidden=!paused;

    if(!job){
      if(progress)progress.textContent='Sẵn sàng.';
      return;
    }

    const total=Number(job.total||0),index=Number(job.index||0);
    const errors=Array.isArray(job.errors)?job.errors.length:0;
    const parts=[`${scopeLabel(job.scope)} • ${index}/${total||'?'}`];
    if(job.currentProduct&&(running||stopping))parts.push(job.currentProduct);
    if(Number(job.lastProductMs||0)>0&&!running)parts.push(`${(Number(job.lastProductMs)/1000).toFixed(1)}s/SP`);
    if(errors)parts.push(`${errors} lỗi`);
    if(Number(job.rowCount||0))parts.push(`${Number(job.rowCount)} dòng`);
    if(progress)progress.textContent=parts.join(' • ');

    if(job.status==='done')setStatus(`ĐÃ XONG ${job.profileName}: ${index}/${total} sản phẩm.`,'ok');
    else if(job.status==='paused')setStatus(`ĐÃ DỪNG tại ${index}/${total}. Có thể tiếp tục sau.`,'ok');
    else if(job.status==='error')setStatus(`LỖI: ${text(job.lastError)}`,'bad');
    else if(job.status==='stopping')setStatus(`Đang hoàn tất sản phẩm hiện tại rồi dừng • ${index}/${total}.`);
    else if(running)setStatus(`Đang quét ${index}/${total}${job.currentProduct?` • ${job.currentProduct}`:''} • mở popup để đọc đủ màu / size / tồn.`);
  }

  async function refreshJob(){
    try{
      const stored=await chrome.storage.local.get(JOB_KEY);
      renderJob(stored[JOB_KEY]&&typeof stored[JOB_KEY]==='object'?stored[JOB_KEY]:null);
    }catch{}
  }

  function bind(){
    $('manualStartBtn')?.addEventListener('click',startJob);
    $('manualStopBtn')?.addEventListener('click',stopAfterCurrent);
    $('manualResumeBtn')?.addEventListener('click',resumeJob);

    $('manualSourceSelect')?.addEventListener('change',async()=>{
      selectedTabId=Number($('manualSourceSelect').value)||0;
      discovery=null;clearProductSelection();renderCurrentSource();
      if(currentScope()!=='all')await loadProductsForPartialScan();
    });

    $('manualJobScope')?.addEventListener('change',()=>syncScopeUi());

    $('manualSelectAllBtn')?.addEventListener('click',()=>{
      const inputs=[...document.querySelectorAll('#manualProductList input[data-product-id]')];
      if(currentScope()==='one')inputs.forEach((input,index)=>{input.checked=index===0;});
      else inputs.forEach(input=>{input.checked=true;});
      updateSelectionCount();
    });
    $('manualSelectNoneBtn')?.addEventListener('click',()=>{
      for(const input of document.querySelectorAll('#manualProductList input[data-product-id]'))input.checked=false;
      updateSelectionCount();
    });

    chrome.tabs.onActivated.addListener(async({tabId})=>{
      try{
        const tab=await chrome.tabs.get(tabId);
        if(isSourceCategoryUrl(tab&&tab.url))await loadTabs({preferActive:false,preferTabId:tabId});
      }catch{}
    });
    chrome.tabs.onUpdated.addListener((tabId,changeInfo,tab)=>{
      if((changeInfo.url||changeInfo.status==='complete')&&tab&&tab.active&&isSourceCategoryUrl(tab.url)){
        loadTabs({preferActive:false,preferTabId:tabId}).catch(()=>{});
      }
    });
    chrome.tabs.onRemoved.addListener(tabId=>{
      if(Number(tabId)===Number(selectedTabId))selectedTabId=0;
      loadTabs({preferActive:true}).catch(()=>{});
    });
  }

  function injectStyle(){
    if($('manualJobStyle'))return;
    const style=document.createElement('style');
    style.id='manualJobStyle';
    style.textContent=`
      #manualJobRunner{margin-top:8px;color:#0f172a}
      .current-source-card{padding:10px;border:1px solid #bfdbfe;border-radius:10px;background:#fff}
      .current-source-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
      #currentSourceName{display:block;font-size:12px;line-height:1.3}
      #currentSourceMeta{display:block;margin-top:4px;color:#64748b;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .current-source-badge{display:inline-block;flex:0 0 auto;padding:3px 6px;border-radius:999px;font-size:8px;font-weight:900}
      .current-source-badge.saved{background:#dcfce7;color:#166534}.current-source-badge.new{background:#fef3c7;color:#92400e}.current-source-badge.empty{background:#f1f5f9;color:#64748b}
      #manualStartBtn{width:100%;min-height:50px;margin-top:9px;font-size:13px;font-weight:900}
      .manual-secondary-actions{display:flex;gap:7px;margin-top:7px}.manual-secondary-actions button{flex:1;min-height:34px;font-size:9px}
      #manualAdvanced{margin-top:9px;border-top:1px solid #dbeafe;padding-top:7px}
      #manualAdvanced>summary{cursor:pointer;font-size:10px;font-weight:800;color:#475569}
      #manualAdvanced select{width:100%;min-height:38px;margin-top:7px;padding:7px;border:1px solid #cbd5e1;border-radius:8px;background:#fff}
      #manualPicker{margin-top:8px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;background:#fff}
      #manualProductList{max-height:230px;overflow:auto;margin-top:7px;border-top:1px solid #e2e8f0}
      .manual-product-row{display:flex;gap:8px;align-items:flex-start;padding:7px 2px;border-bottom:1px solid #f1f5f9;cursor:pointer}
      .manual-product-row input{margin-top:2px}.manual-product-row span{min-width:0}.manual-product-row b{display:block;font-size:11px;line-height:1.25}.manual-product-row small{display:block;color:#94a3b8;font-size:9px;margin-top:2px}
      .manual-picker-actions{display:flex;gap:6px}.manual-picker-actions button{flex:1;min-height:32px;font-size:9px}
      .manual-job-status{display:block;margin-top:8px;padding:7px 8px;border-radius:7px;background:#f8fafc;color:#475569;font-size:10px;line-height:1.4}
      .manual-job-status.ok{background:#f0fdf4;color:#166534}.manual-job-status.bad{background:#fef2f2;color:#991b1b}
      #manualJobProgress{display:block;margin-top:4px;color:#64748b;font-size:9px}
    `;
    document.head.appendChild(style);
  }

  async function mount(){
    if($('manualJobRunner'))return true;
    const host=$('savedProfilesMode');
    if(!host)return false;
    injectStyle();

    const panel=document.createElement('div');
    panel.id='manualJobRunner';
    panel.innerHTML=`
      <div class="current-source-card">
        <div class="current-source-top">
          <div style="min-width:0;flex:1">
            <b id="currentSourceName">Đang nhận tab nguồn...</b>
            <small id="currentSourceMeta"></small>
          </div>
          <span id="currentSourceBadge" class="current-source-badge empty">...</span>
        </div>

        <button id="manualStartBtn" type="button" class="primary" disabled>ĐỒNG BỘ TAB NÀY</button>

        <div class="manual-secondary-actions">
          <button id="manualStopBtn" type="button" class="report" hidden>DỪNG SAU SP NÀY</button>
          <button id="manualResumeBtn" type="button" class="secondary" hidden>TIẾP TỤC</button>
        </div>

        <details id="manualAdvanced">
          <summary>TÙY CHỌN NÂNG CAO</summary>
          <select id="manualSourceSelect"></select>
          <select id="manualJobScope">
            <option value="all">Quét toàn bộ danh mục</option>
            <option value="selected">Chỉ quét sản phẩm đã chọn</option>
            <option value="one">Chỉ quét 1 sản phẩm</option>
          </select>
          <div id="manualPicker" hidden>
            <div class="manual-picker-actions">
              <button id="manualSelectAllBtn" type="button" class="secondary">CHỌN TẤT CẢ</button>
              <button id="manualSelectNoneBtn" type="button" class="secondary">BỎ CHỌN</button>
            </div>
            <small id="manualSelectionCount" style="display:block;margin-top:6px;color:#64748b">0/0 sản phẩm đã chọn</small>
            <div id="manualProductList"><small>Chọn chế độ quét một phần để tải danh sách sản phẩm.</small></div>
          </div>
        </details>
      </div>
      <small id="manualJobStatus" class="manual-job-status">Sẵn sàng.</small>
      <small id="manualJobProgress">—</small>`;

    const history=$('profileHistory');
    if(history)history.insertAdjacentElement('beforebegin',panel);
    else host.appendChild(panel);

    bind();

    const stored=await chrome.storage.local.get(UI_KEY);
    const scope=stored[UI_KEY]&&['all','selected','one'].includes(stored[UI_KEY].scope)?stored[UI_KEY].scope:'all';
    $('manualJobScope').value=scope;

    await loadTabs({preferActive:true});
    if(scope!=='all')await syncScopeUi();
    await refreshJob();

    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&changes[JOB_KEY])renderJob(changes[JOB_KEY].newValue||null);
      if(area==='local'&&changes[PROFILE_KEY])loadTabs({preferActive:false}).catch(()=>{});
    });

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){loadTabs({preferActive:true}).catch(()=>{});refreshJob().catch(()=>{});}
    },{passive:true});

    return true;
  }

  mount().catch(()=>{});
})();