const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const source=fs.readFileSync(__dirname+'/tool-reset-mode.js','utf8');
let created=0,readErrors=0,connected=[],timeouts=[],pageHide=null,disconnectHandlers=[],sent=0;
const runtime={
  connect:({name})=>{
    assert.strictEqual(name,'dhl-stock-sync-panel');
    created++;
    const port={
      onDisconnect:{addListener:fn=>disconnectHandlers.push(fn)}
    };
    connected.push(port);
    return port;
  },
  sendMessage:()=>{sent++;return Promise.resolve({cleared:false});}
};
let errorValue=null;
Object.defineProperty(runtime,'lastError',{get(){readErrors++;return errorValue;}});
const elements={};
const doc={
  getElementById:id=>elements[id]||null,
  querySelector:()=>null
};
const sandbox={
  chrome:{
    runtime,
    storage:{local:{remove:async()=>{throw Error('no storage changes expected');}}},
    alarms:{clear:async()=>true}
  },
  document:doc,
  window:{addEventListener:(name,fn)=>{if(name==='pagehide')pageHide=fn;}},
  setTimeout:(fn,ms)=>{timeouts.push({fn,ms});return timeouts.length;},
  clearTimeout:id=>{const timer=timeouts[id-1];if(timer)timer.cancelled=true;},
  confirm:()=>false,
  location:{reload:()=>{throw Error('must not reload without explicit action');}},
  console
};
vm.runInNewContext(source,sandbox);
assert.strictEqual(created,1,'Side panel must establish one port');
assert.strictEqual(disconnectHandlers.length,1);
assert.strictEqual(typeof pageHide,'function');
errorValue={message:'Could not establish connection. Receiving end does not exist.'};
disconnectHandlers[0]();
assert.strictEqual(readErrors,1,'Chrome runtime.lastError must be consumed inside onDisconnect');
assert.strictEqual(timeouts.length,1,'Transient receiver error should schedule reconnect');
timeouts[0].fn();
assert.strictEqual(created,2);
disconnectHandlers[1]();
timeouts[1].fn();
assert.strictEqual(created,3);
disconnectHandlers[2]();
assert.strictEqual(timeouts.length,2,'Reconnect must be bounded; never loop forever');
pageHide();
assert.strictEqual(sent,1,'A closing panel still reports closure once');
assert.strictEqual(timeouts.length,2,'Page close must not schedule new reconnects');
assert.strictEqual(timeouts[1].cancelled,true,'The outstanding reconnect timer must be canceled on close');
assert.strictEqual(typeof elements.resetToolBtn,'undefined');
console.log('PANEL CONNECTION PASS: lastError consumed; bounded reconnect; no cache reset.');
