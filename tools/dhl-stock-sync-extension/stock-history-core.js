(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLStockHistoryCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const text=(v)=>String(v==null?'':v).trim();
  const plain=(v)=>text(v).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const number=(v)=>{const n=Number(v);return Number.isFinite(n)?n:null;};

  function normalizeSize(v){
    const p=plain(v).replace(/\s+/g,'').toUpperCase();
    return({'2XL':'XXL','3XL':'XXXL','4XL':'XXXXL','5XL':'XXXXXL'})[p]||p;
  }

  function itemKey(item){
    if(text(item&&item.sku))return`sku:${text(item.sku).toUpperCase()}`;
    return`src:${plain(item&&item.name)}|${plain(item&&item.color)}|${normalizeSize(item&&item.size)}`;
  }

  function snapshotFromSource(sourceResults,{profileId='',profileName='',sourceUrl='',at=Date.now(),matcher=null}={}){
    const items=[];
    if(matcher&&typeof matcher.groupSourceVariants==='function'){
      for(const group of matcher.groupSourceVariants(sourceResults||[])){
        for(const variant of group.variants||[]){
          const stock=number(variant&&variant.available!=null?variant.available:variant&&variant.stock);
          if(stock==null||stock<0)continue;
          items.push({
            key:'',
            name:text(group.parentName||variant.parentName||variant.name),
            color:text(group.color||variant.color),
            size:normalizeSize(variant.size),
            stock,
            sku:text(variant.sku),
            sourceName:text(variant.name)
          });
        }
      }
    }else{
      for(const product of sourceResults||[]){
        for(const variant of product.variants||[]){
          const stock=number(variant&&variant.available!=null?variant.available:variant&&variant.stock);
          if(stock==null||stock<0)continue;
          items.push({
            key:'',name:text(product.parentName||variant.parentName||variant.name),color:text(variant.color),
            size:normalizeSize(variant.size),stock,sku:text(variant.sku),sourceName:text(variant.name)
          });
        }
      }
    }
    for(const item of items)item.key=itemKey(item);
    const unique=new Map();
    for(const item of items){
      const existing=unique.get(item.key);
      if(!existing)unique.set(item.key,item);
      else if(existing.stock!==item.stock){
        // Nếu nguồn trả trùng cùng key, giữ mức tồn lớn hơn thay vì cộng dồn để tránh nhân đôi.
        if(item.stock>existing.stock)unique.set(item.key,item);
      }
    }
    const finalItems=[...unique.values()].sort((a,b)=>`${a.name}|${a.color}|${a.size}`.localeCompare(`${b.name}|${b.color}|${b.size}`,'vi'));
    return{
      id:`${at}-${Math.random().toString(36).slice(2,8)}`,
      profileId:text(profileId),profileName:text(profileName),sourceUrl:text(sourceUrl),at:Number(at)||Date.now(),
      itemCount:finalItems.length,
      totalStock:finalItems.reduce((sum,item)=>sum+item.stock,0),
      items:finalItems
    };
  }

  function compareSnapshots(oldSnap,newSnap){
    const oldMap=new Map(((oldSnap&&oldSnap.items)||[]).map(item=>[item.key||itemKey(item),item]));
    const newMap=new Map(((newSnap&&newSnap.items)||[]).map(item=>[item.key||itemKey(item),item]));
    const keys=new Set([...oldMap.keys(),...newMap.keys()]);
    const changes=[];
    let increased=0,decreased=0,restocked=0,soldOut=0,added=0,missing=0,net=0;
    for(const key of keys){
      const before=oldMap.get(key)||null,after=newMap.get(key)||null;
      if(before&&after){
        if(before.stock===after.stock)continue;
        const delta=after.stock-before.stock;
        const type=before.stock===0&&after.stock>0?'restocked':before.stock>0&&after.stock===0?'soldout':delta>0?'increased':'decreased';
        if(type==='restocked')restocked++;
        else if(type==='soldout')soldOut++;
        else if(type==='increased')increased++;
        else decreased++;
        net+=delta;
        changes.push({key,type,before:before.stock,after:after.stock,delta,item:after});
      }else if(after){
        added++; net+=after.stock;
        changes.push({key,type:'added',before:null,after:after.stock,delta:after.stock,item:after});
      }else if(before){
        missing++; net-=before.stock;
        changes.push({key,type:'missing',before:before.stock,after:null,delta:-before.stock,item:before});
      }
    }
    const priority={soldout:0,restocked:1,decreased:2,increased:3,added:4,missing:5};
    changes.sort((a,b)=>(priority[a.type]??9)-(priority[b.type]??9)||Math.abs(b.delta)-Math.abs(a.delta)||`${a.item.name}`.localeCompare(`${b.item.name}`,'vi'));
    return{
      oldAt:oldSnap&&oldSnap.at||0,newAt:newSnap&&newSnap.at||0,
      changed:changes.length,increased,decreased,restocked,soldOut,added,missing,net,
      oldTotal:Number(oldSnap&&oldSnap.totalStock)||0,newTotal:Number(newSnap&&newSnap.totalStock)||0,
      changes
    };
  }

  return{plain,normalizeSize,itemKey,snapshotFromSource,compareSnapshots};
});
