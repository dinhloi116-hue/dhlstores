const fs=require('fs');
const assert=require('assert');
const vm=require('vm');
const path=require('path');
const quality=require('./scan-quality-core.js');
const dom=require('./dom-stock-parser.js');
const content=fs.readFileSync(path.join(__dirname,'content.js'),'utf8');

const labelsStart=content.indexOf('  function verifiedInventoryTable(root){');
const labelsEnd=content.indexOf('  function expectedSizesFromRoot(root){',labelsStart);
const readStart=content.indexOf('  function readTargetRows(root,targetSizes){');
const readEnd=content.indexOf('  function rowsSignature(rows)',readStart);
const auditStart=content.indexOf('  function auditColorSnapshots(snapshots){');
const auditEnd=content.indexOf('  async function readOpenedPopup(',auditStart);
assert.ok(labelsStart>=0&&labelsEnd>labelsStart&&readStart>=0&&readEnd>readStart&&auditStart>=0&&auditEnd>auditStart);

const sandbox={dom,text:el=>el.innerText,visible:()=>true};
vm.runInNewContext(content.slice(labelsStart,labelsEnd)+'\n'+content.slice(readStart,readEnd)+'\n'+content.slice(auditStart,auditEnd)
  +'\nglobalThis.scanHelpers={sizeLabelsFromVisibleRows,readTargetRows,auditColorSnapshots};',sandbox);
const {sizeLabelsFromVisibleRows,readTargetRows,auditColorSnapshots}=sandbox.scanHelpers;

function mockTable(headers,data){
  const tr={querySelectorAll:()=>headers.map(innerText=>({innerText}))};
  return{
    matches:()=>true,
    querySelector:s=>s==='thead tr'?tr:null,
    querySelectorAll:s=>{
      if(s==='tbody tr,[role="row"]'){
        return data.map(cells=>({
          children:cells.map(innerText=>({innerText,matches:()=>true}))
        }));
      }
      return[];
    }
  };
}
function mockRoot(tables){
  return{matches:()=>false,querySelectorAll:s=>s==='table,[role="table"]'?tables:[]};
}
const inventoryHeaders=['Tên size','Tình trạng tồn','Số lượng muốn đặt'];
function rootFromSizes(sizes){
  return mockRoot([mockTable(inventoryHeaders,sizes.map(size=>[size,'Còn hàng (2)','0']))]);
}
assert.deepStrictEqual(Array.from(sizeLabelsFromVisibleRows(rootFromSizes(['70','72','74']))),['70','72','74']);
assert.deepStrictEqual(Array.from(sizeLabelsFromVisibleRows(rootFromSizes(['26','28','30']))),['26','28','30']);

// Reproduce the supplied supplier popup: 2026/27 season and VND 70,000
// appear elsewhere in the modal; only five named size cells are stock rows.
const unrelated=mockTable(['Tên sản phẩm','Đơn giá'],[['CLB Liver 26-27 HD','70,000đ']]);
const actual=mockTable(inventoryHeaders,[
  ['S','Còn hàng (6)','0'],
  ['M','Còn hàng (17)','0'],
  ['L','Còn hàng (22)','0'],
  ['XL','Còn hàng (25)','0'],
  ['XXL','Còn hàng (10)','0']
]);
const actualRoot=mockRoot([unrelated,actual]);
const realRows=Array.from(readTargetRows(actualRoot,[]),r=>({size:r.size,stock:r.stock}));
assert.deepStrictEqual(realRows,[
  {size:'S',stock:6},{size:'M',stock:17},{size:'L',stock:22},
  {size:'XL',stock:25},{size:'XXL',stock:10}
]);
assert.deepStrictEqual(Array.from(sizeLabelsFromVisibleRows(actualRoot)),['S','M','L','XL','XXL']);
for(const number of ['26','70','2026']){
  assert.ok(!realRows.some(row=>row.size===number),'Phantom numeric size: '+number);
}
for(const bogus of ['26-27','2026/27','70,000đ','70.000 đ','CLB Liver 26-27 HD']){
  assert.strictEqual(dom.strictSizeLabel(bogus),'','Bogus size accepted: '+bogus);
}
assert.strictEqual(dom.strictSizeLabel('70'),'70');
assert.strictEqual(dom.strictSizeLabel('XXL'),'XXL');
assert.strictEqual(dom.inventoryColumns(['Tên sản phẩm','Đơn giá']),null);
assert.deepStrictEqual(dom.inventoryRowFromCells(['L','Còn hàng (22)','0'],dom.inventoryColumns(inventoryHeaders)),{size:'L',stock:22});

const differingColors=[
 {color:'Xanh',expectedSizes:['70','72'],rows:[{size:'70',stock:1},{size:'72',stock:0}]},
 {color:'Kem',expectedSizes:['26','28'],rows:[{size:'26',stock:6},{size:'28',stock:4}]}
];
const goodAudit=auditColorSnapshots(differingColors);
assert.strictEqual(goodAudit.missing.length,0,'Different numeric-size colors must not share first-color size expectations');
assert.strictEqual(goodAudit.unverifiedColors.length,0);
const missingAudit=auditColorSnapshots([
 {color:'Kem',expectedSizes:['26','28'],rows:[{size:'26',stock:1}]},
 {color:'Đỏ',expectedSizes:[],rows:[]}
]);
assert.deepStrictEqual(Array.from(missingAudit.missing),['kem/28']);
assert.deepStrictEqual(Array.from(missingAudit.unverifiedColors),['Đỏ']);

const job={total:1,index:1};
const results=[{complete:true,variants:[{size:'26',available:4},{size:'28',available:0}]}];
const rows=[{sku:'HD-KEM-26',stock:4},{sku:'HD-KEM-28',stock:0}];
const valid=quality.evaluate(job,results,{rows},[]);
assert.strictEqual(valid.ok,true,valid.reasons.join(';'));
const trusted={qualityValidated:true,rowCount:2,rows,report:{quality:valid,issueCount:0}};
assert.strictEqual(quality.trustedEntry(trusted),true);
assert.strictEqual(quality.evaluate(job,results,{rows},Array(66).fill({type:'missing-size'})).ok,false);
assert.strictEqual(quality.evaluate(job,[{complete:false,variants:results[0].variants}],{rows},[]).ok,false);
assert.strictEqual(quality.evaluate(job,results,{rows:rows.slice(0,1)},[]).ok,false);
assert.strictEqual(quality.evaluate(job,results,{rows},[],'paused').ok,false);
assert.strictEqual(quality.evaluate(job,results,{rows:[rows[0],{...rows[0]}]},[]).ok,false);
assert.strictEqual(quality.evaluate(job,results,{rows:[rows[0],{sku:'HD-KEM-28',stock:undefined}]},[]).ok,false);
assert.strictEqual(quality.trustedEntry({...trusted,report:{...trusted.report,issueCount:66}}),false);
assert.strictEqual(quality.trustedEntry({...trusted,qualityValidated:false}),false);
assert.strictEqual(quality.trustedEntry({...trusted,rowCount:238}),false);

const bg=fs.readFileSync(path.join(__dirname,'manual-sapo-background.js'),'utf8');
const excel=fs.readFileSync(path.join(__dirname,'batch-stock-cache-mode.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'manual-sapo-output-mode.js'),'utf8');
const runner=fs.readFileSync(path.join(__dirname,'manual-job-runner-background.js'),'utf8');
assert.ok(bg.includes('entries.some(entry=>!quality.trustedEntry(entry))'));
assert.ok(bg.includes('qualityValidated:true'));
assert.ok(excel.includes('list.some(entry=>!quality.trustedEntry(entry))'));
assert.ok(ui.includes('s.manualEntries.every(entry=>quality.trustedEntry(entry))'));
assert.ok(runner.includes('quality.evaluate(job,sourceResults,prepared,issues,forcedStatus)'));
console.log('STOCK QUALITY GATE PASS: independent per-color sizes, strict rows and blocked unsafe Sapo/Excel output');
