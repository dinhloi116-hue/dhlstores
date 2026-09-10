(() => {
  'use strict';
  const core=globalThis.DHLStockCore;
  const dom=globalThis.DHLDomStockParser;
  if(!core||!dom)return;

  const TEAM_PATTERNS=[
    ['bo dao nha','portugal'],['tay ban nha','spain'],['nhat ban','japan'],['nhat','japan'],['ha lan','netherlands'],
    ['argentina','argentina'],['brazil','brazil'],['mexico','mexico'],['croatia','croatia'],['crotia','croatia'],['phap','france'],
    ['duc','germany'],['anh','england'],['bi','belgium'],['y','italy']
  ];

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function plain(v){return dom.plain(v).replace(/[^a-z0-9]+/g,' ').trim();}
  function teamKey(v){const p=` ${plain(v)} `;for(const [pat,key] of TEAM_PATTERNS)if(p.includes(` ${pat} `))return key;return'';}
  function hintForTitle(title,hints){const key=teamKey(title);return key?(hints||[]).find(h=>h&&h.team===key)||null:null;}
  function expectedCountFromHint(hint){if(!hint||!Array.isArray(hint.products))return 0;return hint.products.reduce((n,p)=>n+new Set((p.sizes||[]).map(dom.normalizeSize).filter(Boolean)).size,0);}
  function expectedSizesFromHint(hint){const set=new Set();for(const p of (hint&&hint.products)||[])for(const s of p.sizes||[])if(s)set.add(dom.normalizeSize(s));return[...set];}

  function productTitleFromDocument(doc=document){
    const selectors=['h1','[itemprop="name"]','.product-name','.detail-title','[class*="product-name"]','[class*="product-title"]'];
    for(const sel of selectors){const el=doc.querySelector(sel);if(el){const t=core.normalizeText(el.textContent);if(t)return t;}}
    return core.normalizeText(doc.title).replace(/\s*[-|].*$/,'');
  }

  function isVisible(el){
    if(!el||!el.isConnected)return false;
    const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;
    const r=el.getBoundingClientRect();return r.width>2&&r.height>2;
  }
  function textOf(el){return core.normalizeText((el&&el.textContent)||'');}
  function hasStockMarkers(t){const p=plain(t);return /ten size|tinh trang ton|con hang|het hang|ton kho/.test(p);}

  function findStockContainer(){
    const candidates=[];
    const selectors=['[role="dialog"]','dialog','.modal.show','.modal.in','.modal','.modal-content','[class*="modal"]','[class*="popup"]','[class*="dialog"]','table','form'];
    for(const sel of selectors){for(const el of document.querySelectorAll(sel)){if(!isVisible(el))continue;const t=textOf(el);if(t&&hasStockMarkers(t))candidates.push(el);}}
    if(!candidates.length){
      const markerEls=[...document.querySelectorAll('h1,h2,h3,h4,th,td,div,span,p')].filter(el=>{
        if(!isVisible(el))return false;const t=plain(textOf(el));return /ten size|tinh trang ton/.test(t);
      });
      for(const marker of markerEls){let el=marker;for(let i=0;i<6&&el;i++,el=el.parentElement){const t=textOf(el);if(t&&t.length<5000&&hasStockMarkers(t))candidates.push(el);}}
    }
    const unique=[...new Set(candidates)];
    unique.sort((a,b)=>textOf(a).length-textOf(b).length);
    return unique[0]||null;
  }

  function addToCartCandidates(){
    const els=[...document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]')].filter(isVisible);
    return els.map(el=>{
      const raw=core.normalizeText(el.innerText||el.value||el.getAttribute('title')||el.getAttribute('aria-label')||'');
      const p=plain(`${raw} ${el.id||''} ${el.className||''}`);let score=0;
      if(/them vao gio/.test(p))score+=100;
      if(/add.?to.?cart|addcart|btn.?cart/.test(p))score+=70;
      if(/mua ngay/.test(p))score+=20;
      return{el,raw,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  }

  async function ensureStockUi(){
    let container=findStockContainer();if(container)return container;
    const candidate=addToCartCandidates()[0];
    if(!candidate)throw new Error('Không tìm thấy nút Thêm vào giỏ để mở bảng tồn');
    candidate.el.click();
    for(let i=0;i<30;i++){await sleep(150);container=findStockContainer();if(container)return container;}
    throw new Error('Đã bấm Thêm vào giỏ nhưng không thấy bảng màu/size/tồn');
  }

  function rowTexts(container){
    const root=container||document;
    const items=[];
    const primary=[...root.querySelectorAll('tr,li,[role="row"]')];
    for(const el of primary){if(isVisible(el)){const t=textOf(el);if(t&&t.length<=240)items.push(t);}}
    const secondary=[...root.querySelectorAll('div,p')];
    for(const el of secondary){
      if(!isVisible(el)||el.childElementCount>10)continue;
      const t=textOf(el);if(t&&t.length>=3&&t.length<=180&&dom.extractSizeStock(t))items.push(t);
    }
    return items;
  }

  function readStockRows(container){return dom.parseRowTexts(rowTexts(container));}

  function labelForInput(input){
    if(!input)return'';
    if(input.id){const lab=document.querySelector(`label[for="${CSS.escape(input.id)}"]`);if(lab){const t=textOf(lab);if(dom.looksLikeColorName(t))return t;}}
    const own=input.closest('label');if(own){const t=textOf(own);if(dom.looksLikeColorName(t))return t;}
    for(const el of [input.nextElementSibling,input.previousElementSibling,input.parentElement]){if(el){const t=textOf(el);if(dom.looksLikeColorName(t))return t;}}
    for(const v of [input.getAttribute('data-color'),input.getAttribute('data-name'),input.getAttribute('title'),input.getAttribute('aria-label'),input.value])if(dom.looksLikeColorName(v))return core.normalizeText(v);
    return'';
  }

  function interactiveElement(el){
    if(!el)return null;
    if(el.matches('button,a,label,input,[role="button"]'))return el;
    return el.closest('button,a,label,[role="button"]')||el;
  }

  function colorControls(container){
    const root=container||document,raw=[];
    for(const input of root.querySelectorAll('input[type="radio"],input[type="checkbox"]')){
      const name=labelForInput(input);if(name)raw.push({name,el:input,priority:100});
    }
    const selectors='button,label,a,[role="button"],[data-color],[data-name],[class*="color"],[class*="mau"]';
    for(const el of root.querySelectorAll(selectors)){
      if(!isVisible(el))continue;
      const values=[el.getAttribute('data-color'),el.getAttribute('data-name'),el.getAttribute('title'),el.getAttribute('aria-label'),textOf(el)];
      const name=values.find(v=>dom.looksLikeColorName(v));if(name)raw.push({name:core.normalizeText(name),el:interactiveElement(el),priority:el.matches('input,label,button,[role="button"]')?80:40});
    }
    raw.sort((a,b)=>b.priority-a.priority);
    const out=[],seen=new Set();
    for(const item of raw){const key=dom.colorKey(item.name);if(!key||seen.has(key))continue;seen.add(key);out.push(item);}
    return out;
  }

  async function requestFirstVariant(parentId,parentName){
    try{
      const response=await fetch(`/product/child?psId=${encodeURIComponent(parentId)}`,{credentials:'include',cache:'no-store',headers:{Accept:'application/json, text/plain, */*'}});
      if(!response.ok)return null;const data=await response.json();
      return data&&data.data?core.normalizeVariant(data.data,parentId,parentName):null;
    }catch(_){return null;}
  }

  async function clickColor(control){
    const el=control&&control.el;if(!el)return;
    try{el.scrollIntoView({block:'nearest',inline:'nearest'});}catch(_){}
    if(el.matches('input')){
      el.click();
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }else el.click();
    await sleep(180);
  }

  async function stableRows(container,timeout=2200){
    let best=[],last='',stable=0;
    const start=Date.now();
    while(Date.now()-start<timeout){
      await sleep(120);
      const rows=readStockRows(container);
      const sig=JSON.stringify(rows.map(r=>[r.size,r.stock]));
      if(rows.length>best.length)best=rows;
      if(sig&&sig===last)stable++;else stable=0;
      last=sig;
      if(rows.length>=3&&stable>=2)return rows;
    }
    return best;
  }

  function makeVariant(parentId,parentName,color,row,index){
    const c=core.normalizeText(color)||'(không màu)',size=dom.normalizeSize(row.size);
    return{
      id:Number(parentId)*1000+index+1,
      parentId:Number(parentId),
      sku:`DOM-${parentId}-${dom.colorKey(c).replace(/\s+/g,'_')||'COLOR'}-${size}`.toUpperCase(),
      name:`${parentName} - ${c} - ${size}`,
      color:c,size,available:Number(row.stock),price:0,image:'',status:Number(row.stock)>0?2:0,scanMethod:'dom-popup'
    };
  }

  async function scanProductDom({descriptor=null,hints=[],sendProgress=()=>{}}={}){
    const fallbackId=descriptor&&descriptor.id?descriptor.id:core.extractProductId(location.href);
    const parentId=core.extractParentIdFromHtml(document.documentElement.innerHTML,fallbackId);
    if(!parentId)throw new Error('Không xác định được parentId sản phẩm');
    const parentName=core.normalizeText((descriptor&&descriptor.title)||productTitleFromDocument()||`#${parentId}`);
    const hint=hintForTitle(parentName,hints),expected=expectedCountFromHint(hint),expectedSizes=expectedSizesFromHint(hint);
    const container=await ensureStockUi();
    let controls=colorControls(container);
    const first=await requestFirstVariant(parentId,parentName);
    const fallbackColor=first&&first.color?first.color:'';
    if(!controls.length&&fallbackColor)controls=[{name:fallbackColor,el:null,priority:0}];
    if(!controls.length)controls=[{name:'(không màu)',el:null,priority:0}];

    const variants=[],snapshots=[],seenColor=new Set();
    for(let ci=0;ci<controls.length;ci++){
      const control=controls[ci],key=dom.colorKey(control.name)||`color-${ci}`;if(seenColor.has(key))continue;seenColor.add(key);
      if(control.el)await clickColor(control);
      const freshContainer=findStockContainer()||container;
      const rows=await stableRows(freshContainer);
      snapshots.push({color:control.name,rows});
      sendProgress({stage:'dom-color',color:control.name,colorIndex:ci+1,colorTotal:controls.length,rows:rows.length});
      rows.forEach((row,ri)=>variants.push(makeVariant(parentId,parentName,control.name,row,variants.length+ri)));
    }

    // Trường hợp control màu bị nhận thiếu: dùng màu hiện tại từ API cho bảng đang hiển thị.
    if(!variants.length&&fallbackColor){
      const rows=await stableRows(findStockContainer()||container);
      rows.forEach((row,ri)=>variants.push(makeVariant(parentId,parentName,fallbackColor,row,ri)));
      snapshots.push({color:fallbackColor,rows});
    }

    const unique=new Map();
    for(const v of variants){const k=`${dom.colorKey(v.color)}|${dom.normalizeSize(v.size)}`;if(!unique.has(k))unique.set(k,v);}
    const list=[...unique.values()];
    const colors=[...new Set(list.map(v=>dom.colorKey(v.color)).filter(Boolean))];
    const expectedColorCount=hint&&hint.products?hint.products.length:0;
    const missingSizes=[];
    if(expectedSizes.length){for(const color of colors)for(const size of expectedSizes)if(!list.some(v=>dom.colorKey(v.color)===color&&dom.normalizeSize(v.size)===size))missingSizes.push(`${color}/${size}`);}
    const complete=Boolean(list.length)&&(expected?list.length>=expected:true)&&(expectedColorCount?colors.length>=expectedColorCount:true)&&missingSizes.length===0;
    const result={
      parentId:Number(parentId),parentName,variants:list,errors:[],requestCount:1,stopReason:complete?'dom-complete':'dom-incomplete',
      confidence:complete?'high':'medium',complete,scanMethod:'dom-popup',sourceUrl:location.href,expectedFromSapo:expected,
      domDiagnostics:{stockUiFound:true,colorControls:controls.map(x=>x.name),colorsRead:colors.length,expectedColorCount,expectedSizes,missingSizes,snapshots}
    };
    result.validation=core.validateScanResult(result);
    return result;
  }

  function findProductLinksInDocument(doc,baseUrl,limit=60,predicate=null){
    const base=new URL(baseUrl,location.href),seen=new Map();
    for(const a of doc.querySelectorAll('a[href]')){
      try{const url=new URL(a.getAttribute('href'),base);if(url.host!==location.host)continue;const id=core.extractProductId(url.href);if(!id||seen.has(id))continue;
        const title=core.normalizeText(a.textContent),item={id,url:url.href,title};if(predicate&&!predicate(item))continue;seen.set(id,item);if(seen.size>=limit)break;
      }catch(_){}
    }
    return[...seen.values()];
  }

  async function discoverHd2026(){
    const url=new URL('/hd-pc36029.html',location.origin).href;
    const response=await fetch(url,{credentials:'include',cache:'no-store'});if(!response.ok)throw new Error(`Không mở được danh mục HD: HTTP ${response.status}`);
    const html=await response.text(),doc=new DOMParser().parseFromString(html,'text/html');
    const links=findProductLinksInDocument(doc,url,60,item=>/(?:^|\s)ĐT\s+.+2026\s+HD/i.test(item.title));
    if(!links.length)throw new Error('Không tìm thấy sản phẩm ĐT 2026 HD trong danh mục nguồn');return links;
  }

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(!message||!message.type)return;
    const progress=data=>chrome.runtime.sendMessage({type:'DHL_STOCK_PROGRESS',data}).catch(()=>{});
    const hints=Array.isArray(message.hints)?message.hints:[];
    if(message.type==='DHL_DISCOVER_HD_2026'){
      discoverHd2026().then(result=>sendResponse({ok:true,result})).catch(error=>sendResponse({ok:false,error:error.message}));return true;
    }
    if(message.type==='DHL_SCAN_PAGE_DOM'||message.type==='DHL_SCAN_CURRENT_DOM'||message.type==='DHL_SCAN_CURRENT'){
      scanProductDom({descriptor:message.descriptor||null,hints,sendProgress:progress}).then(result=>sendResponse({ok:true,result})).catch(error=>sendResponse({ok:false,error:error.message}));return true;
    }
  });
})();
