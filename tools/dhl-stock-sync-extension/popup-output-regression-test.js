const fs=require('fs');
const path=require('path');
const assert=require('assert');
const dir=__dirname;
const read=(name)=>fs.readFileSync(path.join(dir,name),'utf8');

const content=read('content.js');
const runnerBg=read('manual-job-runner-background.js');

assert.ok(content.includes('async function stableTargetRows(root, targetSizes, timeout = 4000, cancelVersion = null)'));
assert.ok(content.includes("async function switchColorAndRead(name, root, targetSizes, previousSignature = '', cancelVersion = null)"));
assert.ok(content.includes('switchColorAndRead(target.name, currentRoot, neededSizes, previousSignature, cancelVersion)'));
assert.ok(content.includes('stableTargetRows(currentRoot, neededSizes, 4000, cancelVersion)'));
assert.ok(content.includes('stableTargetRows(currentRoot, targetSizes, 1800, cancelVersion)'));
assert.ok(content.includes('assertPopupScanActive(cancelVersion)'));

global.DHLShopRules=require('./shop-rules.js');
require('./generic-shop-rules.js');
const rules=global.DHLShopRules;
const core=require('./auto-sync-core.js');
const matcher=require('./match-core.js');

const source=[{
  parentId:12345,
  parentName:'Áo Trẻ Em CLB Arsenal 26-27',
  complete:true,
  variants:['S','M','L','XL','XXL'].map((size,i)=>({
    id:123450+i,
    parentId:12345,
    name:`Áo Trẻ Em CLB Arsenal 26-27 - Đỏ - ${size}`,
    color:'Đỏ',
    size,
    available:10+i
  }))
}];

const prepared=core.prepareRows({}, {variants:[]}, source, matcher, rules);
assert.strictEqual(prepared.rows.length,5,'Popup đủ 5 size phải dựng được 5 dòng đầu ra');
assert.deepStrictEqual(prepared.rows.map(x=>x.size),['S','M','L','XL','XXL']);
assert.ok(prepared.rows.every(x=>x.sku&&/-S$|-M$|-L$|-XL$|-XXL$/.test(x.sku)));
assert.ok(prepared.rows.every(x=>Number.isFinite(x.stock)));

assert.ok(runnerBg.includes("job.status='output-error'"),'0 dòng không được báo done');
assert.ok(runnerBg.includes('Quét xong nhưng không đọc được biến thể size/tồn từ popup.'));
assert.ok(runnerBg.includes('lastScanRowCount:0'));

console.log('POPUP OUTPUT REGRESSION PASS',{
  cancelTokenThreaded:true,
  fiveSizesToFiveRows:true,
  emptyOutputBlocked:true
});
