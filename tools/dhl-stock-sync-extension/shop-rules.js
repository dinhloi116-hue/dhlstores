(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLShopRules=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function plain(value){
    return String(value||'').toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function skuBase(value){
    return String(value||'').trim().replace(/-(S|M|L|XL|XXL|XXXL|XXXXL|XXXXXL|2XL|3XL|4XL|5XL)$/i,'').trim();
  }

  const SKU_BASE_TO_SOURCE_NAME={
    'bi do 26 hd':'ĐT Bỉ 2026 HD - Đỏ',
    'argentina trang xanh 26 hd':'ĐT Argentina 2026 HD - Trắng Sọc Xanh',
    'duc den 26 hd':'ĐT Đức 2026 HD - Xanh Đen',
    'y xanh 26 hd':'ĐT Ý 2026 HD - Xanh Dương',
    'y vang 26 hd':'ĐT Ý 2026 HD - Kem',
    'duc trang wc 26 hd':'ĐT Đức 2026 HD - Trắng Đỏ',
    'nhat trang 26 hd':'ĐT Nhật 2026 HD - Trắng',
    'duc trang tap 26 hd':'ĐT Đức 2026 HD - Trắng',
    'phap trang xanh 26 hd':'ĐT Pháp 2026 HD - Xanh Ngọc',
    'bo dao nha do 26 hd':'ĐT Bồ Đào Nha 2026 HD - Đỏ',
    'bo dao nha siu 26 hd':'ĐT Bồ Đào Nha 2026 HD - Siu',
    'ha lan trang 26 hd':'ĐT Hà Lan 2026 HD - Trắng',
    'anh do 26 hd':'ĐT Anh 2026 HD - Đỏ',
    'brazil vang hd':'ĐT Brazil 2026 HD - Vàng',
    'phap xanh 26 hd':'ĐT Pháp 2026 HD - Xanh Đen',
    'bo dao nha trang 26 hd':'ĐT Bồ Đào Nha 2026 HD - Trắng Ngọc',
    'brazil den hd':'ĐT Brazil 2026 HD - Xanh Đen',
    'tay ban nha be 26 hd':'ĐT Tây Ban Nha 2026 HD - Kem',
    'argentina den 26 hd':'ĐT Argentina 2026 HD - Đen',
    'anh be hd':'ĐT Anh 2026 HD - Vàng Kem',
    'anh trang hd':'ĐT Anh 2026 HD - Trắng',
    'crotia do 26 hd':'ĐT Croatia 2026 HD - Đỏ Trắng',
    'croatia do 26 hd':'ĐT Croatia 2026 HD - Đỏ Trắng',
    'bo dao nha reu 26 hd':'ĐT Bồ Đào Nha 2026 HD - Xanh Rêu',
    'mexico xanh 26 hd':'ĐT Mexico 2026 HD - Rêu',
    'nhat xanh 26 hd':'ĐT Nhật 2026 HD - Xanh Dương',
    'tay ban nha do 26 hd':'ĐT Tây Ban Nha 2026 HD - Đỏ'
  };

  const STANDARD_SKU_ENTRIES=[
    ['ĐT Bỉ 2026 HD - Đỏ','Bỉ đỏ 26 HD'],
    ['ĐT Argentina 2026 HD - Trắng Sọc Xanh','Argentina trắng xanh 26 HD'],
    ['ĐT Đức 2026 HD - Xanh Đen','Đức đen 26 HD'],
    ['ĐT Ý 2026 HD - Xanh Dương','Ý xanh 26 HD'],
    ['ĐT Ý 2026 HD - Kem','Ý vàng 26 HD'],
    ['ĐT Đức 2026 HD - Trắng Đỏ','Đức trắng wc 26 HD'],
    ['ĐT Nhật 2026 HD - Trắng','Nhật trắng 26 HD'],
    ['ĐT Đức 2026 HD - Trắng','Đức trắng tập 26 HD'],
    ['ĐT Pháp 2026 HD - Xanh Ngọc','Pháp trắng xanh 26 HD'],
    ['ĐT Bồ Đào Nha 2026 HD - Đỏ','Bồ đào nha đỏ 26 HD'],
    ['ĐT Bồ Đào Nha 2026 HD - Siu','Bồ đào nha Siu 26 HD'],
    ['ĐT Hà Lan 2026 HD - Trắng','Hà lan trắng 26 HD'],
    ['ĐT Anh 2026 HD - Đỏ','Anh đỏ 26 HD'],
    ['ĐT Brazil 2026 HD - Vàng','Brazil vàng HD'],
    ['ĐT Pháp 2026 HD - Xanh Đen','Pháp xanh 26 HD'],
    ['ĐT Bồ Đào Nha 2026 HD - Trắng Ngọc','Bồ đào nha trắng 26 HD'],
    ['ĐT Brazil 2026 HD - Xanh Đen','Brazil đen HD'],
    ['ĐT Tây Ban Nha 2026 HD - Kem','Tây Ban Nha be 26 HD'],
    ['ĐT Argentina 2026 HD - Đen','Argentina đen 26 HD'],
    ['ĐT Anh 2026 HD - Vàng Kem','Anh be HD'],
    ['ĐT Anh 2026 HD - Trắng','Anh trắng HD'],
    ['ĐT Croatia 2026 HD - Đỏ Trắng','Crotia đỏ 26 HD'],
    ['ĐT Bồ Đào Nha 2026 HD - Xanh Rêu','Bồ đào nha rêu 26 HD'],
    ['ĐT Mexico 2026 HD - Rêu','Mexico xanh 26 HD'],
    ['ĐT Tây Ban Nha 2026 HD - Đỏ','Tây Ban Nha đỏ 26 HD'],
    ['ĐT Nhật 2026 HD - Xanh Dương','Nhật xanh 26 HD']
  ];
  const STANDARD_NAME_TO_SKU_BASE=Object.create(null);
  for(const [name,base] of STANDARD_SKU_ENTRIES)STANDARD_NAME_TO_SKU_BASE[plain(name)]=base;

  function sourceNameFromSkuBase(base){
    return SKU_BASE_TO_SOURCE_NAME[plain(skuBase(base))]||'';
  }

  function skuBaseForStandardName(name){
    return STANDARD_NAME_TO_SKU_BASE[plain(name)]||'';
  }

  function sourceColorFromStandardName(name){
    const parts=String(name||'').split(/\s+-\s+/).map(x=>x.trim()).filter(Boolean);
    if(parts.length<2)return'';
    if(!/^(ĐT|CLB)\b/i.test(parts[0]))return'';
    return parts[parts.length-1];
  }

  function sourceBaseNameFromStandardName(name){
    const parts=String(name||'').split(/\s+-\s+/).map(x=>x.trim()).filter(Boolean);
    return parts.length>=2?parts.slice(0,-1).join(' - '):String(name||'').trim();
  }

  function targetNameForProduct(product,availableStandardNames){
    const available=new Map((availableStandardNames||[]).map(x=>[plain(x),String(x)]));
    const current=String((product&&product.name)||'').trim();
    if(current&&available.has(plain(current)))return available.get(plain(current));

    const base=(product&&product.skuBase)||((product&&product.variants&&product.variants[0]&&product.variants[0].sku)||'');
    const mapped=sourceNameFromSkuBase(base);
    if(mapped&&available.has(plain(mapped)))return available.get(plain(mapped));
    return'';
  }

  return{
    plain,skuBase,SKU_BASE_TO_SOURCE_NAME,STANDARD_SKU_ENTRIES,STANDARD_NAME_TO_SKU_BASE,
    sourceNameFromSkuBase,skuBaseForStandardName,sourceColorFromStandardName,sourceBaseNameFromStandardName,targetNameForProduct
  };
});