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

  function sourceNameFromSkuBase(base){
    return SKU_BASE_TO_SOURCE_NAME[plain(skuBase(base))]||'';
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
    plain,skuBase,SKU_BASE_TO_SOURCE_NAME,sourceNameFromSkuBase,sourceColorFromStandardName,sourceBaseNameFromStandardName,targetNameForProduct
  };
});
