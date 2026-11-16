(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLExcelSkuCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const text=v=>String(v==null?'':v).trim();
  // SKU is an identifier: compare the WHOLE string, never prefixes,
  // substrings, approximate colors or fuzzy product names.
  function skuKey(v){return text(v).normalize('NFC').toUpperCase();}
  function slug(v){
    return text(v).toLowerCase().replace(/đ/g,'d').normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').replace(/\bkhong in(?: ten so)?\b/g,' ')
      .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim().replace(/ /g,'-');
  }
  function expectedSku(row){
    const alias=text(row&&row.alias),size=text(row&&row.size);
    return alias&&size?alias+'-'+size.toUpperCase():'';
  }
  function validate(rows){
    const arr=Array.isArray(rows)?rows:[];
    if(!arr.length)throw new Error('Không có SKU để xuất Excel.');
    const seen=new Map();
    for(const row of arr){
      const sku=skuKey(row&&row.sku);
      if(!sku)throw new Error('Có dòng chưa có SKU trong file tồn kho.');
      const expected=expectedSku(row);
      if(expected&&sku!==skuKey(expected)){
        throw new Error('SKU không khớp alias + size: '+text(row.sku)+' ≠ '+expected);
      }
      if(row&&row.standardName&&row.alias&&row.matchedBy&&/^clean-/.test(text(row.matchedBy))){
        const fromLabel=slug(row.standardName);
        if(skuKey(row.alias)!==skuKey(fromLabel)){
          throw new Error('Tên màu/biến thể khác SKU: '+text(row.standardName)+' / '+text(row.sku));
        }
      }
      const existing=seen.get(sku);
      if(existing){
        throw new Error('SKU trùng trong Excel: '+text(row.sku)
          +' (không được tự gộp dù số tồn bằng nhau).');
      }
      if(!Number.isSafeInteger(Number(row&&row.stock))||Number(row.stock)<0
        ||row.stock==null||row.stock===''){
        throw new Error('Tồn kho không hợp lệ cho SKU '+text(row.sku));
      }
      seen.set(sku,row);
    }
    return arr;
  }
  return{skuKey,slug,expectedSku,validate};
});
