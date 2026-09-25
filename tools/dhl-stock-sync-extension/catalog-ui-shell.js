(() => {
  'use strict';

  function mountCatalogShell() {
    const main = document.querySelector('main');
    const steps = document.querySelector('.steps');
    if (!main || !steps || document.getElementById('catalogMode')) return false;

    const section = document.createElement('section');
    section.id = 'catalogMode';
    section.className = 'safety-note';
    section.style.borderColor = '#93c5fd';
    section.style.background = '#eff6ff';
    section.innerHTML = `
      <b>BƯỚC 1 — QUÉT TOÀN BỘ SẢN PHẨM MỚI</b>
      <span style="display:block;margin:6px 0 10px">Quét cả danh mục trong 1 lượt. KHÔNG lấy SKU cũ. Cột A Đường dẫn/Alias là mã gốc sản phẩm; SKU từng phân loại = Alias + Size.</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="scanCatalogSource" class="primary" style="flex:1;min-width:145px">QUÉT TẤT CẢ SẢN PHẨM MỚI</button>
        <button id="catalogQuickTest" class="secondary" style="flex:1;min-width:120px">TEST NHANH 1 SP</button>
        <button id="exportCatalogSource" class="secondary" style="flex:1;min-width:145px" disabled>TẠO FILE TẤT CẢ SP MỚI (.XLSX)</button>
      </div>
      <small id="catalogState" style="display:block;margin-top:8px">Chưa quét. Luồng này độc lập với products_export/SKU cũ.</small>`;
    main.insertBefore(section, steps);
    return true;
  }

  mountCatalogShell();
})();