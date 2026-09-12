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
      oldDesc.textContent = 'Chỉ chạy khi web nguồn vừa thêm sản phẩm, đổi tên hoặc thêm màu mới. Không cần chạy mỗi ngày. Nên TEST NHANH 1 SP trước rồi mới quét toàn bộ.';
    }

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
    toggle.innerHTML = '<span><b>BẢO TRÌ NGUỒN</b><small style="display:block;margin-top:3px;font-weight:400">Chỉ dùng khi web có sản phẩm / màu mới</small></span><span id="catalogMaintenanceChevron" style="font-size:16px">▾</span>';

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
