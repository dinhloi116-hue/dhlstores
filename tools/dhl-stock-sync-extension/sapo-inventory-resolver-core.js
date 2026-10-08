(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLSapoInventoryResolver=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const text=(v)=>String(v==null?'':v).trim();
  const normSku=(v)=>text(v).toUpperCase().replace(/\s+/g,' ');

  function objectRoots(data){
    if(!data||typeof data!=='object')return[];
    const roots=[data];
    for(const key of ['data','result']){
      const value=data[key];
      if(value&&typeof value==='object'&&!Array.isArray(value))roots.push(value);
    }
    return roots;
  }

  function inventoryCandidates(data){
    if(Array.isArray(data))return data;
    for(const root of objectRoots(data)){
      for(const key of ['inventory_items','items']){
        const value=root[key];
        if(Array.isArray(value))return value;
      }
      if(root.inventory_item&&typeof root.inventory_item==='object')return[root.inventory_item];
      if(root.data&&Array.isArray(root.data))return root.data;
    }
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
    // Nếu API không có variant_id nhưng có SKU trùng ở nhiều sản phẩm, ưu tiên product_id + SKU.
    if(productId&&sku){
      const byProductSku=list.find(x=>Number(x&&x.product_id)===productId&&normSku(x&&x.sku)===sku);
      if(byProductSku)return byProductSku;
    }
    if(sku){
      const bySku=list.find(x=>normSku(x&&x.sku)===sku);
      if(bySku)return bySku;
    }
    return null;
  }

  function inventoryItemIdFromObject(value){
    if(!value||typeof value!=='object')return 0;
    const direct=Number(value.inventory_item_id||value.inventoryItemId||0);
    if(direct)return direct;
    const nested=Number(value.inventory_item&&value.inventory_item.id||0);
    return nested||0;
  }

  function variantInventoryItemId(data){
    if(!data||typeof data!=='object')return 0;
    const roots=[
      data,
      data.variant,
      data.data,
      data.data&&data.data.variant,
      data.result,
      data.result&&data.result.variant
    ];
    for(const root of roots){
      const id=inventoryItemIdFromObject(root);
      if(id)return id;
    }
    return 0;
  }

  return{inventoryCandidates,findCandidate,variantInventoryItemId,normSku};
});
