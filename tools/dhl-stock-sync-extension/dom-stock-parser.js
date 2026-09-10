(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLDomStockParser=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SIZE_RE=/\b(XXXXXL|XXXXL|XXXL|XXL|XL|5XL|4XL|3XL|2XL|L|M|S)\b/i;
  const COLOR_WORDS=['trắng','đen','xanh','đỏ','vàng','be','sữa','rêu','cam','ngọc','than','kem','siu','sọc','dương','lá','hồng','tím','ghi','xám','bạc','nâu'];

  function text(v){return String(v||'').replace(/\s+/g,' ').trim();}
  function plain(v){return text(v).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function normalizeSize(v){
    const p=text(v).toUpperCase().replace(/\s+/g,'');
    return ({'2XL':'XXL','3XL':'XXXL','4XL':'XXXXL','5XL':'XXXXXL'})[p]||p;
  }
  function extractSize(v){const m=text(v).match(SIZE_RE);return m?normalizeSize(m[1]):'';}
  function extractStock(v){
    const raw=text(v),p=plain(raw);
    if(/het hang|khong con hang|sold out/.test(p))return 0;
    let m=raw.match(/còn\s*hàng\s*\(\s*(\d+)\s*\)/i);if(m)return Number(m[1]);
    m=p.match(/con\s*hang[^0-9]{0,12}(\d+)/i);if(m)return Number(m[1]);
    m=p.match(/(?:ton(?:\s*kho)?|available|stock)[^0-9]{0,12}(\d+)/i);if(m)return Number(m[1]);
    m=raw.match(/\((\d+)\)/);if(m&&/hàng|hang|tồn|ton|stock|available/i.test(raw))return Number(m[1]);
    return null;
  }
  function extractSizeStock(v){
    const size=extractSize(v),stock=extractStock(v);
    return size&&stock!==null?{size,stock}:null;
  }
  function looksLikeColorName(v){
    const raw=text(v);if(!raw||raw.length>36)return false;
    const p=plain(raw);
    if(/chon mau|mau sac|ten size|tinh trang|con hang|het hang|them vao gio|mua ngay|so luong|size/.test(p))return false;
    return COLOR_WORDS.some(w=>p.split(/\s+/).includes(plain(w)));
  }
  function colorKey(v){return plain(v).replace(/[^a-z0-9]+/g,' ').trim();}
  function dedupeColorNames(values){
    const out=[],seen=new Set();
    for(const value of values||[]){const v=text(value),k=colorKey(v);if(!v||!k||seen.has(k))continue;seen.add(k);out.push(v);}return out;
  }
  function dedupeRows(rows){
    const best=new Map();
    for(const row of rows||[]){
      if(!row||!row.size||row.stock==null)continue;
      const size=normalizeSize(row.size),candidate={size,stock:Number(row.stock),raw:text(row.raw||'')};
      const old=best.get(size);
      if(!old||candidate.raw.length<old.raw.length)best.set(size,candidate);
    }
    return [...best.values()];
  }
  function parseRowTexts(values){
    return dedupeRows((values||[]).map(v=>{const hit=extractSizeStock(v);return hit?{...hit,raw:text(v)}:null;}).filter(Boolean));
  }

  return {text,plain,normalizeSize,extractSize,extractStock,extractSizeStock,looksLikeColorName,colorKey,dedupeColorNames,dedupeRows,parseRowTexts};
});
