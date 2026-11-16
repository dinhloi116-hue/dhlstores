const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const source=fs.readFileSync(__dirname+'/manual-sapo-background.js','utf8');
function jsonResponse(status,data){
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
}
const rows=Array.from({length:8},(_,i)=>({
  sku:'SKU-'+(i+1),variantId:i+1,productId:100+i,stock:i
}));
const state={
  dhlSapoPushQueueV1:{
    id:'fast-test',source:'manual',status:'running',manualPaused:false,qualityValidated:true,
    host:'demo.mysapo.net',locationId:2,locationName:'dhl sport',rows,
    index:0,total:8,success:0,successRows:[],errors:[],startedAt:Date.now()
  },
  dhlSapoInventoryMapV1:{},
  dhlAutoSyncConfigV1:{sapo:{
    storeHost:'demo.mysapo.net',apiKey:'test-key',apiSecret:'test-secret',
    verifiedAt:Date.now(),locationId:2,locationName:'dhl sport'
  }}
};
let alarmListener, maxWrites=0, activeWrites=0, failOnce=true;
const attempts=new Map();
const chrome={
  storage:{local:{
    async get(keys){
      const out={};for(const key of typeof keys==='string'?[keys]:keys)out[key]=state[key];
      return out;
    },
    async set(values){Object.assign(state,values);},
    async remove(keys){for(const k of Array.isArray(keys)?keys:[keys])delete state[k];}
  }},
  alarms:{
    onAlarm:{addListener(fn){alarmListener=fn;}},
    async clear(){return true;},
    create(){}
  },
  runtime:{onMessage:{addListener(){}}}
};
const ctx={
  chrome,Response,URL,URLSearchParams,Date,Math,Promise,console,
  btoa:s=>Buffer.from(s).toString('base64'),
  setTimeout:(fn)=>{queueMicrotask(fn);return 1;},
  clearTimeout(){},
  fetch:async(url,init={})=>{
    const path=String(url);
    if(path.includes('/admin/inventory_items.json?')){
      const u=new URL(path);
      const variantId=Number(u.searchParams.get('variant_id')||0);
      return jsonResponse(200,{inventory_items:[{
        id:1000+variantId,variant_id:variantId,sku:'SKU-'+variantId,product_id:99+variantId
      }]});
    }
    const match=path.match(/\/admin\/inventory_items\/(\d+)\/locations\/2\.json/);
    if(match){
      const index=Number(match[1])-1000-1;
      activeWrites++;maxWrites=Math.max(maxWrites,activeWrites);
      attempts.set(index,(attempts.get(index)||0)+1);
      await new Promise(r=>setImmediate(r));
      activeWrites--;
      if(index===1&&failOnce){
        failOnce=false;
        return jsonResponse(429,{error:'rate limit'});
      }
      return jsonResponse(200,{inventory_level:{available:rows[index].stock}});
    }
    throw Error('Unexpected Sapo endpoint: '+path);
  }
};
ctx.globalThis=ctx;
ctx.DHLAutoSyncCore={normalizeConfig:x=>x||{}};
ctx.DHLBatchStockCore={};
ctx.DHLScanQualityCore=require('./scan-quality-core.js');
ctx.DHLStockBranchCore=require('./stock-branch-core.js');
ctx.DHLExcelSkuCore=require('./excel-sku-core.js');
ctx.DHLStockPushPreviewCore=require('./stock-push-preview-core.js');
ctx.DHLSapoInventoryResolver={
  normSku:v=>String(v||'').toUpperCase(),
  inventoryCandidates:d=>d.inventory_items||[],
  findCandidate:(items,row)=>items.find(x=>Number(x.variant_id)===Number(row.variantId)),
  variantInventoryItemId:()=>0
};
vm.createContext(ctx);
vm.runInContext(source,ctx,{filename:'manual-sapo-background.js'});
assert.ok(alarmListener,'Sapo alarm listener missing');
async function waitFor(predicate){
  for(let i=0;i<250;i++){
    await new Promise(r=>setImmediate(r));
    if(predicate())return;
  }
  throw Error('Queue did not reach expected state');
}
(async()=>{
  alarmListener({name:'dhl-sapo-manual-push-queue'});
  await waitFor(()=>state.dhlSapoPushQueueV1.manualPaused===true);
  let queue=state.dhlSapoPushQueueV1;
  assert.strictEqual(queue.index,1,'Fatal 429 must checkpoint first uncompleted SKU');
  assert.strictEqual(queue.successRows.length,3,'Other in-flight successes need checkpointing');
  assert.ok(maxWrites>1&&maxWrites<=4,'Write operations must run in bounded parallel');
  assert.strictEqual(attempts.get(2),1);
  assert.strictEqual(attempts.get(3),1);
  // On explicit resume, successful indices beyond the earlier fatal must
  // not be written a second time.
  queue.manualPaused=false;
  queue.status='running';
  queue.errors=[];
  alarmListener({name:'dhl-sapo-manual-push-queue'});
  await waitFor(()=>state.dhlSapoPushQueueV1.status==='done');
  queue=state.dhlSapoPushQueueV1;
  assert.strictEqual(queue.success,8);
  assert.strictEqual(queue.index,8);
  assert.strictEqual(attempts.get(1),2,'Rate-limited row may retry when manually resumed');
  assert.strictEqual(attempts.get(2),1,'Previously successful in-flight rows cannot repeat');
  assert.strictEqual(attempts.get(3),1,'Previously successful in-flight rows cannot repeat');
  assert.strictEqual(queue.failed,0);
  assert.strictEqual(new Set(queue.successRows.map(x=>x.index)).size,8);
  console.log('SAPO PARALLEL PASS: max concurrency '+maxWrites+', 429 pause and safe resume');
})().catch(error=>{console.error(error);process.exitCode=1;});
