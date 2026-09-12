(() => {
  'use strict';

  const matcher=globalThis.DHLMatchCore;
  const xlsx=globalThis.DHLXlsxLite;
  const stockImport=globalThis.DHLStockImportCore;
  if(!matcher||!xlsx||!stockImport)return;

  let warehouseBuffer=null;
  let warehouseData=null;
  let catalogData=null;
  let latestSource=[];
  let scanAfterFiles=false;

  function setState(text,kind=''){
    const el=document.getElementById('oneFileState');
    if(!el)return;
    el.textContent=String(text||'');
    el.style.color=kind==='error'?'#b91c1c':kind==='ok'?'#166534':'#475569';
  }

  function plain(value){
    return String(value||'')
      .toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\bkhong in(?: ten so)?\b/g,' ')
      .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function displaySize(variant){
    if(!variant)return'';
    if(variant.displaySize)return String(variant.displaySize).trim();
    const raw=String(variant.rawProductLabel||'');
    const hit=raw.match(/\/\s*Size\s*[:\-]?\s*(\d{1,3})/i);
    if(hit)return hit[1];
    const attr=String(variant.sizeFromAttribute||variant.size||'').trim();
    const attrHit=attr.match(/(?:^|\b)SIZE\s*[:\-]?\s*(\d{1,3})/i);
    if(attrHit)return attrHit[1];
    if(/^\d{1,3}$/.test(attr))return attr;
    return attr;
  }

  function rowKey(name,size){
    return `${plain(name)}|${plain(size)}`;
  }

  function catalogSkuIndex(){
    const unique=new Map();
    const duplicates=new Set();
    for(const variant of (catalogData&&catalogData.variants)||[]){
      const sku=String(variant&&variant.sku||'').trim();
      if(!sku)continue;
      const key=rowKey(variant.name,displaySize(variant));
      if(!key||key==='|')continue;
      if(unique.has(key)&&unique.get(key).sku!==sku)duplicates.add(key);
      else unique.set(key,{sku,variantId:variant.variantId,productId:variant.productId,name:variant.name,size:displaySize(variant)});
    }
    for(const key of duplicates)unique.delete(key);
    return{map:unique,duplicates};
  }

  function skuCoverage(){
    if(!warehouseData||!catalogData)return{matched:0,total:warehouseData?warehouseData.variants.length:0,missing:[],duplicates:0};
    const index=catalogSkuIndex();
    let matched=0;
    const missing=[];
    for(const variant of warehouseData.variants||[]){
      const key=rowKey(variant.name,displaySize(variant));
      if(index.map.has(key))matched+=1;
      else missing.push(`${variant.name} / Size ${displaySize(variant)}`);
    }
    return{matched,total:(warehouseData.variants||[]).length,missing,duplicates:index.duplicates.size};
  }

  function matchedRows(){
    if(!warehouseData||!latestSource.length)return[];
    const matches=matcher.matchSapoProducts(warehouseData.products,latestSource);
    const rows=[];
    for(const match of matches){
      for(const vm of match.variantMatches||[]){
        if(vm&&vm.sapo&&vm.source)rows.push({match,...vm});
      }
    }
    return rows;
  }

  function officialImportRows(){
    const result=[];
    const missingSku=[];
    const index=catalogSkuIndex().map;
    for(const row of matchedRows()){
      const stock=Number(row.source.available);
      if(!Number.isFinite(stock)||stock<0)continue;
      const size=displaySize(row.sapo);
      const lookup=index.get(rowKey(row.sapo.name,size));
      if(!lookup){
        missingSku.push(`${row.sapo.name||''} / Size ${size}`);
        continue;
      }
      const variantName=String(row.sapo.rawProductLabel||`${row.sapo.name||''}${size?` / Size ${size}`:''}`).trim();
      result.push({
        variantName,
        sku:lookup.sku,
        stock,
        standardName:String(row.sapo.name||'').trim(),
        size,
        variantId:lookup.variantId,
        productId:lookup.productId
      });
    }
    return{rows:result,missingSku};
  }

  function refreshButton(){
    const btn=document.getElementById('makeImportOneFile');
    if(!btn)return;
    const coverage=skuCoverage();
    const matched=matchedRows();
    const prepared=officialImportRows();
    const branch=String((warehouseData&&warehouseData.warehouseBranchName)||'').trim();
    btn.disabled=!(warehouseData&&catalogData&&scanAfterFiles&&prepared.rows.length&&branch);

    if(!warehouseData){
      setState('Bước 1: chọn file TỒN KHO “Danh sách quản lý kho phiên bản sản phẩm”. Đây là file chính.');
    }else if(!catalogData){
      setState(`Đã nhận file tồn kho: ${warehouseData.products.length} sản phẩm / ${warehouseData.variants.length} biến thể • chi nhánh ${branch||'chưa đọc được'}. Bước 2: chọn file DANH SÁCH products_export có SKU.`,'ok');
    }else if(coverage.matched<coverage.total){
      setState(`Đối chiếu Tồn kho ↔ Danh sách: ${coverage.matched}/${coverage.total} biến thể có đúng SKU. Còn ${coverage.total-coverage.matched} dòng chưa tìm được SKU${coverage.duplicates?` • ${coverage.duplicates} khóa bị trùng`:''}.`,'error');
    }else if(!scanAfterFiles){
      setState(`Đối chiếu SKU chuẩn ${coverage.matched}/${coverage.total}. File TỒN KHO là gốc; file DANH SÁCH chỉ cấp SKU/ID. Bấm QUÉT KHO TRANG ĐANG MỞ.`,'ok');
    }else if(prepared.rows.length){
      const products=new Set(matched.map((row)=>String(row.sapo.productId))).size;
      const skipped=Math.max(0,(warehouseData.variants||[]).length-prepared.rows.length);
      setState(`Sẵn sàng: ${prepared.rows.length}/${warehouseData.variants.length} biến thể thuộc ${products}/${warehouseData.products.length} sản phẩm. SKU lấy đúng từ file DANH SÁCH; tồn lấy từ nguồn; ${skipped} dòng chưa đủ điều kiện sẽ bỏ qua.`,'ok');
    }else if(matched.length){
      setState(`Đã ghép nguồn ${matched.length} biến thể nhưng chưa nối được SKU từ file DANH SÁCH.`,'error');
    }else{
      setState('Chưa có biến thể nào ghép được với nguồn.','error');
    }
  }

  async function readWarehouse(file){
    if(!file)return;
    try{
      const buffer=await file.arrayBuffer();
      const parsed=await xlsx.parseSapoExport(buffer.slice(0));
      if(!parsed||parsed.inputType!=='warehouse')throw new Error('Đây không phải file “Danh sách quản lý kho phiên bản sản phẩm”.');
      warehouseBuffer=buffer;
      warehouseData=parsed;
      latestSource=[];
      scanAfterFiles=false;
      refreshButton();
    }catch(error){
      warehouseBuffer=null;
      warehouseData=null;
      latestSource=[];
      scanAfterFiles=false;
      setState(`File TỒN KHO không hợp lệ: ${error.message||String(error)}`,'error');
      refreshButton();
    }
  }

  async function readCatalog(file){
    if(!file)return;
    const state=document.getElementById('skuCatalogState');
    try{
      const parsed=await xlsx.parseSapoExport(await file.arrayBuffer());
      if(parsed&&parsed.inputType==='warehouse')throw new Error('Bạn đang chọn nhầm file tồn kho. Cần file products_export có cột Mã SKU.');
      const withSku=(parsed.variants||[]).filter((v)=>String(v&&v.sku||'').trim()).length;
      if(!withSku)throw new Error('File này không có SKU.');
      catalogData=parsed;
      scanAfterFiles=false;
      if(state)state.textContent=`${parsed.products.length} sản phẩm • ${withSku} biến thể có SKU`;
      refreshButton();
    }catch(error){
      catalogData=null;
      scanAfterFiles=false;
      if(state)state.textContent='File danh sách không hợp lệ.';
      setState(`File DANH SÁCH không hợp lệ: ${error.message||String(error)}`,'error');
      refreshButton();
    }
  }

  function download(bytes,fileName){
    const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=fileName;a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }

  async function makeOneFileImport(){
    const btn=document.getElementById('makeImportOneFile');
    const oldText=btn?btn.textContent:'';
    if(btn){btn.disabled=true;btn.textContent='ĐANG TẠO FILE...';}
    try{
      if(!warehouseData||!warehouseBuffer)throw new Error('Chưa chọn file TỒN KHO.');
      if(!catalogData)throw new Error('Chưa chọn file DANH SÁCH products_export có SKU.');
      const coverage=skuCoverage();
      if(coverage.matched!==coverage.total)throw new Error(`Mới nối được ${coverage.matched}/${coverage.total} SKU giữa 2 file. Chưa đủ an toàn để xuất.`);
      if(!scanAfterFiles)throw new Error('Hãy bấm QUÉT KHO TRANG ĐANG MỞ sau khi chọn đủ 2 file.');
      const branch=String(warehouseData.warehouseBranchName||'').trim();
      if(!branch)throw new Error('Không đọc được tên chi nhánh từ file TỒN KHO.');
      const prepared=officialImportRows();
      if(!prepared.rows.length)throw new Error('Không có biến thể nào đủ Tên + Size + SKU + tồn nguồn để tạo file.');

      setState(`Đang tạo file ${prepared.rows.length} dòng: Tên/size theo file TỒN KHO, SKU theo file DANH SÁCH, tồn theo nguồn...`);
      await new Promise((resolve)=>setTimeout(resolve,20));
      const out=stockImport.buildOfficialInventoryWorkbook(xlsx,prepared.rows,branch);
      if(out.templateSignature!=='SAPO-INVENTORY-TEMPLATE-V2')throw new Error('Bộ tạo file mẫu Sapo chưa đúng phiên bản');
      const d=new Date();
      const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      download(out.bytes,`SAPO_NHAP_TON_KHO_${stamp}.xlsx`);
      const skipped=Math.max(0,warehouseData.variants.length-prepared.rows.length);
      setState(`ĐÃ XONG: ${out.rows} dòng • ${out.zeroCount} dòng tồn = 0 • chi nhánh ${branch}. File TỒN KHO là gốc, SKU giữ nguyên từ products_export. Bỏ qua ${skipped} dòng chưa đủ điều kiện.`,'ok');
    }catch(error){
      setState(`LỖI TẠO FILE: ${error.message||String(error)}`,'error');
    }finally{
      if(btn){btn.textContent=oldText||'TẠO FILE NHẬP TỒN KHO SAPO';refreshButton();}
    }
  }

  function mount(){
    const templateStep=document.getElementById('templateStep');
    if(templateStep)templateStep.style.display='none';
    const original=document.getElementById('makeImport');
    if(original)original.style.display='none';

    const exportInput=document.getElementById('sapoExport');
    const exportStep=exportInput&&exportInput.closest('.step');
    if(exportStep){
      const label=exportStep.querySelector('b');
      if(label)label.textContent='1. Chọn file TỒN KHO Sapo (file chính)';
    }

    const actions=document.querySelector('.step.actions');
    if(exportStep&&actions&&!document.getElementById('skuCatalogFile')){
      const step=document.createElement('div');
      step.className='step';
      step.innerHTML='<b>2. Chọn file DANH SÁCH Sapo (lấy SKU)</b><input id="skuCatalogFile" type="file" accept=".xlsx" /><small id="skuCatalogState">Chưa chọn file products_export có SKU.</small>';
      actions.parentElement.insertBefore(step,actions);
      const actionLabel=actions.querySelector('b');
      if(actionLabel)actionLabel.textContent='3. Lấy tồn kho nguồn';
      step.querySelector('#skuCatalogFile').addEventListener('change',(event)=>readCatalog(event.target.files&&event.target.files[0]));
    }

    const toolbar=original&&original.parentElement;
    if(toolbar&&!document.getElementById('makeImportOneFile')){
      const btn=document.createElement('button');
      btn.id='makeImportOneFile';btn.className='success';btn.disabled=true;
      btn.textContent='TẠO FILE NHẬP TỒN KHO SAPO';
      toolbar.appendChild(btn);
      const state=document.createElement('small');
      state.id='oneFileState';state.style.display='block';state.style.width='100%';state.style.marginTop='6px';
      state.textContent='Chọn file TỒN KHO trước, sau đó chọn file DANH SÁCH có SKU.';
      toolbar.parentElement.appendChild(state);
      btn.addEventListener('click',makeOneFileImport);
    }

    const guide=document.getElementById('dailyGuide');
    if(guide)guide.innerHTML='<b>DÙNG 2 FILE — FILE TỒN KHO LÀ GỐC</b><span style="display:block;margin-top:5px">1) File <b>TỒN KHO</b> quyết định sản phẩm/size cần cập nhật → 2) file <b>DANH SÁCH products_export</b> chỉ dùng tra đúng SKU/ID theo tên + size → 3) quét nguồn → 4) tạo file nhập tồn.</span>';
    const subtitle=document.querySelector('header p');
    if(subtitle)subtitle.textContent='Tồn kho là file chính • Danh sách chỉ cấp SKU/ID • Ghép chính xác theo Tên + Size';
    const footer=document.querySelector('footer');
    if(footer)footer.textContent='Không tự sinh SKU. Tool nối file Tồn kho ↔ products_export bằng đúng Tên sản phẩm + Size rồi mới lấy SKU gốc Sapo.';

    if(exportInput)exportInput.addEventListener('change',(event)=>readWarehouse(event.target.files&&event.target.files[0]));

    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area!=='local'||!changes.dhlLastSourceResults)return;
      latestSource=Array.isArray(changes.dhlLastSourceResults.newValue)?changes.dhlLastSourceResults.newValue:[];
      scanAfterFiles=Boolean(warehouseData&&catalogData);
      refreshButton();
    });

    refreshButton();
  }

  mount();
})();