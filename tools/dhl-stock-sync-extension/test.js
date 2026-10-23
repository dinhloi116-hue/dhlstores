const assert = require('assert');
const core = require('./stock-core.js');

async function main() {
  assert.strictEqual(core.extractProductId('https://si.aobongda.net/dt-mexico-2026-hd-reu-s-p4985511.html'), 4985511);
  assert.strictEqual(core.extractProductId('https://si.aobongda.net/product/child?psId=4985510'), 4985510);

  assert.strictEqual(core.extractParentIdFromHtml('<script>fetch("/product/child?psId=4985510")</script>', 4985511), 4985510);
  assert.strictEqual(core.extractParentIdFromHtml('<button data-parent-id="7777">Thêm vào giỏ</button>', null), 7777);
  assert.strictEqual(core.extractParentIdFromHtml('<div>không có id</div>', 8888), 8888);

  assert.strictEqual(core.normalizeSku(' 16802-r-s '), '16802-R-S');

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
  assert.strictEqual(result.stopReason, 'cycle');
  assert.strictEqual(result.confidence, 'high');
  assert.strictEqual(result.complete, true);
  assert.deepStrictEqual(result.variants.map(v => v.available), [7, 19, 20, 14, 8]);
  assert.deepStrictEqual(result.variants.map(v => v.size), ['S', 'M', 'L', 'XL', 'XXL']);

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
  assert.strictEqual(multiResult.complete, true);
  assert.strictEqual(multiResult.variants.filter(v => v.available === 0).length, 2);
  assert.deepStrictEqual(multiResult.variants.at(-1).color, 'Xanh Ngọc');
  assert.deepStrictEqual(multiResult.variants.at(-1).size, 'XXXL');

  // Endpoint bị kẹt ở một child: vẫn đọc được dữ liệu nhưng KHÔNG được coi là hoàn chỉnh để sync.
  const repeated = await core.collectVariants({
    parentId: 7000,
    parentName: 'Áo Một Biến Thể?',
    delayMs: 0,
    maxDuplicateStreak: 2,
    requestChild: async () => ({ code: 1, data: { id: 7001, parentId: 7000, code: 'ONE-S', name: 'Áo Một Biến Thể? - Đỏ - S', available: 5 } }),
  });
  assert.strictEqual(repeated.variants.length, 1);
  assert.strictEqual(repeated.confidence, 'medium');
  assert.strictEqual(repeated.complete, false);
  assert.strictEqual(repeated.stopReason, 'duplicate-streak');
  assert.strictEqual(core.validateScanResult(repeated).safeToSync, false);

  // Nếu session/cursor trả child của parent khác, phải chặn ngay.
  const mismatch = await core.collectVariants({
    parentId: 8000,
    parentName: 'Áo Parent 8000',
    delayMs: 0,
    requestChild: async () => ({ code: 1, data: { id: 9001, parentId: 9000, code: 'WRONG-S', name: 'Áo Khác - Đỏ - S', available: 4 } }),
  });
  assert.strictEqual(mismatch.stopReason, 'parent-mismatch');
  assert.strictEqual(mismatch.complete, false);
  assert.strictEqual(mismatch.variants.length, 0);
  assert.ok(mismatch.errors.some(x => /sai parentId/.test(x.message)));

  const safeValidation = core.validateScanResult(multiResult);
  assert.strictEqual(safeValidation.safeToSync, true);

  const unsafeValidation = core.validateScanResult({
    parentId: 1,
    confidence: 'high',
    complete: true,
    errors: [],
    variants: [
      { id: 1, parentId: 1, sku: 'DUP-S', available: 3 },
      { id: 2, parentId: 1, sku: 'dup-s', available: 4 },
      { id: 3, parentId: 1, sku: '', available: 5 },
    ],
  });
  assert.strictEqual(unsafeValidation.safeToSync, false);
  assert.ok(unsafeValidation.issues.some(x => x.type === 'duplicate-sku'));
  assert.ok(unsafeValidation.issues.some(x => x.type === 'missing-sku'));

  const emptyValidation = core.validateScanResult({ parentId: 1, confidence: 'low', complete: false, variants: [], errors: [] });
  assert.strictEqual(emptyValidation.safeToSync, false);
  assert.ok(emptyValidation.issues.some(x => x.type === 'no-variants'));

  // Map Sapo không phân biệt hoa/thường để tránh miss SKU vô nghĩa.
  const diff = core.diffInventory(
    [{ id: 1, parentId: 1, sku: '16802-R-S', available: 7 }],
    { '16802-r-s': { inventory: 3 } },
  );
  assert.strictEqual(diff[0].matched, true);
  assert.strictEqual(diff[0].sapoInventory, 3);
  assert.strictEqual(diff[0].delta, 4);

  console.log('PASS', {
    mexicoVariants: result.variants.length,
    multiColorVariants: multiResult.variants.length,
    stuckEndpointBlocked: repeated.complete === false,
    parentMismatchBlocked: mismatch.stopReason === 'parent-mismatch',
    safetyValidation: safeValidation.safeToSync,
    caseInsensitiveSkuMatch: diff[0].matched,
  });
}

main().catch((error) => { console.error(error); process.exit(1); });
