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
              credentials: 'include',
              cache: 'no-store',
              headers: { Accept: 'application/json, text/plain, */*' }
            });
            if (!response.ok) continue;
            const json = await response.json();
            const data = json && json.data ? json.data : null;
            if (data) out[String(id)] = { code: data.code || '', name: data.name || '', id: data.id || '', parentId: data.parentId || id };
          } catch (_) {}
          await new Promise((resolve) => setTimeout(resolve, 40));
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
      for (const group of byColor.values()) {
        const stock = Object.create(null);
        for (const v of group.variants) stock[String(v.size || '').toUpperCase()] = Number(v.available);
        const exactSampleColor = refColor && plain(refColor) === plain(group.color);
        rows.push({
          parentId: product.parentId,
          parentName: product.parentName,
          color: group.color,
          standardName: `${product.parentName} - ${group.color}`,
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
        row.parentId,
        row.parentName,
        row.color,
        row.standardName,
        row.sampleSku,
        row.sampleColor,
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
    a.download = `DANH_SACH_NGUON_HD_2026_${stamp}.csv`;
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
      <span style="display:block;margin:6px 0 10px">Quét toàn bộ tên sản phẩm + màu + S/M/L/XL/XXL trên web nguồn. SKU mẫu nguồn được lấy trực tiếp từ API nếu đọc được. Dùng danh sách này để chuẩn hóa tên ở Sapo trước.</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="scanCatalogSource" class="primary" style="flex:1;min-width:145px">QUÉT DANH SÁCH NGUỒN</button>
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
      state.textContent = 'Đang quét toàn bộ sản phẩm và tất cả màu nguồn...';
      try {
        const tab = await ensureHdTab();
        const response = await sendToTab(tab.id, { type: 'DHL_SCAN_HD_LIVE', hints: [] });
        if (!response || !response.ok) throw new Error(response && response.error ? response.error : 'Không nhận được dữ liệu nguồn');
        catalogResults = Array.isArray(response.result) ? response.result : [];
        const ids = catalogResults.map((x) => Number(x.parentId)).filter(Boolean);
        sampleSkuByParent = await readSampleSkus(tab.id, ids);
        const rows = groupRows();
        await chrome.storage.local.set({ dhlCatalogResults: catalogResults, dhlCatalogSkuSamples: sampleSkuByParent, dhlCatalogAt: Date.now() });
        state.textContent = `Đã quét ${catalogResults.length} sản phẩm, ${rows.length} mẫu/màu nguồn. Có thể xuất CSV để sửa tên Sapo.`;
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
        state.textContent = `Đã có dữ liệu cũ: ${catalogResults.length} sản phẩm, ${rows.length} mẫu/màu${when ? ` — ${when}` : ''}.`;
      }
    }).catch(() => {});
  }

  mountUi();
})();
