(() => {
  'use strict';

  const HD_URL = 'https://si.aobongda.net/hd-pc36029.html';
  const TARGET_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
  let catalogResults = [];
  let sampleSkuByParent = Object.create(null);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function plain(value) {
    return String(value || '').toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/"/g, '""');
  }

  function csvCell(value) {
    const text = String(value == null ? '' : value);
    return /[",\n\r]/.test(text) ? `"${esc(text)}"` : text;
  }

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  function noReceiver(error) {
    return /Receiving end does not exist|Could not establish connection/i.test(String(error && error.message ? error.message : error || ''));
  }

  async function injectScanner(tabId) {
    for (const file of ['stock-core.js', 'dom-stock-parser.js', 'match-core.js', 'content.js']) {
      await chrome.scripting.executeScript({ target: { tabId }, files: [file] });
    }
    await sleep(180);
  }

  async function sendToTab(tabId, message) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      if (!noReceiver(error)) throw error;
      await injectScanner(tabId);
      return chrome.tabs.sendMessage(tabId, message);
    }
  }

  async function waitTabComplete(tabId, timeout = 25000) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === 'complete') return tab;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Trang nguồn tải quá 25 giây'));
      }, timeout);
      function listener(id, info, updated) {
        if (id === tabId && info.status === 'complete') {
          clearTimeout(timer);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(updated);
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  async function ensureHdTab() {
    const tab = await activeTab();
    if (!tab || !tab.id || !String(tab.url || '').startsWith('https://si.aobongda.net/')) {
      throw new Error('Hãy mở si.aobongda.net và đăng nhập trước.');
    }
    const current = new URL(tab.url);
    if (current.pathname !== '/hd-pc36029.html') {
      await chrome.tabs.update(tab.id, { url: HD_URL, active: true });
      await waitTabComplete(tab.id);
      await sleep(900);
    }
    return chrome.tabs.get(tab.id);
  }

  // Bước 0 phải lấy TẤT CẢ card sản phẩm đang có trên trang danh mục.
  // Không lọc theo "ĐT ... 2026 HD" như scanner tồn cũ, vì trang còn có CLB/HG và các tên khác.
  async function discoverAllProductCards(tabId) {
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        function productId(value) {
          const text = String(value || '');
          const m = text.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i) || text.match(/[?&](?:psId|productId|id)=(\d+)/i);
          return m ? Number(m[1]) : null;
        }
        function norm(value) {
          return String(value || '').replace(/\s+/g, ' ').trim();
        }
        function titleFromAnchor(a) {
          const direct = norm(a.innerText || a.textContent);
          if (direct && direct.length > 2 && direct.length < 180 && !/^(đăng nhập ngay|xem chi tiết|mua ngay)$/i.test(direct)) return direct;
          const img = a.querySelector('img');
          const alt = norm(img && (img.alt || img.title));
          if (alt && alt.length > 2 && alt.length < 180) return alt;
          return '';
        }
        function hasQuickAction(card, id) {
          if (!card) return false;
          const selectors = 'button,a,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid],[class*="cart"],[class*="buy"],[class*="quick"],[class*="add"]';
          for (const el of card.querySelectorAll(selectors)) {
            const attrs = ['id','class','onclick','href','data-id','data-product-id','data-product','data-psid','title','aria-label']
              .map((name) => (el.getAttribute && el.getAttribute(name)) || '').join(' ');
            const txt = norm(el.innerText || el.textContent);
            const all = `${txt} ${attrs}`.toLowerCase();
            if (attrs.includes(String(id)) || /thêm vào giỏ|them vao gio|add.?to.?cart|addcart|cart|quick.?buy|buy.?now|chon mua|đặt hàng|dat hang/.test(all)) return true;
          }
          return false;
        }
        function cardForAnchor(anchor, id) {
          let best = null;
          let el = anchor;
          for (let depth = 0; depth < 9 && el && el !== document.body; depth += 1, el = el.parentElement) {
            const txt = norm(el.innerText || el.textContent);
            if (!txt || txt.length > 4000) continue;
            const ids = new Set();
            for (const link of el.querySelectorAll('a[href]')) {
              const pid = productId(link.href || link.getAttribute('href'));
              if (pid) ids.add(pid);
            }
            if (ids.size <= 3 && hasQuickAction(el, id)) {
              const score = (ids.size === 1 ? 100 : 60) - txt.length / 150;
              if (!best || score > best.score) best = { el, score };
            }
          }
          return best && best.el;
        }

        const byId = new Map();
        for (const a of document.querySelectorAll('a[href]')) {
          let url;
          try { url = new URL(a.getAttribute('href'), location.href); } catch (_) { continue; }
          if (url.host !== location.host) continue;
          const id = productId(url.href);
          if (!id) continue;
          const title = titleFromAnchor(a);
          if (!title) continue;
          const card = cardForAnchor(a, id);
          if (!card) continue;
          const current = byId.get(id);
          if (!current || title.length > current.title.length) byId.set(id, { id, url: url.href, title });
        }
        return [...byId.values()];
      }
    });
    return (injected && injected[0] && Array.isArray(injected[0].result)) ? injected[0].result : [];
  }

  async function openQuickPopup(tabId, descriptor) {
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      args: [descriptor],
      func: async (item) => {
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const id = Number(item && item.id);
        function productId(value) {
          const text = String(value || '');
          const m = text.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i) || text.match(/[?&](?:psId|productId|id)=(\d+)/i);
          return m ? Number(m[1]) : null;
        }
        function norm(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
        const anchors = [...document.querySelectorAll('a[href]')].filter((a) => {
          try { return productId(new URL(a.getAttribute('href'), location.href).href) === id; } catch (_) { return false; }
        });
        let card = null;
        for (const anchor of anchors) {
          let el = anchor;
          for (let depth = 0; depth < 9 && el && el !== document.body; depth += 1, el = el.parentElement) {
            const txt = norm(el.innerText || el.textContent);
            if (!txt || txt.length > 4000) continue;
            const ids = new Set();
            for (const link of el.querySelectorAll('a[href]')) {
              try { const pid = productId(new URL(link.getAttribute('href'), location.href).href); if (pid) ids.add(pid); } catch (_) {}
            }
            const clicks = el.querySelectorAll('button,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid],[class*="cart"],[class*="buy"],[class*="quick"],[class*="add"]');
            if (ids.size <= 3 && clicks.length) { card = el; if (ids.size === 1) break; }
          }
          if (card) break;
        }
        if (!card) return { ok: false, reason: 'card-not-found' };

        const selector = 'button,a,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid],[data-variant-id],[class*="cart"],[class*="buy"],[class*="quick"],[class*="add"]';
        const scored = [...card.querySelectorAll(selector)].map((el) => {
          const attrs = ['id','class','onclick','href','data-id','data-product-id','data-product','data-psid','data-variant-id','title','aria-label']
            .map((name) => (el.getAttribute && el.getAttribute(name)) || '').join(' ');
          const txt = norm(el.innerText || el.textContent);
          const p = `${txt} ${attrs}`.toLowerCase();
          let score = 0;
          if (attrs.includes(String(id))) score += 140;
          if (/thêm vào giỏ|them vao gio|thêm giỏ|them gio|chon mua|chọn mua|dat hang|đặt hàng/.test(p)) score += 120;
          if (/add.?to.?cart|addcart|cart|quick.?buy|quick.?view|buy.?now|order/.test(p)) score += 70;
          if (el.matches('button,[role="button"],[onclick]')) score += 15;
          return { el, score };
        }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
        if (!scored.length) return { ok: false, reason: 'quick-button-not-found' };
        try { scored[0].el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (_) {}
        try { scored[0].el.click(); } catch (_) { return { ok: false, reason: 'click-failed' }; }
        await sleep(220);
        return { ok: true, candidates: scored.length };
      }
    });
    return (injected && injected[0] && injected[0].result) || { ok: false, reason: 'no-result' };
  }

  async function closePopup(tabId) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        function visible(el) {
          if (!el) return false;
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 2 && r.height > 2;
        }
        const roots = [...document.querySelectorAll('[role="dialog"],dialog,.modal,[class*="modal"],[class*="popup"],[class*="dialog"]')].filter(visible);
        const root = roots.find((el) => /tên size|tinh trang ton|tình trạng tồn|còn hàng|hết hàng/i.test(el.innerText || el.textContent || '')) || roots[0];
        if (root) {
          const close = [...root.querySelectorAll('button,a,[role="button"],[aria-label],[title],[class*="close"]')].find((el) => {
            const t = `${el.innerText || el.textContent || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.className || ''}`;
            return /(^|\s)(x|×|đóng|close)(\s|$)/i.test(t);
          });
          if (close) { try { close.click(); return; } catch (_) {} }
        }
        try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); } catch (_) {}
      }
    }).catch(() => {});
    await sleep(100);
  }

  async function scanAllCatalogProducts(tabId, descriptors, onProgress) {
    const out = [];
    for (let i = 0; i < descriptors.length; i += 1) {
      const descriptor = descriptors[i];
      if (onProgress) onProgress(i + 1, descriptors.length, descriptor);
      const opened = await openQuickPopup(tabId, descriptor);
      if (!opened.ok) {
        out.push({ parentId: descriptor.id, parentName: descriptor.title, sourceUrl: descriptor.url, variants: [], complete: false, errors: [{ message: opened.reason }] });
        continue;
      }
      try {
        const response = await sendToTab(tabId, { type: 'DHL_SCAN_CURRENT_POPUP', hints: [] });
        if (!response || !response.ok || !response.result) throw new Error(response && response.error ? response.error : 'Không đọc được popup');
        const result = response.result;
        result.parentId = Number(descriptor.id);
        result.parentName = descriptor.title;
        result.sourceUrl = descriptor.url;
        for (const variant of result.variants || []) {
          variant.parentId = Number(descriptor.id);
          variant.name = `${descriptor.title} - ${variant.color || ''} - ${variant.size || ''}`;
        }
        out.push(result);
      } catch (error) {
        out.push({ parentId: descriptor.id, parentName: descriptor.title, sourceUrl: descriptor.url, variants: [], complete: false, errors: [{ message: error.message || String(error) }] });
      } finally {
        await closePopup(tabId);
      }
    }
    return out;
  }

  async function readSampleSkus(tabId, parentIds) {
    if (!parentIds.length) return {};
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      args: [parentIds],
      func: async (ids) => {
        const out = {};
        for (const id of ids) {
          try {
            const response = await fetch(`/product/child?psId=${encodeURIComponent(id)}`, {
              credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json, text/plain, */*' }
            });
            if (!response.ok) continue;
            const json = await response.json();
            const data = json && json.data ? json.data : null;
            if (data) out[String(id)] = { code: data.code || '', name: data.name || '', id: data.id || '', parentId: data.parentId || id };
          } catch (_) {}
          await new Promise((resolve) => setTimeout(resolve, 35));
        }
        return out;
      }
    });
    return (injected && injected[0] && injected[0].result) || {};
  }

  function sampleColor(sampleName) {
    const parts = String(sampleName || '').split(/\s+-\s+/).map((x) => x.trim()).filter(Boolean);
    return parts.length >= 3 ? parts[parts.length - 2] : '';
  }

  function groupRows() {
    const rows = [];
    for (const product of catalogResults || []) {
      const byColor = new Map();
      for (const variant of product.variants || []) {
        const color = String(variant.color || '(không màu)').trim();
        const key = plain(color) || '(khong mau)';
        if (!byColor.has(key)) byColor.set(key, { color, variants: [] });
        byColor.get(key).variants.push(variant);
      }
      const sample = sampleSkuByParent[String(product.parentId)] || {};
      const refColor = sampleColor(sample.name);
      if (!byColor.size) {
        rows.push({ parentId: product.parentId, parentName: product.parentName, color: '', standardName: product.parentName, sampleSku: sample.code || '', sampleVariantName: sample.name || '', sampleColor: refColor, sampleSkuMatchesColor: false, stock: {} });
        continue;
      }
      for (const group of byColor.values()) {
        const stock = Object.create(null);
        for (const v of group.variants) stock[String(v.size || '').toUpperCase()] = Number(v.available);
        const exactSampleColor = refColor && plain(refColor) === plain(group.color);
        rows.push({
          parentId: product.parentId,
          parentName: product.parentName,
          color: group.color,
          standardName: group.color ? `${product.parentName} - ${group.color}` : product.parentName,
          sampleSku: sample.code || '',
          sampleVariantName: sample.name || '',
          sampleColor: refColor,
          sampleSkuMatchesColor: Boolean(exactSampleColor),
          stock
        });
      }
    }
    return rows;
  }

  function downloadCatalogCsv() {
    const rows = groupRows();
    if (!rows.length) return;
    const headers = ['Parent ID', 'Tên sản phẩm nguồn', 'Màu nguồn', 'Tên chuẩn đề xuất Sapo', 'SKU mẫu nguồn', 'Màu của SKU mẫu', 'SKU mẫu đúng màu?', 'S', 'M', 'L', 'XL', 'XXL'];
    const lines = [headers.map(csvCell).join(',')];
    for (const row of rows) {
      lines.push([
        row.parentId, row.parentName, row.color, row.standardName, row.sampleSku, row.sampleColor,
        row.sampleSkuMatchesColor ? 'Có' : 'Không/chưa chắc',
        ...TARGET_SIZES.map((size) => row.stock[size] == null ? '' : row.stock[size])
      ].map(csvCell).join(','));
    }
    const blob = new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    a.href = url;
    a.download = `DANH_SACH_NGUON_HD_${stamp}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function mountUi() {
    const main = document.querySelector('main');
    const steps = document.querySelector('.steps');
    if (!main || !steps || document.getElementById('catalogMode')) return;

    const section = document.createElement('section');
    section.id = 'catalogMode';
    section.className = 'safety-note';
    section.style.borderColor = '#93c5fd';
    section.style.background = '#eff6ff';
    section.innerHTML = `
      <b>BƯỚC 0 — LẤY DANH SÁCH NGUỒN (KHÔNG CẦN FILE SAPO)</b>
      <span style="display:block;margin:6px 0 10px">Quét TẤT CẢ card sản phẩm trên trang HD hiện tại, không lọc riêng ĐT 2026. Mỗi sản phẩm đọc tất cả màu và S/M/L/XL/XXL để xuất danh sách chuẩn hóa Sapo.</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="scanCatalogSource" class="primary" style="flex:1;min-width:145px">QUÉT TOÀN BỘ TRANG HD</button>
        <button id="exportCatalogSource" class="secondary" style="flex:1;min-width:145px" disabled>XUẤT CSV TÊN + SKU</button>
      </div>
      <small id="catalogState" style="display:block;margin-top:8px">Chưa quét.</small>`;
    main.insertBefore(section, steps);

    const scanBtn = document.getElementById('scanCatalogSource');
    const exportBtn = document.getElementById('exportCatalogSource');
    const state = document.getElementById('catalogState');

    scanBtn.addEventListener('click', async () => {
      scanBtn.disabled = true;
      exportBtn.disabled = true;
      state.textContent = 'Đang nhận diện tất cả card sản phẩm trên trang...';
      try {
        const tab = await ensureHdTab();
        const descriptors = await discoverAllProductCards(tab.id);
        if (!descriptors.length) throw new Error('Không nhận diện được card sản phẩm nào trên trang HD.');
        state.textContent = `Đã thấy ${descriptors.length} sản phẩm trên trang. Bắt đầu mở từng popup...`;
        catalogResults = await scanAllCatalogProducts(tab.id, descriptors, (index, total, item) => {
          state.textContent = `Đang quét ${index}/${total}: ${item.title}`;
        });
        const ids = descriptors.map((x) => Number(x.id)).filter(Boolean);
        sampleSkuByParent = await readSampleSkus(tab.id, ids);
        const rows = groupRows();
        await chrome.storage.local.set({ dhlCatalogResults: catalogResults, dhlCatalogSkuSamples: sampleSkuByParent, dhlCatalogAt: Date.now() });
        const okProducts = catalogResults.filter((x) => (x.variants || []).length > 0).length;
        state.textContent = `Trang có ${descriptors.length} sản phẩm. Đọc được popup ${okProducts}/${descriptors.length}; tạo ${rows.length} dòng sản phẩm/màu. Có thể xuất CSV.`;
        exportBtn.disabled = rows.length === 0;
      } catch (error) {
        state.textContent = `Lỗi: ${error.message || String(error)}`;
      } finally {
        scanBtn.disabled = false;
      }
    });

    exportBtn.addEventListener('click', downloadCatalogCsv);

    chrome.storage.local.get(['dhlCatalogResults', 'dhlCatalogSkuSamples', 'dhlCatalogAt']).then((stored) => {
      if (Array.isArray(stored.dhlCatalogResults) && stored.dhlCatalogResults.length) {
        catalogResults = stored.dhlCatalogResults;
        sampleSkuByParent = stored.dhlCatalogSkuSamples || {};
        const rows = groupRows();
        exportBtn.disabled = rows.length === 0;
        const when = stored.dhlCatalogAt ? new Date(stored.dhlCatalogAt).toLocaleString('vi-VN') : '';
        state.textContent = `Đã có dữ liệu cũ: ${catalogResults.length} sản phẩm, ${rows.length} dòng sản phẩm/màu${when ? ` — ${when}` : ''}.`;
      }
    }).catch(() => {});
  }

  mountUi();
})();
