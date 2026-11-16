const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync(__dirname+'/content.js','utf8');
const start=src.indexOf('  async function switchColorAndRead(');
const end=src.indexOf('  function productAnchors(',start);
assert.ok(start>=0&&end>start,'Cannot isolate color scan logic');
const snippet=src.slice(start,end);
async function runCase({rows,selected,previousSignature='',expected,deadline,shouldHaveRows}){
  let now=0,clicks=0,confirmations=0;
  const context={
    Date:{now:()=>now},
    sleep:async(n)=>{now+=n;},
    assertPopupScanActive:()=>{},
    findStockRoot:()=>({}),
    findColorControl:()=>({el:{}}),
    isSelectedColor:()=>selected,
    clickElement:async()=>{clicks++;},
    readTargetRows:()=>rows,
    rowsSignature:x=>JSON.stringify(x.map(v=>[v.size,v.stock])),
    hasAllTargetRows:(x,w)=>x.length===w.length&&w.every(k=>x.some(r=>r.size===k)),
    stableTargetRows:async(root,w)=>{confirmations++;now+=120;return rows;}
  };
  vm.runInNewContext(snippet+';globalThis.scanColor=switchColorAndRead;',context);
  const result=await context.scanColor('Blue',{},expected,previousSignature,0);
  assert.strictEqual(Boolean(result.length),shouldHaveRows,'Unsafe color data assignment');
  assert.ok(now<=deadline,'Excessive stable-read time: '+now+'ms');
  return {time:now,clicks,confirmations};
}
(async()=>{
 const partial=await runCase({
   rows:[{size:'S',stock:4}],selected:true,expected:['S','M','L'],
   deadline:1100,shouldHaveRows:true
 });
 assert.ok(partial.time>=850,'Partial rows must be stable before early return');
 const complete=await runCase({
   rows:[{size:'S',stock:4},{size:'M',stock:0}],selected:true,
   expected:['S','M'],deadline:500,shouldHaveRows:true
 });
 assert.ok(complete.confirmations>0,'Full rows must be stable-verified');
 const unsafe=await runCase({
   rows:[{size:'S',stock:10}],selected:false,
   expected:['S','M'],previousSignature:'[["S",10]]',deadline:6700,shouldHaveRows:false
 });
 assert.strictEqual(unsafe.confirmations,0);
 console.log('ADAPTIVE POPUP TIMING PASS',partial,complete,unsafe);
})().catch(e=>{console.error(e);process.exitCode=1;});
