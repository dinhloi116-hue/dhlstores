(() => {
  'use strict';

  const xlsx = globalThis.DHLXlsxLite;
  if (!xlsx || typeof xlsx.parseSapoExport !== 'function' || xlsx.__warehouseSkuLinkV1) return;

  // File kho cần 2 tên khác nhau cho 2 nhiệm vụ:
  // - product.name: tên đã chuẩn hóa để quét/ghép với web nguồn.
  // - variant.name: tên gốc Sapo để nối chính xác với products_export và lấy SKU/ID.
  // Một số tên legacy (Ý 2026, Hà Lan 2026, Ý vàng, BĐN Siu...) được canonical hóa
  // khi quét nguồn. Nếu dùng tên canonical đó để tra SKU sẽ làm mất đúng 5 size/SP.
  const previous = xlsx.parseSapoExport.bind(xlsx);

  xlsx.parseSapoExport = async function parseWithOriginalWarehouseVariantName(buffer) {
    const parsed = await previous(buffer && buffer.slice ? buffer.slice(0) : buffer);
    if (!parsed || parsed.inputType !== 'warehouse') return parsed;

    for (const variant of parsed.variants || []) {
      if (!variant) continue;
      const rawName = String(variant.rawName || '').trim();
      if (!rawName) continue;
      variant.sourceName = String(variant.name || '').trim();
      variant.name = rawName;
    }

    // product.name cố ý giữ nguyên tên canonical để matcher + scan hints vẫn hoạt động.
    parsed.skuLinkUsesRawWarehouseName = true;
    return parsed;
  };

  xlsx.__warehouseSkuLinkV1 = true;
})();
