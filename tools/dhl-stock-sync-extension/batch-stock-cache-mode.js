(() => {
  'use strict';

  const xlsx=globalThis.DHLXlsxLite;
  const matcher=globalThis.DHLMatchCore;
  const stockImport=globalThis.DHLStockImportCore;
  const batch=globalThis.DHLBatchStockCore;
  const autoCore=globalThis.DHLAutoSyncCore;
  const rules=globalThis.DHLShopRules;
  if(!xlsx||!matcher||!stockImport||!batch||!autoCore||!rules)return;

  const BATCH_KEY='dhlManualPendingStockBatchV1';
  const LEGACY_BATCH_KEY='dhlPendingStockBatchV1';
  const PROFILE_KEY='dhlSavedStockProfilesV1';
  const SELECTED_KEY='dhlSelectedStockProfileId';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
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

  function manualEntries(pending){
    return Object.values(pending&&typeof pending==='object'?pending:{}).filter(x=>x&&x.auto!==true&&Array.isArray(x.rows)&&x.rows.length);
  }

  async function migrateLegacyManual(pending,legacy){
    const manual={},automatic={};
    for(const [id,entry] of Object.entries(legacy&&typeof legacy==='object'?legacy:{})){
      if(entry&&entry.auto===true)automatic[id]=entry;
      else if(entry&&Array.isArray(entry.rows)&&entry.rows.length)manual[id]=entry;
    }
    if(!Object.keys(manual).length)return pending;
    const merged={...manual,...pending};
    await chrome.storage.local.set({[BATCH_KEY]:merged,[LEGACY_BATCH_KEY]:automatic});
    return merged;
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
    const s=await chrome.storage.local.get([BATCH_KEY,LEGACY_BATCH_KEY,PROFILE_KEY,SELECTED_KEY]);
    let pending=s[BATCH_KEY]&&typeof s[BATCH_KEY]==='object'?s[BATCH_KEY]:{};
    const legacy=s[LEGACY_BATCH_KEY]&&typeof s[LEGACY_BATCH_KEY]==='object'?s[LEGACY_BATCH_KEY]:{};
    pending=await migrateLegacyManual(pending,legacy);
    return{
      pending,
      profiles:Array.isArray(s[PROFILE_KEY])?s[PROFILE_KEY]:[],
      selectedId:text(s[SELECTED_KEY])
    };
  }

  function matchedOfficialRows(warehouseData,catalogData,sourceResults){
    return autoCore.prepareRows(warehouseData,catalogData,sourceResults,matcher,rules);
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
        variantTotal:Number(prepared.sourceVariantCount||prepared.rows.length),
        sourceProductCount:Number(prepared.sourceProductCount||0),
        generatedSkuCount:0,
        matchedSkuCount:Number(prepared.matchedSkuCount||0),
        sourceOnlySkuCount:Number(prepared.sourceOnlySkuCount||0),
        rowCount:prepared.rows.length,
        missingSkuCount:prepared.missingSku.length,
        rows:prepared.rows,
        auto:false
      };
      const next={...state.pending,[profile.id]:entry};
      await chrome.storage.local.set({[BATCH_KEY]:next});
      lastCacheToken=token;
      await renderBatchUi();
      const status=document.getElementById('profileStatus');
      if(status){
        status.textContent=`ĐÃ LƯU CACHE ${entry.profileName}: ${entry.rowCount}/${entry.variantTotal} biến thể SKU GỐC • ${entry.sourceProductCount} mẫu/màu • trùng Sapo ${entry.matchedSkuCount} • SKU nguồn mới ${entry.sourceOnlySkuCount}.`;
        status.style.color='#166534';
      }
    }catch(error){
      const status=document.getElementById('profileStatus');
      if(status){status.textContent=`LỖI LƯU CACHE: ${error.message||String(error)}`;status.style.color='#b91c1c';}
    }finally{caching=false;}
  }

  async function cacheSource(sourceResults){
    if(Array.isArray(sourceResults)&&sourceResults.length){
      latestSource=sourceResults;
      latestSourceAt=Date.now();
      lastCacheToken='';
    }
    return cacheCurrentScan();
  }
  async function clearSourceOnly(label='Nguồn'){
    const stored=await chrome.storage.local.get(BATCH_KEY);
    const pending=stored[BATCH_KEY]&&typeof stored[BATCH_KEY]==='object'?stored[BATCH_KEY]:{};
    const slug=plain(text(label)||'Nguồn').replace(/\s+/g,'-')||'source';
    const profileId=`source:${slug}`;
    const next={...pending};
    delete next[profileId];
    await chrome.storage.local.set({[BATCH_KEY]:next});
    await renderBatchUi();
    return true;
  }

  async function cacheSourceOnly(sourceResults,label='Nguồn'){
    if(!Array.isArray(sourceResults)||!sourceResults.length)throw new Error('Không có dữ liệu nguồn để lưu.');
    const prepared=autoCore.prepareRows({}, {variants:[]}, sourceResults, matcher, rules);
    if(!prepared.rows.length)throw new Error('Nguồn chưa tạo được dòng tồn kho theo Alias + Size.');

    const stored=await chrome.storage.local.get([BATCH_KEY,CONFIG_KEY,PROFILE_KEY,SELECTED_KEY]);
    const pending=stored[BATCH_KEY]&&typeof stored[BATCH_KEY]==='object'?stored[BATCH_KEY]:{};
    const config=stored[CONFIG_KEY]&&typeof stored[CONFIG_KEY]==='object'?stored[CONFIG_KEY]:{};
    const profiles=Array.isArray(stored[PROFILE_KEY])?stored[PROFILE_KEY]:[];
    const selected=profiles.find(p=>String(p&&p.id)===String(stored[SELECTED_KEY]||''))||null;
    const branch=text(config&&config.sapo&&config.sapo.locationName)||text(selected&&selected.branchName);
    if(!branch)throw new Error('Chưa có tên chi nhánh Sapo. Hãy bấm KIỂM TRA KẾT NỐI SAPO một lần.');

    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    const cleanLabel=text(label)||'Nguồn';
    const slug=plain(cleanLabel).replace(/\s+/g,'-')||'source';
    const profileId=`source:${slug}`;
    const entry={
      profileId,
      profileName:cleanLabel,
      branch,
      sourceUrl:text(tab&&tab.url),
      scannedAt:Date.now(),
      variantTotal:Number(prepared.sourceVariantCount||prepared.rows.length),
      sourceProductCount:Number(prepared.sourceProductCount||0),
      generatedSkuCount:0,
      matchedSkuCount:0,
      sourceOnlySkuCount:Number(prepared.rows.length),
      rowCount:prepared.rows.length,
      missingSkuCount:prepared.missingSku.length,
      rows:prepared.rows,
      sourceOnly:true,
      auto:false
    };
    const next={...pending,[profileId]:entry};
    await chrome.storage.local.set({[BATCH_KEY]:next});
    await renderBatchUi();
    const status=document.getElementById('profileStatus');
    if(status){
      status.textContent=`ĐÃ LƯU CACHE ${cleanLabel}: ${entry.rowCount} biến thể • SKU = Đường dẫn/Alias + Size.`;
      status.style.color='#166534';
    }
    return entry;
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
      const entries=manualEntries(state.pending);
      if(!entries.length)throw new Error('Chưa có cache quét thủ công để tạo Excel.');
      const combined=batch.combineEntries(entries);
      const out=stockImport.buildOfficialInventoryWorkbook(xlsx,combined.rows,combined.branch);
      if(out.templateSignature!=='SAPO-INVENTORY-TEMPLATE-V3')throw new Error('Bộ tạo file nhập tồn chưa đúng phiên bản.');
      const d=new Date();
      const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      download(out.bytes,`SAPO_NHAP_TON_KHO_GOP_${stamp}.xlsx`);
      await chrome.storage.local.set({[BATCH_KEY]:{}});
      await renderBatchUi();
      const status=document.getElementById('profileStatus');
      if(status){
        status.textContent=`ĐÃ TẠO FILE GỘP ${combined.profileCount} HỒ SƠ: ${out.rows} dòng • ${out.zeroCount} dòng tồn = 0. Cache quét thủ công đã dọn; cache tự động vẫn giữ nguyên.`;
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
    if(status){status.textContent='Đã xóa cache quét thủ công. Cache tự động, hồ sơ và lịch sử quét vẫn được giữ nguyên.';status.style.color='#475569';}
  }

  async function renderBatchUi(){
    const state=await readState();
    const entries=manualEntries(state.pending).sort((a,b)=>Number(a.scannedAt||0)-Number(b.scannedAt||0));
    const rows=entries.reduce((sum,x)=>sum+Number(x.rowCount||(x.rows||[]).length||0),0);
    const box=document.getElementById('batchPendingBox');
    if(box){
      const title=document.getElementById('batchPendingTitle');
      const list=document.getElementById('batchPendingList');
      if(title)title.textContent=entries.length?`BƯỚC 3 — CHỌN ĐẦU RA • ${entries.length} hồ sơ • ${rows} dòng`:'BƯỚC 3 — CHỌN ĐẦU RA';
      if(list)list.innerHTML=entries.length?entries.map(x=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-top:1px solid #eef2f7"><span><b>${esc(x.profileName)}</b> • ${Number(x.rowCount||(x.rows||[]).length)} dòng</span><small>${new Date(Number(x.scannedAt||Date.now())).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</small></div>`).join(''):'<small>Quét HD, Trẻ em, Wika… lần lượt. Sau khi có dữ liệu, chọn tải Excel hoặc đẩy thẳng lên Sapo.</small>';
    }

    const label=entries.length?`TẢI FILE EXCEL (${entries.length})`:'TẢI FILE EXCEL';
    const title=entries.length?'Tạo 1 file Excel nhập tồn từ toàn bộ cache quét thủ công đang chờ':'Quét ít nhất 1 tab trước';
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
          <b id="batchPendingTitle">BƯỚC 3 — CHỌN ĐẦU RA</b>
          <button id="batchClearBtn" type="button" class="secondary" style="padding:5px 8px;font-size:10px">XÓA CACHE</button>
        </div>
        <div id="batchPendingList" style="margin-top:5px;font-size:11px"></div>
        <button id="batchExportBtn" type="button" class="success" style="width:100%;margin-top:9px;min-height:46px;font-size:13px;font-weight:800" disabled>TẢI FILE EXCEL</button>`;
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

  globalThis.DHLBatchStockCache={
    cacheSource,
    cacheSourceOnly,
    clearSourceOnly,
    renderBatchUi,
    cacheCurrentScan
  };

  function install(){
    captureMatcher();
    if(!mountUi()){
      const obs=new MutationObserver(()=>{if(mountUi())obs.disconnect();});
      obs.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>obs.disconnect(),15000);
    }
    watchScanSuccess();
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&(changes[BATCH_KEY]||changes[LEGACY_BATCH_KEY]||changes[SELECTED_KEY]||changes[PROFILE_KEY]))setTimeout(()=>renderBatchUi().catch(()=>{}),50);
    });
  }

  install();
})();
