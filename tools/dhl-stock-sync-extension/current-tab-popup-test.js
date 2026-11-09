const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const bg=fs.readFileSync(__dirname+'/manual-job-runner-background.js','utf8');
const content=fs.readFileSync(__dirname+'/content.js','utf8');
const begin=bg.indexOf('  function sameCategoryPage(currentUrl,originalUrl){');
const end=bg.indexOf('  async function injectScanner(tabId){',begin);
assert.ok(begin>=0&&end>begin,'Current-tab scan helpers missing');
assert.ok(!bg.includes('chrome.windows.create('),'Stock sync must not spawn a scan window');
assert.ok(!bg.includes('chrome.tabs.create('),'Stock sync must not spawn a scan tab');
assert.ok(!bg.includes('chrome.windows.remove('),'Stock sync must not close the user's window');
assert.ok(!bg.includes('chrome.tabs.remove('),'Stock sync must not close the user's tab');
assert.ok(bg.includes("type:'DHL_SCAN_ONE_DESCRIPTOR_POPUP_ONLY'"),'Only real popup scanning is allowed');
assert.ok(content.includes("message.type === 'DHL_SCAN_ONE_DESCRIPTOR_POPUP_ONLY'"));
assert.ok(content.includes('const stale=findStockRoot()'));
assert.ok(content.includes('await closeStockPopup(stale)'));
assert.ok(content.includes('const visiblePopup=findStockRoot()'));
assert.ok(content.includes('await closeStockPopup(visiblePopup)'));
let stateTab={
 id:42,url:'https://si.aobongda.net/hd-pc36029.html',active:true,status:'complete'
};
let stateJob={
 id:'job-1',running:true,status:'queued',sourceTabId:42,
 sourceUrl:'https://si.aobongda.net/hd-pc36029.html',tabId:0,
 ownsWindow:false,ownsTab:false,scanWindowId:0
};
let saved=0,mutationCalls=0;
const chrome={
 tabs:{
   get:async(id)=>{if(id!==42||!stateTab)throw new Error('not found');return stateTab;},
   create:()=>{mutationCalls+=1;throw new Error('must not create tab');},
   remove:()=>{mutationCalls+=1;throw new Error('must not remove tab');}
 },
 windows:{
   create:()=>{mutationCalls+=1;throw new Error('must not create window');},
   remove:()=>{mutationCalls+=1;throw new Error('must not remove window');}
 }
};
const context=vm.createContext({
  chrome,URL,
  isCategoryUrl:(v)=>{try{const u=new URL(v);return u.protocol==='https:'&&u.hostname==='si.aobongda.net';}catch{return false;}},
  readJob:async()=>stateJob,
  saveJob:async()=>{saved+=1;},
  waitTabComplete:async()=>stateTab
});
vm.runInContext(bg.slice(begin,end)+'\nglobalThis.testFns={sameCategoryPage,ensureJobTab,closeJobTab};',context);
const {ensureJobTab,closeJobTab}=context.testFns;
(async()=>{
  const tab=await ensureJobTab(stateJob);
  assert.strictEqual(tab.id,42);
  assert.strictEqual(stateJob.tabId,42,'Runner must use the exact original tab');
  assert.strictEqual(stateJob.ownsTab,false);
  assert.strictEqual(stateJob.ownsWindow,false);
  assert.ok(saved>0);
  await closeJobTab(stateJob);
  assert.strictEqual(stateJob.tabId,0);
  assert.strictEqual(stateTab.id,42,'Closing the job must preserve the original tab');
  assert.strictEqual(mutationCalls,0,'No tab/window mutation allowed');
  stateTab={...stateTab,active:false};
  await assert.rejects(ensureJobTab(stateJob),/Tab nguồn không còn được chọn/);
  stateTab={...stateTab,active:true,url:'https://si.aobongda.net/other-category.html'};
  await assert.rejects(ensureJobTab(stateJob),/chuyển trang hoặc đổi danh mục/);
  stateTab={...stateTab,url:'https://si.aobongda.net/hd-pc36029.html'};
  stateJob={...stateJob,running:false,status:'cancelled'};
  await assert.rejects(ensureJobTab(stateJob),/đã bị hủy/);
  stateJob={...stateJob,running:true,status:'running'};
  stateTab=null;
  await assert.rejects(ensureJobTab(stateJob),/đã bị đóng/);
  assert.strictEqual(mutationCalls,0);
  console.log('CURRENT TAB POPUP REGRESSION PASS: same tab, no window, stop on mismatch, safe close');
})().catch(e=>{console.error(e);process.exitCode=1;});
