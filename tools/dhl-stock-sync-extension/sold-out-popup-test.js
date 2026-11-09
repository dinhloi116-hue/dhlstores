const fs=require('fs');
const assert=require('assert');
const vm=require('vm');
const parser=require('./dom-stock-parser.js');
const quality=require('./scan-quality-core.js');
const retry=require('./scan-retry-core.js');
const source=fs.readFileSync(__dirname+'/content.js','utf8');
const start=source.indexOf('  function hasAllTargetRows(rows, targetSizes) {');
const end=source.indexOf('  async function stableTargetRows(',start);
const scanStart=source.indexOf('  async function switchColorAndRead(');
const scanEnd=source.indexOf('  function productAnchors(',scanStart);
assert.ok(start>=0&&end>start&&scanStart>=0&&scanEnd>scanStart);
const sizes=['S','M','L','XL','XXL'];
const columns=parser.inventoryColumns(['Tên size','Tình trạng tồn','Số lượng muốn đặt']);
const zero=sizes.map(size=>parser.inventoryRowFromCells([size,'Hết hàng','0'],columns));
assert.deepStrictEqual(zero.map(row=>row.stock),[0,0,0,0,0]);
assert.ok(zero.every(row=>Number.isSafeInteger(row.stock)));
assert.strictEqual(parser.inventoryRowFromCells(['S','Còn hàng (0)','0'],columns).stock,0);
assert.strictEqual(parser.inventoryRowFromCells(['S','Đang tải...','0'],columns).stock,null);
assert.strictEqual(parser.extractStock('Hết hàng'),0);
assert.strictEqual(quality.rowValid({sku:'KEM-S',stock:0}),true,'SKU with 0 stock is valid');
assert.strictEqual(quality.rowValid({sku:'KEM-S',stock:null}),false,'Unknown stock must not be treated as zero');
assert.strictEqual(retry.verified({
  complete:true,
  variants:sizes.map(size=>({size,available:0})),
  domDiagnostics:{missingSizes:[],unverifiedColors:[],missingColorHints:[]},
  errors:[]
}),true,'A fully verified sold-out color must not enter retry queue');

async function scenario({rows,selects=true,already=false,previous,expect,slowThreshold=6500}){
  let now=0,selected=already,clicks=0,stableCalls=0;
  const fullRows=rows.map(row=>({...row,raw:row.size+' | '+(row.stock===0?'Hết hàng':'Còn hàng ('+row.stock+')')+' | 0'}));
  const context={
    Date:{now:()=>now},
    sleep:async delay=>{now+=delay;},
    dom:parser,
    assertPopupScanActive:()=>{},
    findStockRoot:()=>({}),
    findColorControl:()=>({el:{}}),
    isSelectedColor:()=>selected,
    clickElement:async()=>{clicks++;selected=selects;},
    readTargetRows:()=>fullRows,
    sizeLabelsFromVisibleRows:()=>sizes,
    rowsSignature:r=>JSON.stringify(r.map(x=>[x.size,Number(x.stock)])),
    stableTargetRows:async()=>{stableCalls++;return fullRows;}
  };
  vm.runInNewContext(source.slice(start,end)+source.slice(scanStart,scanEnd)
    +'\nglobalThis.scan=switchColorAndRead;',context);
  const result=await context.scan('Kem',{},sizes,previous);
  assert.strictEqual(result.length,expect,'Wrong inventory row count');
  assert.ok(now<=slowThreshold,'Unexpectedly long scan');
  return{now,clicks,stableCalls,stocks:result.map(r=>r.stock)};
}
(async()=>{
 const rows=sizes.map(size=>({size,stock:0}));
 const old=JSON.stringify(rows.map(x=>[x.size,x.stock]));
 const result=await scenario({rows,previous:old,expect:5});
 assert.ok(result.now>=1500,'Same-zero color needs settling to avoid stale data');
 assert.ok(result.stableCalls>=1,'Confirmed zero rows should be verified by stable reader');
 assert.deepStrictEqual(result.stocks,[0,0,0,0,0]);

 const notSelected=await scenario({rows,previous:old,selects:false,expect:0});
 assert.strictEqual(notSelected.stableCalls,0,'Unselected color must not be accepted as sold out');

 const positive=sizes.map(size=>({size,stock:7}));
 const samePositive=JSON.stringify(positive.map(r=>[r.size,r.stock]));
 const unchanged=await scenario({rows:positive,previous:samePositive,expect:0});
 assert.strictEqual(unchanged.stableCalls,0,'Unchanged positive stock may be a stale table');

 const first=await scenario({rows,previous:'',already:true,expect:5});
 assert.strictEqual(first.clicks,0);
 console.log('SOLD OUT POPUP PASS: five explicit zero stocks, equal signatures, selected color verified');
})().catch(e=>{console.error(e);process.exitCode=1;});
