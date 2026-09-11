(() => {
  'use strict';

  const xlsx = globalThis.DHLXlsxLite;
  if (!xlsx || typeof xlsx.parseSapoExport !== 'function' || xlsx.__kidsProductSizeModeV1) return;

  const AGE_TO_SOURCE_SIZE = Object.freeze({
    '5': '20',
    '7': '22',
    '9': '24',
    '11': '26',
    '13': '28',
    '15': '30'
  });

  function plain(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isKidsNonStrivend(name) {
    const p = plain(name);
    return /\btre em\b/.test(p) && !/\bstrivend\b/.test(p);
  }

  function sizeValueFromRawRow(variant, headerMap) {
    const row = (variant && variant.raw) || [];
    const h = headerMap || {};
    for (let i = 1; i <= 3; i += 1) {
      const labelCol = h[`Thuộc tính ${i}`];
      const valueCol = h[`Giá trị thuộc tính ${i}`];
      if (labelCol == null || valueCol == null) continue;
      const label = plain(row[labelCol]);
      if (label === 'size' || label === 'kich co' || label === 'co') return String(row[valueCol] || '').trim();
    }
    return '';
  }

  function displaySizeFromValue(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const explicit = raw.match(/(?:^|\b)size\s*[:\-]?\s*(\d{1,3})(?=\D|$)/i);
    if (explicit) return explicit[1];
    const numeric = raw.match(/^\s*(\d{1,3})\s*$/);
    return numeric ? numeric[1] : '';
  }

  function sourceMatchSize(productName, displaySize) {
    const normalized = String(displaySize || '').trim();
    if (!normalized) return '';
    if (!isKidsNonStrivend(productName)) return normalized;
    return AGE_TO_SOURCE_SIZE[normalized] || normalized;
  }

  function patchParsedExport(parsed) {
    if (!parsed || parsed.inputType === 'warehouse' || !Array.isArray(parsed.products)) return parsed;
    const byProduct = new Map((parsed.products || []).map((p) => [String(p.productId), p]));

    for (const variant of parsed.variants || []) {
      const product = byProduct.get(String(variant.productId));
      const productName = String((product && product.name) || variant.name || '');
      const rawSizeValue = sizeValueFromRawRow(variant, parsed.headerMap);
      const displaySize = displaySizeFromValue(rawSizeValue);
      if (!displaySize) continue;

      const matchSize = sourceMatchSize(productName, displaySize);
      variant.displaySize = displaySize;
      variant.sourceMatchSize = matchSize;
      variant.size = matchSize;
      variant.sizeFromAttribute = matchSize;
    }

    for (const product of parsed.products || []) {
      product.sizeSet = [...new Set((product.variants || []).map((v) => v.size).filter(Boolean))];
      product.displaySizeSet = [...new Set((product.variants || []).map((v) => v.displaySize || v.size).filter(Boolean))];
    }

    return parsed;
  }

  const previous = xlsx.parseSapoExport.bind(xlsx);
  xlsx.parseSapoExport = async function parseSapoExportWithKidsSourceSizes(buffer) {
    const parsed = await previous(buffer && buffer.slice ? buffer.slice(0) : buffer);
    return patchParsedExport(parsed);
  };

  globalThis.DHLKidsProductSizeMode = {
    AGE_TO_SOURCE_SIZE,
    displaySizeFromValue,
    sourceMatchSize,
    patchParsedExport,
    isKidsNonStrivend
  };
  xlsx.__kidsProductSizeModeV1 = true;
})();
