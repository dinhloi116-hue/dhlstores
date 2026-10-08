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

  // Bộ nhớ SKU đặc biệt của tool.
  // Chỉ áp dụng RIÊNG mẫu Wika Đông Á Thanh Hoá (Bản Fan) - Vàng vì alias đầy đủ quá dài.
  // SKU mới giữ nguyên hash/size, chỉ bỏ tiền tố "ao-thi-dau-".
  const SPECIAL_ALIAS_RULES_V1=[
    {
      id:'wika-dong-a-thanh-hoa-fan-vang-short-sku',
      standardPlain:'ao thi dau wika clb dong a thanh hoa ban fan vang',
      removePrefix:'ao-thi-dau-'
    }
  ];

  function applySpecialAliasRules(standardPlain,alias){
    let out=String(alias||'');
    for(const rule of SPECIAL_ALIAS_RULES_V1){
      if(standardPlain===rule.standardPlain&&out.startsWith(rule.removePrefix)){
        out=out.slice(rule.removePrefix.length);
      }
    }
    return out;
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
    const alias=`${p.replace(/\s+/g,'-').slice(0,64)}-${hash36(p).toLowerCase()}`;
    return applySpecialAliasRules(p,alias);
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
  rules.specialAliasRules=Array.isArray(rules.specialAliasRules)
    ?[...rules.specialAliasRules,...SPECIAL_ALIAS_RULES_V1]
    :SPECIAL_ALIAS_RULES_V1.slice();
  rules.__genericRulesV1=true;
})();
