(() => {
  'use strict';

  const RESULTS_KEY='dhlCatalogResults';
  const text=(v)=>String(v==null?'':v).trim();
  const esc=(v)=>text(v).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

  function firstError(item){
    const errors=Array.isArray(item&&item.errors)?item.errors:[];
    return text(errors[0]&&errors[0].message)||'Không đọc đủ dữ liệu size/tồn từ sản phẩm này.';
  }

  function failedItems(results){
    return (Array.isArray(results)?results:[]).filter(item=>{
      const variants=Array.isArray(item&&item.variants)?item.variants:[];
      return !item||item.complete!==true||variants.length===0;
    });
  }

  function mount(){
    const state=document.getElementById('catalogState');
    if(!state||!state.parentElement)return false;
    if(document.getElementById('catalogScanDiagnostics'))return true;
    const box=document.createElement('div');
    box.id='catalogScanDiagnostics';
    box.style.cssText='display:none;margin-top:8px;padding:8px 9px;border:1px solid #fecaca;border-radius:8px;background:#fff7f7;color:#991b1b;font-size:10px;line-height:1.45';
    state.insertAdjacentElement('afterend',box);
    return true;
  }

  async function refresh(){
    if(!mount())return;
    const stored=await chrome.storage.local.get(RESULTS_KEY);
    const failed=failedItems(stored[RESULTS_KEY]);
    const box=document.getElementById('catalogScanDiagnostics');
    if(!box)return;
    if(!failed.length){box.style.display='none';box.innerHTML='';return;}
    const rows=failed.slice(0,5).map((item,index)=>{
      const name=esc(item&&item.parentName||`Sản phẩm lỗi ${index+1}`);
      const reason=esc(firstError(item));
      const url=text(item&&item.sourceUrl);
      const link=url?`<div style="margin-top:2px;color:#64748b;word-break:break-all">${esc(url)}</div>`:'';
      return `<div style="margin-top:${index?'7':'0'}px"><b>${index+1}. ${name}</b><div>Nguyên nhân scanner: ${reason}</div>${link}</div>`;
    }).join('');
    const more=failed.length>5?`<div style="margin-top:7px">... còn ${failed.length-5} sản phẩm lỗi khác.</div>`:'';
    box.innerHTML=`<b>CHI TIẾT SẢN PHẨM QUÉT LỖI (${failed.length})</b>${rows}${more}`;
    box.style.display='block';
  }

  function install(){
    if(!mount()){
      const obs=new MutationObserver(()=>{if(mount()){obs.disconnect();refresh().catch(()=>{});}});
      obs.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>obs.disconnect(),10000);
    }else refresh().catch(()=>{});
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&changes[RESULTS_KEY])refresh().catch(()=>{});
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
