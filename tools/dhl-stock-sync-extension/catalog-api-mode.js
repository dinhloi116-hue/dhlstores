(() => {
  'use strict';

  const productCreate = globalThis.DHLProductCreateCore;
  if (!productCreate) return;

  const SOURCE_ORIGIN = 'https://si.aobongda.net';
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  function productIdFromUrl(value) {
    const s = String(value || '');
    const m = s.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i) || s.match(/[?&](?:psId|productId|id)=(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  function isProductDetailUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return url.origin === SOURCE_ORIGIN && Boolean(productIdFromUrl(url.href));
    } catch (_) {
      return false;
    }
  }

  async function ensureCategoryTab() {
    const tab = await activeTab();
    if (!tab || !tab.id || !String(tab.url || '').startsWith(`${SOURCE_ORIGIN}/`)) {
      throw new Error('Hãy mở đúng trang DANH MỤC trên si.aobongda.net trước.');
    }
    if (isProductDetailUrl(tab.url)) {
      throw new Error('Bạn đang ở trang CHI TIẾT sản phẩm. Hãy quay lại trang DANH MỤC rồi bấm test/quét.');
    }
    return tab;
  }

  async function discoverProducts(tabId) {
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        function pid(value) {
          const s = String(value || '');
          const m = s.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i) || s.match(/[?&](?:psId|productId|id)=(\d+)/i);
          return m ? Number(m[1]) : null;
        }
        function norm(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
        function imageUrl(anchor) {
          let el = anchor;
          for (let depth = 0; depth < 7 && el && el !== document.body; depth += 1, el = el.parentElement) {
            const imgs = [...el.querySelectorAll('img')];
            for (const img of imgs) {
              for (const attr of ['data-src', 'data-original', 'data-lazy-src', 'data-srcset', 'srcset', 'src']) {
                let raw = img.getAttribute(attr) || '';
                if (attr.includes('srcset')) raw = raw.split(',')[0].trim().split(/\s+/)[0] || '';
                if (!raw || /^data:|^blob:/i.test(raw)) continue;
                try {
                  const u = new URL(raw, location.href);
                  if (/loading|placeholder|logo|icon|sprite|zalo|facebook|youtube/i.test(u.href)) continue;
                  return u.href;
                } catch (_) {}
              }
            }
          }
          return '';
        }
        function titleFor(anchor) {
          const direct = norm(anchor.innerText || anchor.textContent);
          if (direct && direct.length > 2 && direct.length < 180 && !/^(thêm vào giỏ|mua ngay|xem chi tiết)$/i.test(direct)) return direct;
          const img = anchor.querySelector('img');
          const alt = norm(img && (img.alt || img.title));
          if (alt && alt.length < 180) return alt;
          let el = anchor.parentElement;
          for (let depth = 0; depth < 5 && el; depth += 1, el = el.parentElement) {
            const h = el.querySelector('h2,h3,h4,.product-name,[class*="product-name"],[class*="name"]');
            const text = norm(h && (h.innerText || h.textContent));
            if (text && text.length < 180) return text;
          }
          return '';
        }
        const byId = new Map();
        for (const a of document.querySelectorAll('a[href]')) {
          let url;
          try { url = new URL(a.getAttribute('href'), location.href); } catch (_) { continue; }
          if (url.host !== location.host) continue;
          const id = pid(url.href);
          if (!id) continue;
          const title = titleFor(a);
          if (!title) continue;
          const item = { id, url: url.href, title, imageUrl: imageUrl(a) };
          const old = byId.get(id);
          if (!old || title.length > old.title.length || (!old.imageUrl && item.imageUrl)) byId.set(id, item);
        }
        return {
          items: [...byId.values()],
          pageTitle: norm((document.querySelector('h1') || {}).textContent) || norm(document.title),
          pageUrl: location.href
        };
      }
    });
    return (injected && injected[0] && injected[0].result) || { items: [], pageTitle: '', pageUrl: '' };
  }

  async function scanProductApi(tabId, descriptor) {
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      args: [descriptor],
      func: async (item) => {
        const parentId = Number(item.id);
        const parentName = String(item.title || '').replace(/\s+/g, ' ').trim();
        const imageUrl = String(item.imageUrl || '');
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        function text(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
        function plain(v) {
          return text(v).toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
        }
        function normalizeSize(v) {
          const raw = text(v).toUpperCase().replace(/\s+/g, '');
          return ({ '2XL': 'XXL', '3XL': 'XXXL', '4XL': 'XXXXL', '5XL': 'XXXXXL', 'FREE SIZE': 'FREESIZE', 'FREE': 'FREESIZE' })[raw] || raw;
        }
        function extractSize(value) {
          const raw = text(value);
          let m = raw.match(/(?:^|[\s\-\/])(FREESIZE|FREE SIZE|XXXXXL|XXXXL|XXXL|XXL|XL|2XL|3XL|4XL|5XL|L|M|S|1\d\d|[2-9]\d)(?:\s*)$/i);
          if (!m) m = raw.match(/\b(FREESIZE|FREE SIZE|XXXXXL|XXXXL|XXXL|XXL|XL|2XL|3XL|4XL|5XL|L|M|S)\b/i);
          return m ? normalizeSize(m[1]) : '';
        }
        function variantId(d) {
          for (const key of ['id', 'psId', 'productId', 'childId', 'variantId']) {
            const n = Number(d && d[key]);
            if (Number.isFinite(n) && n > 0) return n;
          }
          return 0;
        }
        function stockOf(d) {
          for (const key of ['available', 'quantity', 'stock', 'inventory', 'remain', 'remainQuantity']) {
            const n = Number(d && d[key]);
            if (Number.isFinite(n) && n >= 0) return n;
          }
          return null;
        }
        function skuOf(d) { return text(d && (d.code || d.sku || d.productCode || d.barcode)); }
        function nameOf(d) { return text(d && (d.name || d.productName || d.title)); }
        function sizeOf(d) {
          return normalizeSize(text(d && (d.size || d.sizeName || d.optionSize || d.attributeSize)) || extractSize(`${nameOf(d)} ${skuOf(d)}`));
        }
        function colorOf(d) {
          const explicit = text(d && (d.color || d.colorName || d.colour || d.optionColor));
          if (explicit) return explicit;
          const name = nameOf(d);
          const parts = name.split(/\s+-\s+/).map((x) => x.trim()).filter(Boolean);
          if (parts.length >= 3 && extractSize(parts[parts.length - 1])) return parts[parts.length - 2];
          if (parts.length >= 2) return parts[parts.length - 1];
          return '(không màu)';
        }
        function sameProduct(variantName) {
          const a = plain(parentName);
          const b = plain(String(variantName || '').split(/\s+-\s+/)[0]);
          if (!a || !b) return true;
          if (b.includes(a) || a.includes(b)) return true;
          const stop = new Set(['clb', 'dt', 'tre', 'em', 'hd', 'wc', 'world', 'cup', 'ao', 'bo', 'quan', 'bong', 'da', '2024', '2025', '2026', '2027', '24', '25', '26', '27']);
          const at = a.split(' ').filter((x) => x.length > 1 && !stop.has(x));
          const bt = new Set(b.split(' ').filter((x) => x.length > 1 && !stop.has(x)));
          if (!at.length) return true;
          let hit = 0;
          for (const x of at) if (bt.has(x)) hit += 1;
          return hit / at.length >= 0.66;
        }
        async function fetchVariant(psId) {
          try {
            const response = await fetch(`/product/child?psId=${encodeURIComponent(psId)}`, {
              credentials: 'include',
              cache: 'no-store',
              headers: { Accept: 'application/json, text/plain, */*' }
            });
            if (!response.ok) return null;
            const json = await response.json();
            const d = json && (json.data || json.result || json);
            if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
            const name = nameOf(d);
            const size = sizeOf(d);
            const stock = stockOf(d);
            if (!size || stock == null) return null;
            return {
              id: variantId(d) || Number(psId),
              parentId,
              sku: skuOf(d),
              name: name || `${parentName} - ${colorOf(d)} - ${size}`,
              color: colorOf(d),
              size,
              available: Number(stock),
              price: Number(d.price || 0) || 0,
              image: text(d.image || d.imageUrl || d.avatar || imageUrl),
              status: Number(stock) > 0 ? 2 : 0,
              rawName: name
            };
          } catch (_) {
            return null;
          }
        }

        const unique = new Map();
        function add(v) {
          if (!v || !sameProduct(v.rawName || v.name)) return false;
          const key = `${plain(v.color)}|${normalizeSize(v.size)}`;
          if (!key || unique.has(key)) return false;
          unique.set(key, v);
          return true;
        }

        const first = await fetchVariant(parentId);
        if (first) add(first);
        const firstId = first && Number(first.id) > parentId ? Number(first.id) : parentId + 1;
        let stale = 0;
        let requests = 1;

        for (let id = firstId; id < firstId + 36; id += 1) {
          if (first && id === Number(first.id)) continue;
          const v = await fetchVariant(id);
          requests += 1;
          if (v && sameProduct(v.rawName || v.name)) {
            const added = add(v);
            stale = added ? 0 : stale + 1;
          } else {
            stale += 1;
          }
          if (unique.size && stale >= 6) break;
          await sleep(20);
        }

        const variants = [...unique.values()];
        return {
          parentId,
          parentName,
          sourceUrl: String(item.url || location.href),
          imageUrl,
          variants,
          complete: variants.length > 0,
          confidence: variants.length > 0 ? 'high' : 'low',
          scanMethod: 'api-child-sequential-no-click',
          requestCount: requests,
          stopReason: variants.length ? 'child-sequence-finished' : 'no-variants-found',
          errors: variants.length ? [] : [{ message: 'Không đọc được biến thể từ /product/child' }]
        };
      }
    });
    return (injected && injected[0] && injected[0].result) || null;
  }

  async function runScan(limit, store) {
    const tab = await ensureCategoryTab();
    const discovered = await discoverProducts(tab.id);
    if (!discovered.items.length) throw new Error('Không tìm thấy sản phẩm trên trang danh mục đang mở.');
    const items = discovered.items.slice(0, limit == null ? discovered.items.length : Math.max(1, limit));
    const results = [];
    const state = document.getElementById('catalogState');

    for (let i = 0; i < items.length; i += 1) {
      const descriptor = items[i];
      if (state) state.textContent = `${limit === 1 ? 'TEST NHANH' : 'Đang quét'} ${i + 1}/${items.length}: ${descriptor.title} • API, KHÔNG CLICK`;
      const result = await scanProductApi(tab.id, descriptor);
      if (result) results.push(result);
      await sleep(40);
    }

    if (store) {
      await chrome.storage.local.set({
        dhlCatalogResults: results,
        dhlCatalogSkuSamples: {},
        dhlCatalogAt: Date.now(),
        dhlCatalogPageTitle: discovered.pageTitle,
        dhlCatalogPageUrl: discovered.pageUrl
      });
    }
    return { results, discovered };
  }

  async function quickTest() {
    const scanBtn = document.getElementById('scanCatalogSource');
    const testBtn = document.getElementById('catalogQuickTest');
    const state = document.getElementById('catalogState');
    if (!testBtn || !state) return;
    testBtn.disabled = true;
    if (scanBtn) scanBtn.disabled = true;
    try {
      const { results } = await runScan(1, false);
      const first = results[0];
      const count = first && Array.isArray(first.variants) ? first.variants.length : 0;
      if (!count) throw new Error('API chưa lấy được biến thể của sản phẩm đầu tiên.');
      state.textContent = `TEST OK: ${first.parentName} • ${count} biến thể • KHÔNG click, KHÔNG mở tab, KHÔNG nhảy trang.`;
    } catch (error) {
      state.textContent = `TEST LỖI: ${error.message || String(error)}`;
    } finally {
      testBtn.disabled = false;
      if (scanBtn) scanBtn.disabled = false;
    }
  }

  async function fullScan() {
    const scanBtn = document.getElementById('scanCatalogSource');
    const testBtn = document.getElementById('catalogQuickTest');
    const exportBtn = document.getElementById('exportCatalogSource');
    const state = document.getElementById('catalogState');
    if (!scanBtn || !exportBtn || !state) return;
    scanBtn.disabled = true;
    if (testBtn) testBtn.disabled = true;
    exportBtn.disabled = true;
    try {
      const { results, discovered } = await runScan(null, true);
      const ok = results.filter((x) => (x.variants || []).length).length;
      const workbook = productCreate.makeRows(results);
      exportBtn.disabled = !workbook.rows.length;
      state.textContent = `${discovered.pageTitle || 'Danh mục'}: đọc ${ok}/${results.length} sản phẩm • ${workbook.groups.length} mẫu/màu • ${workbook.rows.length} biến thể. Quét bằng API, không click vào web.`;
    } catch (error) {
      state.textContent = `Lỗi: ${error.message || String(error)}`;
    } finally {
      scanBtn.disabled = false;
      if (testBtn) testBtn.disabled = false;
    }
  }

  async function exportProducts() {
    const state = document.getElementById('catalogState');
    try {
      const stored = await chrome.storage.local.get(['dhlCatalogResults']);
      const results = Array.isArray(stored.dhlCatalogResults) ? stored.dhlCatalogResults : [];
      const out = productCreate.buildWorkbook(results);
      const blob = new Blob([out.bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      a.href = url;
      a.download = `SAPO_TAO_SAN_PHAM_MOI_${stamp}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      if (state) state.textContent = `Đã tạo file Sapo: ${out.products} sản phẩm/màu • ${out.rows} biến thể.`;
    } catch (error) {
      if (state) state.textContent = `Lỗi tạo Excel: ${error.message || String(error)}`;
    }
  }

  function replaceButton(id, handler) {
    const old = document.getElementById(id);
    if (!old) return null;
    const fresh = old.cloneNode(true);
    old.replaceWith(fresh);
    fresh.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handler();
    });
    return fresh;
  }

  function mount() {
    const scan = document.getElementById('scanCatalogSource');
    const test = document.getElementById('catalogQuickTest');
    const exp = document.getElementById('exportCatalogSource');
    const state = document.getElementById('catalogState');
    if (!scan || !test || !exp || scan.dataset.apiMode === '1') return false;

    const scanFresh = replaceButton('scanCatalogSource', fullScan);
    const testFresh = replaceButton('catalogQuickTest', quickTest);
    const exportFresh = replaceButton('exportCatalogSource', exportProducts);
    scanFresh.dataset.apiMode = '1';
    scanFresh.textContent = 'QUÉT TOÀN BỘ TRANG ĐANG MỞ';
    testFresh.textContent = 'TEST NHANH 1 SP';
    exportFresh.textContent = 'TẠO FILE SẢN PHẨM SAPO (.XLSX)';
    if (state) state.textContent = 'Chế độ mới: quét API trực tiếp, KHÔNG click nút Thêm vào giỏ và KHÔNG tạo tab nền. Hãy TEST NHANH 1 SP trước.';
    return true;
  }

  if (!mount()) {
    const observer = new MutationObserver(() => {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 7000);
  }
})();
