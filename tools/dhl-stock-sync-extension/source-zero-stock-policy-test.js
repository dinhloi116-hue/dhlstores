const assert=require('assert');

const store={};
global.chrome={
  storage:{
    local:{
      async get(key){
        if(Array.isArray(key)){
          const out={}; for(const k of key)out[k]=store[k]; return out;
        }
        return {[key]:store[key]};
      },
      async set(obj){Object.assign(store,obj);}
    }
  }
};

require('./source-zero-stock-policy.js');
const policy=global.DHLSourceZeroStockPolicy;
assert.ok(policy);

(async()=>{
  const id=12345;
  store.dhlSourceZeroStockPolicyV1={
    [id]:{
      parentId:id,
      name:'TEST SP',
      zeroDays:[
        '2026-09-01','2026-09-02','2026-09-03','2026-09-04','2026-09-05',
        '2026-09-06','2026-09-07','2026-09-08','2026-09-09'
      ],
      suppressed:false
    }
  };

  const zero=[{
    parentId:id,parentName:'TEST SP',
    variants:[
      {size:'S',available:0},
      {size:'M',available:0}
    ]
  }];

  const r10=await policy.applyScan(zero);
  assert.strictEqual(r10.newlySuppressed.length,1,'Ngày zero thứ 10 phải đưa sản phẩm vào ngủ');
  assert.strictEqual((await policy.suppressedIds())[0],id);
  assert.strictEqual(policy.filterForOutput(zero,[id]).length,0,'Sản phẩm đang ngủ phải bị loại khỏi output');

  const positive=[{
    parentId:id,parentName:'TEST SP',
    variants:[
      {size:'S',available:0},
      {size:'M',available:2}
    ]
  }];
  const revive=await policy.applyScan(positive);
  assert.strictEqual(revive.revived.length,1,'Có tồn trở lại phải tự kích hoạt');
  assert.deepStrictEqual(await policy.suppressedIds(),[]);
  assert.strictEqual(policy.filterForOutput(positive,[id]).length,1,'Sản phẩm có hàng lại phải quay về output');

  console.log('SOURCE ZERO STOCK POLICY PASS',{
    zeroDays:10,
    suppressNextScan:true,
    quickProbeExpected:true,
    autoReactivate:true
  });
})().catch(err=>{console.error(err);process.exit(1);});
