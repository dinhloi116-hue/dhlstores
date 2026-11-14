const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const source=fs.readFileSync(__dirname+'/manual-sapo-background.js','utf8');
const start=source.indexOf('  async function enqueueVerifiedAutoCycle(cycle){');
const end=source.indexOf('  chrome.alarms.onAlarm.addListener(',start);
assert.ok(start>0&&end>start,'Missing auto push bridge implementation');
const quality=require('./scan-quality-core.js');
const batch=require('./batch-stock-core.js');
const excelSku=require('./excel-sku-core.js');
const branchCore=require('./stock-branch-core.js');
const autoCore=require('./auto-sync-core.js');
function entry(profileId,jobId,scannedAt,sku,stock){
 return{
  profileId,profileName:profileId,branch:'dhl sport',auto:true,
  autoCycleId:'cycle-1',jobId,scannedAt,partial:false,
  qualityValidated:true,rowCount:1,
  rows:[{sku,stock,alias:sku.slice(0,-2),size:'S'}],
  report:{issueCount:0,quality:{ok:true,rowCount:1,sourceVariantCount:1}}
 };
}
const config={
 enabled:false,autoPushSapo:true,intervalHours:2,selectedProfileIds:['hd','kids'],
 sapo:{storeHost:'demo.mysapo.net',locationName:'dhl sport',locationId:12,
  verifiedAt:123,apiKey:'FAKE_KEY',apiSecret:'FAKE_SECRET'}
};
const state={
 dhlAutoSyncConfigV1:config,
 dhlManualPendingStockBatchV1:{
  hd:entry('hd','job-1',101,'HD-A-S',7),
  kids:entry('kids','job-2',102,'KIDS-A-S',0)
 },
 dhlSapoPushQueueV1:null
};
const cycle={
 id:'cycle-1',phase:'ready-to-push',profileIds:['hd','kids'],
 scans:[{profileId:'hd',jobId:'job-1',scannedAt:101},
        {profileId:'kids',jobId:'job-2',scannedAt:102}]
};
let alarmCount=0;
const chrome={storage:{local:{
  get:async keys=>Object.fromEntries((typeof keys==='string'?[keys]:keys).map(k=>[k,state[k]])),
  set:async v=>Object.assign(state,v)
}},alarms:{create:()=>{alarmCount++;}}};
const ctx={
 chrome,readConfig:async()=>state.dhlAutoSyncConfigV1,
 autoCore,batch,excelSku,quality,branchCore,
 text:v=>String(v==null?'':v).trim(),
 storeHost:v=>String(v==null?'':v).trim().toLowerCase(),
 BATCH_KEY:'dhlManualPendingStockBatchV1',
 SAPO_QUEUE_KEY:'dhlSapoPushQueueV1',CONFIG_KEY:'dhlAutoSyncConfigV1',
 MANUAL_ALARM:'dhl-sapo-manual-push-queue',
 sourceScanMap:entries=>Object.fromEntries(entries.map(x=>[x.profileId,x.scannedAt])),
 writePushStatus:async()=>{},pushState:()=>({}),
 Date,Math,String,Number,Array,Object,Error
};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end)+'\nglobalThis.queueAuto=enqueueVerifiedAutoCycle;',ctx);
(async()=>{
 const run=()=>ctx.queueAuto(cycle);
 const original=state.dhlManualPendingStockBatchV1.kids;
 state.dhlManualPendingStockBatchV1.kids={...original,qualityValidated:false};
 await assert.rejects(run(),/chưa đủ chất lượng/);
 assert.strictEqual(alarmCount,0);
 state.dhlManualPendingStockBatchV1.kids=original;
 state.dhlManualPendingStockBatchV1.kids={...original,scannedAt:104};
 await assert.rejects(run(),/đã thay đổi/);
 state.dhlManualPendingStockBatchV1.kids=original;
 state.dhlAutoSyncConfigV1={...config,selectedProfileIds:['hd']};
 await assert.rejects(run(),/Danh mục tự động đã thay đổi/);
 state.dhlAutoSyncConfigV1=config;
 state.dhlManualPendingStockBatchV1.kids=entry('kids','job-2',102,'HD-A-S',7);
 await assert.rejects(run(),/SKU trùng giữa các danh mục/);
 state.dhlManualPendingStockBatchV1.kids=original;
 state.dhlSapoPushQueueV1={id:'other',status:'running',source:'manual'};
 await assert.rejects(run(),/hàng đợi Sapo khác/);
 state.dhlSapoPushQueueV1=null;
 state.dhlAutoSyncConfigV1={...config,autoPushSapo:false};
 await assert.rejects(run(),/đang tắt/);
 state.dhlAutoSyncConfigV1=config;
 const queued=await run();
 assert.strictEqual(queued.total,2);
 assert.strictEqual(alarmCount,1);
 assert.strictEqual(state.dhlSapoPushQueueV1.source,'auto');
 assert.strictEqual(state.dhlSapoPushQueueV1.qualityValidated,true);
 assert.deepStrictEqual(state.dhlSapoPushQueueV1.rows.map(x=>x.sku),['HD-A-S','KIDS-A-S']);
 assert.strictEqual(state.dhlSapoPushQueueV1.rows[1].stock,0);
 assert.strictEqual(state.dhlSapoPushQueueV1.locationId,12);
 assert.strictEqual(JSON.stringify(queued).includes('FAKE_SECRET'),false);
 console.log('SCHEDULED SAPO BRIDGE PASS: fail-closed bad/missing scans, duplicates, active manual queue; exact verified SKU push');
})().catch(e=>{console.error(e);process.exitCode=1;});