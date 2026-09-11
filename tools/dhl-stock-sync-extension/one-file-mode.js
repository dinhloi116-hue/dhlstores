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

  function refreshButton(){
    const btn=document.getElementById('makeImportOneFile');
    if(!btn)return;
    const rows=matchedRows();
    btn.disabled=!(sapoData&&exportBuffer&&scanAfterFile&&rows.length);

    if(!sapoData){
      setState('Chọn file Quản lý kho Sapo trước.');
    }else if(!scanAfterFile){
      const type=sapoData.inputType==='warehouse'?'file Quản lý kho':'file sản phẩm';
      setState(`Đã nhận ${type}: ${sapoData.products.length} sản phẩm / ${sapoData.variants.length} biến thể. Bấm QUÉT KHO HD 2026.`,'ok');
    }else if(rows.length){
      const products=new Set(rows.map((row)=>String(row.sapo.productId))).size;
      setState(`Sẵn sàng: ${rows.length}/${sapoData.variants.length} biến thể thuộc ${products}/${sapoData.products.length} sản phẩm sẽ được cập nhật tồn.`,'ok');
    }else{
      setState('Đã quét nhưng chưa ghép được biến thể nào. Không tạo file.','error');
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
      if(!sapoData||!exportBuffer)throw new Error('Chưa chọn file Sapo');
      if(!scanAfterFile)throw new Error('Hãy bấm QUÉT KHO HD 2026 sau khi chọn file');
      const rows=matchedRows();
      if(!rows.length)throw new Error('Không có biến thể nào ghép chắc chắn với nguồn');

      const inventory=Object.create(null);
      for(const row of rows){
        const stock=Number(row.source.available);
        if(!Number.isFinite(stock)||stock<0)continue;
        inventory[String(row.sapo.variantId)]=stock;
      }

      const d=new Date();
      const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

      if(sapoData.inputType==='warehouse'){
        setState(`Đang sửa trực tiếp cột Tồn kho cho ${Object.keys(inventory).length} biến thể trong chính file Quản lý kho...`);
        await new Promise((resolve)=>setTimeout(resolve,20));
        const out=await warehouse.updateWarehouseWorkbook(exportBuffer.slice(0),sapoData,inventory);
        download(out.bytes,`DANH_SACH_QUAN_LY_KHO_DA_CAP_NHAT_TON_${stamp}.xlsx`);
        setState(`ĐÃ XONG: sửa ${out.rows} dòng Tồn kho (${out.zeroCount} dòng về 0). File giữ nguyên đúng cấu trúc Quản lý kho Sapo; dòng trẻ em và dòng chưa ghép giữ nguyên.`,'ok');
      }else{
        setState(`Đang tạo file 36 cột đúng mẫu Sapo cho ${Object.keys(inventory).length} biến thể...`);
        await new Promise((resolve)=>setTimeout(resolve,20));
        const out=stockImport.buildInventoryWorkbook(xlsx,sapoData,inventory,'Cửa hàng chính');
        download(out.bytes,`SAPO_NHAP_TON_KHO_${stamp}.xlsx`);
        setState(`ĐÃ XONG: ${out.rows} dòng, đúng mẫu 36 cột; cột Cửa hàng chính_Tồn kho đã ghi tồn mới.`,'ok');
      }
    }catch(error){
      setState(`LỖI TẠO FILE: ${error.message||String(error)}`,'error');
    }finally{
      if(btn){
        btn.textContent=oldText||'TẠO FILE KHO ĐÃ CẬP NHẬT TỒN';
        const rows=matchedRows();
        btn.disabled=!(sapoData&&exportBuffer&&scanAfterFile&&rows.length);
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
      btn.textContent='TẠO FILE KHO ĐÃ CẬP NHẬT TỒN';
      toolbar.appendChild(btn);
      const state=document.createElement('small');
      state.id='oneFileState';
      state.style.display='block';
      state.style.width='100%';
      state.style.marginTop='6px';
      state.textContent='Chọn file Quản lý kho Sapo trước.';
      toolbar.parentElement.appendChild(state);
      btn.addEventListener('click',makeOneFileImport);
    }

    const guide=document.getElementById('dailyGuide');
    if(guide){
      guide.innerHTML='<b>DÙNG HẰNG NGÀY — FILE QUẢN LÝ KHO</b><span style="display:block;margin-top:5px">1) Xuất <b>Danh sách quản lý kho phiên bản sản phẩm</b> từ Sapo → 2) chọn file đó → 3) QUÉT KHO → 4) TẠO FILE KHO ĐÃ CẬP NHẬT TỒN → 5) nhập lại Sapo.</span>';
    }

    const subtitle=document.querySelector('header p');
    if(subtitle)subtitle.textContent='File Quản lý kho Sapo → quét nguồn → sửa trực tiếp cột Tồn kho';
    const footer=document.querySelector('footer');
    if(footer)footer.textContent='File kho đầu ra giữ nguyên cấu trúc gốc; tool chỉ sửa cột Tồn kho của các size S/M/L/XL/XXL ghép chắc chắn.';

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
