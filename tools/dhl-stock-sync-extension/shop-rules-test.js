const assert = require('assert');
const rules = require('./shop-rules');

assert.strictEqual(rules.sourceNameFromSkuBase('Mexico xanh 26 HD-S'), 'ĐT Mexico 2026 HD - Rêu');
assert.strictEqual(rules.sourceNameFromSkuBase('Ý vàng 26 HD-XL'), 'ĐT Ý 2026 HD - Kem');
assert.strictEqual(rules.sourceNameFromSkuBase('Anh be HD-M'), 'ĐT Anh 2026 HD - Vàng Kem');
assert.strictEqual(rules.sourceColorFromStandardName('ĐT Đức 2026 HD - Trắng Đỏ'), 'Trắng Đỏ');
assert.strictEqual(rules.sourceBaseNameFromStandardName('ĐT Đức 2026 HD - Trắng Đỏ'), 'ĐT Đức 2026 HD');

const available = ['ĐT Mexico 2026 HD - Rêu', 'ĐT Ý 2026 HD - Kem'];
assert.strictEqual(rules.targetNameForProduct({ name: 'Tên cũ', skuBase: 'Mexico xanh 26 HD' }, available), 'ĐT Mexico 2026 HD - Rêu');
assert.strictEqual(rules.targetNameForProduct({ name: 'ĐT Ý 2026 HD - Kem', skuBase: 'Ý vàng 26 HD' }, available), 'ĐT Ý 2026 HD - Kem');
assert.strictEqual(rules.targetNameForProduct({ name: 'Không có', skuBase: 'không có' }, available), '');

console.log('SHOP RULES PASS', {
  mexico: true,
  italyLegacyToSource: true,
  englandLegacyToSource: true,
  exactNamePriority: true
});
