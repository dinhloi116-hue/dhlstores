(() => {
  'use strict';

  const productCreate=globalThis.DHLProductCreateCore;
  if(!productCreate||typeof productCreate.makeApiProducts!=='function')return;

  const RESULTS_KEY='dhlCatalogResults';
  const QUEUE_KEY='dhlSapoProductCreateQueueV1';
  const text=(v)=>String(v==null?'':v).trim();

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
      if(queue&&queue.status==='paused'){
        btn.disabled=false;btn.textContent='THỬ LẠI ĐĂNG SAPO';btn.dataset.mode='retry';
        setState(queueSummary(queue),'bad');return;
      }
      if(queue&&queue.status==='running'){
        btn.disabled=true;btn.textContent=`ĐANG ĐĂNG ${Number(queue.index||0)}/${Number(queue.total||0)}...`;btn.dataset.mode='running';
        setState(queueSummary(queue),'working');return;
      }
      btn.dataset.mode='start';btn.textContent='ĐĂNG THẲNG LÊN SAPO';
      btn.disabled=!response.verified;
      if(queue&&queue.status==='done')setState(queueSummary(queue),'ok');
      else if(!response.verified)setState('Chưa xác minh Ứng dụng riêng Sapo. Hãy kiểm tra kết nối ở phần TỰ ĐỘNG ĐỒNG BỘ trước.','bad');
      else setState(`Sẵn sàng đăng trực tiếp lên ${response.shop||'Sapo'} • chi nhánh ${response.locationName||'đã xác minh'}. Ảnh dùng link nguồn (src), Sapo tự tải ảnh về.`,'ok');
    }catch(error){
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
      .catalog-sapo-create-state{display:block;margin-top:8px;padding:8px 9px;border-radius:8px;background:#f8fafc;color:#475569;font-size:10px;line-height:1.45}
      .catalog-sapo-create-state.ok{background:#f0fdf4;color:#166534}.catalog-sapo-create-state.bad{background:#fef2f2;color:#991b1b}.catalog-sapo-create-state.working{background:#eff6ff;color:#1d4ed8}
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
    setInterval(()=>{if(document.getElementById('catalogSapoCreateBtn'))refresh().catch(()=>{});},5000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
