(() => {
  'use strict';
  const rules=globalThis.DHLShopRules;
  if(!rules||rules.__genericRulesV1)return;

  const originalSkuBaseForStandardName=rules.skuBaseForStandardName.bind(rules);

  function plain(value){
    return String(value||'').toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function hash36(value){
    let h=2166136261>>>0;
    const text=String(value||'');
    for(let i=0;i<text.length;i+=1){
      h^=text.charCodeAt(i);
      h=Math.imul(h,16777619)>>>0;
    }
    return h.toString(36).toUpperCase();
  }

  function generatedSkuBaseForStandardName(name){
    const p=plain(name);
    if(!p)return'';
    const slug=p.replace(/\s+/g,'-').toUpperCase().slice(0,28).replace(/-+$/,'');
    return `ABDN-${slug}-${hash36(p)}`;
  }

  function generatedAliasForStandardName(name){
    const p=plain(name);
    if(!p)return'';
    return `${p.replace(/\s+/g,'-').slice(0,64)}-${hash36(p).toLowerCase()}`;
  }

  function sourceColorFromAnyStandardName(name){
    const parts=String(name||'').split(/\s+-\s+/).map(x=>x.trim()).filter(Boolean);
    return parts.length>=2?parts[parts.length-1]:'';
  }

  function sourceBaseNameFromAnyStandardName(name){
    const parts=String(name||'').split(/\s+-\s+/).map(x=>x.trim()).filter(Boolean);
    return parts.length>=2?parts.slice(0,-1).join(' - '):String(name||'').trim();
  }

  rules.generatedSkuBaseForStandardName=generatedSkuBaseForStandardName;
  rules.generatedAliasForStandardName=generatedAliasForStandardName;
  rules.skuBaseForStandardName=function(name){
    return originalSkuBaseForStandardName(name)||generatedSkuBaseForStandardName(name);
  };
  rules.sourceColorFromStandardName=sourceColorFromAnyStandardName;
  rules.sourceBaseNameFromStandardName=sourceBaseNameFromAnyStandardName;
  rules.__genericRulesV1=true;
})();
