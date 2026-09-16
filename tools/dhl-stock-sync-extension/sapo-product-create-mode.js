(() => {
  'use strict';

  const productCreate=globalThis.DHLProductCreateCore;
  if(!productCreate||typeof productCreate.makeApiProducts!=='function')return;

  const RESULTS_KEY='dhlCatalogResults';
  const QUEUE_KEY='dhlSapoProductCreateQueueV1';
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

  function stateEl(){return document.getElementById('catalogSapoCreateState');}
  function setState(message,kind=''){
    const el=stateEl();if(!el)return;
    el.textContent=message;
    el.className=`catalog-sapo-create-state ${kind}`.trim();
  }

  function queueSummary(queue){
    if(!queue)return'Chưa có lượt đăng sản phẩm trực tiếp.';
    const total=Number(queue.total||0),done=Number(queue.index||0),success=Number(queue.success||0);
    if(queue.status==='running')return `ĐANG ĐĂNG SAPO: ${done}/${total} sản phẩm • hoàn tất ${success}.`;
    if(queue.status==='paused'){
      const item=Array.isArray(queue.items)?queue.items[queue.index]:null;
      return `TẠM DỪNG ở ${done}/${total}${item&&item.name?` • ${item.name}`:''}${item&&item.error?` • ${item.error}`:''}`;
    }
    if(queue.status==='done')return `ĐÃ XONG: ${success}/${total} sản phẩm • tạo mới ${Number(queue.created||0)} • dùng lại sản phẩm trùng alias/SKU ${Number(queue.adopted||0)}.`;
    return `Trạng thái: ${text(queue.status)||'—'} • ${done}/${total}.`;
  }

  function progressInfo(queue){
    if(!queue)return null;
    const items=Array.isArray(queue.items)?queue.items:[];
    const total=Math.max(0,Number(queue.total||items.length||0));
    const done=Math.min(total,Math.max(0,Number(queue.index||0)));
    const item=items[done]||null;
    if(queue.status==='done')return{percent:100,phase:'Hoàn tất',item:null,done,total,variantDone:0,variantTotal:0,currentVariant:null};

    let fraction=0;
    let phase='Đang chuẩn bị hàng đợi';
    let variantDone=0,variantTotal=0,currentVariant=null;
    if(item){
      const variants=Array.isArray(item.variants)?item.variants:[];
      variantTotal=variants.length;
      variantDone=Math.min(variantTotal,Math.max(0,Number(item.variantIndex||0)));
      currentVariant=variants[variantDone]||null;
      if(!Number(item.productId)){
        fraction=0.08;
        phase='Đang kiểm tra trùng và tạo sản phẩm trên Sapo';
      }else if(item.imagesDone!==true){
        fraction=0.28;
        phase='Đang đưa ảnh lên Sapo từ link nguồn';
      }else if(variantTotal&&variantDone<variantTotal){
        fraction=0.40+0.58*(variantDone/variantTotal);
        phase=`Đang ghi tồn kho biến thể ${variantDone+1}/${variantTotal}`;
      }else{
        fraction=0.98;
        phase='Đang hoàn tất sản phẩm';
      }
    }
    const percent=total?Math.max(0,Math.min(99,Math.round(((done+fraction)/total)*100))):0;
    if(queue.status==='paused')phase='Đã tạm dừng do lỗi';
    return{percent,phase,item,done,total,variantDone,variantTotal,currentVariant};
  }

  function renderProgress(queue){
    const box=document.getElementById('catalogSapoProgress');
    if(!box)return;
    if(!queue){box.hidden=true;box.innerHTML='';return;}
    const info=progressInfo(queue);
    if(!info){box.hidden=true;return;}
    const running=queue.status==='running';
    const paused=queue.status==='paused';
    const done=queue.status==='done';
    const item=info.item;
    const variant=info.currentVariant;
    const productLine=item?`${info.done+1}/${info.total} • ${esc(item.name||'Sản phẩm')}`:`${info.done}/${info.total} sản phẩm`;
    const variantLine=variant
      ? `Size ${esc(variant.size||'—')} • SKU ${esc(variant.sku||'—')} • tồn ${Number(variant.stock||0)}`
      : (info.variantTotal?`${info.variantDone}/${info.variantTotal} biến thể đã ghi tồn`:'' );
    const errorLine=paused&&item&&item.error?`<div class="catalog-progress-error">${esc(item.error)}</div>`:'';
    box.hidden=false;
    box.className=`catalog-sapo-progress ${running?'running':paused?'paused':done?'done':''}`;
    box.innerHTML=`
      <div class="catalog-progress-head">
        <span class="catalog-progress-live">${running?'<i class="catalog-progress-spinner"></i><b>ĐANG HOẠT ĐỘNG</b>':paused?'<b>TẠM DỪNG</b>':'<b>HOÀN TẤT</b>'}</span>
        <strong>${info.percent}%</strong>
      </div>
      <div class="catalog-progress-track"><div class="catalog-progress-fill" style="width:${info.percent}%"></div></div>
      <div class="catalog-progress-product"><b>${productLine}</b></div>
      <div class="catalog-progress-phase">${esc(info.phase)}</div>
      ${variantLine?`<div class="catalog-progress-variant">${variantLine}</div>`:''}
      ${errorLine}`;
  }

  async function getCatalogProducts(){
    const stored=await chrome.storage.local.get(RESULTS_KEY);
    const results=Array.isArray(stored[RESULTS_KEY])?stored[RESULTS_KEY]:[];
    if(!results.length)throw new Error('Chưa có kết quả quét sản phẩm mới. Hãy quét trang trước.');
    if(results.some(r=>!r||r.complete!==true))throw new Error('Kết quả quét chưa đủ 100%. Tool không đăng sản phẩm thiếu size/biến thể.');
    const built=productCreate.makeApiProducts(results);
    if(!built.products.length)throw new Error('Không tạo được danh sách sản phẩm để đăng Sapo.');
    return built.products;
  }

  async function refresh(){
    if(!mount())return;
    const btn=document.getElementById('catalogSapoCreateBtn');
    try{
      const response=await send({type:'DHL_SAPO_PRODUCT_CREATE_GET_STATE'});
      if(!response.ok)throw new Error(response.error||'Không đọc được trạng thái Sapo.');
      const queue=response.queue||null;
      renderProgress(queue);
      if(queue&&queue.status==='paused'){
        btn.disabled=false;btn.textContent='THỬ LẠI ĐĂNG SAPO';btn.dataset.mode='retry';
        setState(queueSummary(queue),'bad');return;
      }
      if(queue&&queue.status==='running'){
        const info=progressInfo(queue);
        btn.disabled=true;btn.textContent=`ĐANG ĐĂNG ${info?info.percent:0}%...`;btn.dataset.mode='running';
        setState(queueSummary(queue),'working');return;
      }
      btn.dataset.mode='start';btn.textContent='ĐĂNG THẲNG LÊN SAPO';
      btn.disabled=!response.verified;
      if(queue&&queue.status==='done')setState(queueSummary(queue),'ok');
      else if(!response.verified)setState('Chưa xác minh Ứng dụng riêng Sapo. Hãy kiểm tra kết nối ở phần TỰ ĐỘNG ĐỒNG BỘ trước.','bad');
      else setState(`Sẵn sàng đăng trực tiếp lên ${response.shop||'Sapo'} • chi nhánh ${response.locationName||'đã xác minh'}. Ảnh dùng link nguồn (src), Sapo tự tải ảnh về.`,'ok');
    }catch(error){
      renderProgress(null);
      btn.disabled=true;btn.textContent='ĐĂNG THẲNG LÊN SAPO';
      setState(error.message||String(error),'bad');
    }
  }

  async function startOrRetry(){
    const btn=document.getElementById('catalogSapoCreateBtn');
    if(!btn)return;
    btn.disabled=true;
    try{
      if(btn.dataset.mode==='retry'){
        const response=await send({type:'DHL_SAPO_PRODUCT_CREATE_RETRY'});
        if(!response.ok)throw new Error(response.error||'Không chạy lại được hàng đợi.');
        setState('Đã tiếp tục đúng sản phẩm/biến thể đang dừng. Không tạo lại các sản phẩm đã hoàn tất.','ok');
        renderProgress(response.queue||null);
        await refresh();return;
      }
      const products=await getCatalogProducts();
      const current=await send({type:'DHL_SAPO_PRODUCT_CREATE_GET_STATE'});
      if(!current.ok)throw new Error(current.error||'Không đọc được cấu hình Sapo.');
      if(!current.verified)throw new Error('Chưa xác minh Ứng dụng riêng Sapo.');
      const variants=products.reduce((n,p)=>n+(p.variants||[]).length,0);
      const images=products.reduce((n,p)=>n+(p.images||[]).length,0);
      const ok=confirm(`Đăng ${products.length} sản phẩm mới (${variants} biến thể) lên ${current.shop||'Sapo'}?\n\nTồn kho sẽ ghi vào: ${current.locationName||'chi nhánh đã xác minh'}\nẢnh: ${images} link nguồn; Sapo sẽ tự tải ảnh về.\n\nTool sẽ kiểm tra alias + SKU để tránh tạo trùng.`);
      if(!ok){await refresh();return;}
      setState(`Đang tạo hàng đợi ${products.length} sản phẩm...`,'working');
      const response=await send({type:'DHL_SAPO_PRODUCT_CREATE_START',products});
      if(!response.ok)throw new Error(response.error||'Không khởi tạo được hàng đợi tạo sản phẩm.');
      renderProgress(response.queue||null);
      await refresh();
    }catch(error){
      setState(`Lỗi đăng Sapo: ${error.message||String(error)}`,'bad');
    }finally{
      setTimeout(()=>refresh().catch(()=>{}),500);
    }
  }

  function injectStyle(){
    if(document.getElementById('catalogSapoCreateStyle'))return;
    const style=document.createElement('style');style.id='catalogSapoCreateStyle';
    style.textContent=`
      #catalogSapoCreateBtn{flex:1;min-width:145px;background:#0f172a;color:#fff;border-color:#0f172a;font-weight:900}
      #catalogSapoCreateBtn:disabled{opacity:.75;cursor:wait}
      .catalog-sapo-create-state{display:block;margin-top:8px;padding:8px 9px;border-radius:8px;background:#f8fafc;color:#475569;font-size:10px;line-height:1.45}
      .catalog-sapo-create-state.ok{background:#f0fdf4;color:#166534}.catalog-sapo-create-state.bad{background:#fef2f2;color:#991b1b}.catalog-sapo-create-state.working{background:#eff6ff;color:#1d4ed8}
      .catalog-sapo-progress{margin-top:8px;padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#334155}
      .catalog-sapo-progress.running{border-color:#93c5fd;background:#f8fbff}.catalog-sapo-progress.paused{border-color:#fecaca;background:#fff7f7}.catalog-sapo-progress.done{border-color:#bbf7d0;background:#f7fff9}
      .catalog-progress-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px}.catalog-progress-head strong{font-size:13px;color:#0f172a}
      .catalog-progress-live{display:flex;align-items:center;gap:6px}.catalog-sapo-progress.running .catalog-progress-live{color:#1d4ed8}.catalog-sapo-progress.paused .catalog-progress-live{color:#b91c1c}.catalog-sapo-progress.done .catalog-progress-live{color:#166534}
      .catalog-progress-spinner{width:11px;height:11px;border:2px solid #bfdbfe;border-top-color:#2563eb;border-radius:50%;display:inline-block;animation:dhlSapoSpin .75s linear infinite}
      .catalog-progress-track{height:9px;margin-top:8px;border-radius:999px;overflow:hidden;background:#e2e8f0;box-shadow:inset 0 0 0 1px rgba(15,23,42,.04)}
      .catalog-progress-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#2563eb,#60a5fa,#2563eb);background-size:160px 100%;transition:width .35s ease;animation:dhlSapoFlow 1.1s linear infinite}
      .catalog-sapo-progress.paused .catalog-progress-fill{background:#ef4444;animation:none}.catalog-sapo-progress.done .catalog-progress-fill{background:#22c55e;animation:none}
      .catalog-progress-product{margin-top:8px;font-size:11px;color:#0f172a}.catalog-progress-phase{margin-top:3px;font-size:10px;font-weight:700}.catalog-progress-variant{margin-top:3px;font-size:9px;color:#64748b}.catalog-progress-error{margin-top:6px;padding:6px 7px;border-radius:6px;background:#fee2e2;color:#991b1b;font-size:9px;line-height:1.35}
      @keyframes dhlSapoSpin{to{transform:rotate(360deg)}}@keyframes dhlSapoFlow{to{background-position:160px 0}}
      @media(prefers-reduced-motion:reduce){.catalog-progress-spinner,.catalog-progress-fill{animation:none!important}.catalog-progress-fill{transition:none}}
    `;document.head.appendChild(style);
  }

  function mount(){
    const section=document.getElementById('catalogMode');
    const exportBtn=document.getElementById('exportCatalogSource');
    if(!section||!exportBtn||!exportBtn.parentElement)return false;
    if(document.getElementById('catalogSapoCreateBtn'))return true;
    const btn=document.createElement('button');
    btn.id='catalogSapoCreateBtn';btn.type='button';btn.className='primary';
    btn.textContent='ĐĂNG THẲNG LÊN SAPO';btn.dataset.mode='start';btn.disabled=true;
    btn.title='Tạo sản phẩm trực tiếp qua Ứng dụng riêng Sapo; ảnh gửi bằng đường link src.';
    btn.addEventListener('click',startOrRetry);
    exportBtn.insertAdjacentElement('afterend',btn);
    const state=document.createElement('small');
    state.id='catalogSapoCreateState';state.className='catalog-sapo-create-state';
    state.textContent='Đang kiểm tra quyền tạo sản phẩm Sapo...';
    const oldState=document.getElementById('catalogState');
    if(oldState)oldState.insertAdjacentElement('afterend',state);else section.appendChild(state);
    const progress=document.createElement('div');
    progress.id='catalogSapoProgress';progress.className='catalog-sapo-progress';progress.hidden=true;
    state.insertAdjacentElement('afterend',progress);
    return true;
  }

  function install(){
    injectStyle();
    if(!mount()){
      const obs=new MutationObserver(()=>{if(mount()){obs.disconnect();refresh().catch(()=>{});}});
      obs.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>obs.disconnect(),10000);
    }else refresh().catch(()=>{});
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&(changes[QUEUE_KEY]||changes[RESULTS_KEY]))refresh().catch(()=>{});
    });
    setInterval(()=>{if(document.getElementById('catalogSapoCreateBtn'))refresh().catch(()=>{});},1800);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
