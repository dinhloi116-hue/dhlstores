const assert = require('assert');

const variant = {
  name: 'ĐT Ý 2026 HD - Xanh Dương',
  rawName: 'ĐT Ý 2026 HD',
  size: 'M'
};
const product = {
  name: 'ĐT Ý 2026 HD - Xanh Dương',
  variants: [variant]
};

globalThis.DHLXlsxLite = {
  async parseSapoExport() {
    return {
      inputType: 'warehouse',
      products: [product],
      variants: [variant]
    };
  }
};

require('./warehouse-sku-link-mode.js');

(async () => {
  const parsed = await globalThis.DHLXlsxLite.parseSapoExport(new ArrayBuffer(0));
  assert.strictEqual(parsed.products[0].name, 'ĐT Ý 2026 HD - Xanh Dương', 'Tên product canonical phải giữ để quét nguồn');
  assert.strictEqual(parsed.variants[0].name, 'ĐT Ý 2026 HD', 'Tên variant phải trở về tên gốc Sapo để nối SKU');
  assert.strictEqual(parsed.variants[0].sourceName, 'ĐT Ý 2026 HD - Xanh Dương');
  assert.strictEqual(parsed.skuLinkUsesRawWarehouseName, true);
  console.log('WAREHOUSE SKU LINK PASS');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
