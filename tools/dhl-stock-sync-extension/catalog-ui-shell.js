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
      <b>BƯỚC 0 — LẤY DANH SÁCH NGUỒN (KHÔNG CẦN FILE SAPO)</b>
      <span style="display:block;margin:6px 0 10px">Đứng ở đúng danh mục cần quét (HD, Trẻ em, CLB/ĐT...). Tool chỉ dùng đúng trang đang mở và không tự chuyển sang danh mục khác.</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="scanCatalogSource" class="primary" style="flex:1;min-width:145px">QUÉT TOÀN BỘ TRANG ĐANG MỞ</button>
        <button id="exportCatalogSource" class="secondary" style="flex:1;min-width:145px" disabled>TẠO FILE SẢN PHẨM SAPO (.XLSX)</button>
      </div>
      <small id="catalogState" style="display:block;margin-top:8px">Chưa quét. Tool sẽ giữ nguyên danh mục bạn đang mở.</small>`;
    main.insertBefore(section, steps);
    return true;
  }

  mountCatalogShell();
})();
