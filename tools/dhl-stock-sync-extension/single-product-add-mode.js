(() => {
  'use strict';

  const productCreate=globalThis.DHLProductCreateCore;
  if(!productCreate||typeof productCreate.makeApiProducts!=='function'||typeof productCreate.buildWorkbook!=='function')return;

  const QUEUE_KEY='dhlSapoProductCreateQueueV1';
  const text=(v)=>String(v==null?'':v).trim();
  let busy=false;
  let lastResult=null;

  function send(message){
    return new Promise((resolve,reject)=>{
      chrome.runtime.sendMessage(message,response=>{
        const error=chrome.runtime.lastError;
        if(error){reject(error);return;}
        if(!response){reject(new Error('Không nhận được phản hồi từ background.'));return;}
        resolve(response);
      });
    });
  }

  function state(message,kind=''){
    const el=document.getElementById('singleProductAddState');
    if(!el)return;
    el.textContent=message;
    el.className=`single-product-add-state ${kind}`.trim();
  }

  async function activeSourceTab(){
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab||!tab.id||!String(tab.url||'').startsWith('https://si.aobongda.net/')){
      throw new Error('Hãy mở sản phẩm trên si.aobongda.net trước.');
    }
    return tab;
  }

  function noReceiver(error){
    return /Receiving end does not exist|Could not establish connection/i.test(String(error&&error.message||error||''));
  }

  async function scanOpenedPopup(){
    const tab=await activeSourceTab();
    const message={type:'DHL_SCAN_CURRENT_POPUP',hints:[]};
    try{
      const response=await chrome.tabs.sendMessage(tab.id,message);
      if(!response||!response.ok)throw new Error(response&&response.error||'Không đọc được popup sản phẩm.');
      return response.result;
    }catch(error){
      if(!noReceiver(error))throw error;
      for(const file of ['stock-core.js','dom-stock-parser.js','match-core.js','content.js']){
        await chrome.scripting.executeScript({target:{tabId:tab.id},files:[file]});
      }
      await new Promise(resolve=>setTimeout(resolve,220));
      const response=await chrome.tabs.sendMessage(tab.id,message);
      if(!response||!response.ok)throw new Error(response&&response.error||'Không đọc được popup sản phẩm.');
      return response.result;
    }
  }

  function validateResult(result){
    if(!result||typeof result!=='object')throw new Error('Không có dữ liệu sản phẩm.');
    const variants=Array.isArray(result.variants)?result.variants:[];
    if(!variants.length)throw new Error('Popup chưa đọc được màu/size/tồn.');
    if(result.complete!==true){
      const missing=result.domDiagnostics&&Array.isArray(result.domDiagnostics.missingSizes)
        ? result.domDiagnostics.missingSizes.filter(Boolean):[];
      const detail=missing.length?` Thiếu: ${missing.slice(0,8).join(', ')}.`:'';
      throw new Error(`Sản phẩm chưa quét đủ size/tồn.${detail} Hãy giữ popup mở rồi thử lại.`);
    }
    return result;
  }

  function builtProducts(result){
    const built=productCreate.makeApiProducts([result]);
    const products=Array.isArray(built&&built.products)?built.products:[];
    if(!products.length)throw new Error('Không tạo được sản phẩm Sapo từ popup này.');
    return products;
  }

  function productSummary(result,products){
    const variants=products.reduce((n,p)=>n+(Array.isArray(p&&p.variants)?p.variants.length:0),0);
    const colors=products.length;
    return{
      name:text(result&&result.parentName)||'Sản phẩm',
      colors,variants,
      stock:products.reduce((n,p)=>n+(p.variants||[]).reduce((s,v)=>s+Number(v.stock||0),0),0)
    };
  }

  function downloadOne(result){
    const out=productCreate.buildWorkbook([result]);
    if(!out||!out.bytes)throw new Error('Không tạo được Excel 1 sản phẩm.');
    const blob=new Blob([out.bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob),a=document.createElement('a'),d=new Date();
    const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    a.href=url;
    a.download=`SAPO_TAO_1_SAN_PHAM_MOI_${stamp}.xlsx`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1600);
  }

  async function scanOne(){
    if(busy)return;
    busy=true;
    const scan=document.getElementById('singleProductScanBtn');
    const direct=document.getElementById('singleProductDirectBtn');
    const excel=document.getElementById('singleProductExcelBtn');
    if(scan)scan.disabled=true;
    if(direct)direct.disabled=true;
    if(excel)excel.disabled=true;
    try{
      state('Đang đọc đúng popup sản phẩm đang mở...','working');
      const result=validateResult(await scanOpenedPopup());
      const products=builtProducts(result);
      const summary=productSummary(result,products);
      lastResult=result;
      state(`ĐÃ QUÉT ĐỦ: ${summary.name} • ${summary.colors} màu/sản phẩm Sapo • ${summary.variants} biến thể • tổng tồn đọc được ${summary.stock}. Có thể đăng thẳng hoặc tải Excel 1 SP.`,'ok');
      if(direct)direct.disabled=false;
      if(excel)excel.disabled=false;
    }catch(error){
      lastResult=null;
      state(`CHƯA ĐẠT: ${error.message||String(error)}`,'bad');
    }finally{
      busy=false;
      if(scan)scan.disabled=false;
    }
  }

  async function createDirect(){
    if(busy)return;
    busy=true;
    const direct=document.getElementById('singleProductDirectBtn');
    if(direct)direct.disabled=true;
    try{
      const result=validateResult(lastResult);
      const products=builtProducts(result);
      const current=await send({type:'DHL_SAPO_PRODUCT_CREATE_GET_STATE'});
      if(!current.ok)throw new Error(current.error||'Không đọc được trạng thái Sapo.');
      if(!current.verified)throw new Error('Chưa xác minh Ứng dụng riêng Sapo.');
      const summary=productSummary(result,products);
      const ok=confirm(
        `THÊM SẢN PHẨM MỚI LÊN SAPO\n\n`+
        `${summary.name}\n`+
        `${summary.colors} màu/sản phẩm Sapo • ${summary.variants} biến thể\n`+
        `Chi nhánh: ${current.locationName||'đã xác minh'}\n\n`+
        `Tool giữ NGUYÊN SKU GỐC của website, chỉ tạo alias, kiểm tra trùng trước khi tạo, đưa ảnh nguồn lên Sapo và ghi tồn từng size.\n`+
        `Nếu đã tồn tại cùng alias/SKU, tool dùng lại thay vì tạo trùng.`
      );
      if(!ok)return;
      state(`Đang gửi ${summary.name} lên Sapo... theo dõi tiến độ ở khối ĐĂNG SAPO bên dưới.`,'working');
      const response=await send({type:'DHL_SAPO_PRODUCT_CREATE_START',products});
      if(!response.ok)throw new Error(response.error||'Không khởi tạo được hàng đợi Sapo.');
    }catch(error){
      state(`LỖI ĐĂNG SAPO: ${error.message||String(error)}`,'bad');
    }finally{
      busy=false;
      if(direct&&lastResult)direct.disabled=false;
    }
  }

  function exportOne(){
    try{
      const result=validateResult(lastResult);
      downloadOne(result);
      state('Đã tạo Excel cho đúng sản phẩm vừa quét. Không chứa các sản phẩm khác.','ok');
    }catch(error){
      state(`LỖI TẠO EXCEL: ${error.message||String(error)}`,'bad');
    }
  }

  function renderQueueState(queue){
    if(!queue||!lastResult)return;
    if(queue.status==='done'){
      state(`ĐÃ XONG SAPO: tạo mới ${Number(queue.created||0)} • dùng lại sản phẩm trùng ${Number(queue.adopted||0)} • hoàn tất ${Number(queue.success||0)}/${Number(queue.total||0)}.`,'ok');
    }else if(queue.status==='paused'){
      const item=Array.isArray(queue.items)?queue.items[queue.index]:null;
      state(`Sapo đang tạm dừng${item&&item.name?` ở ${item.name}`:''}. Có thể dùng nút THỬ LẠI ở phần tiến độ Sapo.`,'bad');
    }
  }

  function mount(){
    const section=document.getElementById('catalogMode');
    if(!section||document.getElementById('singleProductAddBox'))return Boolean(section);
    const box=document.createElement('div');
    box.id='singleProductAddBox';
    box.className='single-product-add-box';
    box.innerHTML=`
      <div class="single-product-add-title">THÊM 1 SẢN PHẨM MỚI — NHANH</div>
      <div class="single-product-add-steps">
        1) Trên aobongda mở <b>popup màu/size</b> của đúng sản phẩm cần thêm.<br>
        2) Bấm <b>QUÉT 1 SP ĐANG MỞ</b>.<br>
        3) Kiểm tra đủ màu/size/SKU gốc → <b>ĐĂNG 1 SP LÊN SAPO</b>. SKU Sapo tạo mới sẽ giống hệt SKU website.
      </div>
      <div class="single-product-add-actions">
        <button id="singleProductScanBtn" type="button" class="primary">QUÉT 1 SP ĐANG MỞ</button>
        <button id="singleProductDirectBtn" type="button" class="success" disabled>ĐĂNG 1 SP LÊN SAPO</button>
        <button id="singleProductExcelBtn" type="button" class="secondary" disabled>TẠO EXCEL 1 SP</button>
      </div>
      <small id="singleProductAddState" class="single-product-add-state">Chưa quét sản phẩm. Tool chỉ đọc đúng popup bạn đang mở.</small>`;
    const firstControls=section.querySelector('div[style*="display:flex"]');
    if(firstControls)firstControls.insertAdjacentElement('beforebegin',box);
    else section.appendChild(box);
    document.getElementById('singleProductScanBtn')?.addEventListener('click',scanOne);
    document.getElementById('singleProductDirectBtn')?.addEventListener('click',createDirect);
    document.getElementById('singleProductExcelBtn')?.addEventListener('click',exportOne);
    return true;
  }

  function style(){
    if(document.getElementById('singleProductAddStyle'))return;
    const el=document.createElement('style');
    el.id='singleProductAddStyle';
    el.textContent=`
      .single-product-add-box{margin:10px 0;padding:11px;border:1px solid #86efac;border-radius:10px;background:#f0fdf4}
      .single-product-add-title{font-size:12px;font-weight:900;color:#14532d}
      .single-product-add-steps{margin-top:6px;font-size:10px;line-height:1.55;color:#334155}
      .single-product-add-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
      .single-product-add-actions button{flex:1;min-width:130px}
      .single-product-add-state{display:block;margin-top:8px;padding:7px 8px;border-radius:7px;background:#fff;color:#475569;font-size:10px;line-height:1.45}
      .single-product-add-state.ok{background:#dcfce7;color:#166534}
      .single-product-add-state.bad{background:#fee2e2;color:#991b1b}
      .single-product-add-state.working{background:#dbeafe;color:#1d4ed8}
    `;
    document.head.appendChild(el);
  }

  function install(){
    style();
    if(!mount()){
      const obs=new MutationObserver(()=>{if(mount())obs.disconnect();});
      obs.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>obs.disconnect(),10000);
    }
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&changes[QUEUE_KEY])renderQueueState(changes[QUEUE_KEY].newValue);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();