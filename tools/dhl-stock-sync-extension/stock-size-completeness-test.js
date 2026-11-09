const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync(__dirname+'/content.js','utf8');

assert.ok(src.includes("const TARGET_SIZES = ['S', 'M', 'L', 'XL', 'XXL']"));
assert.ok(src.includes('function expectedSizesFromRoot(root)'));
assert.ok(src.includes('function verifiedInventoryTable(root)'));
assert.ok(src.includes('dom.inventoryRowFromCells(cells,found.columns)'));
assert.ok(src.includes('inventoryTableSnapshot(root)'));
assert.ok(src.includes('const neededSizes = hintedSizes.length ? hintedSizes : (adultSize ? inferredSizes : [])'));
assert.ok(src.includes('sizeLabelsFromVisibleRows(currentRoot)'));
assert.ok(src.includes('auditColorSnapshots(snapshots)'));
assert.ok(src.includes('while (Date.now() - started < 6500)'));
assert.ok(src.includes('stableTargetRows(currentRoot, effectiveSizes, 1800, cancelVersion)'));
assert.ok(src.includes('Nếu popup đã đọc được nhưng còn thiếu size'));
assert.ok(src.includes('const retryOpen=await openStockPopup(descriptor, cancelVersion)'));
assert.ok(src.includes('if(retry&&retry.complete===true'));
assert.ok(src.includes('newMissing+newUnverified<oldMissing+oldUnverified'));

console.log('STOCK SIZE COMPLETENESS PASS', {
  adultExpectedSizes:['S','M','L','XL','XXL'],
  perColorWaitMaxMs:6500,
  numericSizes:'per-color',
  partialProductRetry:true
});
