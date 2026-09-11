(() => {
  'use strict';

  const matcher=globalThis.DHLMatchCore;
  const xlsx=globalThis.DHLXlsxLite;
  const stockImport=globalThis.DHLStockImportCore;
  const warehouse=globalThis.DHLWarehouseCore;
  if(!matcher||!xlsx||!stockImport||!warehouse)return;

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

  function officialImportRows(){
    const result=[];
    const missingSku=[];
    for(const row of matchedRows()){
      const stock=Number(row.source.available);
      if(!Number.isFinite(stock)||stock<0)continue;

      // Quan trọng: dùng nguyên SKU đang có trong file Sapo. Không tự tạo/map SKU mới.
      const sku=String((row.sapo&&row.sapo.sku)||'').trim();
      if(!sku){
        missingSku.push(`${row.sapo.name||''} / ${row.sapo.size||''}`);
        continue;
      }

      const size=matcher.normalizeSize(row.sapo.size||row.sapo.sizeFromSku);
      const variantName=String(row.sapo.rawProductLabel||`${row.sapo.name||''}${size?` / ${size}`:''}`).trim();
      result.push({
        variantName,
        sku,
        stock,
        standardName:String(row.sapo.name||'').trim(),
        size
      });
    }
    return{rows:result,missingSku};
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
      setState(`Đã nhận file đối chiếu: ${sapoData.products.length} sản phẩm / ${sapoData.variants.length} biến thể • chi nhánh: ${sapoData.warehouseBranchName}. Bấm QUÉT KHO TRANG ĐANG MỞ.`,'ok');
    }else if(prepared.rows.length){
      const products=new Set(matched.map((row)=>String(row.sapo.productId))).size;
      const skipped=Math.max(0,sapoData.variants.length-prepared.rows.length);
      const skuText=prepared.missingSku.length?` • ${prepared.missingSku.length} dòng không có SKU gốc bị bỏ qua`:'';
      setState(`Sẵn sàng: ${prepared.rows.length}/${sapoData.variants.length} biến thể thuộc ${products}/${sapoData.products.length} sản phẩm. ${skipped} biến thể không ghép được sẽ BỎ QUA, không chặn tạo file.${skuText}`,'ok');
    }else{
      setState('Không có tên sản phẩm nào trùng chính xác với nguồn. Tool sẽ không đoán ghép; các sản phẩm này được bỏ qua.');
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
      if(!scanAfterFile)throw new Error('Hãy bấm QUÉT KHO TRANG ĐANG MỞ sau khi chọn file');

      const prepared=officialImportRows();
      if(!prepared.rows.length)throw new Error('Không có sản phẩm nào trùng tên + trùng size để tạo file. Các sản phẩm không ghép được đã được bỏ qua.');

      setState(`Đang tạo file cho ${prepared.rows.length} biến thể ghép được. Các biến thể không ghép được sẽ không xuất.`);
      await new Promise((resolve)=>setTimeout(resolve,20));
      const out=stockImport.buildOfficialInventoryWorkbook(xlsx,prepared.rows,sapoData.warehouseBranchName);
      if(out.templateSignature!=='SAPO-INVENTORY-TEMPLATE-V2')throw new Error('Bộ tạo file mẫu Sapo chưa đúng phiên bản');
      const d=new Date();
      const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      download(out.bytes,`SAPO_NHAP_TON_KHO_${stamp}.xlsx`);
      const skipped=Math.max(0,sapoData.variants.length-prepared.rows.length);
      const skuText=prepared.missingSku.length?` Trong đó ${prepared.missingSku.length} dòng thiếu SKU gốc.`:'';
      setState(`ĐÃ XONG: xuất ${out.rows} dòng ghép được (${out.zeroCount} dòng tồn = 0), dùng nguyên SKU Sapo. Bỏ qua ${skipped} biến thể không ghép được.${skuText}`,'ok');
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
      guide.innerHTML='<b>DÙNG HẰNG NGÀY — CHỈ GHÉP TÊN TRÙNG</b><span style="display:block;margin-top:5px">1) Chọn file Quản lý kho Sapo → 2) mở đúng danh mục nguồn → 3) QUÉT KHO → 4) tool chỉ lấy sản phẩm có <b>tên trùng + size trùng</b>. Không trùng thì bỏ qua → 5) tạo file nhập bằng <b>SKU gốc Sapo</b>.</span>';
    }

    const subtitle=document.querySelector('header p');
    if(subtitle)subtitle.textContent='Tên trùng + size trùng thì lấy tồn; không trùng thì bỏ qua; SKU luôn giữ nguyên từ Sapo';
    const footer=document.querySelector('footer');
    if(footer)footer.textContent='Sản phẩm không ghép được không làm hỏng cả file: tool chỉ xuất các dòng ghép chắc chắn và dùng nguyên SKU Sapo.';

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