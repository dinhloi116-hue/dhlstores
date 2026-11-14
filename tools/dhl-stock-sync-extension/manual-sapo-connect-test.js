const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync(__dirname+'/manual-sapo-background.js','utf8');
const ui=fs.readFileSync(__dirname+'/manual-sapo-output-mode.js','utf8');
const start=src.indexOf('  async function connectSapo(request){');
const end=src.indexOf('  async function ensureVerifiedSapo(config){',start);
assert.ok(start>=0&&end>start);
const old={sapo:{storeHost:'old.mysapo.net',excelLocationName:'dhl sport',apiKey:'old',apiSecret:'old-secret',verifiedAt:998,locationId:4},autoPushSapo:true};
let stored=JSON.parse(JSON.stringify(old)),writes=[],removed=[];
const locations=[{id:11,name:'Kho phụ'},{id:12,name:'dhl sport'}];
const ctx={
  CONFIG_KEY:'dhlAutoSyncConfigV1',PREVIEW_KEY:'dhlSapoManualPreviewV1',
  text:v=>String(v==null?'':v).trim(),storeHost:v=>String(v).trim().toLowerCase(),
  authHeaders:v=>{if(!v.apiKey||!v.apiSecret)throw Error('missing credentials');return{};},
  readConfig:async()=>stored,
  sapoFetch:async(sapo,path)=>{
    if(!sapo.apiKey||!sapo.apiSecret)throw Error('missing credentials');
    if(path==='/admin/store.json')return{store:{name:'Shop'}};
    if(path==='/admin/locations.json')return{locations};
    throw Error('unexpected API');
  },
  chrome:{storage:{local:{
    set:async obj=>{writes.push(obj.dhlAutoSyncConfigV1);stored=obj.dhlAutoSyncConfigV1;},
    remove:async key=>removed.push(key)
  }}},
  Number,Date,String,Array,Object,Error
};
vm.createContext(ctx);
vm.runInContext(src.slice(start,end)+'\nglobalThis.connect=connectSapo;',ctx);
(async()=>{
 let result=await ctx.connect({storeHost:'new.mysapo.net',apiKey:'test-key',apiSecret:'test-secret'});
 assert.strictEqual(result.connected,true);
 assert.strictEqual(result.locationName,'dhl sport');
 assert.strictEqual(writes.length,2,'Unverified credentials must be written before verified location');
 assert.strictEqual(writes[0].sapo.verifiedAt,0);
 assert.strictEqual(writes[0].sapo.locationId,0);
 assert.strictEqual(writes[1].sapo.locationId,12);
 assert.ok(writes[1].sapo.verifiedAt>0);
 assert.strictEqual(stored.autoPushSapo,false);
 assert.strictEqual(removed[0],'dhlSapoManualPreviewV1');
 // No credentials should leak back into the connection response.
 assert.strictEqual(JSON.stringify(result).includes('test-secret'),false);
 stored={sapo:{storeHost:'new.mysapo.net',excelLocationName:'Không trùng',apiKey:'test-key',apiSecret:'test-secret'}};
 writes=[];
 result=await ctx.connect({storeHost:'new.mysapo.net'});
 assert.strictEqual(result.needsLocation,true);
 assert.strictEqual(writes.length,0,'Multi-warehouse choice must not silently select first');
 result=await ctx.connect({storeHost:'new.mysapo.net',locationId:11});
 assert.strictEqual(result.locationId,11);
 assert.strictEqual(stored.sapo.locationName,'Kho phụ');
 assert.ok(ui.includes('KẾT NỐI / ĐỔI KHO SAPO'));
 assert.ok(ui.includes("type:'DHL_SAPO_CONNECT'"));
 assert.ok(ui.includes('autocomplete="new-password"'));
 assert.ok(src.includes("message.type==='DHL_SAPO_CONNECT'"));
 assert.ok(ui.includes('Sapo Web → Ứng dụng → Ứng dụng riêng'));
 // Exercise the real HTTP failure formatter without live credentials.
 const httpStart=src.indexOf('  function storeHost(value){');
 const httpEnd=src.indexOf('  // Connection is an explicit user action.',httpStart);
 assert.ok(httpStart>=0&&httpEnd>httpStart);
 let calledUrl='',calledAuthorization='';
 const httpCtx={
   text:v=>String(v==null?'':v).trim(),
   btoa:v=>Buffer.from(v,'binary').toString('base64'),
   fetch:async(url,opts)=>{
     calledUrl=url;
     calledAuthorization=opts.headers.Authorization;
     return{ok:false,status:401,text:async()=>JSON.stringify({error:'invalid_request'})};
   },
   String,Error,JSON,RegExp
 };
 vm.createContext(httpCtx);
 vm.runInContext(src.slice(httpStart,httpEnd)+'\\nglobalThis.testFetch=sapoFetch;',httpCtx);
 const sample={storeHost:'https://dhl-sport.mysapo.net/',apiKey:'FAKE_API_KEY',apiSecret:'FAKE_API_SECRET'};
 await assert.rejects(httpCtx.testFetch(sample,'/admin/store.json'),error=>{
   assert.ok(/HTTP 401 \\(invalid_request\\)/.test(error.message));
   assert.ok(error.message.includes('/admin/store.json'));
   assert.ok(error.message.includes('ỨNG DỤNG RIÊNG'));
   assert.ok(!error.message.includes('FAKE_API_KEY'));
   assert.ok(!error.message.includes('FAKE_API_SECRET'));
   return true;
 });
 assert.strictEqual(calledUrl,'https://dhl-sport.mysapo.net/admin/store.json');
 assert.strictEqual(calledAuthorization,'Basic '+Buffer.from('FAKE_API_KEY:FAKE_API_SECRET').toString('base64'));
 console.log('SAPO CONNECT PASS: warehouse verification and safe, actionable HTTP 401 diagnostics');
})().catch(e=>{console.error(e);process.exitCode=1;});
