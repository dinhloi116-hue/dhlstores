(() => {
  'use strict';

  const matcher=globalThis.DHLMatchCore;
  const xlsx=globalThis.DHLXlsxLite;
  const stockImport=globalThis.DHLStockImportCore;
  const warehouse=globalThis.DHLWarehouseCore;
  const shopRules=globalThis.DHLShopRules;
  if(!matcher||!xlsx||!stockImport||!warehouse||!shopRules)return;

  let exportBuffer=null;
  let sapoData=null;
  let latestSource=[];
  let exportName='';
  let scanAfterFile=false;

  function setState(text,kind=''){
    const el=document.getElementById('oneFileState');
    if(!el)return;
    el.textContent=String(text||'');
    el.style.color=kind==='error'?'#b91c1c':kind==='ok'?'#166534':'#475569';
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

  function standardSourceName(row){
    const best=row&&row.match&&row.match.best;
    if(best){
      const parent=String(best.parentName||'').trim();
      const color=String(best.color||'').trim();
      if(parent&&shopRules.skuBaseForStandardName(parent))return parent;
      if(parent&&color&&color!=='(không màu)'){
        const combined=`${parent} - ${color}`;
        if(shopRules.skuBaseForStandardName(combined))return combined;
      }
    }
    return String(row&&row.sapo&&row.sapo.name||'').trim();
  }

  function officialImportRows(){
    const result=[];
    const missing=[];
    for(const row of matchedRows()){
      const stock=Number(row.source.available);
      if(!Number.isFinite(stock)||stock<0)continue;
      const standard=standardSourceName(row);
      const base=shopRules.skuBaseForStandardName(standard)||shopRules.skuBaseForStandardName(row.sapo.name);
      if(!base){
        missing.push(`${row.sapo.name} / ${row.sapo.size}`);
        continue;
      }
      const size=matcher.normalizeSize(row.sapo.size);
      const sku=`${base}-${size}`;
      const variantName=String(row.sapo.rawProductLabel||`${row.sapo.name} Không in / ${size}`).trim();
      result.push({variantName,sku,stock,standardName:standard,size});
    }
    return{rows:result,missing};
  }

  function refreshButton(){
    const btn=document.getElementById('makeImportOneFile');
    if(!btn)return;
    const matched=matchedRows();
    const prepared=officialImportRows();
    btn.disabled=!(sapoData&&exportBuffer&&sapoData.inputType==='warehouse'&&scanAfterFile&&prepared.rows.length);

    if(!sapoData){
      setState('Chọn file Quản lý kho Sapo gốc. File này CHỈ dùng để đối chiếu tên/size, không dùng làm file đầu ra.');
    }else if(sapoData.inputType!=='warehouse'){
      setState('Hãy dùng file “Danh sách quản lý kho phiên bản sản phẩm” của Sapo.','error');
    }else if(!sapoData.warehouseBranchName){
      setState('Đã đọc file kho nhưng không thấy tên chi nhánh ở dòng phía trên cột Tồn kho.','error');
    }else if(!scanAfterFile){
      setState(`Đã nhận file đối chiếu: ${sapoData.products.length} sản phẩm / ${sapoData.variants.length} biến thể • chi nhánh: ${sapoData.warehouseBranchName}. Bấm QUÉT KHO HD 2026.`,'ok');
    }else if(prepared.rows.length){
      const products=new Set(matched.map((row)=>String(row.sapo.productId))).size;
      const missText=prepared.missing.length?` • ${prepared.missing.length} dòng thiếu map SKU sẽ bỏ qua`:'';
      setState(`Sẵn sàng: ${prepared.rows.length}/${sapoData.variants.length} biến thể thuộc ${products}/${sapoData.products.length} sản phẩm. Nút xanh sẽ tạo FILE MỚI theo đúng mẫu nhập tồn kho Sapo, không sửa file gốc.${missText}`,'ok');
    }else{
      setState('Đã quét nhưng chưa có dòng nào vừa ghép được tồn vừa xác định được SKU Sapo.','error');
    }
  }

  async function readExport(file){
    if(!file)return;
    try{
      const buffer=await file.arrayBuffer();
      exportBuffer=buffer;
      exportName=file.name||'';
      sapoData=await xlsx.parseSapoExport(buffer.slice(0));
      if(sapoData.inputType!=='warehouse')throw new Error('File này không phải “Danh sách quản lý kho phiên bản sản phẩm” của Sapo.');
      latestSource=[];
      scanAfterFile=false;
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
      btn.textContent='ĐANG TẠO FILE MẪU SAPO...';
    }
    try{
      if(!sapoData||!exportBuffer)throw new Error('Chưa chọn file Quản lý kho Sapo');
      if(sapoData.inputType!=='warehouse')throw new Error('Chỉ dùng file Quản lý kho Sapo làm dữ liệu đối chiếu');
      if(!sapoData.warehouseBranchName)throw new Error('Không đọc được tên chi nhánh từ file kho');
      if(!scanAfterFile)throw new Error('Hãy bấm QUÉT KHO HD 2026 sau khi chọn file');

      const prepared=officialImportRows();
      if(!prepared.rows.length)throw new Error('Không có biến thể nào đủ điều kiện tạo file nhập tồn kho');

      setState(`Đang dựng FILE MỚI theo mẫu “Cập nhật tồn kho phiên bản sản phẩm” cho ${prepared.rows.length} biến thể • chi nhánh “${sapoData.warehouseBranchName}”...`);
      await new Promise((resolve)=>setTimeout(resolve,20));
      const out=stockImport.buildOfficialInventoryWorkbook(xlsx,prepared.rows,sapoData.warehouseBranchName);
      if(out.templateSignature!=='SAPO-INVENTORY-TEMPLATE-V2')throw new Error('Bộ tạo file mẫu Sapo chưa đúng phiên bản');
      const d=new Date();
      const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      download(out.bytes,`SAPO_NHAP_TON_KHO_${stamp}.xlsx`);
      const missingText=prepared.missing.length?` Bỏ qua ${prepared.missing.length} dòng chưa có mapping SKU.`:'';
      setState(`ĐÃ XONG: tạo FILE MỚI đúng mẫu nhập tồn kho Sapo • ${out.rows} dòng (${out.zeroCount} dòng tồn = 0) • chi nhánh “${out.branchName}”. File Quản lý kho gốc không bị sửa.${missingText}`,'ok');
    }catch(error){
      setState(`LỖI TẠO FILE: ${error.message||String(error)}`,'error');
    }finally{
      if(btn){
        btn.textContent=oldText||'TẠO FILE NHẬP TỒN KHO SAPO';
        const prepared=officialImportRows();
        btn.disabled=!(sapoData&&exportBuffer&&sapoData.inputType==='warehouse'&&scanAfterFile&&prepared.rows.length);
      }
    }
  }

  function mount(){
    const templateStep=document.getElementById('templateStep');
    if(templateStep)templateStep.style.display='none';

    const original=document.getElementById('makeImport');
    if(original)original.style.display='none';

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
      state.textContent='Chọn file Quản lý kho Sapo gốc để đối chiếu.';
      toolbar.parentElement.appendChild(state);
      btn.addEventListener('click',makeOneFileImport);
    }

    const guide=document.getElementById('dailyGuide');
    if(guide){
      guide.innerHTML='<b>DÙNG HẰNG NGÀY — 1 FILE ĐỐI CHIẾU</b><span style="display:block;margin-top:5px">1) Xuất <b>Danh sách quản lý kho phiên bản sản phẩm</b> → 2) chọn file đó <b>chỉ để đối chiếu</b> → 3) QUÉT KHO → 4) tool tự tạo <b>FILE MỚI đúng mẫu nhập tồn kho Sapo</b> → 5) nhập file mới vào Sapo.</span>';
    }

    const subtitle=document.querySelector('header p');
    if(subtitle)subtitle.textContent='File Quản lý kho chỉ để đối chiếu → đầu ra luôn là FILE MỚI theo mẫu nhập tồn kho Sapo';
    const footer=document.querySelector('footer');
    if(footer)footer.textContent='Không xuất lại file Quản lý kho. Đầu ra luôn là mẫu “Cập nhật tồn kho phiên bản sản phẩm” với Tên phiên bản, SKU*, Tồn kho và chi nhánh.';

    const exportInput=document.getElementById('sapoExport');
    if(exportInput){
      exportInput.addEventListener('change',(event)=>readExport(event.target.files&&event.target.files[0]));
    }

    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area!=='local'||!changes.dhlLastSourceResults)return;
      latestSource=Array.isArray(changes.dhlLastSourceResults.newValue)?changes.dhlLastSourceResults.newValue:[];
      scanAfterFile=Boolean(sapoData&&exportBuffer);
      refreshButton();
    });

    refreshButton();
  }

  mount();
})();