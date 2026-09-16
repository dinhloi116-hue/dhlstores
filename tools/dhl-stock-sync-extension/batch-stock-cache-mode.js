(() => {
  'use strict';

  const xlsx=globalThis.DHLXlsxLite;
  const matcher=globalThis.DHLMatchCore;
  const stockImport=globalThis.DHLStockImportCore;
  const batch=globalThis.DHLBatchStockCore;
  if(!xlsx||!matcher||!stockImport||!batch)return;

  const BATCH_KEY='dhlPendingStockBatchV1';
  const PROFILE_KEY='dhlSavedStockProfilesV1';
  const SELECTED_KEY='dhlSelectedStockProfileId';
  let latestSource=[];
  let latestSourceAt=0;
  let caching=false;
  let lastCacheToken='';

  const text=(v)=>String(v==null?'':v).trim();
  const plain=(v)=>text(v).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\bkhong in(?: ten so)?\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const esc=(v)=>text(v).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

  function displaySize(variant){
    if(!variant)return'';
    if(variant.displaySize)return text(variant.displaySize);
    const raw=text(variant.rawProductLabel);
    const hit=raw.match(/\/\s*Size\s*[:\-]?\s*(\d{1,3})/i);
    if(hit)return hit[1];
    const attr=text(variant.sizeFromAttribute||variant.size);
    const attrHit=attr.match(/(?:^|\b)SIZE\s*[:\-]?\s*(\d{1,3})/i);
    if(attrHit)return attrHit[1];
    return attr;
  }

  function rowKey(name,size){return `${plain(name)}|${plain(size)}`;}

  function base64ToBuffer(value){
    const binary=atob(String(value||''));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);
    return bytes.buffer;
  }

  function catalogSkuIndex(catalogData){
    const unique=new Map(),duplicates=new Set();
    for(const variant of (catalogData&&catalogData.variants)||[]){
      const sku=text(variant&&variant.sku);
      if(!sku)continue;
      const key=rowKey(variant.name,displaySize(variant));
      if(!key||key==='|')continue;
      if(unique.has(key)&&unique.get(key).sku!==sku)duplicates.add(key);
      else unique.set(key,{sku,variantId:variant.variantId,productId:variant.productId});
    }
    for(const key of duplicates)unique.delete(key);
    return unique;
  }

  async function readState(){
    const s=await chrome.storage.local.get([BATCH_KEY,PROFILE_KEY,SELECTED_KEY]);
    return{
      pending:s[BATCH_KEY]&&typeof s[BATCH_KEY]==='object'?s[BATCH_KEY]:{},
      profiles:Array.isArray(s[PROFILE_KEY])?s[PROFILE_KEY]:[],
      selectedId:text(s[SELECTED_KEY])
    };
  }

  function matchedOfficialRows(warehouseData,catalogData,sourceResults){
    const index=catalogSkuIndex(catalogData);
    const matches=matcher.matchSapoProducts(warehouseData.products||[],sourceResults||[]);
    const rows=[];
    const missingSku=[];
    for(const match of matches){
      for(const vm of match.variantMatches||[]){
        if(!vm||!vm.sapo||!vm.source)continue;
        const stock=Number(vm.source.available);
        if(!Number.isFinite(stock)||stock<0)continue;
        const size=displaySize(vm.sapo);
        const lookup=index.get(rowKey(vm.sapo.name,size));
        if(!lookup){missingSku.push(`${vm.sapo.name||''} / Size ${size}`);continue;}
        rows.push({
          variantName:text(vm.sapo.rawProductLabel||`${vm.sapo.name||''}${size?` / Size ${size}`:''}`),
          sku:lookup.sku,
          stock,
          standardName:text(vm.sapo.name),
          size,
          variantId:lookup.variantId,
          productId:lookup.productId
        });
      }
    }
    return{rows,missingSku};
  }

  function captureMatcher(){
    if(matcher.__batchStockCacheWrapped)return;
    const original=matcher.matchSapoProducts.bind(matcher);
    matcher.matchSapoProducts=function(sapoProducts,sourceResults,options){
      if(Array.isArray(sourceResults)&&sourceResults.length){
        latestSource=sourceResults;
        latestSourceAt=Date.now();
      }
      return original(sapoProducts,sourceResults,options);
    };
    matcher.__batchStockCacheWrapped=true;
  }

  async function cacheCurrentScan(){
    if(caching||!latestSource.length||Date.now()-latestSourceAt>30000)return;
    caching=true;
    try{
      const state=await readState();
      const profile=state.profiles.find(p=>String(p&&p.id)===state.selectedId)||null;
      if(!profile||!profile.warehouseBase64||!profile.catalogBase64)return;
      const token=`${profile.id}|${latestSourceAt}`;
      if(token===lastCacheToken)return;

      const warehouseData=await xlsx.parseSapoExport(base64ToBuffer(profile.warehouseBase64));
      const catalogData=await xlsx.parseSapoExport(base64ToBuffer(profile.catalogBase64));
      const prepared=matchedOfficialRows(warehouseData,catalogData,latestSource);
      if(!prepared.rows.length)return;
      const branch=text(warehouseData.warehouseBranchName||profile.branchName);
      if(!branch)return;
      const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
      const entry={
        profileId:profile.id,
        profileName:text(profile.name)||'Hồ sơ',
        branch,
        sourceUrl:text(tab&&tab.url),
        scannedAt:Date.now(),
        variantTotal:Number((warehouseData.variants||[]).length),
        rowCount:prepared.rows.length,
        missingSkuCount:prepared.missingSku.length,
        rows:prepared.rows
      };
      const next={...state.pending,[profile.id]:entry};
      await chrome.storage.local.set({[BATCH_KEY]:next});
      lastCacheToken=token;
      await renderBatchUi();
      const status=document.getElementById('profileStatus');
      if(status){
        status.textContent=`ĐÃ LƯU CACHE ${entry.profileName}: ${entry.rowCount} dòng. Có thể chuyển sang tab/hồ sơ khác để quét tiếp, chưa cần tải file.`;
        status.style.color='#166534';
      }
    }catch(error){
      const status=document.getElementById('profileStatus');
      if(status){status.textContent=`LỖI LƯU CACHE: ${error.message||String(error)}`;status.style.color='#b91c1c';}
    }finally{caching=false;}
  }

  function download(bytes,fileName){
    const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=fileName;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2500);
  }

  function setExportBusy(busy){
    for(const id of ['batchExportBtn','profileExportBtn']){
      const btn=document.getElementById(id);
      if(btn)btn.disabled=Boolean(busy);
    }
  }

  async function exportBatch(event){
    if(event){event.preventDefault();event.stopImmediatePropagation();}
    setExportBusy(true);
    try{
      const state=await readState();
      const combined=batch.combineEntries(Object.values(state.pending));
      const out=stockImport.buildOfficialInventoryWorkbook(xlsx,combined.rows,combined.branch);
      if(out.templateSignature!=='SAPO-INVENTORY-TEMPLATE-V2')throw new Error('Bộ tạo file nhập tồn chưa đúng phiên bản.');
      const d=new Date();
      const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      download(out.bytes,`SAPO_NHAP_TON_KHO_GOP_${stamp}.xlsx`);
      await chrome.storage.local.set({[BATCH_KEY]:{}});
      await renderBatchUi();
      const status=document.getElementById('profileStatus');
      if(status){
        status.textContent=`ĐÃ TẠO FILE GỘP ${combined.profileCount} HỒ SƠ: ${out.rows} dòng • ${out.zeroCount} dòng tồn = 0. Cache chờ đã được dọn.`;
        status.style.color='#166534';
      }
    }catch(error){
      const status=document.getElementById('profileStatus');
      if(status){status.textContent=`LỖI TẠO FILE GỘP: ${error.message||String(error)}`;status.style.color='#b91c1c';}
      await renderBatchUi();
    }
  }

  async function clearBatch(){
    await chrome.storage.local.set({[BATCH_KEY]:{}});
    await renderBatchUi();
    const status=document.getElementById('profileStatus');
    if(status){status.textContent='Đã xóa cache chờ xuất. Các hồ sơ và lịch sử quét vẫn được giữ nguyên.';status.style.color='#475569';}
  }

  async function renderBatchUi(){
    const state=await readState();
    const entries=Object.values(state.pending).sort((a,b)=>Number(a.scannedAt||0)-Number(b.scannedAt||0));
    const rows=entries.reduce((sum,x)=>sum+Number(x.rowCount||(x.rows||[]).length||0),0);
    const box=document.getElementById('batchPendingBox');
    if(box){
      const title=document.getElementById('batchPendingTitle');
      const list=document.getElementById('batchPendingList');
      if(title)title.textContent=entries.length?`ĐANG CHỜ XUẤT: ${entries.length} hồ sơ • ${rows} dòng`:'CHƯA CÓ CACHE CHỜ XUẤT';
      if(list)list.innerHTML=entries.length?entries.map(x=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-top:1px solid #eef2f7"><span><b>${esc(x.profileName)}</b> • ${Number(x.rowCount||(x.rows||[]).length)} dòng</span><small>${new Date(Number(x.scannedAt||Date.now())).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</small></div>`).join(''):'<small>Quét HD, Trẻ em, Wika… lần lượt. Mỗi lần quét sẽ tự lưu vào đây.</small>';
    }

    const label=entries.length?`XUẤT FILE TỒN KHO GỘP (${entries.length})`:'XUẤT FILE TỒN KHO GỘP';
    const title=entries.length?'Gộp toàn bộ cache đang chờ thành 1 file nhập tồn kho Sapo':'Quét ít nhất 1 tab trước';
    for(const id of ['batchExportBtn','profileExportBtn']){
      const btn=document.getElementById(id);
      if(!btn)continue;
      btn.textContent=label;
      btn.disabled=entries.length===0;
      btn.title=title;
    }
  }

  function mountUi(){
    const host=document.getElementById('savedProfilesMode');
    if(!host)return false;

    const legacyExport=document.getElementById('profileExportBtn');
    if(legacyExport&&legacyExport.dataset.batchExport!=='1'){
      legacyExport.dataset.batchExport='1';
      legacyExport.addEventListener('click',exportBatch,true);
      legacyExport.style.display='none';
    }

    if(!document.getElementById('batchPendingBox')){
      const box=document.createElement('div');
      box.id='batchPendingBox';
      box.style.cssText='margin-top:9px;padding:9px 10px;border:1px solid #bfdbfe;border-radius:9px;background:#eff6ff;color:#334155';
      box.innerHTML=`
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <b id="batchPendingTitle">CHƯA CÓ CACHE CHỜ XUẤT</b>
          <button id="batchClearBtn" type="button" class="secondary" style="padding:5px 8px;font-size:10px">XÓA CACHE</button>
        </div>
        <div id="batchPendingList" style="margin-top:5px;font-size:11px"></div>
        <button id="batchExportBtn" type="button" class="success" style="width:100%;margin-top:9px;min-height:46px;font-size:13px;font-weight:800" disabled>XUẤT FILE TỒN KHO GỘP</button>`;
      const status=document.getElementById('profileStatus');
      if(status)status.insertAdjacentElement('beforebegin',box);else host.appendChild(box);
      document.getElementById('batchClearBtn')?.addEventListener('click',clearBatch);
      document.getElementById('batchExportBtn')?.addEventListener('click',exportBatch,true);
    }
    renderBatchUi().catch(()=>{});
    return true;
  }

  function watchScanSuccess(){
    const inspect=()=>{
      const status=text(document.getElementById('profileStatus')?.textContent);
      if(/^QUÉT XONG\s+/i.test(status))cacheCurrentScan().catch(()=>{});
    };
    const obs=new MutationObserver(inspect);
    obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
    inspect();
  }

  function install(){
    captureMatcher();
    if(!mountUi()){
      const obs=new MutationObserver(()=>{if(mountUi())obs.disconnect();});
      obs.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>obs.disconnect(),15000);
    }
    watchScanSuccess();
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&(changes[BATCH_KEY]||changes[SELECTED_KEY]||changes[PROFILE_KEY]))setTimeout(()=>renderBatchUi().catch(()=>{}),50);
    });
  }

  install();
})();
