(() => {
  'use strict';

  const PROFILE_KEY='dhlSavedStockProfilesV1';
  let profiles=[];

  const $=(id)=>document.getElementById(id);
  const text=(v)=>String(v==null?'':v).trim();
  const esc=(v)=>text(v).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

  async function loadStore(){
    const s=await chrome.storage.local.get(PROFILE_KEY);
    profiles=Array.isArray(s[PROFILE_KEY])?s[PROFILE_KEY]:[];
  }

  function profileMeta(p){
    const parts=[];
    if(Number(p&&p.productCount||0))parts.push(`${Number(p.productCount)} SP`);
    if(Number(p&&p.lastScanRowCount||0))parts.push(`${Number(p.lastScanRowCount)} dòng`);
    if(Number(p&&p.lastSourceAt||0))parts.push(new Date(Number(p.lastSourceAt)).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}));
    return parts.join(' • ');
  }

  function render(){
    const box=$('profileHistoryList');
    if(!box)return;
    const sorted=[...profiles].sort((a,b)=>Number(b&&b.lastSourceAt||b&&b.updatedAt||0)-Number(a&&a.lastSourceAt||a&&a.updatedAt||0));
    if(!sorted.length){
      box.innerHTML='<small>Chưa có lịch sử. Tab mới sẽ tự tạo hồ sơ sau lần đồng bộ đầu tiên.</small>';
      return;
    }
    box.innerHTML=sorted.map(p=>`
      <div style="padding:7px 0;border-top:1px solid #e2e8f0">
        <b style="display:block;font-size:10px">${esc(p.name||'Danh mục')}</b>
        <small style="display:block;margin-top:2px;color:#64748b;font-size:9px">${esc(profileMeta(p)||p.lastSourceUrl||'')}</small>
      </div>`).join('');
  }

  function mount(){
    if($('savedProfilesMode'))return true;
    const main=document.querySelector('main');
    if(!main)return false;

    const section=document.createElement('section');
    section.id='savedProfilesMode';
    section.className='safety-note';
    section.style.borderColor='#86efac';
    section.style.background='#f0fdf4';
    section.innerHTML=`
      <b>1. ĐỒNG BỘ TỒN KHO</b>
      <small style="display:block;margin-top:4px;color:#475569">Đứng ở tab nguồn cần làm rồi bấm ĐỒNG BỘ TAB NÀY. Tab mới tự tạo hồ sơ.</small>
      <details id="profileHistory" style="margin-top:9px">
        <summary style="cursor:pointer;font-size:9px;font-weight:800;color:#64748b">LỊCH SỬ HỒ SƠ</summary>
        <div id="profileHistoryList" style="margin-top:6px"></div>
      </details>
      <small id="profileStatus" style="display:none"></small>`;

    main.appendChild(section);

    loadStore().then(render).catch(()=>{});
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&changes[PROFILE_KEY])loadStore().then(render).catch(()=>{});
    });
    return true;
  }

  mount();
})();