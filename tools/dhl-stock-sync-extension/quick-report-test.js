const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const history=require('./stock-history-core.js');
const matcher=require('./match-core.js');
const bg=read('manual-job-runner-background.js');
const ui=read('batch-stock-cache-mode.js');

function source(parentId,name,color,stocks){
  const sizes=['S','M','L','XL','XXL'];
  return [{
    parentId,
    parentName:name,
    complete:true,
    variants:sizes.map((size,i)=>({
      id:parentId*100+i,
      parentId,
      name:`${name} - ${color} - ${size}`,
      color,
      size,
      sku:`TEST-${size}`,
      available:stocks[i]
    }))
  }];
}

const oldSnap=history.snapshotFromSource(
  source(1,'CLB Test 26-27','Đỏ',[5,4,3,2,1]),
  {profileId:'p1',profileName:'Test',sourceUrl:'https://si.aobongda.net/test',at:1000,matcher}
);
const newSnap=history.snapshotFromSource(
  source(1,'CLB Test 26-27','Đỏ',[7,4,0,3,2]),
  {profileId:'p1',profileName:'Test',sourceUrl:'https://si.aobongda.net/test',at:2000,matcher}
);
const diff=history.compareSnapshots(oldSnap,newSnap);

assert.strictEqual(diff.changed,4);
assert.strictEqual(diff.increased,3);
assert.strictEqual(diff.soldOut,1);
assert.strictEqual(diff.decreased,0);
assert.strictEqual(diff.restocked,0);
assert.strictEqual(diff.net,1);

assert.ok(bg.includes("const HISTORY_KEY='dhlStockScanHistoryV1'"));
assert.ok(bg.includes("const REPORT_KEY='dhlManualStockReportV1'"));
assert.ok(bg.includes('async function buildQuickReport('));
assert.ok(bg.includes('function collectScanIssues('));
assert.ok(bg.includes("push('missing-size'"));
assert.ok(bg.includes("push('missing-color'"));
assert.ok(bg.includes("push('missing-sku'"));
assert.ok(bg.includes("job.scope==='all'"));
assert.ok(bg.includes("job.stopAfterCurrent!==true"));
assert.ok(bg.includes('[HISTORY_KEY]:history,[REPORT_KEY]:reports'));

assert.ok(ui.includes("const REPORT_KEY='dhlManualStockReportV1'"));
assert.ok(ui.includes("const QUEUE_KEY='dhlSapoPushQueueV1'"));
assert.ok(ui.includes('id="stockQuickReports"'));
assert.ok(ui.includes('BÁO CÁO NHANH'));
assert.ok(ui.includes('CHI TIẾT TĂNG / GIẢM'));
assert.ok(ui.includes('BÁO CÁO LỖI'));
assert.ok(ui.includes("source:'QUÉT'"));
assert.ok(ui.includes("source:'SAPO'"));
assert.ok(ui.includes('quick-report-grid'));
assert.ok(!ui.includes('setInterval('),'Báo cáo nhanh không được polling');
assert.ok(!ui.includes('new MutationObserver'),'Báo cáo nhanh không được dùng MutationObserver');

console.log('QUICK REPORT PASS',{
  diff:{
    changed:diff.changed,
    increased:diff.increased,
    soldOut:diff.soldOut,
    net:diff.net
  },
  scanErrors:true,
  sapoErrors:true,
  polling:false
});
