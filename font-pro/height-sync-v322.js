(function(){
  'use strict';
  const CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const TOL=0.005;
  let lastBackup=null;
  function $id(id){return document.getElementById(id)}
  function median(a){const s=a.slice().sort((x,y)=>x-y); const n=s.length; return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):0;}
  function pct(x){return (x*100).toFixed(2)+'%'}
  async function svgVisualHeightRatio(svgText){
    const doc=new DOMParser().parseFromString(svgText,'image/svg+xml');
    const src=doc.documentElement;
    if(!src||src.tagName.toLowerCase()!=='svg')return 0;
    let vb=(src.getAttribute('viewBox')||'').trim().split(/[ ,]+/).map(Number);
    if(vb.length!==4||!vb.every(Number.isFinite)||vb[2]<=0||vb[3]<=0){const w=parseFloat(src.getAttribute('width'))||1000;const h=parseFloat(src.getAttribute('height'))||1000;vb=[0,0,w,h];}
    const wrap=document.createElement('div');
    wrap.style.cssText='position:fixed;left:-100000px;top:0;width:2000px;height:2000px;overflow:visible;visibility:hidden;pointer-events:none;';
    const clone=document.importNode(src,true);clone.removeAttribute('width');clone.removeAttribute('height');clone.style.height='1000px';clone.style.width=(1000*vb[2]/vb[3])+'px';clone.style.overflow='visible';clone.setAttribute('preserveAspectRatio','xMinYMin meet');
    wrap.appendChild(clone);document.body.appendChild(wrap);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const nodes=[...clone.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line,text,use')];let top=Infinity,bottom=-Infinity;
    for(const el of nodes){const r=el.getBoundingClientRect();if(r.height>0&&Number.isFinite(r.top)&&Number.isFinite(r.bottom)){top=Math.min(top,r.top);bottom=Math.max(bottom,r.bottom);}}
    wrap.remove();
    return(Number.isFinite(top)&&Number.isFinite(bottom)&&bottom>top)?(bottom-top)/1000:0;
  }
  async function baseHeightRatio(ch){
    const ov=state.svgOverrides&&state.svgOverrides[ch];
    if(ov&&ov.svg)return svgVisualHeightRatio(ov.svg);
    if(typeof fontLoaded!=='undefined'&&fontLoaded){try{await document.fonts.ready}catch(e){}const c=document.createElement('canvas');const ctx=c.getContext('2d');ctx.font='1000px LoadedFont';const m=ctx.measureText(ch);const h=(m.actualBoundingBoxAscent||0)+(m.actualBoundingBoxDescent||0);return h>0?h/1000:0;}
    return 0;
  }
  async function measureAll(){const rows=[];for(const ch of CHARS){const base=await baseHeightRatio(ch);const g=gs(ch);rows.push({ch,base,current:base>0?base*Math.abs(Number(g.sy)||1):0,sx:Number(g.sx)||1,sy:Number(g.sy)||1});}return rows;}
  function summarize(rows){const ok=rows.filter(r=>r.current>0),missing=rows.filter(r=>!r.current).map(r=>r.ch);if(!ok.length)return{ok,missing,target:0,maxDev:Infinity};const target=median(ok.map(r=>r.current));const maxDev=Math.max(...ok.map(r=>Math.abs(r.current-target)/target));return{ok,missing,target,maxDev};}
  function show(rows,mode){const s=summarize(rows),box=$id('heightSyncStatus'),detail=$id('heightSyncDetail');if(!box)return;if(!s.ok.length){box.className='bigStatus warn';box.innerHTML='<b>Chưa đo được.</b> Hãy nạp font hoặc đủ SVG A–Z + 0–9.';if(detail)detail.textContent='';return;}const complete=s.missing.length===0,equal=complete&&s.maxDev<=TOL;box.className='bigStatus '+(equal?'ok':'warn');if(mode==='after'&&equal)box.innerHTML='<b>✓ ĐÃ ĐỒNG BỘ THẬT 36/36 GLYPH.</b> A–Z và 0–9 hiện cùng chiều cao (sai lệch ≤ 0,5%).';else if(equal)box.innerHTML='<b>✓ 36/36 glyph đã cùng chiều cao.</b> Không cần đồng bộ thêm.';else box.innerHTML='<b>Chưa đồng đều.</b> Đã đo '+s.ok.length+'/36 glyph • lệch lớn nhất '+pct(s.maxDev)+(s.missing.length?' • thiếu: '+s.missing.join(' '):'');if(detail){const sorted=s.ok.slice().sort((a,b)=>Math.abs(b.current-s.target)-Math.abs(a.current-s.target));detail.textContent='Mốc đồng bộ = trung vị chiều cao của 36 glyph. Lệch nhiều nhất: '+sorted.slice(0,10).map(r=>r.ch+' '+pct(r.current/s.target)).join(' • ');}}
  async function scan(){const box=$id('heightSyncStatus');if(box){box.className='bigStatus warn';box.textContent='Đang đo chiều cao thực của 36 glyph…';}try{const rows=await measureAll();show(rows,'scan');return rows;}catch(e){if(box){box.className='bigStatus err';box.textContent='Lỗi đo chiều cao: '+e.message;}console.error(e);return[];}}
  async function syncAll(){const btn=$id('heightSyncApply'),box=$id('heightSyncStatus');if(btn){btn.disabled=true;btn.textContent='ĐANG ĐỒNG BỘ 36 GLYPH…';}if(box){box.className='bigStatus warn';box.textContent='Đang đo và ghi hệ số mới vào A–Z + 0–9…';}try{const rows=await measureAll();const s=summarize(rows);if(s.missing.length){show(rows,'scan');throw new Error('Chưa đủ 36 glyph để đồng bộ. Thiếu: '+s.missing.join(' '));}lastBackup={};for(const r of rows){const g=gs(r.ch);lastBackup[r.ch]={sx:g.sx,sy:g.sy,baseline:g.baseline,left:g.left,right:g.right};}for(const r of rows){const factor=s.target/r.current;const g=gs(r.ch);g.sx=(Number(g.sx)||1)*factor;g.sy=(Number(g.sy)||1)*factor;}dirty();render();glyphToUI();const after=await measureAll();show(after,'after');const undo=$id('heightSyncUndo');if(undo)undo.disabled=false;}catch(e){if(box){box.className='bigStatus err';box.innerHTML='<b>Không đồng bộ:</b> '+e.message;}console.error(e);}finally{if(btn){btn.disabled=false;btn.textContent='ĐỒNG BỘ CHIỀU CAO TOÀN BỘ A–Z + 0–9';}}}
  function undo(){if(!lastBackup)return;for(const ch of CHARS){if(lastBackup[ch])Object.assign(gs(ch),lastBackup[ch]);}dirty();render();glyphToUI();const b=$id('heightSyncUndo');if(b)b.disabled=true;lastBackup=null;scan();}
  function install(){if($id('heightSyncCard'))return;const side=document.querySelector('.side');if(!side)return;const first=side.querySelector('.card');if(!first)return;const card=document.createElement('div');card.className='card';card.id='heightSyncCard';card.innerHTML='<div class="cardTitleRow"><div><span class="sectionEyebrow">REAL SIZE SYNC</span><h3>Đồng bộ chiều cao chữ & số</h3></div><span class="stepBadge">36</span></div><div class="muted" style="margin-bottom:7px">Đo chiều cao <b>hình thực</b> của 26 chữ A–Z và 10 số 0–9. Nút đồng bộ ghi trực tiếp scale vào từng glyph; không chỉ thay hình xem trước.</div><div class="btns"><button id="heightSyncScan" class="btn">KIỂM TRA 36 GLYPH</button></div><button id="heightSyncApply" class="btn primary" style="width:100%;margin-top:7px;font-weight:900">ĐỒNG BỘ CHIỀU CAO TOÀN BỘ A–Z + 0–9</button><button id="heightSyncUndo" class="btn" style="width:100%;margin-top:6px" disabled>HOÀN TÁC LẦN ĐỒNG BỘ</button><div id="heightSyncStatus" class="bigStatus" style="margin-top:7px">Chưa kiểm tra 36 glyph.</div><div id="heightSyncDetail" class="smallNote" style="margin-top:5px"></div>';first.insertAdjacentElement('afterend',card);$id('heightSyncScan').onclick=scan;$id('heightSyncApply').onclick=syncAll;$id('heightSyncUndo').onclick=undo;const pill=document.querySelector('.versionPill');if(pill)pill.textContent='V32.2 • ĐỒNG BỘ CHIỀU CAO THẬT';const sv=document.querySelector('.sideVersion');if(sv)sv.textContent='STUDIO V32.2';}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.__HEIGHT_SYNC_V322__={scan,syncAll,undo,measureAll};
})();
