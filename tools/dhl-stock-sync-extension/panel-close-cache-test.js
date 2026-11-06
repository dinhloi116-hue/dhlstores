const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const background=fs.readFileSync(__dirname+'/background.js','utf8');
const ui=fs.readFileSync(__dirname+'/tool-reset-mode.js','utf8');
const start=background.indexOf("const PANEL_AUTO_CLEANUP_PORT = ");
const end=background.indexOf('chrome.runtime.onInstalled.addListener',start);
assert.ok(start>=0&&end>start,'Không tìm thấy đoạn tự dọn trong background');
const cleanupCode=background.slice(start,end);
assert.ok(ui.includes("panelCleanupPort=chrome.runtime.connect({name:'dhl-stock-sync-panel'})"));
assert.ok(ui.includes("type:'DHL_PANEL_CLOSE_AUTO_CLEANUP'"));
assert.ok(ui.includes("window.addEventListener('pagehide'"));

async function runCase(override,expectedCleared){
  const state={
    dhlManualScanJobV2:{running:false,status:'done',results:[{stock:4}]},
    dhlManualPendingStockBatchV1:{HD:{rows:[{sku:'A-S',stock:4}]}},
    dhlManualStockReportV1:{HD:{issueCount:1}},
    dhlCatalogResults:[{parentId:99}],
    dhlSapoPushQueueV1:{status:'done',success:3},
    dhlSapoProductCreateQueueV1:{status:'done'},
    dhlSavedStockProfilesV1:[{id:'HD',lastSourceUrl:'https://si.aobongda.net/hd'}],
    dhlStockScanHistoryV1:{HD:[{at:123}]},
    dhlAutoSyncConfigV1:{sapo:{storeHost:'myshop.mysapo.net'}},
    dhlSapoInventoryMapV1:{'ABC':123},
    ...override
  };
  let onConnect=null,onMessage=null,removed=[];
  const chrome={
    storage:{local:{
      get:async(keys)=>Object.fromEntries(keys.map(k=>[k,state[k]])),
      remove:async(keys)=>{
        removed=removed.concat(keys);
        keys.forEach(k=>delete state[k]);
      }
    }},
    runtime:{
      onConnect:{addListener(f){onConnect=f}},
      onMessage:{addListener(f){onMessage=f}}
    }
  };
  const scope=vm.createContext({chrome,console});
  vm.runInContext(cleanupCode+'\n;globalThis.cleanup=cleanupPanelCloseCache;',scope);
  const result=await scope.cleanup();
  assert.strictEqual(result.cleared,expectedCleared,'Sai điều kiện xóa cache');
  assert.ok(onConnect&&onMessage,'Thiếu sự kiện đóng Side Panel');
  assert.ok(state.dhlSavedStockProfilesV1,'Không được xóa hồ sơ');
  assert.ok(state.dhlStockScanHistoryV1,'Không được xóa lịch sử tồn');
  assert.ok(state.dhlAutoSyncConfigV1.sapo,'Không được xóa kết nối Sapo');
  assert.ok(state.dhlSapoInventoryMapV1,'Không được xóa mapping Sapo');
  if(expectedCleared){
    for(const key of ['dhlManualScanJobV2','dhlManualPendingStockBatchV1','dhlCatalogResults',
                       'dhlManualStockReportV1','dhlSapoPushQueueV1','dhlSapoProductCreateQueueV1']){
      assert.strictEqual(state[key],undefined,'Vẫn còn cache cũ: '+key);
    }
  }else{
    assert.strictEqual(removed.length,0,'Không được xóa cache khi còn tác vụ');
  }
  return{result,removed:removed.length};
}

(async()=>{
  await runCase({},true);
  await runCase({dhlManualScanJobV2:{running:true,status:'running'}},false);
  await runCase({dhlManualScanJobV2:{running:false,status:'paused'}},false);
  await runCase({dhlManualScanJobV2:{running:true,status:'queued'}},false);
  await runCase({dhlSapoPushQueueV1:{status:'running',manualPaused:false}},false);
  await runCase({dhlSapoProductCreateQueueV1:{status:'paused'}},false);
  await runCase({dhlSapoProductCreateQueueV1:{status:'running'}},false);
  await runCase({dhlManualScanJobV2:{running:false,status:'output-error'}},true);
  console.log('PANEL CLOSE CACHE PASS: stale data cleared; running/paused work and persistent settings preserved');
})().catch(error=>{console.error(error);process.exit(1)});
