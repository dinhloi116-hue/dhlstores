const assert=require('assert');
const batch=require('./batch-stock-core.js');

const combined=batch.combineEntries([
  {profileId:'hd',profileName:'HD',branch:'dhl sport',rows:[{sku:'HD-A-S',stock:5,variantName:'A / S'}]},
  {profileId:'kids',profileName:'Trẻ em HD',branch:'dhl sport',rows:[{sku:'KID-A-5',stock:2,variantName:'Kid / 5'}]}
]);
assert.strictEqual(combined.branch,'dhl sport');
assert.strictEqual(combined.profileCount,2);
assert.strictEqual(combined.rows.length,2);

assert.throws(()=>batch.combineEntries([
  {profileId:'a',profileName:'A',branch:'CN1',rows:[{sku:'X',stock:1}]},
  {profileId:'b',profileName:'B',branch:'CN2',rows:[{sku:'Y',stock:1}]}
]),/nhiều chi nhánh/i);

assert.throws(()=>batch.combineEntries([
  {profileId:'a',profileName:'A',branch:'CN',rows:[{sku:'X',stock:1}]},
  {profileId:'b',profileName:'B',branch:'CN',rows:[{sku:'X',stock:2}]}
]),/tồn khác nhau/i);

const same=batch.combineEntries([
  {profileId:'a',profileName:'A',branch:'CN',rows:[{sku:'X',stock:1}]},
  {profileId:'b',profileName:'B',branch:'CN',rows:[{sku:'X',stock:1}]}
]);
assert.strictEqual(same.rows.length,1);
assert.deepStrictEqual(same.duplicateSame,['X']);
console.log('BATCH STOCK CORE PASS');
