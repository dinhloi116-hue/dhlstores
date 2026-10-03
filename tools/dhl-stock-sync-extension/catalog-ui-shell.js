(() => {
  'use strict';

  function mountCatalogShell(){
    const main=document.querySelector('main');
    if(!main||document.getElementById('catalogMode'))return false;

    const section=document.createElement('section');
    section.id='catalogMode';
    section.className='safety-note';
    section.style.borderColor='#93c5fd';
    section.style.background='#eff6ff';
    section.innerHTML=`
      <b>2. THÊM SẢN PHẨM MỚI</b>
      <span style="display:block;margin:6px 0 10px">Thêm 1 sản phẩm đang mở hoặc quét toàn bộ sản phẩm mới của danh mục. SKU = Đường dẫn/Alias + Size.</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="scanCatalogSource" class="primary" style="flex:1;min-width:145px">QUÉT TẤT CẢ SP MỚI</button>
        <button id="catalogQuickTest" class="secondary" style="display:none">TEST NHANH 1 SP</button>
        <button id="exportCatalogSource" class="secondary" style="flex:1;min-width:145px" disabled>TẠO EXCEL SP MỚI</button>
      </div>
      <small id="catalogState" style="display:block;margin-top:8px">Chưa quét sản phẩm mới.</small>`;

    const stock=document.getElementById('savedProfilesMode');
    if(stock&&stock.parentElement===main)stock.insertAdjacentElement('afterend',section);
    else main.appendChild(section);
    return true;
  }

  mountCatalogShell();
})();