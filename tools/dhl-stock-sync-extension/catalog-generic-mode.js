(() => {
  'use strict';
  const productCreate=globalThis.DHLProductCreateCore;
  if(!productCreate)return;

  const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

  async function activeTab(){
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    return tab;
  }

  function noReceiver(error){
    return /Receiving end does not exist|Could not establish connection/i.test(String(error&&error.message?error.message:error||''));
  }

  async function injectScanner(tabId){
    for(const file of ['stock-core.js','dom-stock-parser.js','match-core.js','content.js']){
      await chrome.scripting.executeScript({target:{tabId},files:[file]});
    }
    await sleep(180);
  }

  async function sendToTab(tabId,message){
    try{return await chrome.tabs.sendMessage(tabId,message);}
    catch(error){
      if(!noReceiver(error))throw error;
      await injectScanner(tabId);
      return chrome.tabs.sendMessage(tabId,message);
    }
  }

  async function ensureCurrentCategoryTab(){
    const tab=await activeTab();
    if(!tab||!tab.id||!String(tab.url||'').startsWith('https://si.aobongda.net/'))throw new Error('Hãy mở đúng danh mục trên si.aobongda.net trước.');
    return tab;
  }

  async function discoverProducts(tabId){
    const injected=await chrome.scripting.executeScript({
      target:{tabId},
      func:()=>{
        function pid(value){
          const s=String(value||'');
          const m=s.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i)||s.match(/[?&](?:psId|productId|id)=(\d+)/i);
          return m?Number(m[1]):null;
        }
        function norm(value){return String(value||'').replace(/\s+/g,' ').trim();}
        function imageUrl(card,anchor){
          const imgs=[];
          if(anchor){const img=anchor.querySelector('img');if(img)imgs.push(img);}
          if(card)imgs.push(...card.querySelectorAll('img'));
          const candidates=[];
          for(const img of imgs){
            for(const attr of ['data-src','data-original','data-lazy-src','data-srcset','srcset','src']){
              let raw=img.getAttribute(attr)||'';
              if(attr.includes('srcset'))raw=raw.split(',')[0].trim().split(/\s+/)[0]||'';
              if(!raw||/^data:|^blob:/i.test(raw))continue;
              try{
                const url=new URL(raw,location.href);
                const low=url.href.toLowerCase();
                if(/loading|placeholder|logo|icon|sprite|zalo|facebook|youtube/.test(low))continue;
                candidates.push(url.href);
              }catch(_){}
            }
          }
          return candidates[0]||'';
        }
        function titleFromAnchor(a){
          const direct=norm(a.innerText||a.textContent);
          if(direct&&direct.length>2&&direct.length<200&&!/^(đăng nhập ngay|xem chi tiết|mua ngay)$/i.test(direct))return direct;
          const img=a.querySelector('img');
          const alt=norm(img&&(img.alt||img.title));
          return alt&&alt.length<200?alt:'';
        }
        function hasAction(card,id){
          if(!card)return false;
          const els=card.querySelectorAll('button,a,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid],[class*="cart"],[class*="buy"],[class*="quick"],[class*="add"]');
          for(const el of els){
            const attrs=['id','class','onclick','href','data-id','data-product-id','data-product','data-psid','title','aria-label'].map(n=>(el.getAttribute&&el.getAttribute(n))||'').join(' ');
            const p=`${norm(el.innerText||el.textContent)} ${attrs}`.toLowerCase();
            if(attrs.includes(String(id))||/thêm vào giỏ|them vao gio|chon mua|chọn mua|add.?to.?cart|addcart|cart|quick.?buy|quick.?view|buy.?now|dat hang|đặt hàng/.test(p))return true;
          }
          return false;
        }
        function cardFor(anchor,id){
          let best=null;
          for(let depth=0,el=anchor;depth<9&&el&&el!==document.body;depth+=1,el=el.parentElement){
            const t=norm(el.innerText||el.textContent);
            if(!t||t.length>4500)continue;
            const ids=new Set();
            for(const link of el.querySelectorAll('a[href]')){try{const x=pid(new URL(link.getAttribute('href'),location.href).href);if(x)ids.add(x);}catch(_){}}
            if(ids.size<=3&&hasAction(el,id)){
              const score=(ids.size===1?100:60)-t.length/160;
              if(!best||score>best.score)best={el,score};
            }
          }
          return best&&best.el;
        }
        const byId=new Map();
        for(const a of document.querySelectorAll('a[href]')){
          let url;try{url=new URL(a.getAttribute('href'),location.href);}catch(_){continue;}
          if(url.host!==location.host)continue;
          const id=pid(url.href);if(!id)continue;
          const title=titleFromAnchor(a);if(!title)continue;
          const card=cardFor(a,id);if(!card)continue;
          const item={id,url:url.href,title,imageUrl:imageUrl(card,a),categoryPath:location.pathname};
          const current=byId.get(id);
          if(!current||title.length>current.title.length||(!current.imageUrl&&item.imageUrl))byId.set(id,item);
        }
        return{items:[...byId.values()],pageTitle:norm((document.querySelector('h1')||{}).textContent)||norm(document.title),pageUrl:location.href};
      }
    });
    return(injected&&injected[0]&&injected[0].result)||{items:[],pageTitle:'',pageUrl:''};
  }

  async function openQuickPopup(tabId,descriptor){
    const injected=await chrome.scripting.executeScript({
      target:{tabId},args:[descriptor],
      func:async(item)=>{
        const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
        const id=Number(item&&item.id);
        function pid(value){const s=String(value||'');const m=s.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i)||s.match(/[?&](?:psId|productId|id)=(\d+)/i);return m?Number(m[1]):null;}
        function norm(value){return String(value||'').replace(/\s+/g,' ').trim();}
        const anchors=[...document.querySelectorAll('a[href]')].filter(a=>{try{return pid(new URL(a.getAttribute('href'),location.href).href)===id;}catch(_){return false;}});
        let card=null;
        for(const anchor of anchors){
          for(let depth=0,el=anchor;depth<9&&el&&el!==document.body;depth+=1,el=el.parentElement){
            const txt=norm(el.innerText||el.textContent);if(!txt||txt.length>4500)continue;
            const ids=new Set();for(const link of el.querySelectorAll('a[href]')){try{const x=pid(new URL(link.getAttribute('href'),location.href).href);if(x)ids.add(x);}catch(_){}}
            const clicks=el.querySelectorAll('button,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid],[class*="cart"],[class*="buy"],[class*="quick"],[class*="add"]');
            if(ids.size<=3&&clicks.length){card=el;if(ids.size===1)break;}
          }
          if(card)break;
        }
        if(!card)return{ok:false,reason:'card-not-found'};
        const selector='button,a,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid],[data-variant-id],[class*="cart"],[class*="buy"],[class*="quick"],[class*="add"]';
        const scored=[];
        for(const el of card.querySelectorAll(selector)){
          const attrs=['id','class','onclick','href','data-id','data-product-id','data-product','data-psid','data-variant-id','title','aria-label'].map(n=>(el.getAttribute&&el.getAttribute(n))||'').join(' ');
          const p=`${norm(el.innerText||el.textContent)} ${attrs}`.toLowerCase();
          const actionish=/thêm vào giỏ|them vao gio|chon mua|chọn mua|add.?to.?cart|addcart|cart|quick.?buy|quick.?view|buy.?now|dat hang|đặt hàng|order/.test(p);
          let hrefPid=0;if(el.matches&&el.matches('a[href]')){try{hrefPid=pid(new URL(el.getAttribute('href'),location.href).href)||0;}catch(_){}}
          if(hrefPid&&!actionish)continue;
          let score=0;if(attrs.includes(String(id)))score+=160;if(actionish)score+=150;if(el.matches&&el.matches('button,[role="button"],[onclick]'))score+=20;
          if(score>0)scored.push({el,score});
        }
        scored.sort((a,b)=>b.score-a.score);
        if(!scored.length)return{ok:false,reason:'quick-action-not-found'};
        const target=scored[0].el;
        try{target.scrollIntoView({block:'center',inline:'nearest'});}catch(_){}
        if(target.matches&&target.matches('a[href]'))target.addEventListener('click',e=>e.preventDefault(),{capture:true,once:true});
        try{target.click();}catch(_){return{ok:false,reason:'click-failed'};}
        await sleep(260);
        return{ok:true,candidates:scored.length};
      }
    });
    return(injected&&injected[0]&&injected[0].result)||{ok:false,reason:'no-result'};
  }

  async function closePopup(tabId){
    await chrome.scripting.executeScript({target:{tabId},func:()=>{
      function visible(el){if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>2&&r.height>2;}
      const roots=[...document.querySelectorAll('[role="dialog"],dialog,.modal,[class*="modal"],[class*="popup"],[class*="dialog"]')].filter(visible);
      const root=roots.find(el=>/ten size|tinh trang ton|còn hàng|con hang|hết hàng|het hang/i.test(el.innerText||el.textContent||''))||roots[0];
      if(root){
        const close=[...root.querySelectorAll('button,a,[role="button"],[aria-label],[title],[class*="close"],[data-dismiss="modal"],[data-bs-dismiss="modal"]')].find(el=>/(^|\s)(x|×|đóng|dong|close)(\s|$)/i.test(`${el.innerText||el.textContent||''} ${el.getAttribute('aria-label')||''} ${el.getAttribute('title')||''} ${el.className||''}`));
        if(close){try{close.click();return;}catch(_){}}
      }
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
    }}).catch(()=>{});
    await sleep(140);
  }

  async function scanCurrentCategory(){
    const scanBtn=document.getElementById('scanCatalogSource');
    const exportBtn=document.getElementById('exportCatalogSource');
    const state=document.getElementById('catalogState');
    if(!scanBtn||!exportBtn||!state)return;
    scanBtn.disabled=true;exportBtn.disabled=true;
    try{
      const tab=await ensureCurrentCategoryTab();
      const discovered=await discoverProducts(tab.id);
      if(!discovered.items.length)throw new Error('Trang đang mở không thấy card sản phẩm có nút mua nhanh. Hãy mở một trang danh mục sản phẩm.');
      const results=[];
      for(let i=0;i<discovered.items.length;i+=1){
        const descriptor=discovered.items[i];
        state.textContent=`Đang quét ${i+1}/${discovered.items.length}: ${descriptor.title}`;
        const opened=await openQuickPopup(tab.id,descriptor);
        if(!opened.ok){results.push({parentId:descriptor.id,parentName:descriptor.title,sourceUrl:descriptor.url,imageUrl:descriptor.imageUrl,variants:[],complete:false,errors:[{message:opened.reason}]});continue;}
        try{
          const response=await sendToTab(tab.id,{type:'DHL_SCAN_CURRENT_POPUP',hints:[]});
          if(!response||!response.ok||!response.result)throw new Error(response&&response.error?response.error:'Không đọc được popup');
          const result=response.result;
          result.parentId=Number(descriptor.id);result.parentName=descriptor.title;result.sourceUrl=descriptor.url;result.imageUrl=descriptor.imageUrl||'';
          for(const variant of result.variants||[]){variant.parentId=Number(descriptor.id);if(!variant.image)variant.image=result.imageUrl||'';variant.name=`${descriptor.title} - ${variant.color||''} - ${variant.size||''}`;}
          results.push(result);
        }catch(error){
          results.push({parentId:descriptor.id,parentName:descriptor.title,sourceUrl:descriptor.url,imageUrl:descriptor.imageUrl,variants:[],complete:false,errors:[{message:error.message||String(error)}]});
        }finally{await closePopup(tab.id);}
      }
      await chrome.storage.local.set({dhlCatalogResults:results,dhlCatalogSkuSamples:{},dhlCatalogAt:Date.now(),dhlCatalogPageTitle:discovered.pageTitle,dhlCatalogPageUrl:discovered.pageUrl});
      const ok=results.filter(x=>(x.variants||[]).length).length;
      const workbook=productCreate.makeRows(results);
      exportBtn.disabled=!workbook.rows.length;
      state.textContent=`${discovered.pageTitle||'Danh mục'}: đọc được ${ok}/${results.length} sản phẩm • ${workbook.groups.length} mẫu/màu • ${workbook.rows.length} biến thể. Sẵn sàng tạo file sản phẩm Sapo.`;
    }catch(error){state.textContent=`Lỗi: ${error.message||String(error)}`;}
    finally{scanBtn.disabled=false;}
  }

  async function exportSapoProducts(){
    const state=document.getElementById('catalogState');
    try{
      const stored=await chrome.storage.local.get(['dhlCatalogResults','dhlCatalogPageTitle']);
      const results=Array.isArray(stored.dhlCatalogResults)?stored.dhlCatalogResults:[];
      const out=productCreate.buildWorkbook(results);
      const blob=new Blob([out.bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const url=URL.createObjectURL(blob),a=document.createElement('a'),d=new Date();
      const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      a.href=url;a.download=`SAPO_TAO_SAN_PHAM_MOI_${stamp}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1800);
      if(state)state.textContent=`Đã tạo file Sapo: ${out.products} sản phẩm/màu • ${out.rows} biến thể. Có link ảnh và tồn kho nguồn.`;
    }catch(error){if(state)state.textContent=`Lỗi tạo Excel: ${error.message||String(error)}`;}
  }

  function upgrade(){
    const scanBtn=document.getElementById('scanCatalogSource');
    const exportBtn=document.getElementById('exportCatalogSource');
    const state=document.getElementById('catalogState');
    if(!scanBtn||!exportBtn||scanBtn.dataset.genericCategory==='1')return false;
    scanBtn.dataset.genericCategory='1';
    scanBtn.textContent='QUÉT SẢN PHẨM TRANG ĐANG MỞ';
    exportBtn.textContent='TẠO FILE SẢN PHẨM SAPO (.XLSX)';
    scanBtn.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();scanCurrentCategory();},true);
    exportBtn.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();exportSapoProducts();},true);
    if(state)state.textContent='Chỉ dùng khi web có sản phẩm/màu mới. Mở đúng danh mục cần thêm hàng rồi bấm quét.';
    return true;
  }

  if(!upgrade()){
    const observer=new MutationObserver(()=>{if(upgrade())observer.disconnect();});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),5000);
  }
})();
