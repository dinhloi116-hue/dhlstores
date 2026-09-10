(() => {
  'use strict';
  const core = globalThis.DHLStockCore;
  if (!core) return;

  function productTitleFromDocument(doc = document) {
    const candidates = [doc.querySelector('h1'), doc.querySelector('[itemprop="name"]'), doc.querySelector('.product-name'), doc.querySelector('.detail-title')].filter(Boolean);
    for (const el of candidates) { const text = core.normalizeText(el.textContent); if (text) return text; }
    return core.normalizeText(doc.title).replace(/\s*[-|].*$/, '');
  }

  function findProductLinksInDocument(doc, baseUrl, limit = 50, predicate = null) {
    const base = new URL(baseUrl, location.href), seen = new Map();
    for (const a of doc.querySelectorAll('a[href]')) {
      try {
        const url = new URL(a.getAttribute('href'), base);
        if (url.host !== location.host) continue;
        const id = core.extractProductId(url.href);
        if (!id || seen.has(id)) continue;
        const title = core.normalizeText(a.textContent);
        const item = { id, url: url.href, title };
        if (predicate && !predicate(item)) continue;
        seen.set(id, item);
        if (seen.size >= limit) break;
      } catch (_) {}
    }
    return [...seen.values()];
  }

  function findProductLinks(limit = 10) { return findProductLinksInDocument(document, location.href, limit); }

  async function requestChild(parentId) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`/product/child?psId=${encodeURIComponent(parentId)}`, {
        method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'follow', signal: controller.signal,
        headers: { Accept: 'application/json, text/plain, */*' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const type = response.headers.get('content-type') || '';
      if (!type.includes('json')) throw new Error('Phiên đăng nhập có thể đã hết hạn');
      const data = await response.json();
      if (!data || Number(data.code) !== 1 || !data.data) throw new Error('Nguồn trả dữ liệu không hợp lệ');
      return data;
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('Nguồn phản hồi quá 10 giây');
      throw error;
    } finally { clearTimeout(timeout); }
  }

  async function scanCurrentProduct(sendProgress) {
    const parentId = core.extractParentIdFromHtml(document.documentElement.innerHTML, core.extractProductId(location.href));
    if (!parentId) throw new Error('Không xác định được ID sản phẩm cha');
    const parentName = productTitleFromDocument();
    const result = await core.collectVariants({ parentId, parentName, requestChild, maxRequests: 80, delayMs: 160, maxDuplicateStreak: 3, onProgress: sendProgress });
    return { ...result, validation: core.validateScanResult(result) };
  }

  async function scanProductDescriptor(descriptor, sendProgress) {
    const response = await fetch(descriptor.url, { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error(`Không mở được sản phẩm: HTTP ${response.status}`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const parentId = core.extractParentIdFromHtml(html, descriptor.id);
    const parentName = productTitleFromDocument(doc) || descriptor.title || `#${parentId}`;
    const result = await core.collectVariants({ parentId, parentName, requestChild, maxRequests: 100, delayMs: 150, maxDuplicateStreak: 3, onProgress: sendProgress });
    return { ...result, validation: core.validateScanResult(result), sourceUrl: descriptor.url };
  }

  async function scanDescriptors(links, sendProgress) {
    const results = [];
    for (let i = 0; i < links.length; i += 1) {
      const descriptor = links[i];
      sendProgress({ stage: 'product', productIndex: i + 1, productTotal: links.length, descriptor });
      try {
        const result = await scanProductDescriptor(descriptor, p => sendProgress({ stage: 'variant', descriptor, ...p }));
        results.push(result);
      } catch (error) {
        results.push({ parentId: descriptor.id, parentName: descriptor.title || '', variants: [], errors: [{ message: error.message }], complete: false, sourceUrl: descriptor.url });
      }
    }
    return results;
  }

  async function scanBatch(limit, sendProgress) {
    const links = findProductLinks(limit);
    if (!links.length) {
      const currentId = core.extractProductId(location.href);
      if (currentId) return [await scanCurrentProduct(sendProgress)];
      throw new Error('Không tìm thấy link sản phẩm trên trang này');
    }
    return scanDescriptors(links, sendProgress);
  }

  async function discoverHd2026() {
    const url = new URL('/hd-pc36029.html', location.origin).href;
    const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error(`Không mở được danh mục HD: HTTP ${response.status}`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const links = findProductLinksInDocument(doc, url, 60, item => /(?:^|\s)ĐT\s+.+2026\s+HD/i.test(item.title));
    if (!links.length) throw new Error('Không tìm thấy sản phẩm ĐT 2026 HD trong danh mục nguồn');
    return links;
  }

  async function scanHd2026(sendProgress) {
    const links = await discoverHd2026();
    sendProgress({ stage: 'discovered', productTotal: links.length });
    return scanDescriptors(links, sendProgress);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) return;
    const progress = data => chrome.runtime.sendMessage({ type: 'DHL_STOCK_PROGRESS', data }).catch(() => {});
    if (message.type === 'DHL_SCAN_CURRENT') {
      scanCurrentProduct(progress).then(result => sendResponse({ ok: true, result })).catch(error => sendResponse({ ok: false, error: error.message })); return true;
    }
    if (message.type === 'DHL_SCAN_BATCH') {
      const limit = Math.max(1, Math.min(50, Number(message.limit) || 10));
      scanBatch(limit, progress).then(result => sendResponse({ ok: true, result })).catch(error => sendResponse({ ok: false, error: error.message })); return true;
    }
    if (message.type === 'DHL_SCAN_HD_2026') {
      scanHd2026(progress).then(result => sendResponse({ ok: true, result })).catch(error => sendResponse({ ok: false, error: error.message })); return true;
    }
  });
})();