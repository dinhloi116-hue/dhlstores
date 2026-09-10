(() => {
  'use strict';

  const core = globalThis.DHLStockCore;
  const dom = globalThis.DHLDomStockParser;
  if (!core || !dom) return;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const HD_PATH = '/hd-pc36029.html';
  const TEAM_PATTERNS = [
    ['bo dao nha', 'portugal'], ['tay ban nha', 'spain'], ['nhat ban', 'japan'], ['nhat', 'japan'],
    ['ha lan', 'netherlands'], ['argentina', 'argentina'], ['brazil', 'brazil'], ['mexico', 'mexico'],
    ['croatia', 'croatia'], ['crotia', 'croatia'], ['phap', 'france'], ['duc', 'germany'],
    ['anh', 'england'], ['bi', 'belgium'], ['y', 'italy']
  ];

  function plain(value) {
    return dom.plain(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function text(el) {
    return core.normalizeText((el && (el.innerText || el.textContent)) || '');
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2;
  }

  function teamKey(value) {
    const p = ` ${plain(value)} `;
    for (const [pattern, key] of TEAM_PATTERNS) if (p.includes(` ${pattern} `)) return key;
    return '';
  }

  function hintForTitle(title, hints) {
    const key = teamKey(title);
    return key ? (hints || []).find((hint) => hint && hint.team === key) || null : null;
  }

  function expectedSizes(hint) {
    const out = new Set();
    for (const product of (hint && hint.products) || []) {
      for (const size of product.sizes || []) {
        const normalized = dom.normalizeSize(size);
        if (normalized) out.add(normalized);
      }
    }
    return [...out];
  }

  function expectedCount(hint) {
    if (!hint || !Array.isArray(hint.products)) return 0;
    return hint.products.reduce((sum, product) => {
      return sum + new Set((product.sizes || []).map(dom.normalizeSize).filter(Boolean)).size;
    }, 0);
  }

  function productTitleFromDocument(doc = document) {
    for (const selector of ['h1', '[itemprop="name"]', '.product-name', '.detail-title', '[class*="product-name"]', '[class*="product-title"]']) {
      const el = doc.querySelector(selector);
      if (el) {
        const value = core.normalizeText(el.textContent);
        if (value) return value;
      }
    }
    return core.normalizeText(doc.title).replace(/\s*[-|].*$/, '');
  }

  function findProductLinksInDocument(doc = document, baseUrl = location.href) {
    const base = new URL(baseUrl, location.href);
    const seen = new Map();
    for (const a of doc.querySelectorAll('a[href]')) {
      try {
        const url = new URL(a.getAttribute('href'), base);
        if (url.host !== location.host) continue;
        const id = core.extractProductId(url.href);
        const title = core.normalizeText(a.textContent);
        if (!id || seen.has(id) || !/(?:^|\s)ĐT\s+.+2026\s+HD/i.test(title)) continue;
        seen.set(id, { id, url: url.href, title });
      } catch (_) {}
    }
    return [...seen.values()];
  }

  async function discoverHd2026() {
    if (location.pathname === HD_PATH) {
      const live = findProductLinksInDocument(document, location.href);
      if (live.length) return live;
    }
    const url = new URL(HD_PATH, location.origin).href;
    const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error(`Không mở được danh mục HD: HTTP ${response.status}`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const links = findProductLinksInDocument(doc, url);
    if (!links.length) throw new Error('Không tìm thấy sản phẩm ĐT 2026 HD trong danh mục nguồn');
    return links;
  }

  function stockMarker(value) {
    return /nhap so luong cho tung size|ten size|tinh trang ton|con hang|het hang|ton kho/.test(plain(value));
  }

  function colorMarker(value) {
    return /chon mau|mau sac|chon mau sac/.test(plain(value));
  }

  function findStockRoot() {
    const modalCandidates = [];
    const selectors = [
      '[role="dialog"]', 'dialog', '.modal.show', '.modal.in', '.modal', '.modal-content',
      '[class*="modal"]', '[class*="popup"]', '[class*="dialog"]', '[class*="quick"]'
    ];
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (!visible(el)) continue;
        const value = text(el);
        if (stockMarker(value)) modalCandidates.push(el);
      }
    }
    if (modalCandidates.length) {
      modalCandidates.sort((a, b) => text(a).length - text(b).length);
      return modalCandidates[0];
    }

    for (const table of document.querySelectorAll('table,[role="table"]')) {
      if (!visible(table) || !stockMarker(text(table))) continue;
      let best = table;
      for (let i = 0, el = table.parentElement; i < 8 && el; i += 1, el = el.parentElement) {
        const value = text(el);
        if (!value || value.length > 7000) break;
        best = el;
        if (colorMarker(value)) return el;
      }
      return best;
    }

    const markers = [...document.querySelectorAll('h1,h2,h3,h4,th,td,div,span,p')]
      .filter((el) => visible(el) && /nhap so luong cho tung size|ten size|tinh trang ton/.test(plain(text(el))));
    for (const marker of markers) {
      for (let i = 0, el = marker; i < 8 && el; i += 1, el = el.parentElement) {
        const value = text(el);
        if (value && value.length < 7000 && stockMarker(value)) return el;
      }
    }
    return null;
  }

  async function waitForStockRoot(timeout = 3500) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const root = findStockRoot();
      if (root) return root;
      await sleep(120);
    }
    return null;
  }

  function rowTexts(root) {
    const out = [];
    if (!root) return out;
    for (const el of root.querySelectorAll('tr,li,[role="row"]')) {
      if (!visible(el)) continue;
      const value = text(el);
      if (value && value.length <= 300) out.push(value);
    }
    for (const el of root.querySelectorAll('div,p,span')) {
      if (!visible(el) || el.childElementCount > 10) continue;
      const value = text(el);
      if (value && value.length <= 220 && dom.extractSizeStock(value)) out.push(value);
    }
    return out;
  }

  function readRows(root) {
    return dom.parseRowTexts(rowTexts(root));
  }

  async function stableRows(root, timeout = 2800) {
    let best = [];
    let previous = '';
    let stable = 0;
    const started = Date.now();
    while (Date.now() - started < timeout) {
      await sleep(140);
      const currentRoot = findStockRoot() || root;
      const rows = readRows(currentRoot);
      const signature = JSON.stringify(rows.map((row) => [row.size, row.stock]));
      if (rows.length > best.length) best = rows;
      if (signature && signature === previous) stable += 1;
      else stable = 0;
      previous = signature;
      if (rows.length >= 3 && stable >= 2) return rows;
    }
    return best;
  }

  function labelForInput(input, root) {
    if (input.id) {
      const selector = `label[for="${CSS.escape(input.id)}"]`;
      const label = root.querySelector(selector) || document.querySelector(selector);
      if (label && dom.looksLikeColorName(text(label))) return text(label);
    }
    const own = input.closest('label');
    if (own && dom.looksLikeColorName(text(own))) return text(own);
    for (const el of [input.nextElementSibling, input.previousElementSibling, input.parentElement]) {
      if (el && dom.looksLikeColorName(text(el))) return text(el);
    }
    for (const value of [input.dataset && input.dataset.color, input.dataset && input.dataset.name, input.title, input.getAttribute('aria-label'), input.value]) {
      if (dom.looksLikeColorName(value)) return core.normalizeText(value);
    }
    return '';
  }

  function clickable(el) {
    if (!el) return null;
    if (el.matches('button,a,label,input,[role="button"]')) return el;
    return el.closest('button,a,label,[role="button"]') || el;
  }

  function colorControls(root) {
    const all = [];
    if (!root) return all;
    for (const input of root.querySelectorAll('input[type="radio"],input[type="checkbox"]')) {
      const name = labelForInput(input, root);
      if (name) all.push({ name, el: input, priority: 120 });
    }
    for (const el of root.querySelectorAll('button,label,a,[role="button"],[data-color],[data-name],[class*="color"],[class*="mau"]')) {
      if (!visible(el)) continue;
      const values = [el.getAttribute('data-color'), el.getAttribute('data-name'), el.title, el.getAttribute('aria-label'), text(el)];
      const name = values.find((value) => dom.looksLikeColorName(value));
      if (name) all.push({ name: core.normalizeText(name), el: clickable(el), priority: el.matches('label,button,[role="button"]') ? 90 : 50 });
    }
    all.sort((a, b) => b.priority - a.priority);
    const out = [];
    const seen = new Set();
    for (const item of all) {
      const key = dom.colorKey(item.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function findColorControl(name, root) {
    const key = dom.colorKey(name);
    return colorControls(root).find((item) => dom.colorKey(item.name) === key) || null;
  }

  async function clickElement(el) {
    if (!el) return;
    try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (_) {}
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
      try { el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })); } catch (_) {}
    }
    try { el.click(); } catch (_) {}
    if (el.matches && el.matches('input')) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async function clickColorControl(control) {
    if (!control || !control.el) return;
    await clickElement(control.el);
    await sleep(260);
  }

  function productAnchors(descriptor) {
    const out = [];
    for (const a of document.querySelectorAll('a[href]')) {
      try {
        const url = new URL(a.getAttribute('href'), location.href);
        if (core.extractProductId(url.href) === Number(descriptor.id)) out.push(a);
      } catch (_) {}
    }
    return out;
  }

  function cardForDescriptor(descriptor) {
    const anchors = productAnchors(descriptor);
    let best = null;
    for (const anchor of anchors) {
      let el = anchor;
      for (let depth = 0; depth < 8 && el; depth += 1, el = el.parentElement) {
        if (!el || el === document.body) break;
        const value = text(el);
        if (!value || value.length > 3500) continue;
        const productLinks = [...el.querySelectorAll('a[href]')].filter((a) => {
          try { return !!core.extractProductId(new URL(a.getAttribute('href'), location.href).href); } catch (_) { return false; }
        });
        const clickables = el.querySelectorAll('button,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid],[class*="cart"],[class*="buy"],[class*="quick"]').length;
        if (productLinks.length <= 3 && clickables) {
          const score = (productLinks.length === 1 ? 100 : 60) - value.length / 100;
          if (!best || score > best.score) best = { el, score };
        }
      }
    }
    return best ? best.el : (anchors[0] ? anchors[0].parentElement : null);
  }

  function elementSummary(el) {
    if (!el) return '';
    const attrs = ['id', 'class', 'onclick', 'href', 'data-id', 'data-product-id', 'data-product', 'data-psid', 'title', 'aria-label']
      .map((name) => `${name}=${el.getAttribute && el.getAttribute(name) ? el.getAttribute(name) : ''}`)
      .join(' ');
    return `${el.tagName || ''} text="${text(el).slice(0, 80)}" ${attrs}`.slice(0, 500);
  }

  function quickCandidates(descriptor, card) {
    const id = String(descriptor.id);
    const selectors = 'button,a,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid],[data-variant-id],[class*="cart"],[class*="buy"],[class*="quick"],[class*="add"]';
    const pools = [];
    if (card) pools.push(...card.querySelectorAll(selectors));
    pools.push(...document.querySelectorAll(`[data-id="${CSS.escape(id)}"],[data-product-id="${CSS.escape(id)}"],[data-product="${CSS.escape(id)}"],[data-psid="${CSS.escape(id)}"]`));

    const unique = [];
    const seen = new Set();
    for (const el of pools) {
      if (!el || seen.has(el) || !visible(el)) continue;
      seen.add(el);
      const rawText = text(el);
      const attrs = ['id', 'class', 'onclick', 'href', 'data-id', 'data-product-id', 'data-product', 'data-psid', 'data-variant-id', 'title', 'aria-label']
        .map((name) => (el.getAttribute && el.getAttribute(name)) || '')
        .join(' ');
      const p = plain(`${rawText} ${attrs}`);
      let score = 0;
      if (attrs.includes(id)) score += 140;
      if (/them vao gio|them gio|chon mua|chon size|dat hang/.test(p)) score += 120;
      if (/add.?to.?cart|addcart|cart|quick.?buy|quick.?view|buy.?now|order/.test(p)) score += 70;
      if (card && card.contains(el)) score += 25;
      if (el.matches('button,[role="button"],[onclick]')) score += 15;

      if (el.tagName === 'A') {
        const href = el.getAttribute('href') || '';
        let productHref = false;
        try { productHref = core.extractProductId(new URL(href, location.href).href) === Number(descriptor.id); } catch (_) {}
        if (productHref && !/cart|buy|quick|add|gio|mua|dat|chon/.test(p.replace(plain(descriptor.title), ''))) score -= 180;
      }
      if (score > 0) unique.push({ el, score, summary: elementSummary(el) });
    }
    unique.sort((a, b) => b.score - a.score);
    return unique.slice(0, 12);
  }

  function modalContainer(root) {
    if (!root) return null;
    return root.closest('[role="dialog"],dialog,.modal,[class*="modal"],[class*="popup"],[class*="dialog"]') || root;
  }

  async function closeStockPopup(root) {
    const container = modalContainer(root) || root;
    if (!container) return;
    const candidates = [...container.querySelectorAll('button,a,[role="button"],[aria-label],[title],[class*="close"]')]
      .filter(visible)
      .map((el) => {
        const p = plain(`${text(el)} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.className || ''}`);
        let score = 0;
        if (/dong|close|modal close|btn close/.test(p)) score += 100;
        if (/^[x×]$/.test(text(el).trim().toLowerCase())) score += 120;
        if (String(el.className || '').toLowerCase().includes('close')) score += 70;
        return { el, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    if (candidates[0]) {
      await clickElement(candidates[0].el);
      await sleep(180);
      return;
    }
    try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); } catch (_) {}
    await sleep(120);
  }

  async function openStockPopup(descriptor) {
    const existing = findStockRoot();
    if (existing) await closeStockPopup(existing);

    const card = cardForDescriptor(descriptor);
    const candidates = quickCandidates(descriptor, card);
    const attempts = [];
    for (const candidate of candidates) {
      attempts.push(candidate.summary);
      await clickElement(candidate.el);
      const root = await waitForStockRoot(1700);
      if (root) return { root, cardFound: !!card, attempts };
    }

    const diagnostics = {
      cardFound: !!card,
      productAnchorCount: productAnchors(descriptor).length,
      quickCandidates: attempts.length ? attempts : (card ? [elementSummary(card)] : [])
    };
    const error = new Error(`Không mở được popup tồn cho ${descriptor.title}. Tool đã tìm ${candidates.length} nút mua nhanh.`);
    error.diagnostics = diagnostics;
    throw error;
  }

  async function firstVariant(parentId, parentName) {
    try {
      const response = await fetch(`/product/child?psId=${encodeURIComponent(parentId)}`, {
        credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json, text/plain, */*' }
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data && data.data ? core.normalizeVariant(data.data, parentId, parentName) : null;
    } catch (_) {
      return null;
    }
  }

  function makeVariant(parentId, parentName, color, row, index) {
    const cleanColor = core.normalizeText(color) || '(không màu)';
    const size = dom.normalizeSize(row.size);
    return {
      id: Number(parentId) * 1000 + index + 1,
      parentId: Number(parentId),
      sku: `DOM-${parentId}-${dom.colorKey(cleanColor).replace(/\s+/g, '_') || 'COLOR'}-${size}`.toUpperCase(),
      name: `${parentName} - ${cleanColor} - ${size}`,
      color: cleanColor,
      size,
      available: Number(row.stock),
      price: 0,
      image: '',
      status: Number(row.stock) > 0 ? 2 : 0,
      scanMethod: 'live-category-popup'
    };
  }

  async function readOpenedPopup(descriptor, hints, progress, openInfo = null) {
    const root = (openInfo && openInfo.root) || findStockRoot();
    if (!root) throw new Error('Chưa có popup tồn kho đang mở');

    const parentId = Number(descriptor.id || core.extractProductId(location.href));
    const parentName = core.normalizeText(descriptor.title || productTitleFromDocument() || `#${parentId}`);
    const hint = hintForTitle(parentName, hints);
    const expected = expectedCount(hint);
    const neededSizes = expectedSizes(hint);
    const expectedColorCount = hint && hint.products ? hint.products.length : 0;
    const first = await firstVariant(parentId, parentName);
    const fallbackColor = first && first.color ? first.color : '';

    let names = dom.dedupeColorNames(colorControls(root).map((item) => item.name));
    if (!names.length && fallbackColor) names = [fallbackColor];
    if (!names.length) names = ['(không màu)'];

    const variants = [];
    const snapshots = [];
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      let currentRoot = findStockRoot() || root;
      const control = findColorControl(name, currentRoot);
      if (control) await clickColorControl(control);
      currentRoot = findStockRoot() || currentRoot;
      const rows = await stableRows(currentRoot);
      snapshots.push({ color: name, rows });
      progress({ stage: 'dom-color', descriptor, color: name, colorIndex: index + 1, colorTotal: names.length, rows: rows.length });
      rows.forEach((row) => variants.push(makeVariant(parentId, parentName, name, row, variants.length)));
    }

    const unique = new Map();
    for (const variant of variants) {
      const key = `${dom.colorKey(variant.color)}|${dom.normalizeSize(variant.size)}`;
      if (!unique.has(key)) unique.set(key, variant);
    }
    const list = [...unique.values()];
    const colorKeys = [...new Set(list.map((variant) => dom.colorKey(variant.color)).filter(Boolean))];
    const missing = [];
    if (neededSizes.length) {
      for (const color of colorKeys) {
        for (const size of neededSizes) {
          if (!list.some((variant) => dom.colorKey(variant.color) === color && dom.normalizeSize(variant.size) === size)) missing.push(`${color}/${size}`);
        }
      }
    }
    const complete = Boolean(list.length) && (!expected || list.length >= expected) && (!expectedColorCount || colorKeys.length >= expectedColorCount) && missing.length === 0;
    const result = {
      parentId,
      parentName,
      variants: list,
      errors: [],
      requestCount: 1,
      stopReason: complete ? 'live-popup-complete' : 'live-popup-partial',
      confidence: list.length ? (complete ? 'high' : 'medium') : 'low',
      complete,
      scanMethod: 'live-category-popup',
      sourceUrl: location.href,
      expectedFromSapo: expected,
      domDiagnostics: {
        stockUiFound: true,
        cardFound: openInfo ? openInfo.cardFound : null,
        quickCandidates: openInfo ? openInfo.attempts : [],
        colorControls: names,
        colorsRead: colorKeys.length,
        expectedColorCount,
        expectedSizes: neededSizes,
        missingSizes: missing,
        snapshots
      }
    };
    result.validation = core.validateScanResult(result);
    return result;
  }

  async function scanOneDescriptor(descriptor, hints, progress) {
    let openInfo = null;
    try {
      openInfo = await openStockPopup(descriptor);
      const result = await readOpenedPopup(descriptor, hints, progress, openInfo);
      await closeStockPopup(findStockRoot() || openInfo.root);
      return result;
    } catch (error) {
      if (findStockRoot()) await closeStockPopup(findStockRoot());
      return {
        parentId: Number(descriptor.id),
        parentName: descriptor.title || '',
        sourceUrl: descriptor.url || location.href,
        variants: [],
        complete: false,
        confidence: 'low',
        scanMethod: 'live-category-popup',
        stopReason: 'popup-open-error',
        errors: [{ message: error.message || String(error) }],
        domDiagnostics: error.diagnostics || { cardFound: openInfo ? openInfo.cardFound : null, quickCandidates: openInfo ? openInfo.attempts : [] }
      };
    }
  }

  async function scanHdLive(hints, progress) {
    const links = await discoverHd2026();
    progress({ stage: 'discovered', productTotal: links.length });
    const results = [];
    for (let i = 0; i < links.length; i += 1) {
      const descriptor = links[i];
      progress({ stage: 'product', productIndex: i + 1, productTotal: links.length, descriptor });
      const result = await scanOneDescriptor(descriptor, hints, progress);
      results.push(result);
      await sleep(180);
    }
    return results;
  }

  async function scanCurrentPopup(hints, progress) {
    const root = findStockRoot();
    if (!root) throw new Error('Hãy mở popup chọn màu/size của một sản phẩm trước rồi bấm Test popup đang mở.');
    const parentId = core.extractParentIdFromHtml(document.documentElement.innerHTML, core.extractProductId(location.href));
    const descriptor = { id: parentId || core.extractProductId(location.href) || 0, title: productTitleFromDocument(), url: location.href };
    return readOpenedPopup(descriptor, hints, progress, { root, cardFound: null, attempts: [] });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) return;
    const hints = Array.isArray(message.hints) ? message.hints : [];
    const progress = (data) => chrome.runtime.sendMessage({ type: 'DHL_STOCK_PROGRESS', data }).catch(() => {});

    if (message.type === 'DHL_DISCOVER_HD_2026') {
      discoverHd2026().then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'DHL_SCAN_HD_LIVE') {
      scanHdLive(hints, progress).then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'DHL_SCAN_CURRENT_POPUP' || message.type === 'DHL_SCAN_CURRENT_DOM' || message.type === 'DHL_SCAN_CURRENT') {
      scanCurrentPopup(hints, progress).then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
  });
})();
