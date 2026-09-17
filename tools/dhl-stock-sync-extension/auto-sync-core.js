(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLAutoSyncCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const text=(v)=>String(v==null?'':v).trim();
  function plain(v){
    return text(v).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\bkhong in(?: ten so)?\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function displaySize(variant){
    if(!variant)return'';
    if(variant.displaySize)return text(variant.displaySize);
    const raw=text(variant.rawProductLabel);
    const hit=raw.match(/\/\s*Size\s*[:\-]?\s*(\d{1,3})/i);
    if(hit)return hit[1];
    const attr=text(variant.sizeFromAttribute||variant.size);
    const attrHit=attr.match(/(?:^|\b)SIZE\s*[:\-]?\s*(\d{1,3})/i);
    if(attrHit)return attrHit[1];
    return attr;
  }

  function rowKey(name,size){return `${plain(name)}|${plain(size)}`;}

  function catalogSkuIndex(catalogData){
    const unique=new Map(),duplicates=new Set();
    for(const variant of (catalogData&&catalogData.variants)||[]){
      const sku=text(variant&&variant.sku);
      if(!sku)continue;
      const key=rowKey(variant.name,displaySize(variant));
      if(!key||key==='|')continue;
      if(unique.has(key)&&unique.get(key).sku!==sku)duplicates.add(key);
      else unique.set(key,{
        sku,
        variantId:variant.variantId,
        productId:variant.productId,
        name:variant.name,
        size:displaySize(variant)
      });
    }
    for(const key of duplicates)unique.delete(key);
    return{map:unique,duplicates};
  }

  function skuCoverage(warehouseData,catalogData){
    const index=catalogSkuIndex(catalogData);
    let matched=0;
    const missing=[];
    for(const variant of (warehouseData&&warehouseData.variants)||[]){
      const key=rowKey(variant.name,displaySize(variant));
      if(index.map.has(key))matched+=1;
      else missing.push(`${variant.name||''} / Size ${displaySize(variant)}`);
    }
    return{matched,total:(warehouseData&&warehouseData.variants||[]).length,missing,duplicates:index.duplicates.size};
  }

  function prepareRows(warehouseData,catalogData,sourceResults,matcher){
    if(!matcher||typeof matcher.matchSapoProducts!=='function')throw new Error('Thiếu bộ ghép tồn kho');
    const index=catalogSkuIndex(catalogData).map;
    const matches=matcher.matchSapoProducts((warehouseData&&warehouseData.products)||[],sourceResults||[]);
    const rows=[],missingSku=[];
    for(const match of matches){
      for(const vm of match.variantMatches||[]){
        if(!vm||!vm.sapo||!vm.source)continue;
        const stock=Number(vm.source.available);
        if(!Number.isFinite(stock)||stock<0)continue;
        const size=displaySize(vm.sapo);
        const lookup=index.get(rowKey(vm.sapo.name,size));
        if(!lookup){missingSku.push(`${vm.sapo.name||''} / Size ${size}`);continue;}
        rows.push({
          variantName:text(vm.sapo.rawProductLabel||`${vm.sapo.name||''}${size?` / Size ${size}`:''}`),
          sku:lookup.sku,
          stock,
          standardName:text(vm.sapo.name),
          size,
          variantId:lookup.variantId,
          productId:lookup.productId
        });
      }
    }
    return{rows,missingSku};
  }

  function validSourceUrl(value){
    try{
      const u=new URL(text(value));
      if(u.protocol!=='https:'||u.hostname!=='si.aobongda.net')return false;
      if(/-p\d+(?:\.html)?$/i.test(u.pathname))return false;
      return true;
    }catch{return false;}
  }

  function normalizeConfig(raw){
    const source=raw&&typeof raw==='object'?raw:{};
    const hours=[1,2,3].includes(Number(source.intervalHours))?Number(source.intervalHours):2;
    const ids=Array.isArray(source.selectedProfileIds)?[...new Set(source.selectedProfileIds.map(text).filter(Boolean))]:[];
    const urls={};
    for(const [id,url] of Object.entries(source.profileUrls||{}))if(text(id)&&text(url))urls[text(id)]=text(url);
    return{
      enabled:source.enabled===true,
      intervalHours:hours,
      selectedProfileIds:ids,
      profileUrls:urls,
      closeTabsAfterScan:source.closeTabsAfterScan!==false,
      autoPushSapo:source.autoPushSapo===true,
      sapo:source.sapo&&typeof source.sapo==='object'?source.sapo:{},
      updatedAt:Number(source.updatedAt||0)
    };
  }

  return{plain,displaySize,rowKey,catalogSkuIndex,skuCoverage,prepareRows,validSourceUrl,normalizeConfig};
});
