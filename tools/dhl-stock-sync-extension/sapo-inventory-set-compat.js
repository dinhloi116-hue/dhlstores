(() => {
  'use strict';

  if (globalThis.__DHL_SAPO_INVENTORY_SET_COMPAT__) return;
  globalThis.__DHL_SAPO_INVENTORY_SET_COMPAT__ = true;

  const originalFetch = globalThis.fetch.bind(globalThis);

  function requestUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    return input && input.url ? String(input.url) : '';
  }

  async function jsonOf(response) {
    try { return await response.clone().json(); } catch (_) { return {}; }
  }

  function inventoryLevelsFrom(data) {
    if (Array.isArray(data && data.inventory_levels)) return data.inventory_levels;
    if (Array.isArray(data && data.data)) return data.data;
    if (data && data.data && Array.isArray(data.data.inventory_levels)) return data.data.inventory_levels;
    return [];
  }

  function inventoryItemFrom(data) {
    if (data && data.inventory_item && typeof data.inventory_item === 'object') return data.inventory_item;
    if (data && data.data && data.data.inventory_item && typeof data.data.inventory_item === 'object') return data.data.inventory_item;
    if (data && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
    return data && typeof data === 'object' ? data : null;
  }

  function syntheticOk(inventoryItemId, locationId, available) {
    return new Response(JSON.stringify({
      inventory_level: {
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        available
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  async function fallbackVariantAdjustment(origin, init, inventoryItemId, locationId, available, unsupportedResponse) {
    // Sapo public Admin API documents stock adjustment on Product Variant via
    // PUT /admin/variants/{id}.json + inventory_quantity_adjustment.
    // Resolve the variant from the inventory level first so we still respect the selected location.
    const levelUrl = `${origin}/admin/inventory_levels.json?inventory_item_id=${inventoryItemId}&location_id=${locationId}&limit=5`;
    let levelResponse;
    try {
      levelResponse = await originalFetch(levelUrl, { ...init, method: 'GET', body: undefined });
    } catch (_) {
      return unsupportedResponse;
    }

    let variantId = 0;
    let currentAvailable = NaN;
    if (levelResponse.ok) {
      const levelData = await jsonOf(levelResponse);
      const levels = inventoryLevelsFrom(levelData);
      const level = levels.find(x => Number(x && x.inventory_item_id) === inventoryItemId && Number(x && x.location_id) === locationId)
        || levels.find(x => Number(x && x.inventory_item_id) === inventoryItemId)
        || levels[0];
      if (level) {
        variantId = Number(level.variant_id) || 0;
        currentAvailable = Number(level.available);
      }
    }

    // Fallback resolver for shops whose inventory_levels payload omits variant_id.
    if (!variantId) {
      try {
        const itemResponse = await originalFetch(`${origin}/admin/inventory_items/${inventoryItemId}.json`, { ...init, method: 'GET', body: undefined });
        if (itemResponse.ok) {
          const item = inventoryItemFrom(await jsonOf(itemResponse));
          variantId = Number(item && item.variant_id) || 0;
        }
      } catch (_) {}
    }

    if (!variantId) return unsupportedResponse;

    if (!Number.isFinite(currentAvailable)) {
      try {
        const variantResponse = await originalFetch(`${origin}/admin/variants/${variantId}.json`, { ...init, method: 'GET', body: undefined });
        if (!variantResponse.ok) return unsupportedResponse;
        const variantData = await jsonOf(variantResponse);
        const variant = variantData && (variantData.variant || (variantData.data && variantData.data.variant) || variantData.data);
        currentAvailable = Number(variant && variant.inventory_quantity);
      } catch (_) {
        return unsupportedResponse;
      }
    }

    if (!Number.isFinite(currentAvailable)) return unsupportedResponse;
    const adjustment = available - currentAvailable;
    if (adjustment === 0) return syntheticOk(inventoryItemId, locationId, available);

    return originalFetch(`${origin}/admin/variants/${variantId}.json`, {
      ...init,
      method: 'PUT',
      body: JSON.stringify({
        variant: {
          id: variantId,
          inventory_quantity_adjustment: adjustment
        }
      })
    });
  }

  globalThis.fetch = async function dhlSapoFetchCompat(input, init = {}) {
    const url = requestUrl(input);
    const method = String(init && init.method || (input && input.method) || 'GET').toUpperCase();
    const match = url.match(/^(https:\/\/[^/]+)\/admin\/inventory_items\/(\d+)\/locations\/(\d+)\.json(?:[?#].*)?$/i);

    if (method !== 'PUT' || !match) return originalFetch(input, init);

    let payload = {};
    try {
      payload = typeof init.body === 'string' ? JSON.parse(init.body) : (init.body || {});
    } catch (_) {
      payload = {};
    }

    const available = Number(payload && payload.inventory_level && payload.inventory_level.available);
    if (!Number.isFinite(available) || available < 0) return originalFetch(input, init);

    const origin = match[1];
    const locationId = Number(match[3]);
    const inventoryItemId = Number(match[2]);
    const nextUrl = `${origin}/admin/inventory_levels/set.json`;
    const nextBody = {
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available
    };

    // Sapo shop thực tế trả 405 cho POST ở endpoint này. Thử PUT trước.
    const setResponse = await originalFetch(nextUrl, {
      ...init,
      method: 'PUT',
      body: JSON.stringify(nextBody)
    });
    if (setResponse.ok || ![404, 405].includes(Number(setResponse.status))) return setResponse;

    // Nếu shop không hỗ trợ inventory_levels/set, dùng endpoint Variant đã được Sapo công khai tài liệu.
    return fallbackVariantAdjustment(origin, init, inventoryItemId, locationId, available, setResponse);
  };
})();
