(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const matcher=globalThis.DHLMatchCore;
  const xlsx=globalThis.DHLXlsxLite;
  if(!matcher||!xlsx)return;

  let sapoData=null,templateBuffer=null,sourceResults=[],matches=[];
  let sapoExportFileName='',sapoTemplateFileName='',lastStatusText='Chưa bắt đầu.';

  async function activeTab(){const [tab]=await chrome.tabs.query({active:true,currentWindow:true});return tab;}
  function setStatus(text,kind=''){const el=$('statusBox');lastStatusText=String(text||'');el.textContent=lastStatusText;el.classList.toggle('error',kind==='error');el.classList.toggle('ok',kind==='ok');}
  function escapeHtml(text){return String(text||'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));}
  function sourceGroups(){return matcher.groupSourceVariants(sourceResults);}
  function readyVariantCount(){return matches.reduce((n,m)=>n+(m.complete?m.variantMatches.length:0),0);}
  function fullMatchReady(){return Boolean(sapoData&&sapoData.products.length&&matches.length===sapoData.products.length&&matches.every(m=>m.complete)&&readyVariantCount()===sapoData.variants.length);}

  function updateStats(){
    $('sapoProductCount').textContent=sapoData?sapoData.products.length:0;
    $('sapoVariantCount').textContent=sapoData?sapoData.variants.length:0;
    $('sourceGroupCount').textContent=sourceGroups().length;
    $('matchedCount').textContent=matches.filter(m=>m.complete).length;
    $('readyVariantCount').textContent=readyVariantCount();
    $('makeImport').disabled=!(sapoData&&templateBuffer&&fullMatchReady());
  }

  function renderMatches(){
    const q=$('filter').value.trim().toLowerCase();
    const rows=matches.filter(m=>!q||`${m.sapoProduct.name} ${m.sapoProduct.skuBase||''} ${m.best?m.best.parentName:''} ${m.best?m.best.color:''}`.toLowerCase().includes(q));
    $('matchBody').innerHTML=rows.map(m=>{
      const best=m.best?`${m.best.parentName} / ${m.best.color}`:'—';
      const sizesOk=m.variantMatches.filter(x=>x.source).length,total=m.sapoProduct.variants.length,score=m.best?Math.round(m.best.score*100):0;
      const cls=m.complete?'ok-row':'warn-row',pill=m.complete?'<span class="pill ok">OK</span>':'<span class="pill warn">Cần kiểm tra</span>';
      const base=m.sapoProduct.skuBase?`<br><small>SKU gốc: ${escapeHtml(m.sapoProduct.skuBase)}</small>`:'';
      return `<tr class="${cls}"><td>${escapeHtml(m.sapoProduct.name)}${base}</td><td>${escapeHtml(best)}</td><td class="score">${score}%</td><td>${sizesOk}/${total}</td><td>${pill}</td></tr>`;
    }).join('');
  }

  function recomputeMatches(){
    matches=sapoData&&sourceResults.length?matcher.matchSapoProducts(sapoData.products,sourceResults):[];
    updateStats();renderMatches();
    if(!matches.length)return;
    const ok=matches.filter(m=>m.complete).length,ready=readyVariantCount(),groups=sourceGroups().length;
    if(fullMatchReady())setStatus(`Ghép đủ ${ok}/${sapoData.products.length} sản phẩm, ${ready}/${sapoData.variants.length} size. Có thể tạo file nhập.`,'ok');
    else setStatus(`Ghép chắc chắn ${ok}/${sapoData.products.length} sản phẩm, ${ready}/${sapoData.variants.length} size. Nguồn đang thấy ${groups} mẫu/màu. Chưa đủ thì KHÔNG cho tạo file nhập.`,'error');
  }

  async function loadExport(file){
    if(!file)return;sapoExportFileName=file.name||'';setStatus('Đang đọc file xuất Sapo...');
    try{
      sapoData=await xlsx.parseSapoExport(await file.arrayBuffer());
      const sizeText=`${sapoData.sizeResolved}/${sapoData.sizeTotal} size tự nhận`;
      $('exportState').textContent=`${sapoData.products.length} sản phẩm • ${sapoData.variants.length} biến thể • ${sizeText}`;
      recomputeMatches();
      if(!sourceResults.length)setStatus(`Đã đọc ${sapoData.products.length} sản phẩm; nhận ${sizeText}. Bấm QUÉT KHO HD 2026.`,'ok');
    }catch(error){sapoData=null;$('exportState').textContent='File không hợp lệ.';updateStats();setStatus(error.message||String(error),'error');}
  }

  async function loadTemplate(file){
    if(!file)return;sapoTemplateFileName=file.name||'';setStatus('Đang kiểm tra file mẫu nhập...');
    try{
      const buffer=await file.arrayBuffer(),book=await xlsx.readFirstSheet(buffer),h=xlsx.headerMap(book.rows[0]||[]),inv=Object.keys(h).find(k=>/Tồn kho/i.test(k));
      if(!inv||h['Id phiên bản']==null)throw new Error('Không đúng mẫu nhập Sapo: thiếu Tồn kho hoặc Id phiên bản.');
      templateBuffer=buffer;$('templateState').textContent=`Đúng mẫu • cột tồn: ${inv}`;updateStats();setStatus('File mẫu nhập hợp lệ.','ok');
    }catch(error){templateBuffer=null;$('templateState').textContent='Mẫu không hợp lệ.';updateStats();setStatus(error.message||String(error),'error');}
  }

  function noReceiver(error){return /Receiving end does not exist|Could not establish connection/i.test(String(error&&error.message?error.message:error||''));}
  async function injectScanner(tabId){
    await chrome.scripting.executeScript({target:{tabId},files:['stock-core.js']});
    await chrome.scripting.executeScript({target:{tabId},files:['dom-stock-parser.js']});
    await chrome.scripting.executeScript({target:{tabId},files:['content.js']});
    await new Promise(r=>setTimeout(r,150));
  }
  async function sendToTab(tabId,message){
    try{return await chrome.tabs.sendMessage(tabId,message);}catch(error){
      if(!noReceiver(error))throw error;
      await injectScanner(tabId);
      return await chrome.tabs.sendMessage(tabId,message);
    }
  }
  async function sendActive(type,extra={}){
    const tab=await activeTab();
    if(!tab||!tab.id||!String(tab.url||'').startsWith('https://si.aobongda.net/'))throw new Error('Hãy mở si.aobongda.net và đăng nhập trước.');
    return sendToTab(tab.id,{type,...extra});
  }

  async function waitTabComplete(tabId,timeout=22000){
    const current=await chrome.tabs.get(tabId);if(current.status==='complete')return current;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(listener);reject(new Error('Trang sản phẩm tải quá 22 giây'));},timeout);
      function listener(id,info,tab){if(id===tabId&&info.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve(tab);}}
      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  async function scanHdViaTabs(hints){
    const discovery=await sendActive('DHL_DISCOVER_HD_2026');
    if(!discovery||!discovery.ok)throw new Error(discovery&&discovery.error?discovery.error:'Không lấy được danh sách sản phẩm nguồn');
    const links=Array.isArray(discovery.result)?discovery.result:[];if(!links.length)throw new Error('Danh mục HD 2026 không có sản phẩm để quét');
    setStatus(`Tìm thấy ${links.length} sản phẩm nguồn. Bắt đầu mở từng sản phẩm và đọc popup màu/size/tồn...`);
    const results=[];let worker=null;
    try{
      worker=await chrome.tabs.create({url:'about:blank',active:false});
      for(let i=0;i<links.length;i++){
        const descriptor=links[i];setStatus(`Đang quét ${i+1}/${links.length}: ${descriptor.title}. Tự mở popup và đọc từng màu/size...`);
        try{
          await chrome.tabs.update(worker.id,{url:descriptor.url,active:false});
          await waitTabComplete(worker.id);await new Promise(r=>setTimeout(r,450));
          const response=await sendToTab(worker.id,{type:'DHL_SCAN_PAGE_DOM',descriptor,hints});
          if(!response||!response.ok)throw new Error(response&&response.error?response.error:'Không nhận được dữ liệu DOM');
          results.push(response.result);
        }catch(error){
          results.push({parentId:descriptor.id,parentName:descriptor.title||'',sourceUrl:descriptor.url,variants:[],complete:false,confidence:'low',scanMethod:'dom-popup',stopReason:'dom-error',errors:[{message:error.message||String(error)}],domDiagnostics:{}});
        }
        await new Promise(r=>setTimeout(r,180));
      }
    }finally{if(worker&&worker.id)try{await chrome.tabs.remove(worker.id);}catch(_){}}
    return results;
  }

  async function runSourceScan(type){
    $('scanHd').disabled=true;$('scanCurrent').disabled=true;$('makeImport').disabled=true;
    try{
      const hints=sapoData?matcher.buildScanHints(sapoData.products):[];
      if(type==='HD')sourceResults=await scanHdViaTabs(hints);
      else{
        setStatus('Đang test sản phẩm hiện tại: mở popup và đọc các màu/size...');
        const response=await sendActive('DHL_SCAN_CURRENT_DOM',{hints});
        if(!response||!response.ok)throw new Error(response&&response.error?response.error:'Không nhận được dữ liệu nguồn');
        sourceResults=[response.result];
      }
      await chrome.storage.local.set({dhlLastSourceResults:sourceResults,dhlLastSourceAt:Date.now()});
      recomputeMatches();
    }catch(error){setStatus(error.message||String(error),'error');}
    finally{$('scanHd').disabled=false;$('scanCurrent').disabled=false;updateStats();}
  }

  async function makeImport(){
    if(!sapoData||!templateBuffer)return;
    if(!fullMatchReady()){setStatus('Chưa ghép đủ toàn bộ sản phẩm và size; tool chặn tạo file để tránh cập nhật thiếu.','error');return;}
    const inventory=Object.create(null);
    for(const m of matches)for(const vm of m.variantMatches)inventory[String(vm.sapo.variantId)]=Number(vm.source.available);
    try{
      const out=await xlsx.buildSapoImport(templateBuffer,sapoData,inventory);
      const blob=new Blob([out.bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      const d=new Date(),stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      a.href=url;a.download=`SAPO_NHAP_TON_KHO_${stamp}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
      setStatus(`Đã tạo file nhập ${out.rows} dòng. Chỉ tồn kho thay đổi; tên, ảnh, giá, SKU và Id phiên bản giữ nguyên.`,'ok');
    }catch(error){setStatus(error.message||String(error),'error');}
  }

  function val(v){if(v==null||v==='')return'—';if(typeof v==='object'){try{return JSON.stringify(v);}catch(_){}}return String(v);}
  function buildErrorReport(){
    const lines=[],add=s=>lines.push(String(s)),groups=sourceGroups();
    add('DHL STOCK SYNC - BÁO CÁO LỖI / CHẨN ĐOÁN');add('============================================================');
    add(`Thời điểm: ${new Date().toLocaleString('vi-VN')}`);add('Phiên bản tool: 0.8.0');add(`Trạng thái: ${lastStatusText}`);
    add(`File xuất Sapo: ${sapoExportFileName||'—'}`);add(`File mẫu nhập: ${sapoTemplateFileName||'—'}`);add('');
    add(`SAPO: ${sapoData?sapoData.products.length:0} sản phẩm | ${sapoData?sapoData.variants.length:0} biến thể | size ${sapoData?`${sapoData.sizeResolved}/${sapoData.sizeTotal}`:'0/0'}`);
    add(`NGUỒN: ${sourceResults.length} sản phẩm | ${groups.length} mẫu/màu`);add(`GHÉP: ${matches.filter(m=>m.complete).length}/${sapoData?sapoData.products.length:0} sản phẩm | ${readyVariantCount()}/${sapoData?sapoData.variants.length:0} size`);add('');
    add('1. CHI TIẾT QUÉT DOM NGUỒN');add('============================================================');
    sourceResults.forEach((p,i)=>{
      add(`\n[Nguồn ${i+1}/${sourceResults.length}] ${val(p.parentName)}`);add(`URL: ${val(p.sourceUrl)}`);add(`Parent ID: ${val(p.parentId)} | method=${val(p.scanMethod)} | complete=${val(p.complete)} | confidence=${val(p.confidence)} | stop=${val(p.stopReason)}`);
      const d=p.domDiagnostics||{};add(`Màu control thấy: ${val(d.colorControls)}`);add(`Số màu đọc: ${val(d.colorsRead)} / cần: ${val(d.expectedColorCount)}`);add(`Size cần: ${val(d.expectedSizes)}`);add(`Size/màu còn thiếu: ${val(d.missingSizes)}`);
      if(p.errors&&p.errors.length)add(`Lỗi: ${val(p.errors)}`);
      for(const v of p.variants||[])add(`  ${v.color} | ${v.size} | tồn=${v.available} | sku=${v.sku}`);
      if(d.snapshots&&d.snapshots.length){add('Snapshot từng màu:');for(const s of d.snapshots)add(`  ${s.color}: ${(s.rows||[]).map(r=>`${r.size}=${r.stock}`).join(', ')||'KHÔNG ĐỌC ĐƯỢC'}`);}
    });
    add('\n2. CHI TIẾT GHÉP SAPO ↔ NGUỒN');add('============================================================');
    matches.forEach((m,i)=>{
      const p=m.sapoProduct||{},best=m.best?`${m.best.parentName} / ${m.best.color} (${Math.round((m.best.score||0)*100)}%)`:'KHÔNG CÓ';
      add(`\n[Sapo ${i+1}/${matches.length}] ${p.name}`);add(`SKU gốc: ${p.skuBase||'—'} | Best: ${best} | Complete=${m.complete}`);
      for(const vm of m.variantMatches||[])add(`  ${vm.sapo.size} | ${vm.sapo.sku} → ${vm.source?`${vm.source.color}/${vm.source.size}/tồn=${vm.source.available}`:`KHÔNG GHÉP (${vm.reason})`}`);
    });
    return lines.join('\r\n');
  }
  function downloadErrorReport(){
    const blob=new Blob(['\ufeff',buildErrorReport()],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a'),d=new Date();
    const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
    a.href=url;a.download=`DHL_STOCK_SYNC_LOI_${stamp}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  $('sapoExport').addEventListener('change',e=>loadExport(e.target.files&&e.target.files[0]));
  $('sapoTemplate').addEventListener('change',e=>loadTemplate(e.target.files&&e.target.files[0]));
  $('scanHd').addEventListener('click',()=>runSourceScan('HD'));
  $('scanCurrent').addEventListener('click',()=>runSourceScan('CURRENT'));
  $('makeImport').addEventListener('click',makeImport);
  $('exportErrorReport').addEventListener('click',downloadErrorReport);
  $('filter').addEventListener('input',renderMatches);

  chrome.runtime.onMessage.addListener(message=>{
    if(!message||message.type!=='DHL_STOCK_PROGRESS')return;const d=message.data||{};
    if(d.stage==='dom-color')setStatus(`Đang đọc màu ${d.colorIndex}/${d.colorTotal}: ${d.color} — thấy ${d.rows} size.`);
  });

  (async()=>{
    const tab=await activeTab(),ok=tab&&String(tab.url||'').startsWith('https://si.aobongda.net/');
    $('sourceState').textContent=ok?'Nguồn OK':'Mở web nguồn';if(ok)$('sourceState').style.background='#eaf8ef';
    const stored=await chrome.storage.local.get(['dhlLastSourceResults','dhlLastSourceAt']);
    if(stored.dhlLastSourceResults){sourceResults=stored.dhlLastSourceResults;updateStats();setStatus(`Đã nạp dữ liệu quét cũ. Bấm QUÉT KHO HD 2026 để quét lại bằng cơ chế popup mới.`);}else updateStats();
  })().catch(error=>setStatus(error.message||String(error),'error'));
})();
