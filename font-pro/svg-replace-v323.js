(function(){
  'use strict';
  const VERSION='V32.3';
  const ASCII_UP='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const ASCII_LOW='abcdefghijklmnopqrstuvwxyz';
  const DIGITS='0123456789';

  function byId(id){return document.getElementById(id)}
  function uniqChars(s){return [...new Set([...(s||'')])].filter(ch=>ch && !/\s/u.test(ch));}
  function cp(ch){return 'U+'+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');}
  function labelChar(ch){
    if(/[\u0300-\u036f]/u.test(ch)) return '◌'+ch+' — '+cp(ch);
    if(ch===' ') return 'SPACE — '+cp(ch);
    return ch+' — '+cp(ch);
  }
  function validSvg(text){
    try{
      const d=new DOMParser().parseFromString(text,'image/svg+xml');
      return d.documentElement && d.documentElement.tagName.toLowerCase()==='svg' && !d.querySelector('parsererror');
    }catch(e){return false;}
  }
  function candidateGroups(){
    const base=uniqChars(typeof baseChars!=='undefined'?baseChars:'');
    const vi=uniqChars(typeof VI!=='undefined'?VI:'');
    const overrides=uniqChars(Object.keys(state.svgOverrides||{}).join(''));
    const glyphState=uniqChars(Object.keys(state.glyphs||{}).join(''));
    const all=uniqChars(ASCII_UP+ASCII_LOW+DIGITS+base.join('')+vi.join('')+glyphState.join('')+overrides.join(''));
    const used=new Set();
    function take(name, arr){
      const chars=[];
      for(const ch of arr){if(!used.has(ch) && all.includes(ch)){used.add(ch);chars.push(ch);}}
      return {name,chars};
    }
    const groups=[];
    groups.push(take('Chữ hoa A–Z', uniqChars(ASCII_UP)));
    groups.push(take('Số 0–9', uniqChars(DIGITS)));
    groups.push(take('Chữ tiếng Việt', vi.filter(ch=>!ASCII_UP.includes(ch))));
    const lower=all.filter(ch=>ASCII_LOW.includes(ch));
    if(lower.length) groups.push(take('Chữ thường a–z', lower));
    groups.push(take('Ký tự khác trong font', all));
    return groups.filter(g=>g.chars.length);
  }
  function refreshSelect(prefer){
    const sel=byId('svgReplaceChar');
    if(!sel)return;
    const old=prefer || sel.value || (typeof currentGlyph!=='undefined'?currentGlyph:'A');
    sel.innerHTML='';
    for(const g of candidateGroups()){
      const og=document.createElement('optgroup');og.label=g.name;
      for(const ch of g.chars){const o=document.createElement('option');o.value=ch;o.textContent=labelChar(ch);og.appendChild(o)}
      sel.appendChild(og);
    }
    if([...sel.options].some(o=>o.value===old))sel.value=old;
    updateCurrentInfo();
  }
  function updateCurrentInfo(){
    const sel=byId('svgReplaceChar'),info=byId('svgReplaceCurrent'),remove=byId('svgReplaceRemove');
    if(!sel||!info)return;
    const ch=sel.value;
    const ov=state.svgOverrides && state.svgOverrides[ch];
    info.innerHTML=ov
      ? '<b>'+labelChar(ch)+'</b> hiện đang dùng SVG: <b>'+String(ov.name||'SVG tùy chỉnh')+'</b>'
      : '<b>'+labelChar(ch)+'</b> hiện đang dùng glyph gốc của font.';
    if(remove)remove.disabled=!ov;
  }
  function setStatus(msg,type){
    const s=byId('svgReplaceStatus');if(!s)return;
    s.className='bigStatus '+(type||'');s.textContent=msg;
  }
  async function replaceSelected(){
    const sel=byId('svgReplaceChar'),input=byId('svgReplaceOneFile');
    const ch=sel&&sel.value, file=input&&input.files&&input.files[0];
    if(!ch)return setStatus('Hãy chọn ký tự cần thay.','warn');
    if(!file)return setStatus('Hãy chọn 1 file SVG để thay cho '+ch+'.','warn');
    const svg=await file.text();
    if(!validSvg(svg))return setStatus('File đã chọn không phải SVG hợp lệ.','err');

    let asset=null;
    const old=state.svgOverrides[ch];
    if(old && old.assetId) asset=state.assets.find(a=>a.id===old.assetId) || null;
    if(asset){
      asset.svg=svg;asset.name=file.name;asset.char=ch;
    }else{
      asset={id:(crypto.randomUUID?crypto.randomUUID():('svg-'+Date.now()+'-'+Math.random())),name:file.name,svg,char:ch};
      state.assets.push(asset);
    }
    state.svgOverrides[ch]={svg,name:file.name,assetId:asset.id};
    if(typeof currentGlyph!=='undefined')currentGlyph=ch;
    try{dirty()}catch(e){}
    try{render()}catch(e){}
    try{glyphToUI()}catch(e){}
    if(input)input.value='';
    refreshSelect(ch);
    setStatus('✓ Đã thay SVG thật cho '+ch+' ('+cp(ch)+'). Preview và dữ liệu dự án đã cập nhật.','ok');
  }
  function removeSelected(){
    const sel=byId('svgReplaceChar'); if(!sel||!sel.value)return;
    const ch=sel.value, old=state.svgOverrides[ch];
    if(!old)return updateCurrentInfo();
    if(old.assetId){
      const i=state.assets.findIndex(a=>a.id===old.assetId);
      if(i>=0)state.assets.splice(i,1);
    }
    delete state.svgOverrides[ch];
    try{dirty()}catch(e){}
    try{render()}catch(e){}
    refreshSelect(ch);
    setStatus('Đã bỏ SVG thay thế của '+ch+'; glyph gốc được khôi phục.','ok');
  }
  function useCurrentGlyph(){
    if(typeof currentGlyph==='undefined')return;
    refreshSelect(currentGlyph);
    const sel=byId('svgReplaceChar');if(sel && [...sel.options].some(o=>o.value===currentGlyph))sel.value=currentGlyph;
    updateCurrentInfo();
  }
  function install(){
    const tab=byId('svgTab');
    if(!tab || byId('svgReplaceCard'))return;
    const reset=tab.querySelector('.tabResetBar');
    const card=document.createElement('div');
    card.id='svgReplaceCard';
    card.style.cssText='border:1px solid #cfd7e3;border-radius:10px;padding:10px;margin:8px 0;background:#f8fbff';
    card.innerHTML=`
      <div style="font-size:12px;font-weight:900;margin-bottom:7px">THAY SVG CHO 1 KÝ TỰ</div>
      <div class="muted" style="margin-bottom:8px">Chọn đúng ký tự trước, sau đó chọn 1 file SVG. Nút bên dưới sẽ thay trực tiếp glyph đó trong preview/dự án, không phụ thuộc tên file.</div>
      <div class="row">
        <div><label>1. Ký tự / chữ / số cần thay</label><select id="svgReplaceChar"></select></div>
        <div><label>2. File SVG thay thế</label><input id="svgReplaceOneFile" type="file" accept=".svg,image/svg+xml"></div>
      </div>
      <div class="btns" style="margin-top:8px">
        <button id="svgReplaceApply" class="btn primary">THAY SVG CHO KÝ TỰ ĐÃ CHỌN</button>
        <button id="svgReplaceUseCurrent" class="btn">DÙNG KÝ TỰ ĐANG CHỌN</button>
        <button id="svgReplaceRefresh" class="btn">LÀM MỚI DANH SÁCH</button>
        <button id="svgReplaceRemove" class="btn danger">KHÔI PHỤC GLYPH GỐC</button>
      </div>
      <div id="svgReplaceCurrent" class="smallNote" style="margin-top:7px"></div>
      <div id="svgReplaceStatus" class="bigStatus" style="margin-top:7px">Chưa thay SVG.</div>`;
    if(reset)reset.insertAdjacentElement('afterend',card); else tab.prepend(card);
    byId('svgReplaceChar').addEventListener('change',updateCurrentInfo);
    byId('svgReplaceChar').addEventListener('focus',()=>refreshSelect(byId('svgReplaceChar').value));
    byId('svgReplaceApply').onclick=()=>replaceSelected().catch(e=>setStatus('Lỗi thay SVG: '+e.message,'err'));
    byId('svgReplaceRemove').onclick=removeSelected;
    byId('svgReplaceUseCurrent').onclick=useCurrentGlyph;
    byId('svgReplaceRefresh').onclick=()=>refreshSelect();
    const svgTabBtn=document.querySelector('[data-tab="svgTab"]');
    if(svgTabBtn)svgTabBtn.addEventListener('click',()=>setTimeout(()=>refreshSelect(typeof currentGlyph!=='undefined'?currentGlyph:null),0));
    const fontInput=byId('fontFile');if(fontInput)fontInput.addEventListener('change',()=>setTimeout(()=>refreshSelect(),1200));
    refreshSelect();
    const pill=document.querySelector('.versionPill');
    if(pill)pill.textContent='V32.3 • ĐỒNG BỘ CHIỀU CAO + THAY SVG THEO KÝ TỰ';
    const sv=document.querySelector('.sideVersion');if(sv)sv.textContent='STUDIO V32.3';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install); else install();
  window.__SVG_REPLACE_V323__={refreshSelect,replaceSelected,removeSelected};
})();
