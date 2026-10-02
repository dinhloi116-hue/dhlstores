const fs=require('fs');
const assert=require('assert');

const runner=fs.readFileSync(__dirname+'/manual-job-runner-background.js','utf8');
const content=fs.readFileSync(__dirname+'/content.js','utf8');
const catalog=fs.readFileSync(__dirname+'/catalog-popup-v3-mode.js','utf8');

assert.ok(runner.includes("const CHUNK_SIZE=4"));
assert.ok(runner.includes("scheduleNext(80)"));
assert.ok(!runner.includes("PRODUCT_SETTLE_MS=850"));
assert.ok(!runner.includes("const CHUNK_SIZE=1"));

assert.ok(content.includes("await sleep(90)"));
assert.ok(content.includes("stable >= 1"));
assert.ok(content.includes("stable >= 3"));
assert.ok(content.includes("elapsed >= 650"));
assert.ok(content.includes("stableTargetRows(currentRoot, targetSizes, 1800, cancelVersion)"));
assert.ok(content.includes("await sleep(260)"));
assert.ok(content.includes("await sleep(350)"));

assert.ok(catalog.includes("await sleep(180)"));
assert.ok(catalog.includes("await sleep(120)"));

console.log('SCAN PACING PASS',{
  restoredOriginalSpeed:true,
  chunk:4,
  interChunkMs:80,
  popupStableRead:true,
  slowExperimentRemoved:true
});