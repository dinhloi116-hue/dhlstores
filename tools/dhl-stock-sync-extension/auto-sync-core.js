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

  function sourceGroupKey(group){
    return `${Number(group&&group.parentId)||0}|${plain(group&&group.parentName)}|${plain(group&&group.color)}`;
  }

  function sourceStandardName(group){
    const parent=text(group&&group.parentName);
    const color=text(group&&group.color);
    return color&&color!=='(không màu)'?`${parent} - ${color}`:parent;
  }

  function fallbackSkuBase(name){
    const p=plain(name);
    if(!p)return'';
    let h=2166136261>>>0;
    for(let i=0;i<p.length;i+=1){h^=p.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
    const slug=p.replace(/\s+/g,'-').toUpperCase().slice(0,28).replace(/-+$/,'');
    return `ABDN-${slug}-${h.toString(36).toUpperCase()}`;
  }

  function prepareRows(warehouseData,catalogData,sourceResults,matcher,rules){
    if(!matcher||typeof matcher.matchSapoProducts!=='function'||typeof matcher.groupSourceVariants!=='function')throw new Error('Thiếu bộ ghép tồn kho');

    // MASTER của file tồn là KẾT QUẢ QUÉT NGUỒN.
    // products_export chỉ ưu tiên cung cấp SKU/ID thật đang có trên Sapo.
    // Nếu một mẫu quét được chưa có trong products_export, dùng cùng quy tắc SKU với luồng tạo sản phẩm mới,
    // tuyệt đối không loại mẫu đó khỏi file tồn.
    const catalogProducts=(catalogData&&catalogData.products)||[];
    const sourceGroups=matcher.groupSourceVariants(sourceResults||[]);
    const matches=matcher.matchSapoProducts(catalogProducts,sourceResults||[]);
    const matchedBySource=new Map();

    for(const match of matches){
      if(!match||!match.matched||!match.best||!match.sapoProduct)continue;
      matchedBySource.set(sourceGroupKey(match.best),match.sapoProduct);
    }

    const rows=[],missingSku=[],seen=new Set();
    let sourceVariantCount=0,generatedSkuCount=0,existingSkuCount=0;

    for(const group of sourceGroups){
      const standardName=sourceStandardName(group);
      if(!standardName)continue;
      const sapoProduct=matchedBySource.get(sourceGroupKey(group))||null;
      const existingBySize=new Map();
      for(const v of (sapoProduct&&sapoProduct.variants)||[]){
        const size=matcher.normalizeSize?matcher.normalizeSize(v.size||v.sizeFromSku):displaySize(v);
        if(size&&!existingBySize.has(size))existingBySize.set(size,v);
      }

      let skuBase='';
      if(sapoProduct&&typeof matcher.productSkuBase==='function')skuBase=text(matcher.productSkuBase(sapoProduct));
      if(!skuBase&&rules&&typeof rules.skuBaseForStandardName==='function')skuBase=text(rules.skuBaseForStandardName(standardName));
      if(!skuBase)skuBase=fallbackSkuBase(standardName);

      const sourceBySize=new Map();
      for(const source of group.variants||[]){
        const size=matcher.normalizeSize?matcher.normalizeSize(source&&source.size):text(source&&source.size).toUpperCase();
        const stock=Number(source&&source.available);
        if(!size||!Number.isFinite(stock)||stock<0)continue;
        sourceVariantCount+=1;
        if(!sourceBySize.has(size))sourceBySize.set(size,{source,size,stock});
      }

      for(const {source,size,stock} of sourceBySize.values()){
        const existing=existingBySize.get(size)||null;
        const sku=text(existing&&existing.sku)||(skuBase?`${skuBase}-${size}`:'');
        if(!sku){missingSku.push(`${standardName} / Size ${size}`);continue;}
        const key=sku.toLowerCase();
        if(seen.has(key))continue;
        seen.add(key);
        if(existing)existingSkuCount+=1;else generatedSkuCount+=1;
        rows.push({
          variantName:`${standardName} / Size ${size}`,
          sku,
          stock,
          standardName,
          size,
          variantId:Number(existing&&existing.variantId)||0,
          productId:Number(existing&&existing.productId||sapoProduct&&sapoProduct.productId)||0,
          sourceParentId:Number(group.parentId)||0,
          sourceUrl:text(source&&source.sourceUrl||''),
          generatedSku:!existing
        });
      }
    }

    return{
      rows,missingSku,
      sourceProductCount:sourceGroups.length,
      sourceVariantCount,
      existingSkuCount,
      generatedSkuCount,
      master:'source_scan'
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
