(function zeroPolicyModule(){
  'use strict';

  const KEY='dhlSourceZeroStockPolicyV1';
  const text=v=>String(v==null?'':v).trim();
  const dayKey=(ts=Date.now())=>{
    const d=new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const productId=r=>Number(r&&r.parentId)||0;
  const validVariants=r=>Array.isArray(r&&r.variants)?r.variants.filter(v=>Number.isFinite(Number(v&&v.available))):[];
  const hasPositive=r=>validVariants(r).some(v=>Number(v.available)>0);
  const allZero=r=>{
    const vars=validVariants(r);
    return vars.length>0&&vars.every(v=>Number(v.available)===0);
  };

  async function read(){
    const s=await chrome.storage.local.get(KEY);
    const raw=s[KEY]&&typeof s[KEY]==='object'?s[KEY]:{};
    return raw;
  }

  async function write(data){
    await chrome.storage.local.set({[KEY]:data});
    return data;
  }

  async function suppressedIds(){
    const data=await read();
    return Object.values(data).filter(x=>x&&x.suppressed===true).map(x=>Number(x.parentId)).filter(Boolean);
  }

  async function applyScan(results){
    const data=await read();
    const today=dayKey();
    const revived=[];
    const newlySuppressed=[];
    for(const result of Array.isArray(results)?results:[]){
      const id=productId(result);
      if(!id)continue;
      const key=String(id);
      const current=data[key]&&typeof data[key]==='object'?data[key]:{
        parentId:id,
        name:text(result.parentName),
        zeroDays:[],
        suppressed:false,
        firstSeenAt:Date.now()
      };
      current.name=text(result.parentName)||current.name||`#${id}`;
      current.lastSeenAt=Date.now();

      if(hasPositive(result)){
        if(current.suppressed)revived.push({parentId:id,name:current.name});
        current.zeroDays=[];
        current.suppressed=false;
        current.lastPositiveAt=Date.now();
        current.reactivatedAt=Date.now();
      }else if(allZero(result)){
        const days=Array.isArray(current.zeroDays)?current.zeroDays.filter(Boolean):[];
        if(!days.includes(today))days.push(today);
        current.zeroDays=days.slice(-40);
        current.lastZeroAt=Date.now();
        if(current.zeroDays.length>=10&&!current.suppressed){
          current.suppressed=true;
          current.suppressedAt=Date.now();
          newlySuppressed.push({parentId:id,name:current.name,zeroDays:current.zeroDays.length});
        }
      }
      data[key]=current;
    }
    await write(data);
    return{
      data,
      suppressedIds:Object.values(data).filter(x=>x&&x.suppressed).map(x=>Number(x.parentId)).filter(Boolean),
      newlySuppressed,
      revived
    };
  }

  function filterForOutput(results,previouslySuppressedIds){
    const blocked=new Set((previouslySuppressedIds||[]).map(Number).filter(Boolean));
    return (Array.isArray(results)?results:[]).filter(r=>!blocked.has(productId(r))||hasPositive(r));
  }

  async function summary(){
    const data=await read();
    const all=Object.values(data);
    return{
      tracked:all.length,
      suppressed:all.filter(x=>x&&x.suppressed).length,
      items:all.filter(x=>x&&x.suppressed).map(x=>({
        parentId:Number(x.parentId)||0,
        name:text(x.name),
        zeroDays:Array.isArray(x.zeroDays)?x.zeroDays.length:0,
        suppressedAt:Number(x.suppressedAt)||0
      }))
    };
  }

  globalThis.DHLSourceZeroStockPolicy={read,write,suppressedIds,applyScan,filterForOutput,summary,dayKey,hasPositive,allZero};
})();