const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const source=fs.readFileSync('manual-sapo-background.js','utf8');

function jsonResponse(status,data){
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
}

async function main(){
  const state={
    dhlSapoPushQueueV1:{
      id:'test',source:'manual',manualPaused:false,status:'running',
      host:'demo.mysapo.net',locationId:1,locationName:'Kho',
      rows:[
        {sku:'SKU-S',variantId:1,productId:11,stock:5},
        {sku:'SKU-M',variantId:2,productId:12,stock:6},
        {sku:'SKU-L',variantId:3,productId:13,stock:7}
      ],
      index:0,total:3,success:0,successRows:[],errors:[],startedAt:Date.now()
    },
    dhlSapoInventoryMapV1:{},
    dhlAutoSyncConfigV1:{sapo:{verifiedAt:Date.now(),locationId:1,locationName:'Kho',storeHost:'demo.mysapo.net',apiKey:'k',apiSecret:'s'}}
  };

  let alarmListener=null;
  const chrome={
    storage:{
      local:{
        async get(keys){
          if(typeof keys==='string')return{[keys]:state[keys]};
          const out={};
          for(const key of (Array.isArray(keys)?keys:Object.keys(keys||{})))out[key]=state[key];
          return out;
        },
        async set(values){Object.assign(state,values);},
        async remove(key){for(const k of (Array.isArray(key)?key:[key]))delete state[k];}
      }
    },
    alarms:{
      onAlarm:{addListener(fn){alarmListener=fn;}},
      async clear(){return true;},
      create(){}
    },
    runtime:{onMessage:{addListener(){}}}
  };

  const context={
    console,chrome,Response,URL,URLSearchParams,Promise,Date,Math,
    btoa:(s)=>Buffer.from(s).toString('base64'),
    setTimeout:(fn)=>{queueMicrotask(fn);return 1;},
    clearTimeout(){},
    fetch:async(url,init={})=>{
      const s=String(url);
      if(s.includes('/admin/inventory_items.json?')){
        const u=new URL(s);
        const variantId=Number(u.searchParams.get('variant_id')||0);
        return jsonResponse(200,{inventory_items:[{id:100+variantId,variant_id:variantId,product_id:10+variantId,sku:['','SKU-S','SKU-M','SKU-L'][variantId]}]});
      }
      const write=s.match(/\/admin\/inventory_items\/(\d+)\/locations\/1\.json/);
      if(write){
        const itemId=Number(write[1]);
        if(itemId===102)return jsonResponse(422,{error:'bad row'});
        return jsonResponse(200,{inventory_level:{available:5}});
      }
      return jsonResponse(404,{error:'unexpected '+s});
    }
  };
  context.globalThis=context;
  context.DHLAutoSyncCore={normalizeConfig:(x)=>x||{}};
  context.DHLBatchStockCore={};
  context.DHLSapoInventoryResolver={
    normSku:(v)=>String(v||'').trim().toUpperCase(),
    inventoryCandidates:(data)=>Array.isArray(data&&data.inventory_items)?data.inventory_items:[],
    findCandidate:(list,row)=>list.find(x=>Number(x.variant_id)===Number(row.variantId))||null,
    variantInventoryItemId:()=>0
  };

  vm.createContext(context);
  vm.runInContext(source,context,{filename:'manual-sapo-background.js'});
  assert(alarmListener,'manual alarm listener must register');

  alarmListener({name:'dhl-sapo-manual-push-queue'});
  for(let i=0;i<30;i++)await new Promise(r=>setImmediate(r));

  const q=state.dhlSapoPushQueueV1;
  assert.strictEqual(q.index,3,'one bad SKU must not stop later SKUs');
  assert.strictEqual(q.success,2,'two good SKUs should be pushed');
  assert.strictEqual(q.errors.length,1,'bad SKU should be recorded once');
  assert.strictEqual(q.manualPaused,false,'row-level error must not pause the whole queue');
  assert.ok(['done','done-with-errors'].includes(q.status),'queue should finish after all rows are attempted');

  const chunk=Number((source.match(/const PUSH_CHUNK=(\d+)/)||[])[1]||0);
  assert.ok(chunk>=10,'push chunk should be at least 10 rows for practical speed');

  const processBody=(source.match(/async function processManualQueue\(\)\{([\s\S]*?)\n  \}\n\n  async function cancelManualPush/)||[])[1]||'';
  assert.ok(!/await sleep\(/.test(processBody),'manual push must not add fixed sleeps between SKUs');

  console.log('manual Sapo queue regression tests: OK');
}

main().catch(err=>{console.error(err);process.exit(1);});
