const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const source=fs.readFileSync(__dirname+'/manual-sapo-background.js','utf8');
const from=source.indexOf('  function selectedPendingEntries(pending,profileIds){');
const to=source.indexOf('  async function processManualQueue(){',from);
assert.ok(from>=0&&to>from,'Preview/push service segment missing');
const state={
  dhlManualPendingStockBatchV1:{
    hd:{profileId:'hd',profileName:'HD',scannedAt:123,jobId:'job1',branch:'dhl sport',
      rows:[{sku:'GER-TRANG-S',stock:0},{sku:'GER-TRANG-DO-S',stock:4}]}
  },
  dhlSapoPushQueueV1:null
};
const config={sapo:{storeHost:'demo.mysapo.net',locationName:'dhl sport',locationId:9,verifiedAt:1234}};
const previewCore=require('./stock-push-preview-core.js');
let alarms=0;
const chrome={
  storage:{local:{
    get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,state[k]])),
    set:async obj=>Object.assign(state,obj),
    remove:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])delete state[k];}
  }},
  alarms:{clear:async()=>{},create:()=>{alarms++;}}
};
const ctx={
  chrome,config,
  readConfig:async()=>config,ensureVerifiedSapo:async c=>c,
  quality:{trustedEntry:()=>true},batch:{combineEntries:(entries)=>({
    branch:'dhl sport',profileCount:entries.length,rows:entries.flatMap(e=>e.rows)
  })},
  branchCore:{resolve:()=> 'dhl sport'},
  excelSku:{validate:()=>true},
  previewCore,
  SAPO_QUEUE_KEY:'dhlSapoPushQueueV1',BATCH_KEY:'dhlManualPendingStockBatchV1',
  CYCLE_KEY:'dhlAutoSyncCycleV1',PREVIEW_KEY:'dhlSapoManualPreviewV1',
  PREVIEW_TTL_MS:600000,MANUAL_ALARM:'dhl-sapo-manual-push-queue',AUTO_PUSH_ALARM:'dhl-sapo-push-queue',
  staleLegacy403Queue:()=>false,
  text:v=>String(v==null?'':v).trim(),
  storeHost:v=>String(v),
  sourceScanMap:entries=>Object.fromEntries(entries.map(e=>[e.profileId,e.scannedAt])),
  writePushStatus:async()=>{},
  pushState:()=>({}),
  Date,Math,Array,Object,Number,String,Boolean,Error
};
vm.createContext(ctx);
vm.runInContext(source.slice(from,to)+'\nglobalThis.previewAndPush={prepareManualPreview,enqueueOrResume};',ctx);
const api=ctx.previewAndPush;
(async()=>{
  await assert.rejects(api.enqueueOrResume(['hd'],''),/XEM TRƯỚC SAPO/);
  assert.strictEqual(state.dhlSapoPushQueueV1,null);
  let p=await api.prepareManualPreview(['hd']);
  assert.strictEqual(p.summary.count,2);
  await assert.rejects(api.enqueueOrResume(['hd'],'wrong'),/XEM TRƯỚC SAPO/);
  assert.strictEqual(alarms,0);
  state.dhlManualPendingStockBatchV1.hd.rows[1].stock=77;
  await assert.rejects(api.enqueueOrResume(['hd'],p.token),/Dữ liệu hoặc cấu hình kho đã thay đổi/);
  state.dhlManualPendingStockBatchV1.hd.rows[1].stock=4;
  p=await api.prepareManualPreview(['hd']);
  state.dhlSapoManualPreviewV1.at=Date.now()-600001;
  await assert.rejects(api.enqueueOrResume(['hd'],p.token),/hết hạn/);
  p=await api.prepareManualPreview(['hd']);
  const result=await api.enqueueOrResume(['hd'],p.token);
  assert.strictEqual(result.total,2);
  assert.strictEqual(state.dhlSapoPushQueueV1.total,2);
  assert.strictEqual(state.dhlSapoManualPreviewV1,undefined,'Token must be single-use');
  assert.strictEqual(alarms,1,'Only approved preview can start the push queue');
  state.dhlSapoPushQueueV1={
    ...state.dhlSapoPushQueueV1,
    source:'manual',status:'running',manualPaused:true,index:1,
    rows:[{sku:'GER-TRANG-S',stock:0},{sku:'GER-TRANG-DO-S',stock:99}]
  };
  await assert.rejects(api.prepareManualPreview(['hd']),/hàng đợi Sapo đã tạm dừng khác số tồn/i);
  assert.strictEqual(alarms,1,'A stale paused queue cannot start writes');
  console.log('SAPO PREVIEW TOKEN PASS: no token, wrong token, changed stock, expired token and stale paused queue block writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
