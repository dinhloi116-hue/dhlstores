(() => {
  'use strict';

  const RESULTS_KEY='dhlCatalogResults';
  const SOURCE_ORIGIN='https://si.aobongda.net';
  let retrying=false;
  const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

  function failed(item){
    return Boolean(item&&item.complete!==true&&item.lagRetryAttempted!==true);
  }

  async function activeSourceTab(){
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab||!tab.id||!String(tab.url||'').startsWith(`${SOURCE_ORIGIN}/`))return null;
    return tab;
  }

  function noReceiver(error){
    return /Receiving end does not exist|Could not establish connection/i.test(String(error&&error.message||error||''));
  }

  async function retryOne(tabId,item){
    const descriptor={
      id:Number(item&&item.parentId)||Number(item&&item.id)||0,
      title:String(item&&item.parentName||item&&item.title||'').trim(),
      url:String(item&&item.sourceUrl||'')
    };
    const message={type:'DHL_SCAN_ONE_DESCRIPTOR',descriptor,hints:[]};
    let response;
    try{
      response=await chrome.tabs.sendMessage(tabId,message);
    }catch(error){
      if(!noReceiver(error))throw error;
      for(const file of ['stock-core.js','dom-stock-parser.js','match-core.js','content.js']){
        await chrome.scripting.executeScript({target:{tabId},files:[file]});
      }
      await sleep(250);
      response=await chrome.tabs.sendMessage(tabId,message);
    }
    if(!response||!response.ok)return{ok:false,error:response&&response.error||'Không nhận được kết quả retry SKU nguồn'};
    const result=response.result;
    const variants=Array.isArray(result&&result.variants)?result.variants:[];
    return result&&result.complete===true&&variants.length>0
      ? {ok:true,result}
      : {ok:false,error:`Retry vẫn chưa đủ dữ liệu màu/size/tồn cho ${descriptor.title||'sản phẩm'}`};
  }

  async function run(){
    if(retrying)return;
    const stored=await chrome.storage.local.get(RESULTS_KEY);
    const results=Array.isArray(stored[RESULTS_KEY])?stored[RESULTS_KEY]:[];
    const indexes=[];
    for(let i=0;i<results.length;i+=1)if(failed(results[i]))indexes.push(i);
    if(!indexes.length)return;
    const tab=await activeSourceTab();if(!tab)return;

    retrying=true;
    try{
      const state=document.getElementById('catalogState');
      if(state)state.textContent=`Phát hiện ${indexes.length} sản phẩm thiếu dữ liệu/SKU nguồn. Đang thử lại từng sản phẩm...`;
      let recovered=0;
      for(let n=0;n<indexes.length;n+=1){
        const index=indexes[n],previous=results[index];
        if(state)state.textContent=`Retry ${n+1}/${indexes.length}: ${previous.parentName||'Sản phẩm'} • yêu cầu đủ màu/size/tồn`;
        let retry;
        try{retry=await retryOne(tab.id,previous);}catch(error){retry={ok:false,error:error&&error.message||String(error)};}
        if(retry&&retry.ok&&retry.result){
          results[index]={...previous,...retry.result,lagRetryAttempted:true,lagRetryRecovered:true,lagRetryAt:Date.now()};
          recovered+=1;
        }else{
          results[index]={...previous,lagRetryAttempted:true,lagRetryRecovered:false,lagRetryAt:Date.now(),errors:[{message:String(retry&&retry.error||'Retry SKU nguồn thất bại')}]};
        }
        await chrome.storage.local.set({[RESULTS_KEY]:results});
        await sleep(220);
      }
      if(state)state.textContent=`Đã retry ${indexes.length} sản phẩm • khôi phục đủ dữ liệu màu/size/tồn ${recovered}/${indexes.length}.`;
    }finally{retrying=false;}
  }

  function install(){
    setTimeout(()=>run().catch(()=>{}),500);
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&changes[RESULTS_KEY]&&!retrying)setTimeout(()=>run().catch(()=>{}),250);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();