const assert = require('assert');
const core = require('./stock-core.js');

async function main() {
  const first = ['S','M','L','XL','XXL'].map((size,i)=>({code:1,data:{id:100+i,parentId:99,code:`A-${size}`,name:`ĐT Test 2026 HD - Đỏ - ${size}`,available:10}}));
  const second = ['S','M','L','XL','XXL'].map((size,i)=>({code:1,data:{id:200+i,parentId:99,code:`B-${size}`,name:`ĐT Test 2026 HD - Xanh - ${size}`,available:20}}));
  // Mô phỏng endpoint quay lại vài biến thể màu đầu rồi mới lộ màu tiếp theo.
  const sequence = [...first, first[0], first[1], ...second];
  let i = 0;
  const result = await core.collectVariants({
    parentId: 99,
    parentName: 'ĐT Test 2026 HD',
    delayMs: 0,
    maxRequests: 40,
    maxDuplicateStreak: 8,
    expectedVariantCount: 10,
    requestChild: async () => sequence[Math.min(i++, sequence.length - 1)]
  });
  assert.strictEqual(result.variants.length, 10);
  assert.strictEqual(result.stopReason, 'expected-count');
  assert.strictEqual(result.complete, true);
  assert.strictEqual(result.reachedExpected, true);
  assert.strictEqual(core.validateScanResult(result).safeToSync, true);

  let j = 0;
  const short = await core.collectVariants({
    parentId: 99,
    parentName: 'ĐT Test 2026 HD',
    delayMs: 0,
    maxRequests: 20,
    maxDuplicateStreak: 4,
    expectedVariantCount: 10,
    requestChild: async () => first[j++ % first.length]
  });
  assert.strictEqual(short.variants.length, 5);
  assert.strictEqual(short.complete, false);
  assert.ok(core.validateScanResult(short).issues.some(x => x.type === 'expected-count-missing'));

  console.log('EXPECTED COUNT PASS', { reached: result.variants.length, missingBlocked: short.complete === false });
}

main().catch(error => { console.error(error); process.exit(1); });
