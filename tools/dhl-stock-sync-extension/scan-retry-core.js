(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLManualScanRetryCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_AUTOMATIC_PASSES=4;
  function verified(result){
    const diag=result&&result.domDiagnostics||{};
    return Boolean(result&&result.complete===true
      &&Array.isArray(result.variants)&&result.variants.length>0
      &&!(Array.isArray(result.errors)&&result.errors.length)
      &&!(Array.isArray(diag.missingSizes)&&diag.missingSizes.length)
      &&!(Array.isArray(diag.unverifiedColors)&&diag.unverifiedColors.length)
      &&!(Array.isArray(diag.missingColorHints)&&diag.missingColorHints.length));
  }
  function incompleteIndexes(results,total){
    const list=Array.isArray(results)?results:[];
    const count=Math.max(0,Number(total)||0),out=[];
    for(let i=0;i<count;i++)if(!verified(list[i]))out.push(i);
    return out;
  }
  function preferResult(previous,next){
    if(verified(next))return next;
    if(verified(previous))return previous;
    const prev=previous&&typeof previous==='object'?previous:null;
    const current=next&&typeof next==='object'?next:null;
    if(!prev)return current;
    if(!current)return prev;
    const score=(result)=>{
      const diag=result.domDiagnostics||{};
      const variantCount=Array.isArray(result.variants)?result.variants.length:0;
      const missing=(Array.isArray(diag.missingSizes)?diag.missingSizes.length:0)
        +(Array.isArray(diag.unverifiedColors)?diag.unverifiedColors.length:0)
        +(Array.isArray(diag.missingColorHints)?diag.missingColorHints.length:0);
      return variantCount*10-missing;
    };
    // Never merge two partial reads taken at different times.
    return score(current)>=score(prev)?current:prev;
  }
  function planNextPass(job){
    const remaining=incompleteIndexes(job&&job.results,job&&job.total);
    const pass=Math.max(0,Number(job&&job.retryPass)||0);
    if(!remaining.length)return{status:'complete',remaining:[]};
    if(pass>=MAX_AUTOMATIC_PASSES)return{status:'paused',remaining};
    return{status:'retry',pass:pass+1,remaining};
  }
  return{MAX_AUTOMATIC_PASSES,verified,incompleteIndexes,preferResult,planNextPass};
});
