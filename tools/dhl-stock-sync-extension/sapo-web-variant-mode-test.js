const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const source=fs.readFileSync(__dirname+'/manual-sapo-background.js','utf8');
const ui=fs.readFileSync(__dirname+'/manual-sapo-output-mode.js','utf8');
const core=require('./sapo-inventory-resolver-core.js');
const config={sapo:{storeHost:'dhl-sport.mysapo.net',apiKey:'fake-key',apiSecret:'fake-secret',
  locationId:12,verifiedAt:123,locationName:'dhl sport'},autoPushSapo:true};
const rows={one:{id:111,sku:'HD-S',inventory_management:'bizweb',inventory_quantity:3},
  two:{id:222,sku:'HD-M',inventory_management:'bizweb',inventory_quantity:0},
  three:{id:333,sku:'HD-M',inventory_management:'bizweb',inventory_quantity:9}};
let storage={config,queue:null,pending:{HD:{rows:[{sku:'HD-S',stock:4}]}}},
  urls=[],writes=[],removed=[];
const text=v=>String(v==null?'':v).trim();
const storeHost=v=>text(v).replace(/^https?:\/\//i,'').split('/')[0].toLowerCase();
const fakeApi=async(sapo,path,options={})=>{
  urls.push({path,method:options.method||'GET'});
  if(path==='/admin/store.json')return {store:{name:'dhl sport'}};
  if(path==='/admin/products.json?limit=1')return {products:[{id:10}]};
  if(path.startsWith('/admin/products.json?')){
    return {products:[{id:1,variants:[rows.one,rows.two,rows.three]}]};
  }
  const match=path.match(/^\/admin\/variants\/(\d+)\.json$/);
  if(!match)throw Error('Unknown mock endpoint '+path);
  const id=Number(match[1]),v=Object.values(rows).find(x=>x.id===id);
  if(!v)throw Error('Variant not found');
  if(options.method==='PUT'){
    writes.push(options.body);
    v.inventory_quantity=options.body.variant.inventory_quantity;
  }
  return {variant:{...v}};
};
const main={
  CONFIG_KEY:'config',PREVIEW_KEY:'preview',SAPO_QUEUE_KEY:'queue',
  text,storeHost,authHeaders:s=>{if(!s.apiKey||!s.apiSecret)throw Error('Credentials missing');},
  readConfig:async()=>storage.config,sapoFetch:fakeApi,
  chrome:{storage:{local:{
    get:async k=>({[k]:storage[k]}),
    set:async v=>{if(v.config)storage.config=v.config;},
    remove:async k=>removed.push(k)
  }}},
  Date,Number,Array,Object,Error
};
vm.createContext(main);
const start=source.indexOf('  async function connectSapoWeb(request){');
const end=source.indexOf('  async function ensureVerifiedSapo(config){',start);
assert.ok(start>=0&&end>start);
vm.runInContext(source.slice(start,end)+'\nglobalThis.connectWeb=connectSapoWeb;',main);

const compat={
  text,storeHost,sapoFetch:fakeApi,resolver:core,
  variantFrom:d=>d&&d.variant||null,
  MAX_LIST_PAGES:12,LIST_PAGE_LIMIT:250,
  URLSearchParams,Map,Number,String,Array,Object,Error,Date
};
vm.createContext(compat);
const variantsStart=source.indexOf('  let webVariantIndexCache=null');
const variantsEnd=source.indexOf('  function selectedPendingEntries(',variantsStart);
assert.ok(variantsStart>=0&&variantsEnd>variantsStart);
vm.runInContext(source.slice(variantsStart,variantsEnd)
  +'\nglobalThis.resolve=resolveWebVariant;\nglobalThis.write=writeWebVariantStock;',compat);

(async()=>{
  await assert.rejects(main.connectWeb({storeHost:'dhl-sport.mysapo.net'}),/Phải xác nhận/);
  assert.strictEqual(storage.config.sapo.locationId,12);
  storage.queue={status:'running'};
  await assert.rejects(main.connectWeb({webTotalConfirmed:true}),/Đang có lượt ghi/);
  storage.queue=null;
  const c=await main.connectWeb({storeHost:'dhl-sport.mysapo.net',webTotalConfirmed:true});
  assert.strictEqual(c.connected,true);
  assert.strictEqual(c.webTotal,true);
  assert.strictEqual(storage.config.sapo.locationId,-1);
  assert.strictEqual(storage.config.sapo.syncMode,'web-total');
  assert.ok(storage.config.sapo.verifiedAt>0);
  assert.strictEqual(storage.config.autoPushSapo,false);
  assert.ok(storage.pending.HD.rows.length===1);
  assert.deepStrictEqual(removed,['preview']);
  assert.deepStrictEqual(urls.slice(0,2).map(x=>x.path),
    ['/admin/store.json','/admin/products.json?limit=1']);
  assert.ok(!JSON.stringify(c).includes('fake-secret'));
  const sapo=storage.config.sapo;
  let resolved=await compat.resolve(sapo,{sku:'HD-S',variantId:111});
  assert.strictEqual(resolved.variantId,111);
  await assert.rejects(compat.resolve(sapo,{sku:'HD-M'}),/SKU trùng/);
  await assert.rejects(compat.resolve(sapo,{sku:'OTHER'}),/Không tìm thấy/);
  await assert.rejects(compat.resolve(sapo,{sku:'WRONG',variantId:111}),/không khớp/);
  assert.strictEqual(writes.length,0);
  await compat.write(sapo,{sku:'HD-S',stock:0},resolved);
  assert.strictEqual(writes.length,1);
  assert.strictEqual(JSON.stringify(writes[0]),JSON.stringify({variant:{id:111,inventory_quantity:0}}));
  assert.strictEqual(rows.one.inventory_quantity,0);
  await assert.rejects(compat.write(sapo,{sku:'HD-S',stock:-1},resolved),/không hợp lệ/);
  assert.strictEqual(writes.length,1);
  assert.ok(source.includes("sapo.syncMode==='web-total'"));
  assert.ok(ui.includes('manualSapoWebTotalMode'));
  assert.ok(ui.includes("type:useWebTotal?'DHL_SAPO_CONNECT_WEB':'DHL_SAPO_CONNECT'"));
  assert.ok(ui.includes("()=>connectSapo('web-total')"));
  assert.ok(ui.includes("()=>connectSapo('location')"));
  console.log('SAPO WEB VARIANT MODE PASS: explicit aggregate opt-in, exact SKU, duplicate blocker, verified zero stock, manual-only');
})().catch(e=>{console.error(e);process.exitCode=1;});