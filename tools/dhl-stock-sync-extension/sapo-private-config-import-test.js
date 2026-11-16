const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync(__dirname+'/manual-sapo-background.js','utf8');
const ui=fs.readFileSync(__dirname+'/manual-sapo-output-mode.js','utf8');
const start=src.indexOf('  async function saveSapoCredentials(request){');
const end=src.indexOf('  // Connection is an explicit user action.',start);
assert.ok(start>0&&end>start,'Missing private config import');
const CONFIG_KEY='dhlAutoSyncConfigV1',PREVIEW_KEY='dhlSapoManualPreviewV1';
const SAPO_QUEUE_KEY='dhlSapoPushQueueV1';
const originalBatch={hd:{rows:[{sku:'HD-S',stock:8}]},kids:{rows:[{sku:'KIDS-S',stock:0}]}};
const state={
  [CONFIG_KEY]:{autoPushSapo:true,sapo:{storeHost:'old.mysapo.net',
    apiKey:'old',apiSecret:'old-secret',locationId:9,locationName:'Old',verifiedAt:123}},
  [SAPO_QUEUE_KEY]:null,
  dhlManualPendingStockBatchV1:originalBatch
};
let removed=[];
const ctx={
 CONFIG_KEY,PREVIEW_KEY,SAPO_QUEUE_KEY,
 storeHost:v=>{
   let host=String(v==null?'':v).trim().replace(/^https?:\\/\\//i,'').replace(/\\/.*$/,'').toLowerCase();
   if(!/^[a-z0-9][a-z0-9.-]*\\.mysapo\\.net$/.test(host))throw Error('Invalid host');
   return host;
 },
 text:v=>String(v==null?'':v).trim(),
 readConfig:async()=>state[CONFIG_KEY],
 chrome:{storage:{local:{
   get:async key=>({[key]:state[key]}),
   set:async obj=>Object.assign(state,obj),
   remove:async key=>removed.push(key)
 }}},
 Error,String,Object,Array,Number,Date
};
vm.createContext(ctx);
vm.runInContext(src.slice(start,end)+'\\nglobalThis.saveCredentials=saveSapoCredentials;',ctx);
(async()=>{
 state[SAPO_QUEUE_KEY]={status:'running'};
 await assert.rejects(ctx.saveCredentials({storeHost:'dhl-sport.mysapo.net',
   apiKey:'NEW_FAKE_KEY',apiSecret:'NEW_FAKE_SECRET'}),/Đang có lượt đẩy/);
 state[SAPO_QUEUE_KEY]=null;
 const result=await ctx.saveCredentials({storeHost:'https://dhl-sport.mysapo.net/admin/apps/private/15196',
   apiKey:'NEW_FAKE_KEY',apiSecret:'NEW_FAKE_SECRET'});
 assert.strictEqual(result.saved,true);
 assert.strictEqual(result.verified,false);
 assert.strictEqual(result.storeHost,'dhl-sport.mysapo.net');
 assert.strictEqual(state[CONFIG_KEY].sapo.apiKey,'NEW_FAKE_KEY');
 assert.strictEqual(state[CONFIG_KEY].sapo.apiSecret,'NEW_FAKE_SECRET');
 assert.strictEqual(state[CONFIG_KEY].sapo.locationId,0);
 assert.strictEqual(state[CONFIG_KEY].sapo.verifiedAt,0);
 assert.strictEqual(state[CONFIG_KEY].autoPushSapo,false);
 assert.strictEqual(state.dhlManualPendingStockBatchV1,originalBatch);
 assert.deepStrictEqual(removed,[PREVIEW_KEY]);
 assert.ok(!JSON.stringify(result).includes('NEW_FAKE_SECRET'));
 assert.ok(ui.includes("type:'DHL_SAPO_SAVE_CREDENTIALS'"));
 assert.ok(ui.includes("addEventListener('change',importSapoConfig)"));
 assert.ok(ui.includes("data.format!=='dhl-sapo-private-app-v1'"));
 assert.ok(src.includes("message.type==='DHL_SAPO_SAVE_CREDENTIALS'"));
 console.log('SAPO PRIVATE IMPORT PASS: local only, no unsafe warehouse trust, no batch deletion');
})().catch(e=>{console.error(e);process.exitCode=1;});
