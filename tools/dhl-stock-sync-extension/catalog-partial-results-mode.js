(() => {
  'use strict';

  const productCreate=globalThis.DHLProductCreateCore;
  if(!productCreate||typeof productCreate.buildWorkbook!=='function'||typeof productCreate.makeApiProducts!=='function')return;

  const RESULTS_KEY='dhlCatalogResults';
  const QUEUE_KEY='dhlSapoProductCreateQueueV1';
  let binding=false;

  const text=(v)=>String(v==null?'':v).trim();

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

  function classify(results){
    const all=Array.isArray(results)?results:[];
    const complete=[];
    const failed=[];
    for(const item of all){
      const variants=Array.isArray(item&&item.variants)?item.variants:[];
      const guessedZero=variants.some(v=>v&&v.synthesizedFromExplicitOutOfStock);
      if(item&&item.complete===true&&variants.length>0&&!guessedZero)complete.push(item);
      else failed.push(item||{parentName:'Sản phẩm không xác định',errors:[{message:'Không có dữ liệu quét'}]});
    }
    return{all,complete,failed};
  }

  function firstError(item){
    const errors=Array.isArray(item&&item.errors)?item.errors:[];
    return text(errors[0]&&errors[0].message)||'Thiếu dữ liệu size/tồn';
  }

  async function readClassified(){
    const stored=await chrome.storage.local.get(RESULTS_KEY);
    return classify(stored[RESULTS_KEY]);
  }

  function setCatalogState(message){
    const state=document.getElementById('catalogState');
    if(state)state.textContent=message;
  }

  function setSapoState(message,kind=''){
    const state=document.getElementById('catalogSapoCreateState');
    if(!state)return;
    state.textContent=message;
    state.className=`catalog-sapo-create-state ${kind}`.trim();
  }

  function downloadWorkbook(out,failedCount){
    const blob=new Blob([out.bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob),a=document.createElement('a'),d=new Date();
    const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    a.href=url;
    a.download=`SAPO_TAO_SAN_PHAM_MOI_${stamp}.xlsx`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1600);
    setCatalogState(`Đã tạo file ${out.products} sản phẩm/màu • ${out.rows} biến thể • bỏ qua ${failedCount} sản phẩm lỗi/thiếu. Không chặn cả lô vì lỗi cục bộ.`);
  }

  async function exportCompleteOnly(){
    const btn=document.getElementById('exportCatalogSource');
    if(btn)btn.disabled=true;
    try{
      const {complete,failed}=await readClassified();
      if(!complete.length)throw new Error('Chưa có sản phẩm nào quét đủ để tạo file.');
      const out=productCreate.buildWorkbook(complete);
      downloadWorkbook(out,failed.length);
    }catch(error){
      setCatalogState(`Lỗi tạo file: ${error&&error.message||String(error)}`);
    }finally{
      await syncAvailability();
    }
  }

  async function startCompleteOnly(button){
    if(button.dataset.mode==='retry'){
      button.disabled=true;
      try{
        const response=await send({type:'DHL_SAPO_PRODUCT_CREATE_RETRY'});
        if(!response.ok)throw new Error(response.error||'Không chạy lại được hàng đợi.');
        setSapoState('Đã tiếp tục hàng đợi Sapo.','working');
      }catch(error){setSapoState(`Lỗi: ${error&&error.message||String(error)}`,'bad');}
      return;
    }

    button.disabled=true;
    try{
      const {complete,failed}=await readClassified();
      if(!complete.length)throw new Error('Không có sản phẩm quét đủ để đăng Sapo.');
      const built=productCreate.makeApiProducts(complete);
      const products=Array.isArray(built&&built.products)?built.products:[];
      if(!products.length)throw new Error('Không tạo được danh sách sản phẩm hợp lệ để đăng Sapo.');
      const current=await send({type:'DHL_SAPO_PRODUCT_CREATE_GET_STATE'});
      if(!current.ok)throw new Error(current.error||'Không đọc được trạng thái Sapo.');
      if(!current.verified)throw new Error('Chưa xác minh Ứng dụng riêng Sapo.');
      const variants=products.reduce((n,p)=>n+(Array.isArray(p&&p.variants)?p.variants.length:0),0);
      const preview=failed.slice(0,3).map(x=>`• ${text(x&&x.parentName)||'Sản phẩm'}: ${firstError(x)}`).join('\n');
      const more=failed.length>3?`\n• ... và ${failed.length-3} sản phẩm lỗi khác`:'';
      const ok=confirm(
        `Đăng ${products.length} sản phẩm đạt chuẩn (${variants} biến thể) lên ${current.shop||'Sapo'}?\n\n`+
        `Bỏ qua ${failed.length} sản phẩm lỗi/thiếu.${failed.length?`\n${preview}${more}`:''}\n\n`+
        `Tồn kho: ${current.locationName||'chi nhánh đã xác minh'}\n`+
        `Sản phẩm lỗi sẽ KHÔNG chặn các sản phẩm còn lại.`
      );
      if(!ok)return;
      setSapoState(`Đang tạo hàng đợi ${products.length} sản phẩm đạt chuẩn • bỏ qua ${failed.length} sản phẩm lỗi...`,'working');
      const response=await send({type:'DHL_SAPO_PRODUCT_CREATE_START',products});
      if(!response.ok)throw new Error(response.error||'Không khởi tạo được hàng đợi tạo sản phẩm.');
    }catch(error){
      setSapoState(`Lỗi đăng Sapo: ${error&&error.message||String(error)}`,'bad');
    }finally{
      setTimeout(()=>syncAvailability().catch(()=>{}),400);
    }
  }

  function bindExport(){
    const old=document.getElementById('exportCatalogSource');
    if(!old||old.dataset.partialResults==='1')return;
    const fresh=old.cloneNode(true);
    fresh.dataset.partialResults='1';
    old.replaceWith(fresh);
    fresh.addEventListener('click',event=>{event.preventDefault();exportCompleteOnly();});
  }

  function bindSapo(){
    const old=document.getElementById('catalogSapoCreateBtn');
    if(!old||old.dataset.partialResults==='1')return;
    const fresh=old.cloneNode(true);
    fresh.dataset.partialResults='1';
    old.replaceWith(fresh);
    fresh.addEventListener('click',event=>{event.preventDefault();startCompleteOnly(fresh);});
  }

  async function syncAvailability(){
    if(binding)return;
    binding=true;
    try{
      bindExport();
      bindSapo();
      const {all,complete,failed}=await readClassified();
      const scan=document.getElementById('scanCatalogSource');
      const exportBtn=document.getElementById('exportCatalogSource');
      if(exportBtn)exportBtn.disabled=complete.length===0;

      if(all.length&&scan&&!scan.disabled){
        const state=document.getElementById('catalogState');
        const current=text(state&&state.textContent);
        if(/CHƯA ĐỦ|KHÓA xuất file|ĐỦ \d+\/\d+/.test(current)){
          const variants=complete.reduce((n,r)=>n+(Array.isArray(r&&r.variants)?r.variants.length:0),0);
          const failedNames=failed.slice(0,2).map(x=>text(x&&x.parentName)).filter(Boolean).join(', ');
          state.textContent=`Quét xong: ${complete.length}/${all.length} sản phẩm đạt • ${variants} biến thể • ${failed.length} lỗi/thiếu sẽ BỎ QUA${failedNames?` (${failedNames}${failed.length>2?', ...':''})`:''}. Có thể xuất Excel hoặc đăng Sapo với phần đạt chuẩn.`;
        }
      }
    }finally{binding=false;}
  }

  function install(){
    syncAvailability().catch(()=>{});
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&(changes[RESULTS_KEY]||changes[QUEUE_KEY]))setTimeout(()=>syncAvailability().catch(()=>{}),100);
    });
    setInterval(()=>syncAvailability().catch(()=>{}),900);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
