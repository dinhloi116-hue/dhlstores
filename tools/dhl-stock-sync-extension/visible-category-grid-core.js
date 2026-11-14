(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLVisibleCategoryGridCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function selectMainGrid(entries,body){
    const unique=new Map();
    for(const entry of Array.isArray(entries)?entries:[]){
      if(entry&&Number(entry.id)>0&&entry.card&&!unique.has(Number(entry.id)))
        unique.set(Number(entry.id),entry);
    }
    const cards=[...unique.values()];
    if(cards.length<=2)return cards;
    const bins=new Map();
    for(const entry of cards){
      let el=entry.card.parentElement;
      for(let depth=1;el&&el!==body&&depth<=10;depth++,el=el.parentElement){
        if(!bins.has(el))bins.set(el,{ids:new Set(),totalDepth:0,total:0,element:el});
        const bin=bins.get(el);
        if(!bin.ids.has(Number(entry.id))){
          bin.ids.add(Number(entry.id));bin.totalDepth+=depth;bin.total+=1;
        }
      }
    }
    const minimum=cards.length>=4?4:3;
    const clusters=[...bins.values()].filter(bin=>bin.ids.size>=minimum);
    clusters.sort((a,b)=>{
      const score=bin=>bin.ids.size/(1+0.28*(bin.totalDepth/bin.total));
      return score(b)-score(a)||b.ids.size-a.ids.size;
    });
    if(!clusters.length)throw new Error('Không xác định được lưới sản phẩm chính; dừng thay vì lấy nhầm liên kết ngoài danh mục.');
    const selected=clusters[0].ids;
    return cards.filter(entry=>selected.has(Number(entry.id)));
  }
  return{selectMainGrid};
});
