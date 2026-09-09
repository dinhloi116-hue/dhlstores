(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let lastResults = [];
  let flatRows = [];

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  function setStatus(text, error = false) {
    $('statusBox').textContent = text;
    $('statusBox').classList.toggle('error', error);
  }

  function flatten(results) {
    const list = Array.isArray(results) ? results : [results];
    return list.flatMap((product) => (product.variants || []).map((variant) => ({ ...variant, parentName: product.parentName || '' })));
  }

  function render() {
    const q = $('filter').value.trim().toLowerCase();
    const rows = flatRows.filter((row) => !q || `${row.sku} ${row.name} ${row.color} ${row.size}`.toLowerCase().includes(q));
    $('resultBody').innerHTML = rows.map((row) => `
      <tr class="${row.available <= 0 ? 'out' : ''}">
        <td title="${escapeHtml(row.name)}">${escapeHtml(row.sku || '—')}</td>
        <td>${escapeHtml(row.color || '—')}</td>
        <td>${escapeHtml(row.size || '—')}</td>
        <td>${Number(row.available)}</td>
      </tr>`).join('');
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  function updateStats(results) {
    const list = Array.isArray(results) ? results : [results];
    flatRows = flatten(list);
    const errorCount = list.reduce((n, p) => n + ((p.errors || []).length || (p.validation && !p.validation.safeToSync) ? 1 : 0), 0);
    $('productCount').textContent = list.length;
    $('variantCount').textContent = flatRows.length;
    $('outCount').textContent = flatRows.filter((v) => v.available <= 0).length;
    $('errorCount').textContent = errorCount;
    $('copyJson').disabled = !flatRows.length;
    $('exportCsv').disabled = !flatRows.length;
    render();
  }

  async function send(type, extra = {}) {
    const tab = await activeTab();
    if (!tab || !tab.id || !String(tab.url || '').startsWith('https://si.aobongda.net/')) {
      throw new Error('Hãy mở si.aobongda.net trước khi quét.');
    }
    return chrome.tabs.sendMessage(tab.id, { type, ...extra });
  }

  async function runScan(type, extra = {}) {
    $('scanCurrent').disabled = true;
    $('scanBatch').disabled = true;
    setStatus('Đang quét... giữ tab nguồn mở.');
    try {
      const response = await send(type, extra);
      if (!response || !response.ok) throw new Error(response && response.error ? response.error : 'Không nhận được dữ liệu');
      lastResults = Array.isArray(response.result) ? response.result : [response.result];
      updateStats(lastResults);
      const failed = lastResults.filter((p) => !p.complete).length;
      setStatus(`Quét xong ${lastResults.length} sản phẩm, ${flatRows.length} biến thể${failed ? `, ${failed} sản phẩm có lỗi` : ''}.`, failed > 0);
      await chrome.storage.local.set({ dhlLastScan: lastResults, dhlLastScanAt: Date.now() });
    } catch (error) {
      setStatus(error.message || String(error), true);
    } finally {
      $('scanCurrent').disabled = false;
      $('scanBatch').disabled = false;
    }
  }

  function csvEscape(value) {
    const text = String(value == null ? '' : value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportCsv() {
    const header = ['parentId', 'product', 'variantId', 'sku', 'color', 'size', 'available', 'price'];
    const lines = [header.join(',')];
    for (const row of flatRows) {
      lines.push([
        row.parentId, row.parentName, row.id, row.sku, row.color, row.size, row.available, row.price,
      ].map(csvEscape).join(','));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhl-stock-scan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`Đã xuất ${flatRows.length} biến thể ra CSV.`);
  }

  $('scanCurrent').addEventListener('click', () => runScan('DHL_SCAN_CURRENT'));
  $('scanBatch').addEventListener('click', () => runScan('DHL_SCAN_BATCH', { limit: Number($('batchLimit').value) || 10 }));
  $('filter').addEventListener('input', render);
  $('exportCsv').addEventListener('click', exportCsv);
  $('copyJson').addEventListener('click', async () => {
    await navigator.clipboard.writeText(JSON.stringify(lastResults, null, 2));
    setStatus('Đã copy JSON kết quả quét.');
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === 'DHL_STOCK_PROGRESS') {
      const d = message.data || {};
      if (d.stage === 'product') setStatus(`Đang quét sản phẩm ${d.productIndex}/${d.productTotal}...`);
      else if (d.unique != null) setStatus(`Đang đọc biến thể... đã thấy ${d.unique} SKU.`);
    }
  });

  (async () => {
    const tab = await activeTab();
    const ok = tab && String(tab.url || '').startsWith('https://si.aobongda.net/');
    $('sourceState').textContent = ok ? 'Nguồn OK' : 'Mở web nguồn';
    if (ok) $('sourceState').style.background = '#eaf8ef';
    const stored = await chrome.storage.local.get(['dhlLastScan', 'dhlLastScanAt']);
    if (stored.dhlLastScan) {
      lastResults = stored.dhlLastScan;
      updateStats(lastResults);
      const time = stored.dhlLastScanAt ? new Date(stored.dhlLastScanAt).toLocaleString('vi-VN') : '';
      setStatus(`Đã nạp lần quét gần nhất${time ? `: ${time}` : ''}.`);
    }
  })().catch((error) => setStatus(error.message, true));
})();
