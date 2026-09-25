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
      <b>THÊM NHIỀU SẢN PHẨM / QUÉT CẢ DANH MỤC</b>
      <span style="display:block;margin:6px 0 10px">Dùng phần này khi cần thêm/quét nhiều sản phẩm cùng lúc. Nếu chỉ thêm 1 sản phẩm mới, dùng khối “THÊM 1 SẢN PHẨM MỚI — NHANH” bên dưới.</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="scanCatalogSource" class="primary" style="flex:1;min-width:145px">QUÉT TOÀN BỘ TRANG ĐANG MỞ</button>
        <button id="catalogQuickTest" class="secondary" style="flex:1;min-width:120px">TEST NHANH 1 SP</button>
        <button id="exportCatalogSource" class="secondary" style="flex:1;min-width:145px" disabled>TẠO FILE SẢN PHẨM SAPO (.XLSX)</button>
      </div>
      <small id="catalogState" style="display:block;margin-top:8px">Chưa quét. Tool sẽ giữ nguyên danh mục bạn đang mở.</small>`;
    main.insertBefore(section, steps);
    return true;
  }

  mountCatalogShell();
})();