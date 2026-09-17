(() => {
  'use strict';

  const RESULTS_KEY='dhlCatalogResults';
  const SOURCE_ORIGIN='https://si.aobongda.net';
  let retrying=false;
  const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

  function failed(item){
    const variants=Array.isArray(item&&item.variants)?item.variants:[];
    return Boolean(item&&item.complete!==true&&variants.length===0&&item.lagRetryAttempted!==true);
  }

  async function activeSourceTab(){
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab||!tab.id||!String(tab.url||'').startsWith(`${SOURCE_ORIGIN}/`))return null;
    return tab;
  }

  async function retryOne(tabId,item){
    const injected=await chrome.scripting.executeScript({
      target:{tabId},
      args:[item],
      func:async(item)=>{
        const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
        const parentId=Number(item&&item.parentId)||Number(item&&item.id)||0;
        const parentName=String(item&&item.parentName||item&&item.title||'').replace(/\s+/g,' ').trim();
        const fallbackImage=String(item&&item.imageUrl||'');
        const norm=(v)=>String(v==null?'':v).replace(/\s+/g,' ').trim();
        const plain=(v)=>norm(v).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        const visible=(el)=>{if(!el||!el.isConnected)return false;const cs=getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>2&&r.height>2;};
        const pid=(v)=>{const s=String(v||'');const m=s.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i)||s.match(/[?&](?:psId|productId|id)=(\d+)/i);return m?Number(m[1]):null;};
        const normalizeSize=(v)=>{const raw=norm(v).toUpperCase().replace(/\s+/g,'');return({'2XL':'XXL','3XL':'XXXL','4XL':'XXXXL','5XL':'XXXXXL','FREESIZE':'FREE'})[raw]||raw;};
        function parseRow(value){
          const raw=norm(value),p=plain(raw);
          let sm=raw.match(/^\s*(XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL|XXXXXL|2XL|3XL|4XL|5XL|FREE|FREESIZE|\d{1,3})(?:\s|$)/i);
          if(!sm)sm=raw.match(/(?:^|\bsize\s*[:\-]?\s*)(XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL|XXXXXL|2XL|3XL|4XL|5XL|FREE|FREESIZE|\d{1,3})(?=\s|$|[|,/])/i);
          if(!sm)return null;
          const size=normalizeSize(sm[1]);
          if(/^\d+$/.test(size)){const n=Number(size);if(n<1||n>60)return null;}
          let stock=null;
          if(/het hang|khong con hang|sold out/.test(p))stock=0;
          let m=raw.match(/còn\s*hàng\s*\(\s*(\d+)\s*\)/i);if(m)stock=Number(m[1]);
          if(stock==null){m=p.match(/con\s*hang[^0-9]{0,12}(\d+)/i);if(m)stock=Number(m[1]);}
          if(stock==null){m=p.match(/(?:ton(?:\s*kho)?|available|stock)[^0-9]{0,12}(\d+)/i);if(m)stock=Number(m[1]);}
          return stock==null?null:{size,stock,raw};
        }
        function findPopup(){
          const candidates=[];
          for(const sel of ['[role="dialog"]','dialog','.modal.show','.modal.in','.modal','.modal-content','[class*="modal"]','[class*="popup"]','[class*="dialog"]']){
            for(const el of document.querySelectorAll(sel)){
              if(!visible(el))continue;
              const t=plain(el.innerText||el.textContent);
              if(/ten size|tinh trang ton|nhap so luong cho tung size/.test(t)&&t.length<9000)candidates.push(el);
            }
          }
          candidates.sort((a,b)=>norm(a.innerText).length-norm(b.innerText).length);
          return candidates[0]||null;
        }
        async function waitPopup(timeout=8000){
          const start=Date.now();
          while(Date.now()-start<timeout){const p=findPopup();if(p)return p;await sleep(100);}
          return null;
        }
        function productAnchors(){
          const out=[];
          for(const a of document.querySelectorAll('a[href]')){try{if(pid(new URL(a.getAttribute('href'),location.href).href)===parentId)out.push(a);}catch(_){}}
          return out;
        }
        function findCard(){
          let best=null;
          for(const anchor of productAnchors()){
            for(let d=0,el=anchor;d<8&&el&&el!==document.body;d+=1,el=el.parentElement){
              const t=norm(el.innerText||el.textContent);if(!t||t.length>3500)continue;
              const ids=new Set();
              for(const a of el.querySelectorAll('a[href]')){try{const x=pid(new URL(a.getAttribute('href'),location.href).href);if(x)ids.add(x);}catch(_){}}
              const acts=[...el.querySelectorAll('a,button,[role="button"],[onclick]')].filter(x=>/thêm vào giỏ|them vao gio|chọn mua|chon mua|mua ngay/i.test(norm(x.innerText||x.textContent)));
              if(ids.has(parentId)&&ids.size<=2&&acts.length){const score=100-ids.size*20-t.length/100;if(!best||score>best.score)best={el,score};}
            }
          }
          return best&&best.el;
        }
        function quickAction(card){
          if(!card)return null;
          return [...card.querySelectorAll('a,button,[role="button"],[onclick],[data-product-id],[data-id]')].find(x=>/thêm vào giỏ|them vao gio|chọn mua|chon mua|mua ngay/i.test(norm(x.innerText||x.textContent)))||null;
        }
        async function closePopup(root){
          if(!root)return;
          const btn=[...root.querySelectorAll('button,a,[role="button"]')].find(x=>/^(×|x|đóng|dong|close)$/i.test(norm(x.innerText||x.textContent))||/close|modal-close/i.test(String(x.className||''))||x.getAttribute('data-dismiss')==='modal');
          if(btn){try{btn.click();}catch(_){}}
          document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
          await sleep(180);
        }
        function colorName(input,root){
          const vals=[];
          if(input.id){const l=root.querySelector(`label[for="${CSS.escape(input.id)}"]`);if(l)vals.push(norm(l.innerText||l.textContent));}
          const own=input.closest('label');if(own)vals.push(norm(own.innerText||own.textContent));
          if(input.parentElement)vals.push(norm(input.parentElement.innerText||input.parentElement.textContent));
          for(const v of [input.getAttribute('data-color'),input.getAttribute('data-name'),input.title,input.getAttribute('aria-label')])if(v)vals.push(norm(v));
          for(const v of vals){const clean=v.replace(/chọn màu sắc:?/i,'').replace(/\s+/g,' ').trim();if(clean&&clean.length<=45&&!/ten size|tinh trang|còn hàng|hết hàng|thêm vào giỏ/i.test(clean))return clean;}
          return '';
        }
        function radios(root){const arr=[],seen=new Set();for(const input of root.querySelectorAll('input[type="radio"]')){const name=colorName(input,root),k=plain(name);if(!name||!k||seen.has(k))continue;seen.add(k);arr.push({name,input});}return arr;}
        function readRows(root){const best=new Map();for(const tr of root.querySelectorAll('tr,[role="row"]')){if(!visible(tr))continue;const row=parseRow(tr.innerText||tr.textContent);if(row&&!best.has(row.size))best.set(row.size,row);}return[...best.values()];}
        async function stableRows(root,timeout=5000){
          let best=[],prev='',stable=0;const start=Date.now();
          while(Date.now()-start<timeout){await sleep(120);const r=findPopup()||root;const rows=readRows(r);const sig=JSON.stringify(rows.map(x=>[x.size,x.stock]));if(rows.length>best.length)best=rows;if(sig&&sig===prev)stable+=1;else stable=0;prev=sig;if(rows.length&&stable>=2)return rows;}
          return best;
        }

        const existing=findPopup();if(existing)await closePopup(existing);
        const card=findCard();
        const action=quickAction(card);
        if(!action)return{ok:false,error:`Không tìm thấy nút mua nhanh cho ${parentName}`};
        if(action.matches&&action.matches('a')){if(!action.dataset.dhlOriginalHref)action.dataset.dhlOriginalHref=action.getAttribute('href')||'';action.setAttribute('href','javascript:void(0)');}
        try{action.scrollIntoView({block:'center',inline:'nearest'});}catch(_){}
        try{action.click();}catch(_){action.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));}
        let root=await waitPopup(8000);
        if(!root)return{ok:false,error:`Popup không mở sau 8 giây cho ${parentName}`};

        const variants=[],snapshots=[];
        async function capture(color){
          root=findPopup()||root;
          const rows=await stableRows(root,5000);
          snapshots.push({color,rows});
          for(const row of rows)variants.push({id:parentId*1000+variants.length+1,parentId,sku:`DOM-${parentId}-${plain(color).replace(/[^a-z0-9]+/g,'_')||'COLOR'}-${row.size}`.toUpperCase(),name:`${parentName}${color&&color!=='(không màu)'?` - ${color}`:''} - ${row.size}`,color:color||'(không màu)',size:row.size,available:Number(row.stock),price:0,image:fallbackImage,status:Number(row.stock)>0?2:0,scanMethod:'popup-dom-explicit-stock-lag-retry'});
        }
        const controls=radios(root);
        if(controls.length){
          for(const c of controls){if(!c.input.checked){try{c.input.click();}catch(_){}c.input.dispatchEvent(new Event('change',{bubbles:true}));await sleep(450);}await capture(c.name);}
        }else await capture('(không màu)');
        await closePopup(findPopup()||root);
        const unique=new Map();for(const v of variants){const k=`${plain(v.color)}|${v.size}`;if(!unique.has(k))unique.set(k,v);}
        const list=[...unique.values()];
        const complete=list.length>0&&snapshots.every(s=>s.rows.length>0);
        return{ok:complete,result:{parentId,parentName,sourceUrl:String(item&&item.sourceUrl||location.href),imageUrl:fallbackImage,variants:list,complete,confidence:complete?'high':'low',scanMethod:'popup-dom-explicit-stock-lag-retry',snapshots,errors:complete?[]:[{message:'Retry 8 giây vẫn không đọc đủ size/tồn'}]}};
      }
    });
    return(injected&&injected[0]&&injected[0].result)||{ok:false,error:'Không nhận được kết quả retry'};
  }

  async function run(){
    if(retrying)return;
    const stored=await chrome.storage.local.get(RESULTS_KEY);
    const results=Array.isArray(stored[RESULTS_KEY])?stored[RESULTS_KEY]:[];
    const indexes=[];for(let i=0;i<results.length;i+=1)if(failed(results[i]))indexes.push(i);
    if(!indexes.length)return;
    const tab=await activeSourceTab();if(!tab)return;
    retrying=true;
    try{
      const state=document.getElementById('catalogState');
      if(state)state.textContent=`Phát hiện ${indexes.length} sản phẩm chưa đọc được. Đang tự thử lại với timeout 8 giây...`;
      let recovered=0;
      for(let n=0;n<indexes.length;n+=1){
        const index=indexes[n],old=results[index];
        if(state)state.textContent=`Đang thử lại sản phẩm lỗi ${n+1}/${indexes.length}: ${old.parentName||'Sản phẩm'} • chờ tối đa 8 giây`;
        let retry;
        try{retry=await retryOne(tab.id,old);}catch(error){retry={ok:false,error:error&&error.message||String(error)};}
        if(retry&&retry.ok&&retry.result){results[index]={...old,...retry.result,lagRetryAttempted:true,lagRetryRecovered:true,lagRetryAt:Date.now()};recovered+=1;}
        else results[index]={...old,lagRetryAttempted:true,lagRetryRecovered:false,lagRetryAt:Date.now(),errors:[{message:String(retry&&retry.error||'Retry 8 giây vẫn thất bại')}]};
        await chrome.storage.local.set({[RESULTS_KEY]:results});
        await sleep(250);
      }
      if(state)state.textContent=`Đã tự thử lại ${indexes.length} sản phẩm do nghi mạng lag • khôi phục được ${recovered}/${indexes.length}.`;
    }finally{retrying=false;}
  }

  function install(){
    setTimeout(()=>run().catch(()=>{}),500);
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[RESULTS_KEY]&&!retrying)setTimeout(()=>run().catch(()=>{}),250);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
