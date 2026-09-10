(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLMatchCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const TEAM_PATTERNS=[
    ['bo dao nha','portugal'],['tay ban nha','spain'],['nhat ban','japan'],['nhat','japan'],['ha lan','netherlands'],
    ['argentina','argentina'],['brazil','brazil'],['mexico','mexico'],['croatia','croatia'],['crotia','croatia'],['phap','france'],
    ['duc','germany'],['anh','england'],['bi','belgium'],['y','italy'],['viet nam','vietnam'],['han quoc','korea'],['my','usa']
  ];
  const COLOR_WORDS=new Set(['do','trang','xanh','vang','den','be','sua','reu','cam','ngoc','than','soc','siu','la','duong','dam','nhat','hong','tim','ghi','xam']);
  const STOP=new Set(['bo','quan','ao','bong','da','vai','thun','me','han','quoc','nhan','in','ten','so','dt','clb','hd','wc','world','cup','mau','san','nha','khach','2026','26','2025','25','2024','24']);

  function plain(v){
    return String(v||'').toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function normalizeSize(v){
    const p=plain(v).replace(/\s+/g,'').toUpperCase();
    return({'2XL':'XXL','3XL':'XXXL','4XL':'XXXXL','5XL':'XXXXXL'})[p]||p;
  }

  function skuBase(v){
    return String(v||'').trim().replace(/-(S|M|L|XL|XXL|XXXL|XXXXL|XXXXXL|2XL|3XL|4XL|5XL)$/i,'').trim();
  }

  function teamOf(v){
    const p=' '+plain(v)+' ';
    for(const [pat,id] of TEAM_PATTERNS)if(p.includes(' '+pat+' '))return id;
    return'';
  }

  function modeOf(v){
    const p=plain(v);
    if(/\btap\b/.test(p))return'training';
    if(/san khach|\bkhach\b/.test(p))return'away';
    if(/san nha|\bnha\b/.test(p))return'home';
    return'';
  }

  function yearOf(v){
    const p=plain(v);
    if(/\b2026\b|\b26\b/.test(p))return'2026';
    if(/\b2025\b|\b25\b/.test(p))return'2025';
    return'';
  }

  function colorsOf(v){return new Set(plain(v).split(' ').filter(x=>COLOR_WORDS.has(x)));}
  function contentTokens(v){return new Set(plain(v).split(' ').filter(x=>x.length>1&&!STOP.has(x)&&!COLOR_WORDS.has(x)));}
  function jaccard(a,b){if(!a.size&&!b.size)return 0;let inter=0;for(const x of a)if(b.has(x))inter++;return inter/(a.size+b.size-inter||1);}

  function colorFamilies(tokens){
    const f=new Set();
    for(const t of tokens){
      if(t==='den'||t==='than'||t==='xam'||t==='ghi')f.add('dark');
      if(t==='xanh'||t==='reu'||t==='la'||t==='ngoc')f.add('greenblue');
      if(t==='trang')f.add('white');
      if(t==='do'||t==='hong')f.add('red');
      if(t==='vang')f.add('yellow');
      if(t==='be'||t==='sua')f.add('beige');
      if(t==='cam')f.add('orange');
      if(t==='siu')f.add('siu');
    }
    return f;
  }

  function colorScore(a,b){
    if(!a.size||!b.size)return 0;
    let inter=0;
    for(const x of a)if(b.has(x))inter++;
    if(inter>0){
      const precision=inter/Math.max(1,Math.min(a.size,b.size));
      return Math.min(1,.65+.35*precision);
    }
    const af=colorFamilies(a),bf=colorFamilies(b);
    for(const x of af)if(bf.has(x))return .48;
    return 0;
  }

  function productSkuBase(product){
    if(product&&product.skuBase)return String(product.skuBase);
    const bases=[...new Set(((product&&product.variants)||[]).map(v=>skuBase(v.sku)).filter(Boolean))];
    return bases.length===1?bases[0]:(bases[0]||'');
  }

  function stripSourceTail(name){
    const text=String(name||'').trim();
    const parts=text.split(/\s+-\s+/).map(x=>x.trim()).filter(Boolean);
    if(parts.length>=3&&/^(S|M|L|XL|XXL|XXXL|XXXXL|XXXXXL|2XL|3XL|4XL|5XL)$/i.test(parts[parts.length-1]))return parts.slice(0,-2).join(' - ');
    return text;
  }

  function colorFromVariant(v){
    if(v&&String(v.color||'').trim())return String(v.color).trim();
    const parts=String((v&&v.name)||'').split(/\s+-\s+/).map(x=>x.trim()).filter(Boolean);
    if(parts.length>=3)return parts[parts.length-2];
    return'';
  }

  function sourceIdentity(group){
    const sample=(group.variants&&group.variants[0])||{};
    return `${group.parentName||''} ${group.color||''} ${sample.name||''}`.trim();
  }

  function scoreProductMatch(sapoName,sapoSku,sourceName,sourceColor){
    const sText=`${sapoName||''} ${skuBase(sapoSku)||''}`;
    const tText=`${sourceName||''} ${sourceColor||''}`;
    const st=teamOf(sText),tt=teamOf(tText);
    if(st&&tt&&st!==tt)return 0;
    let score=0;
    if(st&&tt&&st===tt)score+=.54;
    else if(st||tt)score+=.04;
    const sy=yearOf(sText),ty=yearOf(tText);
    if(sy&&ty)score+=sy===ty?.08:-.10;
    const sm=modeOf(sText),tm=modeOf(tText);
    if(sm&&tm)score+=sm===tm?.12:-.08;
    const cs=colorScore(colorsOf(sText),colorsOf(`${sourceColor||''} ${tText}`));
    score+=.22*cs;
    score+=.08*jaccard(contentTokens(sText),contentTokens(tText));
    return Math.max(0,Math.min(1,score));
  }

  function groupSourceVariants(results){
    const groups=[];
    for(const product of results||[]){
      const byColor=new Map();
      for(const v of product.variants||[]){
        const color=colorFromVariant(v)||'(không màu)';
        const key=plain(color)||'(khong mau)';
        if(!byColor.has(key))byColor.set(key,{color,variants:[]});
        byColor.get(key).variants.push(v);
      }
      for(const entry of byColor.values()){
        const sample=entry.variants[0]||{};
        let parentName=String(product.parentName||'').trim();
        const derived=stripSourceTail(sample.name);
        if(!teamOf(parentName)&&teamOf(derived))parentName=derived;
        groups.push({
          parentId:product.parentId,
          parentName,
          color:entry.color,
          variants:entry.variants,
          sourceText:`${parentName} ${sample.name||''}`.trim(),
          validation:product.validation||null,
          completeSource:product.complete===true
        });
      }
    }
    return groups;
  }

  function buildVariantMatches(product,group){
    const result=[];
    for(const sv of (product.variants||[])){
      const size=normalizeSize(sv.size||sv.sizeFromSku);
      const candidates=(group.variants||[]).filter(v=>normalizeSize(v.size)===size);
      result.push({
        sapo:sv,
        source:candidates.length===1?candidates[0]:null,
        reason:candidates.length===1?'exact-size':(size?'size-not-unique':'missing-sapo-size')
      });
    }
    return result;
  }

  function matchSapoProducts(sapoProducts,sourceResults,{minScore=.52}={}){
    const products=sapoProducts||[],groups=groupSourceVariants(sourceResults),pairs=[];
    for(let pi=0;pi<products.length;pi++){
      const p=products[pi],base=productSkuBase(p);
      for(let gi=0;gi<groups.length;gi++){
        const g=groups[gi];
        const score=scoreProductMatch(p.name,base,sourceIdentity(g),g.color);
        const pt=teamOf(`${p.name} ${base}`),gt=teamOf(sourceIdentity(g));
        if(pt&&gt&&pt!==gt)continue;
        pairs.push({pi,gi,score});
      }
    }
    pairs.sort((a,b)=>b.score-a.score);
    const assignedP=new Map(),assignedG=new Set();
    for(const pair of pairs){
      if(pair.score<minScore||assignedP.has(pair.pi)||assignedG.has(pair.gi))continue;
      assignedP.set(pair.pi,pair);
      assignedG.add(pair.gi);
    }

    return products.map((p,pi)=>{
      const assigned=assignedP.get(pi)||null;
      const ranked=pairs.filter(x=>x.pi===pi).sort((a,b)=>b.score-a.score);
      const displayPair=assigned||ranked[0]||null;
      const best=displayPair?{...groups[displayPair.gi],score:displayPair.score}:null;
      const secondPair=ranked.find(x=>!displayPair||x.gi!==displayPair.gi)||null;
      const second=secondPair?{...groups[secondPair.gi],score:secondPair.score}:null;
      const margin=best?best.score-(second?second.score:0):0;
      const matched=!!assigned;
      const variantMatches=matched?buildVariantMatches(p,best):[];
      const complete=matched&&variantMatches.length>0&&variantMatches.every(x=>x.source);
      return{
        sapoProduct:p,matched,best,second,margin,variantMatches,complete,
        linkMethod:matched?'team + SKU gốc/màu + size chính xác':'unmatched'
      };
    });
  }

  function colorHintFromProduct(product){
    const base=plain(productSkuBase(product));
    const team=teamOf(`${product.name||''} ${base}`);
    let words=base.split(' ').filter(x=>!['2026','26','2025','25','hd','wc'].includes(x));
    for(const [pat,id] of TEAM_PATTERNS){
      if(id!==team)continue;
      const patWords=pat.split(' ');
      for(let i=0;i<=words.length-patWords.length;i++){
        if(patWords.every((w,j)=>words[i+j]===w)){words.splice(i,patWords.length);break;}
      }
      break;
    }
    return words.join(' ').trim();
  }

  function buildScanHints(products){
    const byTeam=new Map();
    for(const p of products||[]){
      const base=productSkuBase(p),team=teamOf(`${p.name||''} ${base}`);
      if(!team)continue;
      if(!byTeam.has(team))byTeam.set(team,{team,products:[],colors:[]});
      const item={productId:p.productId,name:p.name||'',skuBase:base,colorHint:colorHintFromProduct(p),sizes:(p.variants||[]).map(v=>normalizeSize(v.size)).filter(Boolean)};
      byTeam.get(team).products.push(item);
      if(item.colorHint&&!byTeam.get(team).colors.includes(item.colorHint))byTeam.get(team).colors.push(item.colorHint);
    }
    return[...byTeam.values()];
  }

  return{
    plain,teamOf,modeOf,yearOf,colorsOf,scoreProductMatch,normalizeSize,skuBase,productSkuBase,
    groupSourceVariants,matchSapoProducts,buildScanHints,colorHintFromProduct,sourceIdentity
  };
});
