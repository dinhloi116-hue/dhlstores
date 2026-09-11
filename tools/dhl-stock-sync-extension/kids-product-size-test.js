const assert = require('assert');

globalThis.DHLXlsxLite = {
  parseSapoExport: async () => ({
    headerMap: {
      'Thuộc tính 1': 0,
      'Giá trị thuộc tính 1': 1
    },
    products: [
      {
        productId: 1,
        name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh',
        variants: [
          { productId: 1, name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh', sku: 'ARG-KID-SIZE9', size: 'SIZE93034KG', raw: ['Size', 'Size 9: 30–34kg'] },
          { productId: 1, name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh', sku: 'ARG-KID-SIZE15', size: 'SIZE15DUOI50KG', raw: ['Size', 'Size 15: Dưới 50kg'] }
        ]
      },
      {
        productId: 2,
        name: 'CLB Barca Trẻ Em 25-26 Strivend - Sọc Home',
        variants: [
          { productId: 2, name: 'CLB Barca Trẻ Em 25-26 Strivend - Sọc Home', sku: 'BAR-KID-9', size: '9', raw: ['Size', 'Size 9'] }
        ]
      },
      {
        productId: 3,
        name: 'ĐT Pháp 2026 HD - Xanh Đen',
        variants: [
          { productId: 3, name: 'ĐT Pháp 2026 HD - Xanh Đen', sku: 'PHAP-XL', size: 'XL', raw: ['Size', 'XL'] }
        ]
      }
    ],
    variants: []
  })
};

globalThis.DHLXlsxLite.parseSapoExport = async () => {
  const products = [
    {
      productId: 1,
      name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh',
      variants: [
        { productId: 1, name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh', sku: 'ARG-KID-SIZE9', size: 'SIZE93034KG', raw: ['Size', 'Size 9: 30–34kg'] },
        { productId: 1, name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh', sku: 'ARG-KID-SIZE15', size: 'SIZE15DUOI50KG', raw: ['Size', 'Size 15: Dưới 50kg'] }
      ]
    },
    {
      productId: 2,
      name: 'CLB Barca Trẻ Em 25-26 Strivend - Sọc Home',
      variants: [
        { productId: 2, name: 'CLB Barca Trẻ Em 25-26 Strivend - Sọc Home', sku: 'BAR-KID-9', size: '9', raw: ['Size', 'Size 9'] }
      ]
    },
    {
      productId: 3,
      name: 'ĐT Pháp 2026 HD - Xanh Đen',
      variants: [
        { productId: 3, name: 'ĐT Pháp 2026 HD - Xanh Đen', sku: 'PHAP-XL', size: 'XL', raw: ['Size', 'XL'] }
      ]
    }
  ];
  return {
    headerMap: { 'Thuộc tính 1': 0, 'Giá trị thuộc tính 1': 1 },
    products,
    variants: products.flatMap((p) => p.variants)
  };
};

require('./kids-product-size-mode.js');

(async () => {
  const parsed = await globalThis.DHLXlsxLite.parseSapoExport(new Uint8Array([1]));
  const arg = parsed.products[0].variants;
  assert.strictEqual(arg[0].displaySize, '9');
  assert.strictEqual(arg[0].size, '24', 'Size 9 trẻ em HD phải đối chiếu với size nguồn 24');
  assert.strictEqual(arg[1].displaySize, '15');
  assert.strictEqual(arg[1].size, '30', 'Size 15 trẻ em HD phải đối chiếu với size nguồn 30');
  assert.strictEqual(arg[0].sku, 'ARG-KID-SIZE9', 'SKU Sapo phải giữ nguyên');

  const strivend = parsed.products[1].variants[0];
  assert.strictEqual(strivend.size, '9', 'Strivend dùng size lẻ thật nên phải giữ nguyên');

  const adult = parsed.products[2].variants[0];
  assert.strictEqual(adult.size, 'XL', 'Người lớn không được bị ảnh hưởng');

  assert.deepStrictEqual(parsed.products[0].sizeSet, ['24', '30']);
  assert.deepStrictEqual(parsed.products[0].displaySizeSet, ['9', '15']);

  console.log('KIDS PRODUCT SIZE PASS', {
    kidsHd: '5/7/9/11/13/15 -> 20/22/24/26/28/30',
    strivend: 'kept odd sizes',
    sku: 'preserved'
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
