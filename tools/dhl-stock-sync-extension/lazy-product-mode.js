(() => {
  'use strict';

  const scripts=[
    'match-core.js',
    'shop-rules.js',
    'product-create-core.js',
    'catalog-ui-shell.js',
    'catalog-popup-v3-mode.js',
    'sapo-product-create-mode.js',
    'single-product-add-mode.js',
    'marketplace-sku-mode.js'
  ];
  let loading=false,loaded=false;

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;
      s.onload=()=>resolve();
      s.onerror=()=>reject(new Error(`Không nạp được ${src}`));
      document.body.appendChild(s);
    });
  }

  async function loadProductModules(){
    if(loaded||loading)return;
    loading=true;
    const btn=document.getElementById('lazyProductBtn');
    const state=document.getElementById('lazyProductState');
    if(btn){btn.disabled=true;btn.textContent='ĐANG NẠP...';}
    if(state)state.textContent='Đang nạp module thêm sản phẩm...';
    try{
      for(const src of scripts)await loadScript(src);
      loaded=true;
      const launcher=document.getElementById('catalogLazyLauncher');
      if(launcher)launcher.remove();
      const catalog=document.getElementById('catalogMode');
      const stock=document.getElementById('savedProfilesMode');
      if(catalog&&stock&&catalog.parentElement===stock.parentElement&&stock.nextSibling!==catalog){
        stock.insertAdjacentElement('afterend',catalog);
      }
    }catch(error){
      if(btn){btn.disabled=false;btn.textContent='THÊM SẢN PHẨM MỚI';}
      if(state){state.textContent=error.message||String(error);state.style.color='#b91c1c';}
    }finally{
      loading=false;
    }
  }

  function mount(){
    if(document.getElementById('catalogLazyLauncher')||document.getElementById('catalogMode'))return;
    const main=document.querySelector('main');
    const stock=document.getElementById('savedProfilesMode');
    if(!main||!stock)return;

    const section=document.createElement('section');
    section.id='catalogLazyLauncher';
    section.className='safety-note';
    section.style.borderColor='#93c5fd';
    section.style.background='#eff6ff';
    section.innerHTML=`
      <b>2. THÊM SẢN PHẨM MỚI</b>
      <small id="lazyProductState" style="display:block;margin:5px 0 8px;color:#64748b">Chưa nạp phần này để tool mở nhanh hơn.</small>
      <button id="lazyProductBtn" type="button" class="secondary" style="width:100%;min-height:42px;font-weight:800">THÊM SẢN PHẨM MỚI</button>`;
    stock.insertAdjacentElement('afterend',section);
    document.getElementById('lazyProductBtn')?.addEventListener('click',loadProductModules);
  }

  mount();
})();