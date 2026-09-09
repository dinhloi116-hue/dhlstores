(() => {
  'use strict';

  const core = globalThis.DHLStockCore;
  if (!core) return;

  function productTitleFromDocument(doc = document) {
    const candidates = [
      doc.querySelector('h1'),
      doc.querySelector('[itemprop="name"]'),
      doc.querySelector('.product-name'),
      doc.querySelector('.detail-title'),
    ].filter(Boolean);
    for (const el of candidates) {
      const text = core.normalizeText(el.textContent);
      if (text) return text;
    }
    return core.normalizeText(doc.title).replace(/\s*[-|].*$/, '');
  }

  function findProductLinks(limit = 10) {
    const currentHost = location.host;
    const seen = new Map();
    for (const a of document.querySelectorAll('a[href]')) {
      try {
        const url = new URL(a.href, location.href);
        if (url.host !== currentHost) continue;
        const id = core.extractProductId(url.href);
        if (!id || seen.has(id)) continue;
        seen.set(id, { id, url: url.href, title: core.normalizeText(a.textContent) });
        if (seen.size >= limit) break;
      } catch (_) {}
    }
    return [...seen.values()];
  }

  async function requestChild(parentId) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`/product/child?psId=${encodeURIComponent(parentId)}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal,
        headers: { Accept: 'application/json, text/plain, */*' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const type = response.headers.get('content-type') || '';
      if (!type.includes('json')) throw new Error('Phiên đăng nhập có thể đã hết hạn');
      const data = await response.json();
      if (!data || Number(data.code) !== 1 || !data.data) {
        throw new Error('Nguồn trả dữ liệu không hợp lệ');
      }
      return data;
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('Nguồn phản hồi quá 10 giây');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function scanCurrentProduct(sendProgress) {
    const parentId = core.extractParentIdFromHtml(document.documentElement.innerHTML, core.extractProductId(location.href));
    if (!parentId) throw new Error('Không xác định được ID sản phẩm cha');
    const parentName = productTitleFromDocument();
    const result = await core.collectVariants({
      parentId,
      parentName,
      requestChild,
      maxRequests: 80,
      delayMs: 160,
      maxDuplicateStreak: 3,
      onProgress: sendProgress,
    });
    return { ...result, validation: core.validateScanResult(result) };
  }

  async function scanProductDescriptor(descriptor, sendProgress) {
    const response = await fetch(descriptor.url, { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error(`Không mở được sản phẩm: HTTP ${response.status}`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const parentId = core.extractParentIdFromHtml(html, descriptor.id);
    const parentName = productTitleFromDocument(doc) || descriptor.title || `#${parentId}`;
    const result = await core.collectVariants({
      parentId,
      parentName,
      requestChild,
      maxRequests: 80,
      delayMs: 160,
      maxDuplicateStreak: 3,
      onProgress: sendProgress,
    });
    return { ...result, validation: core.validateScanResult(result) };
  }

  async function scanBatch(limit, sendProgress) {
    const links = findProductLinks(limit);
    if (!links.length) {
      const currentId = core.extractProductId(location.href);
      if (currentId) return [await scanCurrentProduct(sendProgress)];
      throw new Error('Không tìm thấy link sản phẩm trên trang này');
    }

    const results = [];
    for (let i = 0; i < links.length; i += 1) {
      const descriptor = links[i];
      sendProgress({ stage: 'product', productIndex: i + 1, productTotal: links.length, descriptor });
      try {
        const result = await scanProductDescriptor(descriptor, (p) => sendProgress({ stage: 'variant', descriptor, ...p }));
        results.push(result);
      } catch (error) {
        results.push({ parentId: descriptor.id, parentName: descriptor.title || '', variants: [], errors: [{ message: error.message }], complete: false });
      }
    }
    return results;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) return;

    const progress = (data) => chrome.runtime.sendMessage({ type: 'DHL_STOCK_PROGRESS', data }).catch(() => {});

    if (message.type === 'DHL_SCAN_CURRENT') {
      scanCurrentProduct(progress)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message.type === 'DHL_SCAN_BATCH') {
      const limit = Math.max(1, Math.min(50, Number(message.limit) || 10));
      scanBatch(limit, progress)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
  });
})();
