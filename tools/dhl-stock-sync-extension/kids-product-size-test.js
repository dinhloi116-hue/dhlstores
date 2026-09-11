const assert = require('assert');

globalThis.DHLXlsxLite = {};

globalThis.DHLXlsxLite.parseSapoExport = async () => {
  const products = [
    {
      productId: 1,
      name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh',
      variants: [
        { productId: 1, name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh', sku: 'ARG-KID-SIZE9', size: 'SIZE93034KG', raw: [null, null, null, null, 'Size', 'Size 9: 30–34kg'] },
        // Các dòng sau mô phỏng đúng file Sapo thật: cột Thuộc tính bị trống nhưng Giá trị thuộc tính vẫn có Size.
        { productId: 1, name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh', sku: 'ARG-KID-SIZE15', size: 'SIZE15DUOI50KG', raw: [null, null, null, null, null, 'Size 15: Dưới 50kg'] },
        { productId: 1, name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh', sku: 'ARG-KID-SIZE7', size: 'SIZE72629KG', raw: [null, null, null, null, null, 'Size 7: 26–29kg'] },
        { productId: 1, name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh', sku: 'ARG-KID-SIZE13', size: 'SIZE134044KG', raw: [null, null, null, null, null, 'Size 13: 40–44kg'] },
        { productId: 1, name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh', sku: 'ARG-KID-SIZE5', size: 'SIZE52025KG', raw: [null, null, null, null, null, 'Size 5: 20–25kg'] },
        { productId: 1, name: 'ĐT Argentina Trẻ Em 2026 HD - Trắng Sọc Xanh', sku: 'ARG-KID-SIZE11', size: 'SIZE113539KG', raw: [null, null, null, null, null, 'Size 11: 35–39kg'] }
      ]
    },
    {
      productId: 2,
      name: 'CLB Barca Trẻ Em 25-26 Strivend - Sọc Home',
      variants: [
        { productId: 2, name: 'CLB Barca Trẻ Em 25-26 Strivend - Sọc Home', sku: 'BAR-KID-9', size: '9', raw: [null, null, null, null, 'Size', 'Size 9'] }
      ]
    },
    {
      productId: 3,
      name: 'ĐT Pháp 2026 HD - Xanh Đen',
      variants: [
        { productId: 3, name: 'ĐT Pháp 2026 HD - Xanh Đen', sku: 'PHAP-XL', size: 'XL', raw: [null, null, null, null, 'Size', 'XL'] }
      ]
    }
  ];
  return {
    headerMap: {
      'Thuộc tính 1': 2,
      'Giá trị thuộc tính 1': 3,
      'Thuộc tính 2': 4,
      'Giá trị thuộc tính 2': 5
    },
    products,
    variants: products.flatMap((p) => p.variants)
  };
};

require('./kids-product-size-mode.js');

(async () => {
  const parsed = await globalThis.DHLXlsxLite.parseSapoExport(new Uint8Array([1]));
  const arg = parsed.products[0].variants;
  assert.deepStrictEqual(arg.map((v) => v.displaySize), ['9', '15', '7', '13', '5', '11']);
  assert.deepStrictEqual(arg.map((v) => v.size), ['24', '30', '22', '28', '20', '26']);
  assert.strictEqual(arg[0].sku, 'ARG-KID-SIZE9', 'SKU Sapo phải giữ nguyên');
  assert.strictEqual(arg[1].sku, 'ARG-KID-SIZE15', 'SKU ở continuation row cũng phải giữ nguyên');
  assert.strictEqual(parsed.kidsSourceSizeRemapped, 7, 'Phải nhận đủ 6 HD + 1 Strivend có giá trị Size');

  const strivend = parsed.products[1].variants[0];
  assert.strictEqual(strivend.size, '9', 'Strivend dùng size lẻ thật nên phải giữ nguyên');

  const adult = parsed.products[2].variants[0];
  assert.strictEqual(adult.size, 'XL', 'Người lớn không được bị ảnh hưởng');

  assert.deepStrictEqual(parsed.products[0].sizeSet, ['24', '30', '22', '28', '20', '26']);
  assert.deepStrictEqual(parsed.products[0].displaySizeSet, ['9', '15', '7', '13', '5', '11']);

  console.log('KIDS PRODUCT SIZE PASS', {
    kidsHd: 'all continuation rows mapped 5/7/9/11/13/15 -> 20/22/24/26/28/30',
    strivend: 'kept odd sizes',
    sku: 'preserved'
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
