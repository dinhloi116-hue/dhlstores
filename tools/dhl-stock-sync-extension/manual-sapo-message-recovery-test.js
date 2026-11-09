const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync(__dirname+'/manual-sapo-output-mode.js','utf8');
const start=src.indexOf('  async function send(message){');
const end=src.indexOf('  async function readState(){',start);
assert.ok(start>=0&&end>start,'Promise message handler is missing');
const snippet=src.slice(start,end);
assert.ok(!snippet.includes('chrome.runtime.lastError'),'Do not rely on unchecked callback lastError');
assert.ok(!snippet.includes('new Promise'),'Use native MV3 Promise messaging');
assert.ok(src.includes('!rebuildAttempted'),'Only one automatic recovery per Side Panel cache-missing state');
assert.ok(src.includes("rebuildAttempted=true;"),'Rebuild must record that it was attempted');
assert.ok(src.includes("}else if(!count&&rebuildReceiverError){"),'Connection failure must be visible');
assert.ok(src.includes("s.exportEntries.length){\n      rebuildAttempted=false;"),'Successful output must allow subsequent state recovery');
let calls=0;
const context=vm.createContext({
  chrome:{runtime:{sendMessage:async(message,...args)=>{
    calls++;
    assert.strictEqual(args.length,0,'Never pass a callback to Chrome sendMessage');
    assert.strictEqual(message.type,'DHL_MANUAL_JOB_REBUILD_OUTPUT');
    throw Error('Could not establish connection. Receiving end does not exist.');
  }}},
  Error,String
});
vm.runInContext(snippet+'\nglobalThis.send=send;',context);
(async()=>{
  await assert.rejects(context.send({type:'DHL_MANUAL_JOB_REBUILD_OUTPUT'}),error=>{
    assert.ok(/Không kết nối được tiến trình nền/.test(error.message));
    return true;
  });
  assert.strictEqual(calls,1);
  context.chrome.runtime.sendMessage=async()=>({ok:true,entry:{id:'HD'}});
  const response=await context.send({type:'DHL_MANUAL_JOB_REBUILD_OUTPUT'});
  assert.strictEqual(response.ok,true);
  context.chrome.runtime.sendMessage=async()=>undefined;
  await assert.rejects(context.send({type:'DHL_MANUAL_JOB_REBUILD_OUTPUT'}),/Background chưa phản hồi/);
  context.chrome.runtime.sendMessage=async()=>{throw Error('Unrelated fatal error');};
  await assert.rejects(context.send({type:'DHL_MANUAL_JOB_REBUILD_OUTPUT'}),/Unrelated fatal error/);
  console.log('MANUAL SAPO MESSAGE PASS: missing receiver handled, recovery bounded, background errors preserved.');
})().catch(error=>{console.error(error);process.exitCode=1;});
