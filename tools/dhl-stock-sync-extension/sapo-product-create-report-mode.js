(() => {
  'use strict';

  const QUEUE_KEY='dhlSapoProductCreateQueueV1';
  const text=(v)=>String(v==null?'':v).trim();
  const fmt=(ts)=>ts?new Date(Number(ts)).toLocaleString('vi-VN'):'—';

  function downloadText(content,fileName){
    const blob=new Blob([content],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=fileName;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function itemsOf(queue){return Array.isArray(queue&&queue.items)?queue.items:[];}
  function failedItems(queue){return itemsOf(queue).filter(item=>item&&(item.skipped===true||item.status==='error'));}

  function metrics(queue){
    const items=itemsOf(queue);
    const total=Number(queue&&queue.total||items.length||0);
    const onSapo=items.filter(item=>Number(item&&item.productId)>0);
    const created=items.filter(item=>Number(item&&item.productId)>0&&item.created===true);
    const adopted=items.filter(item=>Number(item&&item.productId)>0&&item.adopted===true);
    const imageDone=items.filter(item=>Number(item&&item.productId)>0&&item.imagesDone===true);
    const stockDone=items.filter(item=>{
      if(!item||!Number(item.productId))return false;
      const variants=Array.isArray(item.variants)?item.variants:[];
      return variants.length>0&&Number(item.variantIndex||0)>=variants.length;
    });
    const fullDone=items.filter(item=>item&&item.status==='done');
    const failed=failedItems(queue);
    return{items,total,onSapo,created,adopted,imageDone,stockDone,fullDone,failed};
  }

  function failurePhase(item){
    if(!item||!Number(item.productId))return'TẠO SẢN PHẨM';
    if(item.imagesDone!==true)return'ẢNH';
    const variants=Array.isArray(item.variants)?item.variants:[];
    if(Number(item.variantIndex||0)<variants.length)return'TỒN KHO';
    return'HOÀN TẤT';
  }

  function reportText(queue){
    const m=metrics(queue);
    const lines=[];
    lines.push('BÁO CÁO ĐĂNG SẢN PHẨM LÊN SAPO');
    lines.push('================================');
    lines.push(`Queue: ${text(queue&&queue.id)||'—'}`);
    lines.push(`Shop: ${text(queue&&queue.shop)||'—'}`);
    lines.push(`Chi nhánh: ${text(queue&&queue.locationName)||'—'}`);
    lines.push(`Bắt đầu: ${fmt(queue&&queue.startedAt)}`);
    lines.push(`Kết thúc: ${fmt(queue&&queue.finishedAt)}`);
    lines.push(`Tổng sản phẩm: ${m.total}`);
    lines.push(`Đã có Product ID trên Sapo: ${m.onSapo.length}/${m.total}`);
    lines.push(`Trong đó tạo mới: ${m.created.length}`);
    lines.push(`Dùng lại sản phẩm có sẵn: ${m.adopted.length}`);
    lines.push(`Đã hoàn tất ảnh: ${m.imageDone.length}/${m.total}`);
    lines.push(`Đã hoàn tất tồn kho: ${m.stockDone.length}/${m.total}`);
    lines.push(`Hoàn tất toàn bộ quy trình: ${m.fullDone.length}/${m.total}`);
    lines.push(`Cần xử lý tiếp ảnh/tồn: ${m.failed.length}`);
    lines.push('');

    lines.push('SẢN PHẨM ĐÃ CÓ TRÊN SAPO');
    lines.push('-------------------------');
    if(!m.onSapo.length)lines.push('Không có.');
    m.onSapo.forEach((item,i)=>{
      lines.push(`${i+1}. ${text(item.name)||'—'} | alias=${text(item.alias)||'—'} | productId=${Number(item.productId)||'—'} | ${item.created?'TẠO MỚI':item.adopted?'DÙNG LẠI':'ĐÃ CÓ ID'}`);
    });
    lines.push('');

    lines.push('SẢN PHẨM HOÀN TẤT ĐỦ ẢNH + TỒN');
    lines.push('--------------------------------');
    if(!m.fullDone.length)lines.push('Không có.');
    m.fullDone.forEach((item,i)=>{
      lines.push(`${i+1}. ${text(item.name)||'—'} | productId=${Number(item.productId)||'—'} | biến thể=${Array.isArray(item.variants)?item.variants.length:0}`);
    });
    lines.push('');

    lines.push('CẦN XỬ LÝ TIẾP ẢNH / TỒN');
    lines.push('-------------------------');
    if(!m.failed.length)lines.push('Không có.');
    m.failed.forEach((item,i)=>{
      const variants=Array.isArray(item.variants)?item.variants:[];
      const vIndex=Math.max(0,Number(item.variantIndex||0));
      const current=variants[vIndex]||null;
      const phase=failurePhase(item);
      lines.push(`${i+1}. ${text(item.name)||'—'}`);
      lines.push(`   Trạng thái tạo SP: ${Number(item.productId)?'ĐÃ CÓ TRÊN SAPO':'CHƯA TẠO'}`);
      lines.push(`   Product ID: ${Number(item.productId)||'—'}`);
      lines.push(`   Bước lỗi: ${phase}`);
      lines.push(`   Ảnh hoàn tất: ${item.imagesDone===true?'CÓ':'CHƯA'}`);
      lines.push(`   Đã ghi tồn biến thể: ${Math.min(vIndex,variants.length)}/${variants.length}`);
      if(phase==='TỒN KHO'&&current)lines.push(`   Biến thể đang lỗi: Size ${text(current.size)||'—'} | SKU ${text(current.sku)||'—'} | tồn ${Number(current.stock)||0}`);
      lines.push(`   Lỗi: ${text(item.error)||'Không rõ lỗi'}`);
    });

    const systemErrors=(Array.isArray(queue&&queue.errors)?queue.errors:[]).filter(err=>{
      const idx=Number(err&&err.index);
      return !Number.isFinite(idx)||idx<0||idx>=m.items.length;
    });
    if(systemErrors.length){
      lines.push('');
      lines.push('LỖI HỆ THỐNG');
      lines.push('-------------');
      systemErrors.forEach((err,i)=>lines.push(`${i+1}. ${fmt(err&&err.at)} • ${text(err&&err.error)||'Không rõ lỗi'}`));
    }
    return lines.join('\r\n');
  }

  function mount(){
    const progress=document.getElementById('catalogSapoProgress');
    if(!progress||!progress.parentElement)return false;
    if(document.getElementById('catalogSapoReportBox'))return true;
    const box=document.createElement('div');
    box.id='catalogSapoReportBox';
    box.style.cssText='display:none;margin-top:8px;padding:8px 9px;border:1px solid #e2e8f0;border-radius:8px;background:#fff';
    box.innerHTML=`
      <div id="catalogSapoReportSummary" style="font-size:10px;color:#475569;line-height:1.4"></div>
      <button id="catalogSapoReportBtn" type="button" class="secondary" style="width:100%;margin-top:7px;font-size:10px;font-weight:800">TẢI BÁO CÁO ĐĂNG SAPO (.TXT)</button>`;
    progress.insertAdjacentElement('afterend',box);
    document.getElementById('catalogSapoReportBtn')?.addEventListener('click',async()=>{
      const state=await chrome.storage.local.get(QUEUE_KEY);
      const queue=state[QUEUE_KEY];
      if(!queue)return;
      const d=new Date();
      const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}`;
      downloadText(reportText(queue),`BAO_CAO_DANG_SAN_PHAM_SAPO_${stamp}.txt`);
    });
    return true;
  }

  async function refresh(){
    if(!mount())return;
    const state=await chrome.storage.local.get(QUEUE_KEY);
    const queue=state[QUEUE_KEY];
    const box=document.getElementById('catalogSapoReportBox');
    const summary=document.getElementById('catalogSapoReportSummary');
    if(!box||!summary)return;
    if(!queue){box.style.display='none';return;}
    const m=metrics(queue);
    const processed=Math.min(m.total,Number(queue.index||0));
    box.style.display='block';
    summary.textContent=queue.status==='running'
      ? `Đã xử lý ${processed}/${m.total} • đã có trên Sapo ${m.onSapo.length} • hoàn tất ảnh+tồn ${m.fullDone.length} • cần xử lý tiếp ${m.failed.length}.`
      : `Kết quả: ${m.onSapo.length}/${m.total} sản phẩm đã có trên Sapo • ${m.fullDone.length}/${m.total} hoàn tất đủ ảnh+tồn • ${m.failed.length} cần xử lý tiếp.`;
  }

  function install(){
    if(!mount()){
      const obs=new MutationObserver(()=>{if(mount()){obs.disconnect();refresh().catch(()=>{});}});
      obs.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>obs.disconnect(),10000);
    }else refresh().catch(()=>{});
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&changes[QUEUE_KEY])refresh().catch(()=>{});
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();