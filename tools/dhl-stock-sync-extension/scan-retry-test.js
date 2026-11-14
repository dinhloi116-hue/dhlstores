const fs=require('fs');
const assert=require('assert');
const path=require('path');
const retry=require('./scan-retry-core.js');
const src=fs.readFileSync(path.join(__dirname,'manual-job-runner-background.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'manual-job-runner-mode.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const bg=fs.readFileSync(path.join(__dirname,'background.js'),'utf8');

const complete=(id)=>({parentId:id,complete:true,variants:[{size:'S',available:3}],errors:[],domDiagnostics:{missingSizes:[],missingColorHints:[],unverifiedColors:[]}});
const incomplete=(id)=>({parentId:id,complete:false,variants:[{size:'S',available:3}],domDiagnostics:{missingSizes:['M'],unverifiedColors:['Trắng']}});
const empty=(id)=>({parentId:id,complete:false,variants:[],errors:[{message:'popup error'}]});
const old=[complete(1),incomplete(2),empty(3),complete(4)];
assert.deepStrictEqual(retry.incompleteIndexes(old,4),[1,2],'Only incomplete products should be retried');
assert.strictEqual(retry.verified(complete(1)),true);
assert.strictEqual(retry.verified({...complete(1),domDiagnostics:{unverifiedColors:['Đỏ']}}),false);
assert.strictEqual(retry.verified({...complete(1),errors:[{message:'bad'}]}),false);
let job={total:4,results:old.slice(),retryPass:0};
let plan=retry.planNextPass(job);
assert.deepStrictEqual(plan,{status:'retry',pass:1,remaining:[1,2]});
job.retryPass=plan.pass;
const oldSuccessful=job.results[0];
job.results[1]=retry.preferResult(job.results[1],complete(2));
job.results[2]=retry.preferResult(job.results[2],empty(3));
assert.strictEqual(job.results[0],oldSuccessful,'Successful product must be preserved by identity');
assert.strictEqual(job.results[1].complete,true,'Successful retry must replace previous partial');
plan=retry.planNextPass(job);
assert.deepStrictEqual(plan,{status:'retry',pass:2,remaining:[2]});
const fewer=retry.preferResult(incomplete(3),empty(3));
assert.strictEqual(fewer.complete,false,'Partial must not be promoted to complete');
assert.strictEqual(fewer.variants.length,1,'Better partial result is kept as partial, never merged');
job.results[2]=retry.preferResult(job.results[2],complete(3));
assert.deepStrictEqual(retry.planNextPass(job),{status:'complete',remaining:[]});
job.results[2]=empty(3);
job.retryPass=retry.MAX_AUTOMATIC_PASSES;
assert.deepStrictEqual(retry.planNextPass(job),{status:'paused',remaining:[2]});
assert.strictEqual(retry.MAX_AUTOMATIC_PASSES,4);

for(const fragment of [
  'retryCore.incompleteIndexes(job.results,job.total)',
  'job.results[resultIndex]=retryCore.preferResult(job.results[resultIndex],result)',
  'job.retryCursor=Number(job.retryCursor||0)+1',
  'job.retryPass=next.pass',
  "await finalize(job,'retry-paused')",
  "if(!job||!['paused','retry-paused','done','output-error'].includes(job.status))",
  "job.errors=job.errors.filter(err=>Number(err&&err.id)!==Number(descriptor&&descriptor.id))",
  'if(!retrying&&job.index<=3&&job.consecutiveEmpty>=3)',
  'scheduleNext(RETRY_COOLDOWN_MS)',
  'job.retryQueue=remaining'
]){
  assert.ok(src.includes(fragment),'Missing retry protection: '+fragment);
}
assert.ok(ui.includes('QUÉT LẠI MẪU LỖI'),'Retry button missing');
assert.ok(ui.includes("['done','output-error'].includes(job.status)&&unfinished"),'Old incomplete completed jobs must be resumable');
assert.ok(src.includes('job.retryQueue=remaining'),'Must resume only failed product indices');
assert.ok(ui.includes("job.status==='retrying'"),'Retry progress missing');
assert.ok(bg.includes("'scan-retry-core.js'"),'Background must preload retry core');
assert.strictEqual(manifest.version,'0.26.1');
console.log('INCOMPLETE PRODUCT RETRY PASS: preserve good results, retry bad products, pause safely and resume');
