(() => {
  'use strict';

  function mountMaintenanceUi() {
    const section = document.getElementById('catalogMode');
    const main = document.querySelector('main');
    if (!section || !main || section.dataset.maintenanceUi === '1') return false;

    section.dataset.maintenanceUi = '1';
    section.style.marginTop = '10px';
    section.style.borderColor = '#cbd5e1';
    section.style.background = '#f8fafc';
    section.style.padding = '0';
    section.style.overflow = 'hidden';

    const originalNodes = [...section.childNodes];
    const body = document.createElement('div');
    body.id = 'catalogMaintenanceBody';
    body.hidden = true;
    body.style.padding = '10px 12px 12px';
    for (const node of originalNodes) body.appendChild(node);

    const oldTitle = body.querySelector('b');
    if (oldTitle) oldTitle.textContent = 'LÀM MỚI DANH SÁCH NGUỒN';
    const oldDesc = body.querySelector('span');
    if (oldDesc) {
      oldDesc.textContent = 'Dùng khi cần chuẩn hóa lại nguồn. Chế độ bên dưới sẽ tự mở popup từng sản phẩm, đọc hết màu/size/tồn rồi chuyển sang sản phẩm tiếp theo.';
    }

    const standardizeBox = document.createElement('div');
    standardizeBox.id = 'maintenancePopupStandardizeBox';
    standardizeBox.style.marginTop = '10px';
    standardizeBox.style.padding = '10px';
    standardizeBox.style.border = '1px solid #f59e0b';
    standardizeBox.style.borderRadius = '9px';
    standardizeBox.style.background = '#fffbeb';
    standardizeBox.innerHTML = `
      <b style="display:block;color:#92400e">CHUẨN HÓA 1 LẦN — POPUP TOÀN BỘ</b>
      <small style="display:block;margin-top:5px;line-height:1.45">
        Tool sẽ BẬT popup thật lên màn hình cho từng sản phẩm → đọc toàn bộ màu / size / tồn → tự đóng popup → bật popup sản phẩm kế tiếp.
        <b>Không dùng quét API nhanh và không dùng SKU cũ.</b> Hãy giữ nguyên tab danh mục trong lúc chạy.
      </small>
      <button id="maintenancePopupFullScan" type="button" class="primary" style="width:100%;margin-top:9px">
        CHẠY POPUP TOÀN BỘ 1 LẦN
      </button>
      <small id="maintenancePopupFullState" style="display:block;margin-top:7px">
        Chưa chạy chuẩn hóa.
      </small>`;
    body.appendChild(standardizeBox);

    const standardizeBtn=standardizeBox.querySelector('#maintenancePopupFullScan');
    const standardizeState=standardizeBox.querySelector('#maintenancePopupFullState');

    function renderStandardizeProgress(info){
      if(!standardizeState||!info)return;
      if(info.done){
        standardizeState.textContent=`HOÀN TẤT: ${info.completeCount}/${info.total} sản phẩm đạt • ${info.variantCount||0} biến thể • lỗi/thiếu ${info.failedCount||0}.`;
        standardizeState.style.color=info.failedCount?'#92400e':'#166534';
        return;
      }
      standardizeState.textContent=`ĐANG POPUP ${info.current||0}/${info.total||0}: ${info.title||'Sản phẩm'} • đạt ${info.completeCount||0} • lỗi ${info.failedCount||0}`;
      standardizeState.style.color='#92400e';
    }

    standardizeBtn.addEventListener('click', async () => {
      const api=globalThis.DHLCatalogMaintenance;
      if(!api||typeof api.standardizeAllByPopup!=='function'){
        standardizeState.textContent='Chưa nạp được bộ quét popup. Hãy NẠP LẠI TOOL rồi thử lại.';
        standardizeState.style.color='#b91c1c';
        return;
      }
      const ok=confirm(
        'CHUẨN HÓA TOÀN BỘ NGUỒN 1 LẦN?\n\n'+
        'Tool sẽ BẬT/ĐÓNG popup thật trên màn hình cho TẤT CẢ sản phẩm trên danh mục đang mở.\n'+
        'Trong lúc chạy không chuyển tab nguồn, không bấm popup bằng tay.'
      );
      if(!ok)return;

      standardizeBtn.disabled=true;
      standardizeBtn.textContent='ĐANG CHUẨN HÓA...';
      standardizeState.textContent='Đang tìm danh sách sản phẩm trên tab nguồn...';
      try{
        const out=await api.standardizeAllByPopup({onProgress:renderStandardizeProgress});
        renderStandardizeProgress({
          done:true,
          total:out.itemCount,
          completeCount:out.completeCount,
          failedCount:out.failedCount,
          variantCount:out.variantCount
        });
      }catch(error){
        standardizeState.textContent=`LỖI: ${error&&error.message||String(error)}`;
        standardizeState.style.color='#b91c1c';
      }finally{
        standardizeBtn.disabled=false;
        standardizeBtn.textContent='CHẠY POPUP TOÀN BỘ 1 LẦN';
      }
    });

    const devBox = document.createElement('div');
    devBox.style.marginTop = '10px';
    devBox.style.paddingTop = '10px';
    devBox.style.borderTop = '1px dashed #cbd5e1';
    devBox.innerHTML = `
      <small style="display:block;margin-bottom:6px"><b>TEST NHANH KHI ĐANG SỬA TOOL</b><br>Load extension từ một thư mục cố định/GitHub clone một lần. Sau khi Pull code mới, chỉ cần bấm nút dưới để Chrome nạp lại code — không cần Add extension lại.</small>
      <button id="reloadExtensionDev" type="button" class="secondary" style="width:100%">NẠP LẠI TOOL SAU KHI PULL CODE</button>`;
    body.appendChild(devBox);

    const reloadBtn = devBox.querySelector('#reloadExtensionDev');
    reloadBtn.addEventListener('click', () => {
      reloadBtn.textContent = 'ĐANG NẠP LẠI...';
      setTimeout(() => chrome.runtime.reload(), 120);
    });

    const toggle = document.createElement('button');
    toggle.id = 'toggleCatalogMaintenance';
    toggle.type = 'button';
    toggle.className = 'secondary';
    toggle.style.width = '100%';
    toggle.style.border = '0';
    toggle.style.borderRadius = '0';
    toggle.style.padding = '11px 12px';
    toggle.style.display = 'flex';
    toggle.style.alignItems = 'center';
    toggle.style.justifyContent = 'space-between';
    toggle.style.gap = '8px';
    toggle.style.textAlign = 'left';
    toggle.innerHTML = '<span><b>BẢO TRÌ NGUỒN</b><small style="display:block;margin-top:3px;font-weight:400">Chuẩn hóa 1 lần / khi web có sản phẩm, màu mới</small></span><span id="catalogMaintenanceChevron" style="font-size:16px">▾</span>';

    toggle.addEventListener('click', () => {
      body.hidden = !body.hidden;
      const chevron = document.getElementById('catalogMaintenanceChevron');
      if (chevron) chevron.textContent = body.hidden ? '▾' : '▴';
    });

    section.replaceChildren(toggle, body);

    const footer = main.querySelector('footer');
    if (footer) main.insertBefore(section, footer);
    else main.appendChild(section);

    return true;
  }

  if (!mountMaintenanceUi()) {
    const observer = new MutationObserver(() => {
      if (mountMaintenanceUi()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 5000);
  }
})();
