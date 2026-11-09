const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const background=fs.readFileSync(__dirname+'/background.js','utf8');
const ui=fs.readFileSync(__dirname+'/tool-reset-mode.js','utf8');
const start=background.indexOf("const PANEL_AUTO_CLEANUP_PORT = ");
const end=background.indexOf('chrome.runtime.onInstalled.addListener',start);
assert.ok(start>=0&&end>start,'Missing Side Panel cleanup hook');
const segment=background.slice(start,end);
assert.ok(ui.includes("panelCleanupPort=chrome.runtime.connect({name:'dhl-stock-sync-panel'})"));
assert.ok(ui.includes("type:'DHL_PANEL_CLOSE_AUTO_CLEANUP'"));
assert.ok(segment.includes('const PANEL_AUTO_CLEANUP_KEYS = []'));
async function runCase(scanStatus){
  const state={
    dhlManualScanJobV2:{running:scanStatus==='running',status:scanStatus,results:[{stock:4}]},
    dhlManualPendingStockBatchV1:{HD:{rows:[{sku:'A-S',stock:4}]}},
    dhlManualStockReportV1:{HD:{issueCount:1}},
    dhlCatalogResults:[{parentId:99}],
    dhlSapoPushQueueV1:{status:'done',success:3},
    dhlSavedStockProfilesV1:[{id:'HD'}],
    dhlStockScanHistoryV1:{HD:[{at:123}]},
    dhlAutoSyncConfigV1:{sapo:{storeHost:'myshop.mysapo.net'}}
  };
  let removed=[],onConnect=null,onMessage=null;
  const chrome={
    storage:{local:{
      get:async(keys)=>Object.fromEntries(keys.map(k=>[k,state[k]])),
      remove:async(keys)=>{removed.push(...keys);keys.forEach(k=>delete state[k]);}
    }},
    runtime:{onConnect:{addListener:f=>{onConnect=f;}},onMessage:{addListener:f=>{onMessage=f;}}}
  };
  const context=vm.createContext({chrome,console});
  vm.runInContext(segment+'\n;globalThis.cleanup=cleanupPanelCloseCache;',context);
  const res=await context.cleanup();
  assert.strictEqual(res.cleared,false,'Closing panel cannot destroy verified stock');
  assert.strictEqual(res.reason,'preserved-until-user-action');
  assert.strictEqual(removed.length,0);
  for(const key of Object.keys(state))assert.ok(state[key]!==undefined,'Data disappeared: '+key);
  assert.ok(onConnect&&onMessage);
}
(async()=>{
  for(const s of ['done','running','paused','output-error','retry-paused'])await runCase(s);
  console.log('PANEL RETENTION PASS: closing panel does not erase scan or Sapo data');
})().catch(e=>{console.error(e);process.exitCode=1;});
