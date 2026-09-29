(() => {
  'use strict';

  const PROFILE_KEY='dhlSavedStockProfilesV1';
  const SELECTED_KEY='dhlSelectedStockProfileId';
  let profiles=[];
  let selectedId='';

  const $=(id)=>document.getElementById(id);
  const text=(v)=>String(v==null?'':v).trim();
  const esc=(v)=>text(v).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

  async function loadStore(){
    const s=await chrome.storage.local.get([PROFILE_KEY,SELECTED_KEY]);
    profiles=Array.isArray(s[PROFILE_KEY])?s[PROFILE_KEY]:[];
    selectedId=text(s[SELECTED_KEY]);
    if(!profiles.some(p=>String(p&&p.id)===selectedId))selectedId=profiles[0]?String(profiles[0].id):'';
  }

  async function selectProfile(id){
    selectedId=text(id);
    await chrome.storage.local.set({[SELECTED_KEY]:selectedId});
    renderProfiles();
  }

  function profileMeta(p){
    const parts=[];
    if(Number(p&&p.productCount||0))parts.push(`${Number(p.productCount)} SP`);
    if(Number(p&&p.lastScanRowCount||0))parts.push(`${Number(p.lastScanRowCount)} dòng`);
    if(Number(p&&p.lastSourceAt||0))parts.push(new Date(Number(p.lastSourceAt)).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}));
    return parts.join(' • ');
  }

  function renderProfiles(){
    const box=$('profileChips');
    if(!box)return;
    const sorted=[...profiles].sort((a,b)=>Number(b&&b.lastSourceAt||b&&b.updatedAt||0)-Number(a&&a.lastSourceAt||a&&a.updatedAt||0));
    if(!sorted.length){
      box.innerHTML='<small style="display:block;color:#64748b">Chưa có hồ sơ. Mở tab danh mục nguồn rồi bấm CHẠY NỀN; tool sẽ tự lưu hồ sơ của tab đó.</small>';
      return;
    }
    box.innerHTML=`
      <small style="display:block;margin-bottom:6px;color:#475569"><b>HỒ SƠ ĐÃ NHỚ</b> — tự tạo từ các tab đã quét.</small>
      <div id="profileChipButtons" style="display:flex;gap:7px;flex-wrap:wrap"></div>`;
    const row=$('profileChipButtons');
    for(const p of sorted){
      const active=String(p.id)===selectedId;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className=active?'primary':'secondary';
      btn.style.padding='7px 10px';
      btn.style.minWidth='72px';
      btn.title=`${text(p.name)||'Hồ sơ'}${profileMeta(p)?' • '+profileMeta(p):''}`;
      btn.innerHTML=`<b style="display:block;font-size:11px">${esc(p.name||'Hồ sơ')}</b>${profileMeta(p)?`<small style="display:block;font-size:9px;opacity:.75;margin-top:2px">${esc(profileMeta(p))}</small>`:''}`;
      btn.addEventListener('click',()=>selectProfile(p.id));
      row.appendChild(btn);
    }
  }

  function status(message,kind=''){
    const el=$('profileStatus');
    if(!el)return;
    el.textContent=text(message);
    el.style.color=kind==='error'?'#b91c1c':kind==='ok'?'#166534':'#475569';
  }

  function mount(){
    if($('savedProfilesMode'))return true;
    const main=document.querySelector('main');
    if(!main)return false;

    for(const el of [document.querySelector('.steps'),$('statusBox'),document.querySelector('.stats'),document.querySelector('.toolbar'),document.querySelector('.table-wrap')]){
      if(el)el.style.display='none';
    }
    const intro=[...main.querySelectorAll('.safety-note')].find(el=>el.id!=='catalogMode');
    if(intro)intro.style.display='none';

    const section=document.createElement('section');
    section.id='savedProfilesMode';
    section.className='safety-note';
    section.style.borderColor='#86efac';
    section.style.background='#f0fdf4';
    section.innerHTML=`
      <b>1. ĐỒNG BỘ TỒN KHO</b>
      <small style="display:block;margin-top:4px;color:#475569">Mở tab danh mục nào thì quét tab đó. Tool tự tạo/cập nhật hồ sơ theo tab và tự nhớ URL, tiến độ, kết quả quét.</small>
      <div id="profileChips" style="margin:10px 0"></div>
      <small id="profileStatus" style="display:block;margin-top:8px;color:#475569">Mở tab nguồn cần đồng bộ rồi bấm CHẠY NỀN.</small>`;

    const catalog=$('catalogMode');
    if(catalog&&catalog.parentElement===main)main.insertBefore(section,catalog);
    else{
      const footer=main.querySelector('footer');
      if(footer)main.insertBefore(section,footer);else main.appendChild(section);
    }

    loadStore().then(()=>{
      renderProfiles();
      if(profiles.length)status('Hồ sơ sẽ tự cập nhật theo tab đang quét.','ok');
    }).catch(error=>status(`Không đọc được hồ sơ đã lưu: ${error.message||String(error)}`,'error'));

    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area!=='local'||(!changes[PROFILE_KEY]&&!changes[SELECTED_KEY]))return;
      loadStore().then(renderProfiles).catch(()=>{});
    });
    return true;
  }

  mount();
})();