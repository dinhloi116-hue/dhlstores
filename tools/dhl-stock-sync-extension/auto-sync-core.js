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
    // products_export là master: chỉ cần chính danh sách này có SKU đầy đủ.
    // warehouseData được giữ trong chữ ký hàm để tương thích các caller cũ và chỉ còn dùng lấy chi nhánh.
    const index=catalogSkuIndex(catalogData);
    const variants=(catalogData&&catalogData.variants)||[];
    const missing=[];
    let matched=0;
    for(const variant of variants){
      if(text(variant&&variant.sku))matched+=1;
      else missing.push(`${variant&&variant.name||''} / Size ${displaySize(variant)}`);
    }
    return{matched,total:variants.length,missing,duplicates:index.duplicates.size,master:'products_export_lookup'};
  }

  function sourceStandardName(group){
    const parent=text(group&&group.parentName);
    const color=text(group&&group.color);
    return color&&color!=='(không màu)'?`${parent} - ${color}`:parent;
  }

  function normalizeSku(value){return text(value).toUpperCase();}

  function prepareRows(warehouseData,catalogData,sourceResults,matcher){
    if(!matcher||typeof matcher.groupSourceVariants!=='function')throw new Error('Thiếu bộ ghép tồn kho');

    // SOURCE SKU là khóa MASTER tuyệt đối.
    // Không ghép tên/màu để quyết định SKU nữa. Sapo chỉ được đối chiếu bằng SKU giống hệt nguồn.
    const sapoBySku=new Map();
    for(const v of (catalogData&&catalogData.variants)||[]){
      const key=normalizeSku(v&&v.sku);
      if(key&&!sapoBySku.has(key))sapoBySku.set(key,v);
    }

    const sourceGroups=matcher.groupSourceVariants(sourceResults||[]);
    const rows=[],missingSku=[],seen=new Set();
    let sourceVariantCount=0,matchedSkuCount=0,sourceOnlySkuCount=0;

    for(const group of sourceGroups){
      const standardName=sourceStandardName(group);
      const bySize=new Map();
      for(const source of group.variants||[]){
        const size=matcher.normalizeSize?matcher.normalizeSize(source&&source.size):text(source&&source.size).toUpperCase();
        const stock=Number(source&&source.available);
        if(!size||!Number.isFinite(stock)||stock<0)continue;
        const sku=text(source&&source.sku);
        if(!sku){
          missingSku.push(`${standardName} / Size ${size}`);
          continue;
        }
        const sourceKey=normalizeSku(sku);
        const uniq=`${sourceKey}|${size}`;
        if(seen.has(uniq))continue;
        seen.add(uniq);
        bySize.set(size,{source,size,stock,sku,sourceKey});
      }
      sourceVariantCount+=bySize.size;

      for(const {source,size,stock,sku,sourceKey} of bySize.values()){
        const existing=sapoBySku.get(sourceKey)||null;
        if(existing)matchedSkuCount+=1;else sourceOnlySkuCount+=1;
        rows.push({
          variantName:text(source&&source.name)||`${standardName} / Size ${size}`,
          sku,
          stock,
          standardName,
          size,
          variantId:Number(existing&&existing.variantId)||0,
          productId:Number(existing&&existing.productId)||0,
          sourceParentId:Number(group.parentId)||0,
          sourceVariantId:Number(source&&source.id)||0,
          sourceUrl:text(source&&source.sourceUrl||''),
          sourceSku:true,
          matchedBy:'exact-source-sku'
        });
      }
    }

    return{
      rows,missingSku,
      sourceProductCount:sourceGroups.length,
      sourceVariantCount,
      existingSkuCount:matchedSkuCount,
      matchedSkuCount,
      sourceOnlySkuCount,
      generatedSkuCount:0,
      master:'source_sku_exact'
    };
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
