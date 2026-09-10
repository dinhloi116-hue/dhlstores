(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DHLStockCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function extractProductId(value) {
    const text = String(value || '');
    const matches = [...text.matchAll(/-p(\d+)(?:\.html)?(?:[?#]|$)/gi)];
    if (matches.length) return Number(matches[matches.length - 1][1]);
    const qs = text.match(/[?&](?:psId|productId|id)=(\d+)/i);
    return qs ? Number(qs[1]) : null;
  }

  function extractParentIdFromHtml(html, fallback = null) {
    const text = String(html || '');
    const patterns = [
      /product\/child\?psId=(\d+)/i,
      /\bpsId\s*[:=]\s*["']?(\d+)/i,
      /data-(?:parent-id|ps-id|psid|product-id)=["'](\d+)["']/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
    return Number(fallback) || null;
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeSku(value) {
    return normalizeText(value).toUpperCase();
  }

  function parseVariantName(fullName, parentName) {
    const full = normalizeText(fullName);
    const parent = normalizeText(parentName);
    let tail = full;
    if (parent && full.toLowerCase().startsWith((parent + ' - ').toLowerCase())) {
      tail = full.slice(parent.length + 3);
    }
    const parts = tail.split(/\s+-\s+/).map((x) => x.trim()).filter(Boolean);
    const size = parts.length ? parts[parts.length - 1] : '';
    const color = parts.length >= 2 ? parts[parts.length - 2] : '';
    return { color, size };
  }

  function normalizeVariant(data, parentId, parentName) {
    if (!data || typeof data !== 'object') return null;
    const id = Number(data.id);
    const available = Number(data.available);
    if (!Number.isFinite(id) || !Number.isFinite(available)) return null;
    const parsed = parseVariantName(data.name, parentName);
    return {
      id,
      parentId: Number(data.parentId || parentId) || Number(parentId) || null,
      sku: normalizeText(data.code),
      skuKey: normalizeSku(data.code),
      name: normalizeText(data.name),
      color: parsed.color,
      size: parsed.size,
      available,
      price: Number(data.price || 0) || 0,
      image: data.image || data.thumbnail || '',
      status: data.status,
    };
  }

  async function collectVariants({
    parentId,
    parentName = '',
    requestChild,
    maxRequests = 80,
    delayMs = 120,
    maxDuplicateStreak = 3,
    onProgress,
  }) {
    if (!parentId) throw new Error('Thiếu parentId');
    if (typeof requestChild !== 'function') throw new Error('Thiếu requestChild');

    const expectedParentId = Number(parentId);
    const byId = new Map();
    const errors = [];
    let duplicateStreak = 0;
    let firstSeenId = null;
    let stopReason = 'max-requests';
    let requestCount = 0;

    for (let index = 0; index < maxRequests; index += 1) {
      requestCount = index + 1;
      let payload;
      try {
        payload = await requestChild(expectedParentId, index);
      } catch (error) {
        errors.push({ index, message: error && error.message ? error.message : String(error) });
        if (errors.length >= 3) {
          stopReason = 'request-errors';
          break;
        }
        await sleep(delayMs);
        continue;
      }

      const raw = payload && payload.data ? payload.data : payload;
      const variant = normalizeVariant(raw, expectedParentId, parentName);
      if (!variant) {
        errors.push({ index, message: 'Phản hồi không có variant hợp lệ' });
        if (errors.length >= 3) {
          stopReason = 'invalid-responses';
          break;
        }
        await sleep(delayMs);
        continue;
      }

      if (variant.parentId && variant.parentId !== expectedParentId) {
        errors.push({
          index,
          message: `Nguồn trả sai parentId: chờ ${expectedParentId}, nhận ${variant.parentId}`,
          variantId: variant.id,
        });
        stopReason = 'parent-mismatch';
        break;
      }

      if (firstSeenId == null) firstSeenId = variant.id;
      const existed = byId.has(variant.id);
      if (existed) duplicateStreak += 1;
      else {
        duplicateStreak = 0;
        byId.set(variant.id, variant);
      }

      if (typeof onProgress === 'function') {
        onProgress({ index: index + 1, unique: byId.size, variant, existed });
      }

      // Web nguồn đang trả lần lượt từng child variant khi gọi cùng parentId.
      // Chỉ coi là đọc đủ khi đã thấy >1 variant và quay lại variant đầu tiên.
      if (existed && variant.id === firstSeenId && byId.size > 1) {
        stopReason = 'cycle';
        break;
      }
      if (duplicateStreak >= maxDuplicateStreak) {
        stopReason = 'duplicate-streak';
        break;
      }
      await sleep(delayMs);
    }

    const confidence = stopReason === 'cycle' && byId.size > 1 && errors.length === 0
      ? 'high'
      : byId.size > 0 && errors.length < 3
        ? 'medium'
        : 'low';

    return {
      parentId: expectedParentId,
      parentName: normalizeText(parentName),
      variants: [...byId.values()],
      errors,
      requestCount,
      stopReason,
      confidence,
      // Với đồng bộ tồn thật, chỉ high confidence mới được coi là quét hoàn chỉnh.
      complete: confidence === 'high',
    };
  }

  function validateScanResult(result) {
    const issues = [];
    const variants = (result && result.variants) || [];
    const skuMap = new Map();
    const expectedParentId = Number(result && result.parentId) || null;

    if (!variants.length) {
      issues.push({ type: 'no-variants', message: 'Không đọc được biến thể nào' });
    }

    for (const variant of variants) {
      if (expectedParentId && Number(variant.parentId) !== expectedParentId) {
        issues.push({
          type: 'parent-mismatch',
          variantId: variant.id,
          message: `Variant ${variant.id} không thuộc parent ${expectedParentId}`,
        });
      }
      if (!variant.sku) {
        issues.push({ type: 'missing-sku', variantId: variant.id, message: 'Biến thể thiếu SKU/code' });
        continue;
      }
      const key = normalizeSku(variant.sku);
      if (skuMap.has(key) && skuMap.get(key) !== variant.id) {
        issues.push({
          type: 'duplicate-sku',
          sku: variant.sku,
          ids: [skuMap.get(key), variant.id],
          message: `SKU trùng: ${variant.sku}`,
        });
      } else {
        skuMap.set(key, variant.id);
      }
      if (!Number.isFinite(Number(variant.available)) || Number(variant.available) < 0) {
        issues.push({ type: 'invalid-stock', sku: variant.sku, message: `Tồn không hợp lệ: ${variant.available}` });
      }
    }

    if (!result || result.confidence !== 'high' || result.complete !== true) {
      issues.push({
        type: 'not-complete',
        confidence: result && result.confidence,
        stopReason: result && result.stopReason,
        message: 'Chưa xác nhận đã đọc đủ toàn bộ biến thể của sản phẩm',
      });
    }
    if (result && Array.isArray(result.errors) && result.errors.length) {
      issues.push({ type: 'source-errors', count: result.errors.length, message: `Có ${result.errors.length} lỗi đọc nguồn` });
    }

    return {
      issues,
      safeToSync: issues.length === 0,
    };
  }

  function buildSapoSkuIndex(sapoBySku) {
    const index = {};
    if (!sapoBySku) return index;
    for (const [sku, value] of Object.entries(sapoBySku)) {
      index[normalizeSku(sku)] = value;
    }
    return index;
  }

  function diffInventory(sourceVariants, sapoBySku) {
    const rows = [];
    const sapoIndex = buildSapoSkuIndex(sapoBySku);
    for (const variant of sourceVariants || []) {
      const sapo = variant.sku ? sapoIndex[normalizeSku(variant.sku)] : null;
      const sapoInventory = sapo && Number.isFinite(Number(sapo.inventory)) ? Number(sapo.inventory) : null;
      rows.push({
        ...variant,
        sapoInventory,
        delta: sapoInventory == null ? null : variant.available - sapoInventory,
        matched: Boolean(sapo),
      });
    }
    return rows;
  }

  function summarize(rows) {
    const list = rows || [];
    return list.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.available <= 0) acc.outOfStock += 1;
        else acc.inStock += 1;
        if (row.matched === false) acc.unmatched += 1;
        if (typeof row.delta === 'number') {
          if (row.delta > 0) acc.increase += 1;
          else if (row.delta < 0) acc.decrease += 1;
          else acc.unchanged += 1;
        }
        return acc;
      },
      { total: 0, inStock: 0, outOfStock: 0, increase: 0, decrease: 0, unchanged: 0, unmatched: 0 }
    );
  }

  return {
    sleep,
    extractProductId,
    extractParentIdFromHtml,
    normalizeText,
    normalizeSku,
    parseVariantName,
    normalizeVariant,
    collectVariants,
    validateScanResult,
    buildSapoSkuIndex,
    diffInventory,
    summarize,
  };
});
