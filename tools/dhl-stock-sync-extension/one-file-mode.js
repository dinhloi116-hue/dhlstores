(() => {
  'use strict';

  const matcher=globalThis.DHLMatchCore;
  const xlsx=globalThis.DHLXlsxLite;
  const stockImport=globalThis.DHLStockImportCore;
  if(!matcher||!xlsx||!stockImport)return;

  let exportBuffer=null;
  let sapoData=null;
  let latestSource=[];
  let exportName='';
  let scanAfterFile=false;
  let savedBranchName='dhl sport';

  function setState(text,kind=''){
    const el=document.getElementById('oneFileState');
    if(!el)return;
    el.textContent=String(text||'');
    el.style.color=kind==='error'?'#b91c1c':kind==='ok'?'#166534':'#475569';
  }

  function branchName(){
    const input=document.getElementById('branchNameOneFile');
    return String((input&&input.value)||savedBranchName||'').trim();
  }

  function hasOriginalSku(){
    if(!sapoData||!Array.isArray(sapoData.variants)||!sapoData.variants.length)return false;
    return sapoData.variants.some((v)=>String((v&&v.sku)||'').trim());
  }

  function matchedRows(){
    if(!sapoData||!latestSource.length)return[];
    const matches=matcher.matchSapoProducts(sapoData.products,latestSource);
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
    for(const row of matchedRows()){
      const stock=Number(row.source.available);
      if(!Number.isFinite(stock)||stock<0)continue;

      // Bắt buộc dùng nguyên SKU đang có trong file Sapo. Tuyệt đối không tự sinh SKU.
      const sku=String((row.sapo&&row.sapo.sku)||'').trim();
      if(!sku){
        missingSku.push(`${row.sapo.name||''} / ${row.sapo.displaySize||row.sapo.size||''}`);
        continue;
      }

      const displaySize=String(row.sapo.displaySize||row.sapo.size||row.sapo.sizeFromSku||'').trim();
      const variantName=String(row.sapo.rawProductLabel||`${row.sapo.name||''}${displaySize?` / ${displaySize}`:''}`).trim();
      result.push({
        variantName,
        sku,
        stock,
        standardName:String(row.sapo.name||'').trim(),
        size:displaySize
      });
    }
    return{rows:result,missingSku};
  }

  function refreshButton(){
    const btn=document.getElementById('makeImportOneFile');
    if(!btn)return;
    const matched=matchedRows();
    const prepared=officialImportRows();
    const branch=branchName();
    btn.disabled=!(sapoData&&exportBuffer&&scanAfterFile&&prepared.rows.length&&branch);

    if(!sapoData){
      setState('Chọn file products_export Sapo có cột Mã SKU. Tool sẽ giữ nguyên SKU và chỉ ghi tồn kho đã ghép.');
    }else if(!hasOriginalSku()){
      setState('File đang chọn không có SKU nên chỉ dùng để đối chiếu/quét, KHÔNG thể tạo file nhập tồn kho chuẩn Sapo. Hãy chọn file products_export có cột Mã SKU.','error');
    }else if(!branch){
      setState('Nhập tên chi nhánh Sapo trước khi tạo file.','error');
    }else if(!scanAfterFile){
      setState(`Đã nhận file có SKU: ${sapoData.products.length} sản phẩm / ${sapoData.variants.length} biến thể • chi nhánh xuất: ${branch}. Bấm QUÉT KHO TRANG ĐANG MỞ.`,'ok');
    }else if(prepared.rows.length){
      const products=new Set(matched.filter((row)=>String((row.sapo&&row.sapo.sku)||'').trim()).map((row)=>String(row.sapo.productId))).size;
      const skipped=Math.max(0,sapoData.variants.length-prepared.rows.length);
      const skuText=prepared.missingSku.length?` • ${prepared.missingSku.length} dòng không có SKU gốc bị bỏ qua`:'';
      setState(`Sẵn sàng: ${prepared.rows.length}/${sapoData.variants.length} biến thể thuộc ${products}/${sapoData.products.length} sản phẩm. ${skipped} biến thể không xuất.${skuText}`,'ok');
    }else if(matched.length){
      setState(`Đã ghép ${matched.length} biến thể nhưng không có dòng nào mang SKU gốc để xuất. Hãy dùng file products_export Sapo có cột Mã SKU.`,'error');
    }else{
      setState('Chưa có biến thể nào ghép được với nguồn.');
    }
  }

  async function readExport(file){
    if(!file)return;
    try{
      const buffer=await file.arrayBuffer();
      exportBuffer=buffer;
      exportName=file.name||'';
      sapoData=await xlsx.parseSapoExport(buffer.slice(0));
      latestSource=[];
      scanAfterFile=false;

      if(sapoData&&sapoData.warehouseBranchName){
        savedBranchName=String(sapoData.warehouseBranchName).trim()||savedBranchName;
        const input=document.getElementById('branchNameOneFile');
        if(input)input.value=savedBranchName;
        try{await chrome.storage.local.set({dhlStockBranchName:savedBranchName});}catch(_){}
      }
      refreshButton();
    }catch(error){
      exportBuffer=null;
      sapoData=null;
      latestSource=[];
      scanAfterFile=false;
      setState(`File Sapo không hợp lệ: ${error.message||String(error)}`,'error');
      refreshButton();
    }
  }

  function download(bytes,fileName){
    const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=fileName;
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }

  async function makeOneFileImport(){
    const btn=document.getElementById('makeImportOneFile');
    const oldText=btn?btn.textContent:'';
    if(btn){
      btn.disabled=true;
      btn.textContent='ĐANG TẠO FILE...';
    }
    try{
      if(!sapoData||!exportBuffer)throw new Error('Chưa chọn file Sapo có SKU');
      if(!hasOriginalSku())throw new Error('File đang chọn không có SKU. Hãy dùng file products_export Sapo để giữ nguyên SKU gốc.');
      if(!scanAfterFile)throw new Error('Hãy bấm QUÉT KHO TRANG ĐANG MỞ sau khi chọn file');
      const branch=branchName();
      if(!branch)throw new Error('Chưa có tên chi nhánh Sapo');

      const prepared=officialImportRows();
      if(!prepared.rows.length)throw new Error('Không có biến thể nào vừa ghép được vừa có SKU gốc để tạo file.');

      setState(`Đang tạo file cho ${prepared.rows.length} biến thể bằng nguyên SKU Sapo...`);
      await new Promise((resolve)=>setTimeout(resolve,20));
      const out=stockImport.buildOfficialInventoryWorkbook(xlsx,prepared.rows,branch);
      if(out.templateSignature!=='SAPO-INVENTORY-TEMPLATE-V2')throw new Error('Bộ tạo file mẫu Sapo chưa đúng phiên bản');
      const d=new Date();
      const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      download(out.bytes,`SAPO_NHAP_TON_KHO_${stamp}.xlsx`);
      const skipped=Math.max(0,sapoData.variants.length-prepared.rows.length);
      const skuText=prepared.missingSku.length?` Trong đó ${prepared.missingSku.length} dòng thiếu SKU gốc.`:'';
      setState(`ĐÃ XONG: xuất ${out.rows} dòng (${out.zeroCount} dòng tồn = 0), chi nhánh ${branch}, dùng nguyên SKU Sapo. Bỏ qua ${skipped} biến thể.${skuText}`,'ok');
    }catch(error){
      setState(`LỖI TẠO FILE: ${error.message||String(error)}`,'error');
    }finally{
      if(btn){
        btn.textContent=oldText||'TẠO FILE NHẬP TỒN KHO SAPO';
        const prepared=officialImportRows();
        btn.disabled=!(sapoData&&exportBuffer&&scanAfterFile&&prepared.rows.length&&branchName());
      }
    }
  }

  async function restoreBranch(){
    try{
      const stored=await chrome.storage.local.get(['dhlStockBranchName']);
      if(stored&&String(stored.dhlStockBranchName||'').trim())savedBranchName=String(stored.dhlStockBranchName).trim();
    }catch(_){}
    const input=document.getElementById('branchNameOneFile');
    if(input)input.value=savedBranchName;
    refreshButton();
  }

  function mount(){
    const templateStep=document.getElementById('templateStep');
    if(templateStep)templateStep.style.display='none';

    const original=document.getElementById('makeImport');
    if(original)original.style.display='none';

    const exportInput=document.getElementById('sapoExport');
    const exportStep=exportInput&&exportInput.closest('.step');
    if(exportStep&&!document.getElementById('branchNameOneFile')){
      const wrap=document.createElement('div');
      wrap.style.marginTop='7px';
      wrap.innerHTML='<small style="display:block;margin-bottom:3px">Chi nhánh nhập tồn</small><input id="branchNameOneFile" type="text" value="dhl sport" style="width:100%;box-sizing:border-box" />';
      exportStep.appendChild(wrap);
      const input=wrap.querySelector('#branchNameOneFile');
      input.addEventListener('input',()=>{
        savedBranchName=String(input.value||'').trim();
        try{chrome.storage.local.set({dhlStockBranchName:savedBranchName});}catch(_){}
        refreshButton();
      });
    }

    const originalLabel=exportStep&&exportStep.querySelector('b');
    if(originalLabel)originalLabel.textContent='1. Chọn file Sapo có SKU (products_export)';

    const toolbar=original&&original.parentElement;
    if(toolbar&&!document.getElementById('makeImportOneFile')){
      const btn=document.createElement('button');
      btn.id='makeImportOneFile';
      btn.className='success';
      btn.disabled=true;
      btn.textContent='TẠO FILE NHẬP TỒN KHO SAPO';
      toolbar.appendChild(btn);
      const state=document.createElement('small');
      state.id='oneFileState';
      state.style.display='block';
      state.style.width='100%';
      state.style.marginTop='6px';
      state.textContent='Chọn file products_export Sapo có SKU để đối chiếu.';
      toolbar.parentElement.appendChild(state);
      btn.addEventListener('click',makeOneFileImport);
    }

    const guide=document.getElementById('dailyGuide');
    if(guide){
      guide.innerHTML='<b>DÙNG HẰNG NGÀY</b><span style="display:block;margin-top:5px">1) Chọn <b>products_export Sapo có SKU</b> → 2) mở đúng danh mục nguồn → 3) QUÉT KHO → 4) tên + màu + size trùng thì lấy tồn → 5) tạo file nhập bằng <b>SKU gốc Sapo</b>.</span>';
    }

    const subtitle=document.querySelector('header p');
    if(subtitle)subtitle.textContent='Chọn products_export có SKU → quét đúng danh mục → tạo file nhập tồn bằng nguyên SKU Sapo';
    const footer=document.querySelector('footer');
    if(footer)footer.textContent='File Quản lý kho không có SKU chỉ dùng kiểm tra/đối chiếu; file tạo nhập tồn bắt buộc dùng SKU gốc từ products_export Sapo.';

    if(exportInput){
      exportInput.addEventListener('change',(event)=>readExport(event.target.files&&event.target.files[0]));
    }

    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area!=='local'||!changes.dhlLastSourceResults)return;
      latestSource=Array.isArray(changes.dhlLastSourceResults.newValue)?changes.dhlLastSourceResults.newValue:[];
      scanAfterFile=Boolean(sapoData&&exportBuffer);
      refreshButton();
    });

    restoreBranch();
    refreshButton();
  }

  mount();
})();