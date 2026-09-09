const assert = require('assert');
const core = require('./stock-core.js');

async function main() {
  assert.strictEqual(core.extractProductId('https://si.aobongda.net/dt-mexico-2026-hd-reu-s-p4985511.html'), 4985511);
  assert.strictEqual(core.extractProductId('https://si.aobongda.net/product/child?psId=4985510'), 4985510);

  assert.strictEqual(core.extractParentIdFromHtml('<script>fetch("/product/child?psId=4985510")</script>', 4985511), 4985510);
  assert.strictEqual(core.extractParentIdFromHtml('<button data-parent-id="7777">Thêm vào giỏ</button>', null), 7777);
  assert.strictEqual(core.extractParentIdFromHtml('<div>không có id</div>', 8888), 8888);

  const p = core.parseVariantName('ĐT Mexico 2026 HD - Rêu - XL', 'ĐT Mexico 2026 HD');
  assert.deepStrictEqual(p, { color: 'Rêu', size: 'XL' });

  const sequence = [
    { code: 1, data: { id: 4985511, parentId: 4985510, code: '16802-R-S', name: 'ĐT Mexico 2026 HD - Rêu - S', available: 7, price: 70000 } },
    { code: 1, data: { id: 4985512, parentId: 4985510, code: '16802-R-M', name: 'ĐT Mexico 2026 HD - Rêu - M', available: 19, price: 70000 } },
    { code: 1, data: { id: 4985513, parentId: 4985510, code: '16802-R-L', name: 'ĐT Mexico 2026 HD - Rêu - L', available: 20, price: 70000 } },
    { code: 1, data: { id: 4985514, parentId: 4985510, code: '16802-R-XL', name: 'ĐT Mexico 2026 HD - Rêu - XL', available: 14, price: 70000 } },
    { code: 1, data: { id: 4985515, parentId: 4985510, code: '16802-R-XXL', name: 'ĐT Mexico 2026 HD - Rêu - XXL', available: 8, price: 70000 } },
    { code: 1, data: { id: 4985511, parentId: 4985510, code: '16802-R-S', name: 'ĐT Mexico 2026 HD - Rêu - S', available: 7, price: 70000 } },
  ];
  let i = 0;
  const result = await core.collectVariants({
    parentId: 4985510,
    parentName: 'ĐT Mexico 2026 HD',
    delayMs: 0,
    requestChild: async () => sequence[i++ % sequence.length],
  });
  assert.strictEqual(result.variants.length, 5);
  assert.deepStrictEqual(result.variants.map(v => v.available), [7, 19, 20, 14, 8]);
  assert.deepStrictEqual(result.variants.map(v => v.size), ['S', 'M', 'L', 'XL', 'XXL']);

  const multi = core.parseVariantName('Áo ABC - Xanh Đen - XXXL', 'Áo ABC');
  assert.deepStrictEqual(multi, { color: 'Xanh Đen', size: 'XXXL' });

  const colors = ['Xanh Đen', 'Xanh Ngọc'];
  const sizes = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const multiSequence = [];
  let mid = 6000;
  for (const color of colors) {
    for (const size of sizes) {
      multiSequence.push({ code: 1, data: { id: mid++, parentId: 5999, code: `T-${color === 'Xanh Đen' ? 'XD' : 'XN'}-${size}`, name: `Áo Test - ${color} - ${size}`, available: size === 'XXXL' ? 0 : 10 } });
    }
  }
  multiSequence.push(multiSequence[0]);
  let mi = 0;
  const multiResult = await core.collectVariants({ parentId: 5999, parentName: 'Áo Test', delayMs: 0, requestChild: async () => multiSequence[mi++ % multiSequence.length] });
  assert.strictEqual(multiResult.variants.length, 12);
  assert.strictEqual(multiResult.confidence, 'high');
  assert.strictEqual(multiResult.variants.filter(v => v.available === 0).length, 2);
  assert.deepStrictEqual(multiResult.variants.at(-1).color, 'Xanh Ngọc');
  assert.deepStrictEqual(multiResult.variants.at(-1).size, 'XXXL');

  const repeated = await core.collectVariants({ parentId: 7000, parentName: 'Áo Một Biến Thể?', delayMs: 0, maxDuplicateStreak: 2, requestChild: async () => ({ code: 1, data: { id: 7001, parentId: 7000, code: 'ONE-S', name: 'Áo Một Biến Thể? - Đỏ - S', available: 5 } }) });
  assert.strictEqual(repeated.variants.length, 1);
  assert.strictEqual(repeated.confidence, 'low');
  assert.strictEqual(repeated.stopReason, 'duplicate-streak');

  const safeValidation = core.validateScanResult(multiResult);
  assert.strictEqual(safeValidation.safeToSync, true);

  const unsafeValidation = core.validateScanResult({
    confidence: 'high', errors: [], variants: [
      { id: 1, sku: 'DUP-S', available: 3 },
      { id: 2, sku: 'DUP-S', available: 4 },
      { id: 3, sku: '', available: 5 },
    ]
  });
  assert.strictEqual(unsafeValidation.safeToSync, false);
  assert.ok(unsafeValidation.issues.some(x => x.type === 'duplicate-sku'));
  assert.ok(unsafeValidation.issues.some(x => x.type === 'missing-sku'));

  console.log('PASS', { mexicoVariants: result.variants.length, multiColorVariants: multiResult.variants.length, lowConfidenceDetected: repeated.confidence === 'low', safetyValidation: safeValidation.safeToSync });
}

main().catch((error) => { console.error(error); process.exit(1); });
