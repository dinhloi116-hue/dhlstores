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

  function failedItems(queue){
    return (Array.isArray(queue&&queue.items)?queue.items:[]).filter(item=>item&&(item.skipped===true||item.status==='error'));
  }

  function reportText(queue){
    const items=Array.isArray(queue&&queue.items)?queue.items:[];
    const failed=failedItems(queue);
    const success=items.filter(item=>item&&item.status==='done');
    const lines=[];
    lines.push('BÁO CÁO ĐĂNG SẢN PHẨM LÊN SAPO');
    lines.push('================================');
    lines.push(`Queue: ${text(queue&&queue.id)||'—'}`);
    lines.push(`Shop: ${text(queue&&queue.shop)||'—'}`);
    lines.push(`Chi nhánh: ${text(queue&&queue.locationName)||'—'}`);
    lines.push(`Bắt đầu: ${fmt(queue&&queue.startedAt)}`);
    lines.push(`Kết thúc: ${fmt(queue&&queue.finishedAt)}`);
    lines.push(`Tổng sản phẩm: ${Number(queue&&queue.total||items.length||0)}`);
    lines.push(`Thành công: ${Number(queue&&queue.success||success.length||0)}`);
    lines.push(`Bỏ qua do lỗi: ${failed.length}`);
    lines.push(`Tạo mới: ${Number(queue&&queue.created||0)}`);
    lines.push(`Dùng lại sản phẩm có sẵn: ${Number(queue&&queue.adopted||0)}`);
    lines.push('');

    lines.push('SẢN PHẨM THÀNH CÔNG');
    lines.push('-------------------');
    if(!success.length)lines.push('Không có.');
    success.forEach((item,i)=>{
      lines.push(`${i+1}. ${text(item.name)||'—'} | alias=${text(item.alias)||'—'} | productId=${Number(item.productId)||'—'} | biến thể=${Array.isArray(item.variants)?item.variants.length:0}`);
    });
    lines.push('');

    lines.push('SẢN PHẨM LỖI ĐÃ BỎ QUA');
    lines.push('----------------------');
    if(!failed.length)lines.push('Không có.');
    failed.forEach((item,i)=>{
      const variants=Array.isArray(item.variants)?item.variants:[];
      const vIndex=Math.max(0,Number(item.variantIndex||0));
      const current=variants[vIndex]||null;
      lines.push(`${i+1}. ${text(item.name)||'—'}`);
      lines.push(`   Alias: ${text(item.alias)||'—'}`);
      lines.push(`   Product ID: ${Number(item.productId)||'—'}`);
      lines.push(`   Đã ghi tồn biến thể: ${Math.min(vIndex,variants.length)}/${variants.length}`);
      if(current)lines.push(`   Biến thể đang lỗi: Size ${text(current.size)||'—'} | SKU ${text(current.sku)||'—'} | tồn ${Number(current.stock)||0}`);
      lines.push(`   Lỗi: ${text(item.error)||'Không rõ lỗi'}`);
    });

    const systemErrors=(Array.isArray(queue&&queue.errors)?queue.errors:[]).filter(err=>{
      const idx=Number(err&&err.index);
      return !Number.isFinite(idx)||idx<0||idx>=items.length;
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
    const total=Number(queue.total||0),processed=Math.min(total,Number(queue.index||0));
    const failed=failedItems(queue).length;
    const success=Number(queue.success||0);
    box.style.display='block';
    summary.textContent=queue.status==='running'
      ? `Đã xử lý ${processed}/${total} • thành công ${success} • lỗi đã bỏ qua ${failed}. Tool vẫn tiếp tục sản phẩm kế tiếp.`
      : `Kết quả: ${success}/${total} thành công • ${failed} lỗi đã bỏ qua. Báo cáo giữ tên sản phẩm và nguyên nhân lỗi.`;
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
