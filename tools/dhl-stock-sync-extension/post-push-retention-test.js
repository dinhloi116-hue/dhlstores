const fs=require('fs');
const assert=require('assert');
const vm=require('vm');
const source=fs.readFileSync(__dirname+'/manual-sapo-background.js','utf8');
const ui=fs.readFileSync(__dirname+'/manual-sapo-output-mode.js','utf8');
const start=source.indexOf('  async function clearConsumedManualCache(queue){');
const end=source.indexOf('  function findExactVariant(',start);
const s2=source.indexOf('  function selectedPendingEntries(pending,profileIds){');
const e2=source.indexOf('  function validatePausedQueue(',s2);
assert.ok(start>=0&&end>start&&s2>=0&&e2>s2);
const state={
 dhlManualPendingStockBatchV1:{
   HD:{profileId:'HD',scannedAt:100,jobId:'j1',rows:[{sku:'HD-A-S',stock:0}]}
 }
};
const chrome={storage:{local:{
 async get(key){return{[key]:state[key]};},
 async set(obj){Object.assign(state,obj);}
}}};
const context=vm.createContext({chrome,BATCH_KEY:'dhlManualPendingStockBatchV1',
 Date,Number,Object,Array,String,Error});
vm.runInContext(source.slice(start,end)+source.slice(s2,e2)+
 '\nglobalThis.tests={clearConsumedManualCache,selectedPendingEntries};',context);
(async()=>{
 const methods=context.tests;
 await methods.clearConsumedManualCache({id:'queue-1',finishedAt:999,sourceScans:{HD:100}});
 const stored=state.dhlManualPendingStockBatchV1.HD;
 assert.ok(stored,'A successful Sapo push must not delete cached Excel rows');
 assert.strictEqual(stored.rows[0].stock,0);
 assert.strictEqual(stored.lastSapoPushedAt,999);
 assert.strictEqual(stored.lastSapoPushQueueId,'queue-1');
 assert.throws(()=>methods.selectedPendingEntries(state.dhlManualPendingStockBatchV1,['HD']),/đã được đẩy/);
 state.dhlManualPendingStockBatchV1.HD={...stored,scannedAt:1200,jobId:'j2'};
 assert.strictEqual(methods.selectedPendingEntries(state.dhlManualPendingStockBatchV1,['HD']).length,1,
   'A new scan after the previous push is eligible for a new preview');
 await methods.clearConsumedManualCache({id:'old-queue',finishedAt:1000,sourceScans:{HD:100}});
 assert.strictEqual(state.dhlManualPendingStockBatchV1.HD.scannedAt,1200,
   'Finishing an older queue must not mark a new scan as already pushed');
 assert.ok(ui.includes('exportEntries'),'Excel must remain exportable after a push');
 console.log('POST SAPO PUSH RETENTION PASS: keep Excel cache, mark pushed scan, require newer scan');
})().catch(err=>{console.error(err);process.exitCode=1;});
