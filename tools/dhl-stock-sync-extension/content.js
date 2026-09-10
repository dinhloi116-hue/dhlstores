(() => {
  'use strict';
  const core=globalThis.DHLStockCore,dom=globalThis.DHLDomStockParser;
  if(!core||!dom)return;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const TEAM_PATTERNS=[['bo dao nha','portugal'],['tay ban nha','spain'],['nhat ban','japan'],['nhat','japan'],['ha lan','netherlands'],['argentina','argentina'],['brazil','brazil'],['mexico','mexico'],['croatia','croatia'],['crotia','croatia'],['phap','france'],['duc','germany'],['anh','england'],['bi','belgium'],['y','italy']];

  function plain(v){return dom.plain(v).replace(/[^a-z0-9]+/g,' ').trim();}
  function teamKey(v){const p=` ${plain(v)} `;for(const [pat,key] of TEAM_PATTERNS)if(p.includes(` ${pat} `))return key;return'';}
  function hintForTitle(title,hints){const key=teamKey(title);return key?(hints||[]).find(h=>h&&h.team===key)||null:null;}
  function expectedCount(h){return h&&Array.isArray(h.products)?h.products.reduce((n,p)=>n+new Set((p.sizes||[]).map(dom.normalizeSize).filter(Boolean)).size,0):0;}
  function expectedSizes(h){const s=new Set();for(const p of (h&&h.products)||[])for(const v of p.sizes||[])if(v)s.add(dom.normalizeSize(v));return[...s];}
  function title(){for(const sel of ['h1','[itemprop="name"]','.product-name','.detail-title','[class*="product-name"]','[class*="product-title"]']){const el=document.querySelector(sel);if(el){const t=core.normalizeText(el.textContent);if(t)return t;}}return core.normalizeText(document.title).replace(/\s*[-|].*$/,'');}
  function visible(el){if(!el||!el.isConnected)return false;const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;const r=el.getBoundingClientRect();return r.width>2&&r.height>2;}
  function txt(el){return core.normalizeText((el&&el.textContent)||'');}
  function stockMarker(v){return /ten size|tinh trang ton|con hang|het hang|ton kho/.test(plain(v));}
  function colorMarker(v){return /chon mau|mau sac|chon mau sac/.test(plain(v));}

  function findStockRoot(){
    const modal=[];
    for(const sel of ['[role="dialog"]','dialog','.modal.show','.modal.in','.modal','.modal-content','[class*="modal"]','[class*="popup"]','[class*="dialog"]']){
      for(const el of document.querySelectorAll(sel)){if(visible(el)&&stockMarker(txt(el)))modal.push(el);}
    }
    if(modal.length){modal.sort((a,b)=>txt(a).length-txt(b).length);return modal[0];}

    const tables=[...document.querySelectorAll('table,[role="table"]')].filter(el=>visible(el)&&stockMarker(txt(el)));
    for(const table of tables){
      let best=table;
      for(let i=0,el=table.parentElement;i<7&&el;i++,el=el.parentElement){const t=txt(el);if(!t||t.length>6000)break;best=el;if(colorMarker(t))return el;}
      if(best)return best;
    }

    const markers=[...document.querySelectorAll('h1,h2,h3,h4,th,td,div,span,p')].filter(el=>visible(el)&&/ten size|tinh trang ton/.test(plain(txt(el))));
    for(const m of markers){for(let i=0,el=m;i<7&&el;i++,el=el.parentElement){const t=txt(el);if(t&&t.length<6000&&stockMarker(t)&&colorMarker(t))return el;}}
    return null;
  }

  function addButton(){
    const list=[...document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]')].filter(visible).map(el=>{
      const raw=core.normalizeText(el.innerText||el.value||el.getAttribute('title')||el.getAttribute('aria-label')||''),p=plain(`${raw} ${el.id||''} ${el.className||''}`);let score=0;
      if(/them vao gio/.test(p))score=100;else if(/add.?to.?cart|addcart|btn.?cart/.test(p))score=70;else if(/mua ngay/.test(p))score=20;return{el,score};
    }).filter(x=>x.score).sort((a,b)=>b.score-a.score);return list[0]&&list[0].el;
  }
  async function ensureStockRoot(){let root=findStockRoot();if(root)return root;const btn=addButton();if(!btn)throw new Error('Không tìm thấy nút Thêm vào giỏ để mở bảng tồn');btn.click();for(let i=0;i<35;i++){await sleep(150);root=findStockRoot();if(root)return root;}throw new Error('Đã bấm Thêm vào giỏ nhưng không thấy bảng màu/size/tồn');}

  function rowTexts(root){
    const out=[];
    for(const el of root.querySelectorAll('tr,li,[role="row"]')){if(visible(el)){const t=txt(el);if(t&&t.length<=260)out.push(t);}}
    for(const el of root.querySelectorAll('div,p')){if(!visible(el)||el.childElementCount>10)continue;const t=txt(el);if(t&&t.length<=190&&dom.extractSizeStock(t))out.push(t);}
    return out;
  }
  function readRows(root){return dom.parseRowTexts(rowTexts(root));}
  async function stableRows(root,timeout=2300){let best=[],last='',stable=0;const start=Date.now();while(Date.now()-start<timeout){await sleep(130);const current=findStockRoot()||root,rows=readRows(current),sig=JSON.stringify(rows.map(r=>[r.size,r.stock]));if(rows.length>best.length)best=rows;if(sig&&sig===last)stable++;else stable=0;last=sig;if(rows.length>=3&&stable>=2)return rows;}return best;}

  function labelInput(input,root){
    if(input.id){const lab=root.querySelector(`label[for="${CSS.escape(input.id)}"]`)||document.querySelector(`label[for="${CSS.escape(input.id)}"]`);if(lab&&dom.looksLikeColorName(txt(lab)))return txt(lab);}
    const own=input.closest('label');if(own&&dom.looksLikeColorName(txt(own)))return txt(own);
    for(const el of [input.nextElementSibling,input.previousElementSibling,input.parentElement])if(el&&dom.looksLikeColorName(txt(el)))return txt(el);
    for(const v of [input.dataset&&input.dataset.color,input.dataset&&input.dataset.name,input.title,input.getAttribute('aria-label'),input.value])if(dom.looksLikeColorName(v))return core.normalizeText(v);
    return'';
  }
  function clickable(el){if(!el)return null;if(el.matches('button,a,label,input,[role="button"]'))return el;return el.closest('button,a,label,[role="button"]')||el;}
  function controls(root){
    const all=[];
    for(const input of root.querySelectorAll('input[type="radio"],input[type="checkbox"]')){const name=labelInput(input,root);if(name)all.push({name,el:input,priority:100});}
    for(const el of root.querySelectorAll('button,label,a,[role="button"],[data-color],[data-name],[class*="color"],[class*="mau"]')){
      if(!visible(el))continue;const vals=[el.getAttribute('data-color'),el.getAttribute('data-name'),el.title,el.getAttribute('aria-label'),txt(el)],name=vals.find(v=>dom.looksLikeColorName(v));if(name)all.push({name:core.normalizeText(name),el:clickable(el),priority:el.matches('input,label,button,[role="button"]')?80:40});
    }
    all.sort((a,b)=>b.priority-a.priority);const out=[],seen=new Set();for(const x of all){const k=dom.colorKey(x.name);if(!k||seen.has(k))continue;seen.add(k);out.push(x);}return out;
  }
  function findControl(name,root){const key=dom.colorKey(name);return controls(root).find(x=>dom.colorKey(x.name)===key)||null;}
  async function clickControl(control){if(!control||!control.el)return;const el=control.el;try{el.scrollIntoView({block:'nearest'});}catch(_){}el.click();if(el.matches('input')){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}await sleep(220);}

  async function firstVariant(parentId,parentName){try{const r=await fetch(`/product/child?psId=${encodeURIComponent(parentId)}`,{credentials:'include',cache:'no-store',headers:{Accept:'application/json, text/plain, */*'}});if(!r.ok)return null;const d=await r.json();return d&&d.data?core.normalizeVariant(d.data,parentId,parentName):null;}catch(_){return null;}}
  function variant(parentId,parentName,color,row,index){const c=core.normalizeText(color)||'(không màu)',size=dom.normalizeSize(row.size);return{id:Number(parentId)*1000+index+1,parentId:Number(parentId),sku:`DOM-${parentId}-${dom.colorKey(c).replace(/\s+/g,'_')||'COLOR'}-${size}`.toUpperCase(),name:`${parentName} - ${c} - ${size}`,color:c,size,available:Number(row.stock),price:0,image:'',status:Number(row.stock)>0?2:0,scanMethod:'dom-popup'};}

  async function scanDom(descriptor,hints,progress){
    const fallback=descriptor&&descriptor.id?descriptor.id:core.extractProductId(location.href),parentId=core.extractParentIdFromHtml(document.documentElement.innerHTML,fallback);if(!parentId)throw new Error('Không xác định được parentId sản phẩm');
    const parentName=core.normalizeText((descriptor&&descriptor.title)||title()||`#${parentId}`),hint=hintForTitle(parentName,hints),needed=expectedCount(hint),sizes=expectedSizes(hint);
    const root=await ensureStockRoot(),first=await firstVariant(parentId,parentName),fallbackColor=first&&first.color?first.color:'';
    let names=dom.dedupeColorNames(controls(root).map(x=>x.name));if(!names.length&&fallbackColor)names=[fallbackColor];if(!names.length)names=['(không màu)'];
    const variants=[],snapshots=[];
    for(let i=0;i<names.length;i++){
      const name=names[i],current=findStockRoot()||root,ctl=findControl(name,current);if(ctl)await clickControl(ctl);
      const rows=await stableRows(findStockRoot()||current);snapshots.push({color:name,rows});progress({stage:'dom-color',color:name,colorIndex:i+1,colorTotal:names.length,rows:rows.length});
      rows.forEach(row=>variants.push(variant(parentId,parentName,name,row,variants.length)));
    }
    if(!variants.length&&fallbackColor){const rows=await stableRows(findStockRoot()||root);rows.forEach(row=>variants.push(variant(parentId,parentName,fallbackColor,row,variants.length)));snapshots.push({color:fallbackColor,rows});}

    const unique=new Map();for(const v of variants){const k=`${dom.colorKey(v.color)}|${dom.normalizeSize(v.size)}`;if(!unique.has(k))unique.set(k,v);}const list=[...unique.values()],colorKeys=[...new Set(list.map(v=>dom.colorKey(v.color)).filter(Boolean))],expectedColors=hint&&hint.products?hint.products.length:0,missing=[];
    if(sizes.length)for(const c of colorKeys)for(const s of sizes)if(!list.some(v=>dom.colorKey(v.color)===c&&dom.normalizeSize(v.size)===s))missing.push(`${c}/${s}`);
    const complete=Boolean(list.length)&&(!needed||list.length>=needed)&&(!expectedColors||colorKeys.length>=expectedColors)&&missing.length===0;
    const result={parentId:Number(parentId),parentName,variants:list,errors:[],requestCount:1,stopReason:complete?'dom-complete':'dom-incomplete',confidence:complete?'high':'medium',complete,scanMethod:'dom-popup',sourceUrl:location.href,expectedFromSapo:needed,domDiagnostics:{stockUiFound:true,colorControls:names,colorsRead:colorKeys.length,expectedColorCount:expectedColors,expectedSizes:sizes,missingSizes:missing,snapshots}};
    result.validation=core.validateScanResult(result);return result;
  }

  function findLinks(doc,baseUrl){const base=new URL(baseUrl,location.href),seen=new Map();for(const a of doc.querySelectorAll('a[href]')){try{const url=new URL(a.getAttribute('href'),base);if(url.host!==location.host)continue;const id=core.extractProductId(url.href),t=core.normalizeText(a.textContent);if(!id||seen.has(id)||!/(?:^|\s)ĐT\s+.+2026\s+HD/i.test(t))continue;seen.set(id,{id,url:url.href,title:t});if(seen.size>=60)break;}catch(_){}}return[...seen.values()];}
  async function discover(){const url=new URL('/hd-pc36029.html',location.origin).href,r=await fetch(url,{credentials:'include',cache:'no-store'});if(!r.ok)throw new Error(`Không mở được danh mục HD: HTTP ${r.status}`);const html=await r.text(),doc=new DOMParser().parseFromString(html,'text/html'),links=findLinks(doc,url);if(!links.length)throw new Error('Không tìm thấy sản phẩm ĐT 2026 HD trong danh mục nguồn');return links;}

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(!message||!message.type)return;const progress=d=>chrome.runtime.sendMessage({type:'DHL_STOCK_PROGRESS',data:d}).catch(()=>{}),hints=Array.isArray(message.hints)?message.hints:[];
    if(message.type==='DHL_DISCOVER_HD_2026'){discover().then(result=>sendResponse({ok:true,result})).catch(e=>sendResponse({ok:false,error:e.message}));return true;}
    if(message.type==='DHL_SCAN_PAGE_DOM'||message.type==='DHL_SCAN_CURRENT_DOM'||message.type==='DHL_SCAN_CURRENT'){scanDom(message.descriptor||null,hints,progress).then(result=>sendResponse({ok:true,result})).catch(e=>sendResponse({ok:false,error:e.message}));return true;}
  });
})();
