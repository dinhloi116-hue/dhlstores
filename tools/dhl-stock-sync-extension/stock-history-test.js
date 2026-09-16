const assert=require('assert');
const history=require('./stock-history-core.js');

const matcher={
  groupSourceVariants(results){
    const out=[];
    for(const p of results||[]){
      const by=new Map();
      for(const v of p.variants||[]){
        const color=v.color||'';
        if(!by.has(color))by.set(color,[]);
        by.get(color).push(v);
      }
      for(const [color,variants] of by)out.push({parentName:p.parentName,color,variants});
    }
    return out;
  }
};

const day1=history.snapshotFromSource([
  {parentName:'Argentina 2026 HD',variants:[
    {name:'Argentina - Trắng Sọc Xanh - S',color:'Trắng Sọc Xanh',size:'S',available:5},
    {name:'Argentina - Trắng Sọc Xanh - M',color:'Trắng Sọc Xanh',size:'M',available:0},
    {name:'Argentina - Đen - L',color:'Đen',size:'L',available:3}
  ]}
],{profileId:'hd',profileName:'HD',at:1000,matcher});

const day2=history.snapshotFromSource([
  {parentName:'Argentina 2026 HD',variants:[
    {name:'Argentina - Trắng Sọc Xanh - S',color:'Trắng Sọc Xanh',size:'S',available:2},
    {name:'Argentina - Trắng Sọc Xanh - M',color:'Trắng Sọc Xanh',size:'M',available:4},
    {name:'Argentina - Đen - L',color:'Đen',size:'L',available:0},
    {name:'Argentina - Đen - XL',color:'Đen',size:'XL',available:7}
  ]}
],{profileId:'hd',profileName:'HD',at:2000,matcher});

assert.strictEqual(day1.itemCount,3);
assert.strictEqual(day1.totalStock,8);
assert.strictEqual(day2.itemCount,4);
assert.strictEqual(day2.totalStock,13);

const diff=history.compareSnapshots(day1,day2);
assert.strictEqual(diff.changed,4);
assert.strictEqual(diff.decreased,1); // S: 5 -> 2
assert.strictEqual(diff.restocked,1); // M: 0 -> 4
assert.strictEqual(diff.soldOut,1);   // L: 3 -> 0
assert.strictEqual(diff.added,1);     // XL mới
assert.strictEqual(diff.missing,0);
assert.strictEqual(diff.net,5);
assert.strictEqual(diff.oldTotal,8);
assert.strictEqual(diff.newTotal,13);

const noChange=history.compareSnapshots(day2,day2);
assert.strictEqual(noChange.changed,0);
assert.strictEqual(noChange.net,0);

console.log('STOCK HISTORY PASS',{
  day1:day1.totalStock,
  day2:day2.totalStock,
  changed:diff.changed,
  net:diff.net
});
