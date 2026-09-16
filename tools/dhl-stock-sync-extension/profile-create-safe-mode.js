(() => {
  'use strict';

  const xlsx=globalThis.DHLXlsxLite;
  if(!xlsx)return;
  const STORAGE_KEY='dhlSavedStockProfilesV1';
  const SELECTED_KEY='dhlSelectedStockProfileId';
  let createMode=false;
  let createIntentUntil=0;
  let saving=false;

  const text=(v)=>String(v==null?'':v).trim();
  const plain=(v)=>text(v).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\bkhong in(?: ten so)?\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

  function displaySize(v){
    if(!v)return'';
    if(v.displaySize)return text(v.displaySize);
    const raw=text(v.rawProductLabel);
    const hit=raw.match(/\/\s*Size\s*[:\-]?\s*(\d{1,3})/i);
    if(hit)return hit[1];
    const attr=text(v.sizeFromAttribute||v.size);
    const attrHit=attr.match(/(?:^|\b)SIZE\s*[:\-]?\s*(\d{1,3})/i);
    if(attrHit)return attrHit[1];
    return attr;
  }

  function rowKey(name,size){return `${plain(name)}|${plain(size)}`;}

  function coverage(warehouseData,catalogData){
    const index=new Map();
    const duplicates=new Set();
    for(const v of (catalogData&&catalogData.variants)||[]){
      const sku=text(v&&v.sku); if(!sku)continue;
      const key=rowKey(v.name,displaySize(v)); if(!key||key==='|')continue;
      if(index.has(key)&&index.get(key)!==sku)duplicates.add(key); else index.set(key,sku);
    }
    for(const key of duplicates)index.delete(key);
    let matched=0; const missing=[];
    for(const v of (warehouseData&&warehouseData.variants)||[]){
      const key=rowKey(v.name,displaySize(v));
      if(index.has(key))matched++; else missing.push(`${v.name} / Size ${displaySize(v)}`);
    }
    return{matched,total:(warehouseData&&warehouseData.variants||[]).length,missing,duplicates:duplicates.size};
  }

  function bytesToBase64(buffer){
    const bytes=new Uint8Array(buffer); let binary=''; const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
    return btoa(binary);
  }

  function setStatus(message,kind=''){
    const el=document.getElementById('profileStatus'); if(!el)return;
    el.textContent=message; el.style.color=kind==='error'?'#b91c1c':kind==='ok'?'#166534':'#475569';
  }

  function makeId(name){return `${plain(name).replace(/\s+/g,'-')||'profile'}-${Date.now().toString(36)}`;}

  async function saveNewProfile(event){
    if(!createMode||saving)return;
    event.preventDefault(); event.stopImmediatePropagation();
    saving=true;
    const btn=document.getElementById('profileSaveBtn');
    const oldText=btn?btn.textContent:'';
    if(btn){btn.disabled=true;btn.textContent='ĐANG LƯU...';}
    try{
      const name=text(document.getElementById('profileNameInput')?.value);
      const warehouseFile=document.getElementById('profileWarehouseFile')?.files?.[0];
      const catalogFile=document.getElementById('profileCatalogFile')?.files?.[0];
      if(!name)throw new Error('Nhập tên hồ sơ.');
      if(!warehouseFile||!catalogFile)throw new Error('Hồ sơ mới cần đủ 2 file TỒN KHO + DANH SÁCH products_export.');

      const warehouseBuffer=await warehouseFile.arrayBuffer();
      const catalogBuffer=await catalogFile.arrayBuffer();
      const warehouseData=await xlsx.parseSapoExport(warehouseBuffer.slice(0));
      const catalogData=await xlsx.parseSapoExport(catalogBuffer.slice(0));
      if(!warehouseData||warehouseData.inputType!=='warehouse')throw new Error('File 1 phải là file TỒN KHO Sapo.');
      if(catalogData&&catalogData.inputType==='warehouse')throw new Error('File 2 phải là products_export có SKU.');
      if(!(catalogData.variants||[]).some(v=>text(v&&v.sku)))throw new Error('File DANH SÁCH không có SKU.');

      const c=coverage(warehouseData,catalogData);
      if(c.matched!==c.total){
        const sample=c.missing.slice(0,3).join('; ');
        throw new Error(`2 file mới nối được ${c.matched}/${c.total} SKU.${sample?` Ví dụ thiếu: ${sample}`:''}`);
      }

      const stored=await chrome.storage.local.get([STORAGE_KEY]);
      const profiles=Array.isArray(stored[STORAGE_KEY])?stored[STORAGE_KEY]:[];
      if(profiles.some(p=>plain(p&&p.name)===plain(name)))throw new Error(`Đã có hồ sơ “${name}”. Hãy chọn hồ sơ đó rồi dùng CẬP NHẬT nếu muốn thay file.`);

      const profile={
        id:makeId(name),name,
        warehouseName:warehouseFile.name,catalogName:catalogFile.name,
        warehouseBase64:bytesToBase64(warehouseBuffer),catalogBase64:bytesToBase64(catalogBuffer),
        branchName:text(warehouseData.warehouseBranchName),
        productCount:(warehouseData.products||[]).length,variantCount:(warehouseData.variants||[]).length,
        updatedAt:Date.now(),lastSourceUrl:'',lastSourceAt:0
      };
      profiles.push(profile);
      await chrome.storage.local.set({[STORAGE_KEY]:profiles,[SELECTED_KEY]:profile.id});
      setStatus(`ĐÃ TẠO HỒ SƠ ${name}: ${c.matched}/${c.total} SKU. Hồ sơ cũ được giữ nguyên.`,'ok');
      createMode=false;
      setTimeout(()=>location.reload(),350);
    }catch(error){
      setStatus(`LỖI TẠO HỒ SƠ: ${error.message||String(error)}`,'error');
    }finally{
      saving=false;
      if(btn){btn.disabled=false;btn.textContent=oldText||'LƯU HỒ SƠ';}
    }
  }

  document.addEventListener('click',(event)=>{
    const target=event.target&&event.target.closest?event.target.closest('button'):null;
    if(!target)return;
    if(target.closest('#profileQuickTabButtons')){
      const label=text(target.textContent);
      if(label.endsWith('+')||label.includes('+ HỒ SƠ KHÁC')){
        createMode=true; createIntentUntil=Date.now()+1200;
        const body=document.getElementById('profileManageBody'); if(body)body.dataset.profileMode='create';
      }else createMode=false;
    }
    if(target.id==='profileManageToggle'&&Date.now()>createIntentUntil){
      createMode=false;
      const body=document.getElementById('profileManageBody'); if(body)body.dataset.profileMode='edit';
    }
  },true);

  function install(){
    const attach=()=>{
      const save=document.getElementById('profileSaveBtn');
      if(!save||save.dataset.safeCreate==='1')return false;
      save.dataset.safeCreate='1';
      save.addEventListener('click',saveNewProfile,true);
      return true;
    };
    if(!attach()){
      const observer=new MutationObserver(()=>{if(attach())observer.disconnect();});
      observer.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>observer.disconnect(),8000);
    }
  }

  install();
})();
