(() => {
  'use strict';

  const matcher=globalThis.DHLMatchCore;
  const xlsx=globalThis.DHLXlsxLite;
  const direct=globalThis.DHLDirectStockCore;
  if(!matcher||!xlsx||!direct)return;

  let exportBuffer=null;
  let sapoData=null;
  let latestSource=[];
  let exportName='';
  let scanAfterFile=false;

  function escapeHtml(value){
    return String(value||'').replace(/[&<>\"]/g,(ch)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }

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
      setState('Chọn file xuất Sapo trước.');
    }else if(!scanAfterFile){
      setState(`Đã nhận ${sapoData.products.length} sản phẩm / ${sapoData.variants.length} biến thể. Bấm QUÉT KHO HD 2026 để lấy tồn mới.`,'ok');
    }else if(rows.length){
      const products=new Set(rows.map((row)=>String(row.sapo.productId))).size;
      setState(`Sẵn sàng: ${rows.length}/${sapoData.variants.length} biến thể thuộc ${products}/${sapoData.products.length} sản phẩm sẽ được sửa tồn trong chính file xuất Sapo.`,'ok');
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
      setState(`File xuất Sapo không hợp lệ: ${error.message||String(error)}`,'error');
      refreshButton();
    }
  }

  function download(bytes,fileName){
    const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=fileName;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  async function makeOneFileImport(){
    const btn=document.getElementById('makeImportOneFile');
    if(btn)btn.disabled=true;
    try{
      if(!sapoData||!exportBuffer)throw new Error('Chưa chọn file xuất Sapo');
      if(!scanAfterFile)throw new Error('Hãy bấm QUÉT KHO HD 2026 sau khi chọn file');
      const rows=matchedRows();
      if(!rows.length)throw new Error('Không có biến thể nào ghép chắc chắn với nguồn');

      const inventory=Object.create(null);
      for(const row of rows){
        const stock=Number(row.source.available);
        if(!Number.isFinite(stock)||stock<0)continue;
        inventory[String(row.sapo.variantId)]=stock;
      }

      setState(`Đang sửa cột tồn kho của ${Object.keys(inventory).length} biến thể trong chính file xuất Sapo...`);
      const out=await direct.updateExportWorkbook(xlsx,exportBuffer.slice(0),sapoData,inventory);
      const d=new Date();
      const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      download(out.bytes,`SAPO_XUAT_DA_CAP_NHAT_TON_${stamp}.xlsx`);
      setState(`Đã tạo file: sửa đúng ${out.rows} ô tồn kho (${out.zeroCount} ô về 0). Các dòng chưa ghép giữ nguyên như file xuất. Tên, SKU, ảnh, giá, mô tả, Alias và ID không bị sửa.`,'ok');
    }catch(error){
      setState(`Lỗi: ${error.message||String(error)}`,'error');
    }finally{
      refreshButton();
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
      btn.textContent='TẠO FILE SAPO ĐÃ CẬP NHẬT TỒN';
      toolbar.appendChild(btn);
      const state=document.createElement('small');
      state.id='oneFileState';
      state.style.display='block';
      state.style.width='100%';
      state.style.marginTop='6px';
      state.textContent='Chọn file xuất Sapo trước.';
      toolbar.parentElement.appendChild(state);
      btn.addEventListener('click',makeOneFileImport);
    }

    const guide=document.getElementById('dailyGuide');
    if(guide){
      guide.innerHTML='<b>DÙNG HẰNG NGÀY — CHỈ 1 FILE</b><span style="display:block;margin-top:5px">1) Xuất sản phẩm từ Sapo → 2) chọn file xuất → 3) QUÉT KHO HD 2026 → 4) TẠO FILE SAPO ĐÃ CẬP NHẬT TỒN → 5) nhập chính file đó lại Sapo. Không cần file mẫu nhập.</span>';
    }

    const subtitle=document.querySelector('header p');
    if(subtitle)subtitle.textContent='File xuất Sapo → quét tồn nguồn → sửa trực tiếp cột tồn → nhập lại Sapo';
    const footer=document.querySelector('footer');
    if(footer)footer.textContent='Hằng ngày chỉ cần 1 file xuất Sapo. Tool giữ nguyên toàn bộ dữ liệu và chỉ sửa tồn kho ở các biến thể ghép chắc chắn.';

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
