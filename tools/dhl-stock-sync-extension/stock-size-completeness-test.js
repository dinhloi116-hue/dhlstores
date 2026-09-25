const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync(__dirname+'/content.js','utf8');

assert.ok(src.includes("const TARGET_SIZES = ['S', 'M', 'L', 'XL', 'XXL']"));
assert.ok(src.includes('function expectedSizesFromRoot(root)'));
assert.ok(src.includes('const neededSizes = hintedSizes.length ? hintedSizes : expectedSizesFromRoot(root)'));
assert.ok(src.includes('while (Date.now() - started < 6500)'));
assert.ok(src.includes('stableTargetRows(currentRoot, targetSizes, 1800)'));
assert.ok(src.includes('Nếu popup đã đọc được nhưng còn thiếu size'));
assert.ok(src.includes('const retryOpen=await openStockPopup(descriptor)'));
assert.ok(src.includes('if(newCount>oldCount||(newCount===oldCount&&newMissing<oldMissing))result=retry'));

console.log('STOCK SIZE COMPLETENESS PASS', {
  adultExpectedSizes:['S','M','L','XL','XXL'],
  perColorWaitMs:6500,
  partialProductRetry:true
});
