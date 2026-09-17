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

    const locationId = Number(match[3]);
    const inventoryItemId = Number(match[2]);
    const nextUrl = `${match[1]}/admin/inventory_levels/set.json`;
    const nextBody = {
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available
    };

    return originalFetch(nextUrl, {
      ...init,
      method: 'POST',
      body: JSON.stringify(nextBody)
    });
  };
})();
