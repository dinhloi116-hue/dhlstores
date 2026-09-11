(() => {
  'use strict';
  const productCreate=globalThis.DHLProductCreateCore;
  if(!productCreate)return;

  const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
  const SOURCE_ORIGIN='https://si.aobongda.net';

  async function activeTab(){
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    return tab;
  }

  function productIdFromUrl(value){
    const s=String(value||'');
    const m=s.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i)||s.match(/[?&](?:psId|productId|id)=(\d+)/i);
    return m?Number(m[1]):null;
  }

  function isProductDetailUrl(value){
    try{
      const url=new URL(String(value||''));
      return url.origin===SOURCE_ORIGIN&&Boolean(productIdFromUrl(url.href));
    }catch(_){return false;}
  }

  function noReceiver(error){
    return /Receiving end does not exist|Could not establish connection/i.test(String(error&&error.message?error.message:error||''));
  }

  function frameGone(error){
    return /Frame with ID 0 was removed|No frame with id 0|The frame was removed|Cannot access contents of the page/i.test(String(error&&error.message?error.message:error||''));
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

  async function waitTabComplete(tabId,timeout=25000){
    const current=await chrome.tabs.get(tabId);
    if(current.status==='complete')return current;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Tab quét nền tải quá 25 giây'));
      },timeout);
      function listener(id,info,tab){
        if(id===tabId&&info.status==='complete'){
          clearTimeout(timer);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(tab);
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  async function ensureCurrentCategoryTab(){
    const tab=await activeTab();
    if(!tab||!tab.id||!String(tab.url||'').startsWith(`${SOURCE_ORIGIN}/`))throw new Error('Hãy mở đúng danh mục trên si.aobongda.net trước.');
    if(isProductDetailUrl(tab.url))throw new Error('Bạn đang đứng ở TRANG CHI TIẾT sản phẩm. Hãy quay lại trang DANH MỤC rồi quét. Tool sẽ không tự nhảy vào trang chi tiết nữa.');
    return tab;
  }

  async function createWorkerTab(sourceTab){
    const worker=await chrome.tabs.create({url:sourceTab.url,active:false});
    await waitTabComplete(worker.id);
    await sleep(500);
    return worker;
  }

  async function removeWorkerTab(tabId){
    if(!tabId)return;
    try{await chrome.tabs.remove(tabId);}catch(_){}
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
        function safeActionElement(el,id){
          if(!el)return false;
          const ownAnchor=el.matches&&el.matches('a[href]')?el:el.closest&&el.closest('a[href]');
          if(ownAnchor){
            try{
              const href=new URL(ownAnchor.getAttribute('href'),location.href).href;
              if(pid(href))return false;
            }catch(_){}
          }
          const attrs=['id','class','onclick','data-id','data-product-id','data-product','data-psid','data-variant-id','title','aria-label']
            .map(n=>(el.getAttribute&&el.getAttribute(n))||'').join(' ');
          const p=`${norm(el.innerText||el.textContent)} ${attrs}`.toLowerCase();
          const actionish=/thêm vào giỏ|them vao gio|chon mua|chọn mua|add.?to.?cart|addcart|cart|quick.?buy|quick.?view|buy.?now|dat hang|đặt hàng|order/.test(p);
          const hasId=attrs.includes(String(id));
          return Boolean(actionish||hasId||el.matches('button,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid]'));
        }
        function hasAction(card,id){
          if(!card)return false;
          const els=card.querySelectorAll('button,a,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid],[class*="cart"],[class*="buy"],[class*="quick"],[class*="add"]');
          return [...els].some(el=>safeActionElement(el,id));
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
    try{
      const injected=await chrome.scripting.executeScript({
        target:{tabId},args:[descriptor],
        func:async(item)=>{
          const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
          const startHref=location.href;
          const id=Number(item&&item.id);
          function pid(value){const s=String(value||'');const m=s.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i)||s.match(/[?&](?:psId|productId|id)=(\d+)/i);return m?Number(m[1]):null;}
          function norm(value){return String(value||'').replace(/\s+/g,' ').trim();}
          function productAnchor(el){
            const anchor=el&&el.closest?el.closest('a[href]'):null;
            if(!anchor)return null;
            try{return pid(new URL(anchor.getAttribute('href'),location.href).href)?anchor:null;}catch(_){return null;}
          }

          const guard=(event)=>{
            const anchor=productAnchor(event.target);
            if(!anchor)return;
            event.preventDefault();
            event.stopImmediatePropagation();
            event.stopPropagation();
          };
          for(const type of ['pointerdown','mousedown','mouseup','click','auxclick','touchstart'])window.addEventListener(type,guard,true);

          try{
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
              if(productAnchor(el))continue;
              const attrs=['id','class','onclick','data-id','data-product-id','data-product','data-psid','data-variant-id','title','aria-label'].map(n=>(el.getAttribute&&el.getAttribute(n))||'').join(' ');
              const p=`${norm(el.innerText||el.textContent)} ${attrs}`.toLowerCase();
              const actionish=/thêm vào giỏ|them vao gio|chon mua|chọn mua|add.?to.?cart|addcart|cart|quick.?buy|quick.?view|buy.?now|dat hang|đặt hàng|order/.test(p);
              const safeType=el.matches&&el.matches('button,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid]');
              let score=0;
              if(attrs.includes(String(id)))score+=180;
              if(actionish)score+=160;
              if(safeType)score+=30;
              if(score>0&&safeType)scored.push({el,score});
            }
            scored.sort((a,b)=>b.score-a.score);
            if(!scored.length)return{ok:false,reason:'safe-quick-action-not-found'};
            const target=scored[0].el;
            try{target.scrollIntoView({block:'center',inline:'nearest'});}catch(_){}
            try{target.click();}catch(_){return{ok:false,reason:'click-failed'};}
            await sleep(320);
            if(location.href!==startHref)return{ok:false,reason:'navigation-block-failed'};
            return{ok:true,candidates:scored.length};
          }finally{
            for(const type of ['pointerdown','mousedown','mouseup','click','auxclick','touchstart'])window.removeEventListener(type,guard,true);
          }
        }
      });
      return(injected&&injected[0]&&injected[0].result)||{ok:false,reason:'no-result'};
    }catch(error){
      if(frameGone(error))return{ok:false,reason:'frame-removed-navigation'};
      throw error;
    }
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

  async function scanInWorker({limit=Infinity,store=true,testOnly=false}={}){
    const sourceTab=await ensureCurrentCategoryTab();
    let worker=null;
    try{
      worker=await createWorkerTab(sourceTab);
      const discovered=await discoverProducts(worker.id);
      if(!discovered.items.length)throw new Error('Trang đang mở không thấy card sản phẩm có nút mua nhanh. Hãy mở một trang DANH MỤC sản phẩm.');
      const items=discovered.items.slice(0,Math.max(1,Number.isFinite(limit)?limit:discovered.items.length));
      const results=[];
      const state=document.getElementById('catalogState');

      for(let i=0;i<items.length;i+=1){
        const descriptor=items[i];
        if(state)state.textContent=`${testOnly?'TEST NHANH':'Đang quét'} ${i+1}/${items.length}: ${descriptor.title} (quét ở tab nền)`;
        const before=await chrome.tabs.get(worker.id);
        if(before.url!==discovered.pageUrl)throw new Error('Tab quét nền đã rời khỏi trang danh mục. Dừng để tránh đọc sai dữ liệu.');

        const opened=await openQuickPopup(worker.id,descriptor);
        if(!opened.ok){
          results.push({parentId:descriptor.id,parentName:descriptor.title,sourceUrl:descriptor.url,imageUrl:descriptor.imageUrl,variants:[],complete:false,errors:[{message:opened.reason}]});
          if(testOnly)throw new Error(`Không mở được popup an toàn cho ${descriptor.title}: ${opened.reason}`);
          continue;
        }
        try{
          const response=await sendToTab(worker.id,{type:'DHL_SCAN_CURRENT_POPUP',hints:[]});
          if(!response||!response.ok||!response.result)throw new Error(response&&response.error?response.error:'Không đọc được popup');
          const result=response.result;
          result.parentId=Number(descriptor.id);result.parentName=descriptor.title;result.sourceUrl=descriptor.url;result.imageUrl=descriptor.imageUrl||'';
          for(const variant of result.variants||[]){variant.parentId=Number(descriptor.id);if(!variant.image)variant.image=result.imageUrl||'';variant.name=`${descriptor.title} - ${variant.color||''} - ${variant.size||''}`;}
          results.push(result);
        }catch(error){
          results.push({parentId:descriptor.id,parentName:descriptor.title,sourceUrl:descriptor.url,imageUrl:descriptor.imageUrl,variants:[],complete:false,errors:[{message:error.message||String(error)}]});
          if(testOnly)throw error;
        }finally{await closePopup(worker.id);}
      }

      if(store){
        await chrome.storage.local.set({dhlCatalogResults:results,dhlCatalogSkuSamples:{},dhlCatalogAt:Date.now(),dhlCatalogPageTitle:discovered.pageTitle,dhlCatalogPageUrl:discovered.pageUrl});
      }
      return{results,discovered};
    }finally{
      if(worker)await removeWorkerTab(worker.id);
    }
  }

  async function scanCurrentCategory(){
    const scanBtn=document.getElementById('scanCatalogSource');
    const testBtn=document.getElementById('catalogQuickTest');
    const exportBtn=document.getElementById('exportCatalogSource');
    const state=document.getElementById('catalogState');
    if(!scanBtn||!exportBtn||!state)return;
    scanBtn.disabled=true;if(testBtn)testBtn.disabled=true;exportBtn.disabled=true;
    try{
      state.textContent='Đang tạo tab quét nền. Trang bạn đang xem sẽ được giữ nguyên.';
      const {results,discovered}=await scanInWorker({store:true});
      const ok=results.filter(x=>(x.variants||[]).length).length;
      const workbook=productCreate.makeRows(results);
      exportBtn.disabled=!workbook.rows.length;
      state.textContent=`${discovered.pageTitle||'Danh mục'}: đọc được ${ok}/${results.length} sản phẩm • ${workbook.groups.length} mẫu/màu • ${workbook.rows.length} biến thể. Trang gốc không bị điều hướng.`;
    }catch(error){state.textContent=`Lỗi: ${error.message||String(error)}`;}
    finally{scanBtn.disabled=false;if(testBtn)testBtn.disabled=false;}
  }

  async function quickTestOne(){
    const scanBtn=document.getElementById('scanCatalogSource');
    const testBtn=document.getElementById('catalogQuickTest');
    const state=document.getElementById('catalogState');
    if(!testBtn||!state)return;
    testBtn.disabled=true;if(scanBtn)scanBtn.disabled=true;
    try{
      state.textContent='TEST NHANH: chỉ kiểm tra 1 sản phẩm trong tab nền...';
      const {results}=await scanInWorker({limit:1,store:false,testOnly:true});
      const result=results[0];
      const count=(result&&result.variants||[]).length;
      if(!count)throw new Error('Popup mở được nhưng chưa đọc được biến thể nào.');
      state.textContent=`TEST OK: ${result.parentName} • đọc ${count} biến thể. Không nhảy trang chi tiết. Có thể chạy QUÉT TOÀN BỘ.`;
    }catch(error){state.textContent=`TEST LỖI: ${error.message||String(error)}`;}
    finally{testBtn.disabled=false;if(scanBtn)scanBtn.disabled=false;}
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
    if(!scanBtn||!exportBtn||scanBtn.dataset.genericCategory==='2')return false;
    scanBtn.dataset.genericCategory='2';
    scanBtn.textContent='QUÉT TOÀN BỘ TRANG ĐANG MỞ';
    exportBtn.textContent='TẠO FILE SẢN PHẨM SAPO (.XLSX)';

    let testBtn=document.getElementById('catalogQuickTest');
    if(!testBtn){
      testBtn=document.createElement('button');
      testBtn.id='catalogQuickTest';
      testBtn.type='button';
      testBtn.className='secondary';
      testBtn.textContent='TEST NHANH 1 SP';
      testBtn.style.flex='1';
      testBtn.style.minWidth='120px';
      scanBtn.parentElement.insertBefore(testBtn,exportBtn);
    }

    scanBtn.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();scanCurrentCategory();},true);
    testBtn.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();quickTestOne();},true);
    exportBtn.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();exportSapoProducts();},true);
    if(state)state.textContent='Mở đúng TRANG DANH MỤC. Nên bấm TEST NHANH 1 SP trước; quét thật sẽ chạy trong tab nền nên không làm nhảy trang bạn đang xem.';
    return true;
  }

  if(!upgrade()){
    const observer=new MutationObserver(()=>{if(upgrade())observer.disconnect();});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),5000);
  }
})();
