const fs=require('fs');
const path=require('path');

function replaceBlock(source,startMarker,endMarker,replacement,label){
  const start=source.indexOf(startMarker);
  if(start<0)throw new Error(`GENERIC PATCH: thiếu start ${label}`);
  const end=source.indexOf(endMarker,start);
  if(end<0)throw new Error(`GENERIC PATCH: thiếu end ${label}`);
  return source.slice(0,start)+replacement+'\n\n  '+source.slice(end);
}

{
  const file=path.join(__dirname,'content.js');
  let source=fs.readFileSync(file,'utf8');
  source=source.replace("  const HD_PATH = '/hd-pc36029.html';\n",'');

  source=replaceBlock(source,'  function targetSizesForHint(hint) {','  function productTitleFromDocument(',`  function targetSizesForHint(hint) {
    const requested=[];
    const seen=new Set();
    for(const product of (hint&&hint.products)||[]){
      for(const value of product.sizes||[]){
        const size=dom.normalizeSize(value);
        if(size&&!seen.has(size)){seen.add(size);requested.push(size);}
      }
    }
    return requested;
  }

  function detectedSizesFromRoot(root){
    const out=[],seen=new Set();
    if(!root)return out;
    for(const tr of root.querySelectorAll('tr,[role="row"]')){
      if(!visible(tr))continue;
      const hit=dom.extractSizeStock(text(tr));
      if(!hit)continue;
      const size=dom.normalizeSize(hit.size);
      if(size&&!seen.has(size)){seen.add(size);out.push(size);}
    }
    if(!out.length){
      for(const el of root.querySelectorAll('li,div,p,span')){
        if(!visible(el)||el.childElementCount>10)continue;
        const hit=dom.extractSizeStock(text(el));
        if(!hit)continue;
        const size=dom.normalizeSize(hit.size);
        if(size&&!seen.has(size)){seen.add(size);out.push(size);}
      }
    }
    return out;
  }`,'targetSizes');

  source=replaceBlock(source,'  function findProductLinksInDocument(','  function stockMarker(',`  function titleForProductAnchor(a) {
    const direct=core.normalizeText(a&&a.textContent);
    if(direct&&direct.length>2&&direct.length<200&&!/^(đăng nhập ngay|xem chi tiết|mua ngay)$/i.test(direct))return direct;
    const img=a&&a.querySelector&&a.querySelector('img');
    const alt=core.normalizeText(img&&(img.alt||img.title));
    return alt&&alt.length<200?alt:'';
  }

  function findProductLinksInDocument(doc=document,baseUrl=location.href){
    const base=new URL(baseUrl,location.href),seen=new Map();
    for(const a of doc.querySelectorAll('a[href]')){
      try{
        const url=new URL(a.getAttribute('href'),base);
        if(url.host!==location.host)continue;
        const id=core.extractProductId(url.href),title=titleForProductAnchor(a);
        if(!id||!title)continue;
        const current=seen.get(id);
        if(!current||title.length>current.title.length)seen.set(id,{id,url:url.href,title,categoryPath:location.pathname});
      }catch(_){}
    }
    return[...seen.values()];
  }

  async function discoverCurrentCategory(){
    const links=findProductLinksInDocument(document,location.href);
    if(!links.length)throw new Error('Không tìm thấy sản phẩm trên trang danh mục đang mở');
    return links;
  }`,'discover');

  source=replaceBlock(source,'  function readTargetRows(root, targetSizes) {','  function rowsSignature(',`  function readTargetRows(root,targetSizes){
    if(!root)return[];
    const order=(targetSizes&&targetSizes.length?targetSizes:detectedSizesFromRoot(root)).map(dom.normalizeSize).filter(Boolean);
    const wanted=new Set(order),rows=[];
    for(const tr of root.querySelectorAll('tr,[role="row"]')){
      if(!visible(tr))continue;
      const hit=dom.extractSizeStock(text(tr));if(!hit)continue;
      const size=dom.normalizeSize(hit.size);
      if(!wanted.size||wanted.has(size))rows.push({size,stock:Number(hit.stock),raw:text(tr)});
    }
    if(!rows.length){
      const values=[];
      for(const el of root.querySelectorAll('li,div,p,span')){
        if(!visible(el)||el.childElementCount>10)continue;
        const value=text(el);if(value&&value.length<=220&&dom.extractSizeStock(value))values.push(value);
      }
      for(const row of dom.parseRowTexts(values)){
        const size=dom.normalizeSize(row.size);
        if(!wanted.size||wanted.has(size))rows.push({...row,size});
      }
    }
    const unique=new Map();for(const row of rows)if(!unique.has(row.size))unique.set(row.size,row);
    const finalOrder=order.length?order:[...unique.keys()];
    return finalOrder.filter(size=>unique.has(size)).map(size=>unique.get(size));
  }`,'readRows');

  source=source.replace('    const rows = readTargetRows(root, TARGET_SIZES);','    const rows = readTargetRows(root, detectedSizesFromRoot(root));');
  source=source.replace("  async function waitForPopupRefresh(beforeFingerprint, timeout = 3200) {","  async function waitForPopupRefresh(beforeFingerprint, expectedPath, timeout = 3200) {");
  source=source.replace("      if (location.pathname !== HD_PATH) throw new Error('Trang nguồn đã rời danh mục HD; dừng quét để tránh sai dữ liệu.');","      if (expectedPath && location.pathname !== expectedPath) throw new Error('Trang nguồn đã rời danh mục đang quét; dừng để tránh sai dữ liệu.');");
  source=source.replace("    if (location.pathname !== HD_PATH) throw new Error('Tool chỉ quét popup tại trang danh mục HD, không mở trang chi tiết.');","    const expectedPath=descriptor.categoryPath||location.pathname;\n    if (location.pathname !== expectedPath) throw new Error('Tool chỉ quét trên đúng trang danh mục đang mở.');");
  source=source.replace('      const root = await waitForPopupRefresh(before, 3200);','      const root = await waitForPopupRefresh(before, expectedPath, 3200);');
  source=source.replace('    const neededSizes = targetSizesForHint(hint);','    const hintedSizes = targetSizesForHint(hint);\n    const neededSizes = hintedSizes.length ? hintedSizes : detectedSizesFromRoot(root);');
  source=source.replace("        ignoredSizes: ['XXXL', 'XXXXL', 'XXXXXL'],","        ignoredSizes: [],");

  source=replaceBlock(source,'  async function scanHdLive(hints, progress) {','  async function scanCurrentPopup(',`  async function scanHdLive(hints,progress){
    const categoryPath=location.pathname;
    const links=await discoverCurrentCategory();
    links.forEach(item=>{item.categoryPath=categoryPath;});
    progress({stage:'discovered',productTotal:links.length,categoryPath});
    const results=[];
    const stale=findStockRoot();if(stale)await closeStockPopup(stale);
    for(let i=0;i<links.length;i+=1){
      if(location.pathname!==categoryPath)throw new Error('Trang nguồn đã rời danh mục đang quét.');
      const descriptor=links[i];
      progress({stage:'product',productIndex:i+1,productTotal:links.length,descriptor});
      results.push(await scanOneDescriptor(descriptor,hints,progress));
      await sleep(180);
    }
    const finalPopup=findStockRoot();if(finalPopup)await closeStockPopup(finalPopup);
    return results;
  }`,'scanLive');

  if(source.includes('HD_PATH'))throw new Error('GENERIC PATCH: vẫn còn HD_PATH trong content.js');
  source=source.replace(/sapo-target-color-5-size/g,'category-target-color-size');
  fs.writeFileSync(file,source,'utf8');
}

{
  const file=path.join(__dirname,'popup.js');
  let source=fs.readFileSync(file,'utf8');
  source=source.replace("  const VERSION = '0.11.0';","  const VERSION = '0.14.0';");
  source=source.replace("  const HD_URL = 'https://si.aobongda.net/hd-pc36029.html';\n",'');
  source=replaceBlock(source,'  async function ensureHdCategoryTab() {','  async function runHdScan() {',`  async function ensureCurrentCategoryTab() {
    const tab=await activeTab();
    if(!tab||!tab.id||!String(tab.url||'').startsWith('https://si.aobongda.net/'))throw new Error('Hãy mở danh mục cần quét trên si.aobongda.net trước.');
    const current=new URL(tab.url);
    if(/-p\\d+(?:\\.html)?$/i.test(current.pathname))throw new Error('Bạn đang ở trang chi tiết sản phẩm. Hãy mở một trang danh mục rồi quét.');
    return tab;
  }`,'popupEnsure');
  source=source.replace('const tab = await ensureHdCategoryTab();','const tab = await ensureCurrentCategoryTab();');
  source=source.replace('Đang quét: chỉ lấy các màu mà file Sapo cần; mỗi màu chỉ đọc S/M/L/XL/XXL rồi chuyển ngay.','Đang quét trang danh mục hiện tại: lấy đúng màu và toàn bộ size mà file Sapo cần.');
  source=source.replace('Bấm QUÉT KHO HD 2026.','Bấm QUÉT KHO TRANG ĐANG MỞ.');
  source=source.replace(/QUÉT KHO HD 2026/g,'QUÉT KHO TRANG ĐANG MỞ');
  fs.writeFileSync(file,source,'utf8');
}

console.log('GENERIC CATEGORY PATCH PASS: current category + dynamic sizes + no HD redirect');
