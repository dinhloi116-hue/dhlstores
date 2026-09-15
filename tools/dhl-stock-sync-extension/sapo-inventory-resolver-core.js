(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLSapoInventoryResolver=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const text=(v)=>String(v==null?'':v).trim();
  const normSku=(v)=>text(v).toUpperCase().replace(/\s+/g,' ');

  function inventoryCandidates(data){
    if(!data||typeof data!=='object')return[];
    for(const key of ['inventory_items','items','data']){
      const value=data[key];
      if(Array.isArray(value))return value;
      if(value&&Array.isArray(value.inventory_items))return value.inventory_items;
      if(value&&Array.isArray(value.items))return value.items;
    }
    if(data.inventory_item)return[data.inventory_item];
    return[];
  }

  function findCandidate(candidates,row){
    const list=Array.isArray(candidates)?candidates:[];
    const variantId=Number(row&&row.variantId);
    const productId=Number(row&&row.productId);
    const sku=normSku(row&&row.sku);

    // variant_id là định danh chính. Không được loại item đúng chỉ vì SKU khác format/case.
    if(variantId){
      const byVariant=list.find(x=>Number(x&&x.variant_id)===variantId);
      if(byVariant)return byVariant;
    }
    if(sku){
      const bySku=list.find(x=>normSku(x&&x.sku)===sku);
      if(bySku)return bySku;
    }
    if(productId&&sku){
      const byProductSku=list.find(x=>Number(x&&x.product_id)===productId&&normSku(x&&x.sku)===sku);
      if(byProductSku)return byProductSku;
    }
    return null;
  }

  function variantInventoryItemId(data){
    const variant=data&&data.variant?data.variant:data;
    if(!variant||typeof variant!=='object')return 0;
    const direct=Number(variant.inventory_item_id||variant.inventoryItemId||0);
    if(direct)return direct;
    const nested=Number(variant.inventory_item&&variant.inventory_item.id||0);
    return nested||0;
  }

  return{inventoryCandidates,findCandidate,variantInventoryItemId,normSku};
});
