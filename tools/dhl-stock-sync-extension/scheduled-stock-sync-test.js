const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const source=fs.readFileSync(__dirname+'/scheduled-stock-sync-background.js','utf8');
const manual=fs.readFileSync(__dirname+'/manual-job-runner-background.js','utf8');
const sapo=fs.readFileSync(__dirname+'/manual-sapo-background.js','utf8');
const popup=fs.readFileSync(__dirname+'/popup.html','utf8');
const background=fs.readFileSync(__dirname+'/background.js','utf8');
const ui=fs.readFileSync(__dirname+'/scheduled-stock-sync-mode.js','utf8');
const core=require('./auto-sync-core.js');
const s={
  dhlAutoSyncConfigV1:{
    enabled:false,intervalHours:2,autoPushSapo:false,
    sapo:{storeHost:'example.mysapo.net',locationId:11,locationName:'dhl sport',
      apiKey:'FAKE_TEST_KEY',apiSecret:'FAKE_TEST_SECRET',verifiedAt:123}
  },
  dhlSavedStockProfilesV1:[
    {id:'hd',name:'HD',lastSourceUrl:'https://si.aobongda.net/hd-pc36029.html'},
    {id:'kids',name:'Trẻ em',lastSourceUrl:'https://si.aobongda.net/tre-em-pc31001.html'}
  ]
};
const alarms=new Map(),listeners={alarm:[],storage:[],runtime:[]},timers=[];
let creates=0,removed=0,starts=0,autoEnqueues=0;
const tabs=new Map();
const runner={
  async startJob(message){
    starts++;
    const job={id:'job-'+starts,autoCycleId:message.autoCycleId,
      sourceTabId:message.sourceTabId,profileId:message.profileId,
      running:true,status:'queued'};
    s.dhlManualScanJobV2=job;
    return job;
  },async readJob(){return s.dhlManualScanJobV2;},async cancelNow(){}
};
const bridge={
  async enqueueVerifiedAutoCycle(cycle){
    autoEnqueues++;
    assert.strictEqual(cycle.scans.length,cycle.profileIds.length,
      'Never auto-push unless every selected category is finished');
    assert.deepStrictEqual(cycle.scans.map(x=>x.profileId),cycle.profileIds);
    const queue={id:'queue-'+autoEnqueues,source:'auto',autoCycleId:cycle.id,
      status:'running',total:2,index:0,success:0};
    s.dhlSapoPushQueueV1=queue;
    return{queueId:queue.id,total:queue.total};
  },async resumeAutoQueue(){return{ok:true};}
};
const chrome={
  storage:{
    local:{
      async get(keys){
        const list=typeof keys==='string'?[keys]:keys;
        return Object.fromEntries(list.map(x=>[x,s[x]]));
      },
      async set(values){Object.assign(s,values);}
    },
    onChanged:{addListener(fn){listeners.storage.push(fn);}}
  },
  alarms:{
    onAlarm:{addListener(fn){listeners.alarm.push(fn);}},
    async get(name){return alarms.get(name)||null;},
    async clear(name){alarms.delete(name);return true;},
    create(name,opts){alarms.set(name,{name,scheduledTime:Date.now()+1000,...opts});}
  },
  runtime:{onMessage:{addListener(fn){listeners.runtime.push(fn);}},
    onStartup:{addListener(){}},onInstalled:{addListener(){}}},
  tabs:{async get(id){return tabs.get(Number(id));}},
  windows:{
    async create({url,focused}){
      assert.strictEqual(focused,false,'Must not steal the current browser focus');
      const id=++creates;
      tabs.set(id,{id,url,status:'complete',active:true});
      return{id,tabs:[{id,url,active:true,status:'complete'}]};
    },
    async remove(){removed++;}
  }
};
const ctx={chrome,console,Date,Math,Promise,setTimeout:fn=>{timers.push(fn);return timers.length;},
  clearTimeout(){},globalThis:null};
ctx.globalThis=ctx;
ctx.DHLAutoSyncCore=core;
ctx.DHLScanQualityCore={trustedEntry:e=>e&&e.qualityValidated===true};
ctx.DHLManualJobRunner=runner;
ctx.DHLSapoAutoBridge=bridge;
vm.createContext(ctx);
vm.runInContext(source,ctx,{filename:'scheduled-stock-sync-background.js'});
async function nextUntil(check){
  for(let i=0;i<100;i++){
    for(const t of timers.splice(0))t();
    for(const listener of listeners.alarm)listener({name:'dhl-scheduled-stock-step'});
    await new Promise(resolve=>setImmediate(resolve));
    if(check())return;
  }
  throw Error('Cycle did not advance: '+JSON.stringify(s.dhlScheduledStockCycleV1));
}
async function send(msg){
  const receiver=listeners.runtime[0];
  return new Promise((resolve,reject)=>{
    const responded=receiver(msg,null,resp=>resp&&resp.ok?resolve(resp.result):reject(Error(resp&&resp.error)));
    if(responded!==true)reject(Error('Message not handled'));
  });
}
(async()=>{
  await new Promise(resolve=>setImmediate(resolve));
  const initial=await send({type:'DHL_SCHEDULED_GET'});
  assert.strictEqual(initial.config.enabled,false,'Fresh install must start disabled');
  assert.strictEqual(JSON.stringify(initial).includes('FAKE_TEST_SECRET'),false);
  await assert.rejects(send({type:'DHL_SCHEDULED_CONFIGURE',
    enabled:true,profileIds:[],intervalHours:2,autoPushSapo:true}),/Chọn ít nhất/);
  assert.strictEqual(creates,0);
  await send({type:'DHL_SCHEDULED_CONFIGURE',
    enabled:true,profileIds:['hd','kids'],intervalHours:2,autoPushSapo:true});
  assert.strictEqual(s.dhlAutoSyncConfigV1.autoPushSapo,true);
  assert.ok(alarms.has('dhl-scheduled-stock-cycle'));
  const start=await send({type:'DHL_SCHEDULED_RUN_NOW'});
  assert.strictEqual(start.started,true);
  await nextUntil(()=>s.dhlScheduledStockCycleV1.phase==='scan');
  let cycle=s.dhlScheduledStockCycleV1;
  assert.strictEqual(cycle.currentProfileId,'hd');
  assert.strictEqual(starts,1);
  // Incomplete scan cannot auto-push and never opens the second category.
  s.dhlManualScanJobV2={...s.dhlManualScanJobV2,running:false,status:'done'};
  s.dhlManualPendingStockBatchV1={hd:{jobId:cycle.jobId,autoCycleId:cycle.id,
    auto:true,qualityValidated:false,partial:false,scannedAt:100}};
  await nextUntil(()=>s.dhlScheduledStockCycleV1.phase==='failed');
  assert.strictEqual(autoEnqueues,0);
  assert.strictEqual(creates,1);
  assert.strictEqual(removed,1);
  // Re-run with valid output from BOTH categories.
  const second=await send({type:'DHL_SCHEDULED_RUN_NOW'});
  assert.strictEqual(second.started,true);
  await nextUntil(()=>s.dhlScheduledStockCycleV1.phase==='scan');
  cycle=s.dhlScheduledStockCycleV1;
  for(let i=0;i<2;i++){
    const entry={profileId:cycle.currentProfileId,jobId:cycle.jobId,
      autoCycleId:cycle.id,auto:true,qualityValidated:true,partial:false,scannedAt:200+i,
      rowCount:1};
    s.dhlManualPendingStockBatchV1[entry.profileId]=entry;
    s.dhlManualScanJobV2={...s.dhlManualScanJobV2,running:false,status:'done'};
    if(i===0)await nextUntil(()=>s.dhlScheduledStockCycleV1.phase==='scan'
      &&s.dhlScheduledStockCycleV1.currentProfileId==='kids');
    else await nextUntil(()=>s.dhlScheduledStockCycleV1.phase==='pushing');
    cycle=s.dhlScheduledStockCycleV1;
  }
  assert.strictEqual(autoEnqueues,1);
  assert.strictEqual(cycle.scans.length,2);
  s.dhlSapoPushQueueV1.status='done';
  await nextUntil(()=>s.dhlScheduledStockCycleV1.phase==='done');
  assert.strictEqual(s.dhlScheduledStockCycleV1.running,false);
  assert.strictEqual(removed,3);
  // Disable does not delete manual scan cache or Sapo credentials.
  await send({type:'DHL_SCHEDULED_CONFIGURE',
    enabled:false,profileIds:['hd','kids'],intervalHours:2,autoPushSapo:false});
  assert.strictEqual(alarms.has('dhl-scheduled-stock-cycle'),false);
  assert.strictEqual(s.dhlAutoSyncConfigV1.sapo.apiSecret,'FAKE_TEST_SECRET');
  assert.ok(s.dhlManualPendingStockBatchV1.hd);
  assert.strictEqual((await send({type:'DHL_SCHEDULED_RUN_NOW'})).started,false);
  assert.ok(background.includes("'scheduled-stock-sync-background.js'"));
  assert.ok(popup.includes('scheduled-stock-sync-mode.js'));
  assert.ok(manual.includes('autoCycleId:text(message.autoCycleId)'));
  assert.ok(sapo.includes('enqueueVerifiedAutoCycle'));
  assert.ok(sapo.includes('quality.trustedEntry(entry)'));
  assert.ok(sapo.includes("['manual','auto'].includes(queue.source)"));
  assert.ok(ui.includes('TỰ ĐỘNG QUÉT & ĐẨY SAPO'));
  assert.ok(ui.includes('Tự đẩy Sapo sau khi TẤT CẢ danh mục quét đạt'));
  console.log('SCHEDULED AUTO PASS: opt-in, two saved tabs, all-or-nothing validation, complete Sapo queue, manual preserved');
})().catch(e=>{console.error(e);process.exitCode=1;});