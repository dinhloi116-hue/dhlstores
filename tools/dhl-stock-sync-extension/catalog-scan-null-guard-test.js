const fs=require('fs');
const src=fs.readFileSync(__dirname+'/catalog-popup-v3-mode.js','utf8');
const assert=require('assert');

assert.ok(src.includes('function failedScanResult(item, message)'));
assert.ok(src.includes("result&&typeof result==='object'?result:failedScanResult"));
assert.ok(src.includes("results.some((r)=>!r||r.complete!==true)"));
assert.ok(src.includes("const validResults=results.filter((r)=>r&&typeof r==='object')"));
assert.ok(src.includes("validResults.filter((r)=>r.complete===true)"));
assert.ok(src.includes('lỗi/thiếu ${failedCount}'));
assert.ok(!src.includes('results.filter((r)=>r.complete).length'));

console.log('CATALOG NULL GUARD PASS');
