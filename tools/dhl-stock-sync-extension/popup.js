(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const matcher = globalThis.DHLMatchCore;
  const xlsx = globalThis.DHLXlsxLite;
  if (!matcher || !xlsx) return;

  const HD_URL = 'https://si.aobongda.net/hd-pc36029.html';
  let sapoData = null;
  let templateBuffer = null;
  let sourceResults = [];
  let matches = [];
  let sapoExportFileName = '';
  let sapoTemplateFileName = '';
  let lastStatusText = 'Chưa bắt đầu.';

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  function setStatus(text, kind = '') {
    const el = $('statusBox');
    lastStatusText = String(text || '');
    el.textContent = lastStatusText;
    el.classList.toggle('error', kind === 'error');
    el.classList.toggle('ok', kind === 'ok');
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>\"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  function sourceGroups() {
    return matcher.groupSourceVariants(sourceResults);
  }

  function variantMatches() {
    const rows = [];
    for (const match of matches) {
      for (const vm of match.variantMatches || []) {
        if (vm && vm.sapo && vm.source) rows.push({ productMatch: match, ...vm });
      }
    }
    return rows;
  }

  function readyVariantCount() {
    return variantMatches().length;
  }

  function matchedProductCount() {
    return matches.filter((match) => (match.variantMatches || []).some((vm) => vm.source)).length;
  }

  function canMakeImport() {
    return Boolean(sapoData && templateBuffer && readyVariantCount() > 0);
  }

  function updateStats() {
    $('sapoProductCount').textContent = sapoData ? sapoData.products.length : 0;
    $('sapoVariantCount').textContent = sapoData ? sapoData.variants.length : 0;
    $('sourceGroupCount').textContent = sourceGroups().length;
    $('matchedCount').textContent = matchedProductCount();
    $('readyVariantCount').textContent = readyVariantCount();
    $('makeImport').disabled = !canMakeImport();
  }

  function renderMatches() {
    const query = $('filter').value.trim().toLowerCase();
    const rows = matches.filter((match) => {
      const text = `${match.sapoProduct.name} ${match.sapoProduct.skuBase || ''} ${match.best ? match.best.parentName : ''} ${match.best ? match.best.color : ''}`.toLowerCase();
      return !query || text.includes(query);
    });

    $('matchBody').innerHTML = rows.map((match) => {
      const best = match.best ? `${match.best.parentName} / ${match.best.color}` : '—';
      const okSizes = (match.variantMatches || []).filter((vm) => vm.source).length;
      const totalSizes = match.sapoProduct.variants.length;
      const score = match.best ? Math.round(Number(match.best.score || 0) * 100) : 0;
      const all = okSizes === totalSizes && totalSizes > 0;
      const some = okSizes > 0;
      const cls = all ? 'ok-row' : 'warn-row';
      const pill = all
        ? '<span class="pill ok">Đủ</span>'
        : some
          ? `<span class="pill warn">Có ${okSizes}/${totalSizes}</span>`
          : '<span class="pill warn">Chưa có</span>';
      const base = match.sapoProduct.skuBase ? `<br><small>SKU gốc: ${escapeHtml(match.sapoProduct.skuBase)}</small>` : '';
      return `<tr class="${cls}"><td>${escapeHtml(match.sapoProduct.name)}${base}</td><td>${escapeHtml(best)}</td><td class="score">${score}%</td><td>${okSizes}/${totalSizes}</td><td>${pill}</td></tr>`;
    }).join('');
  }

  function recomputeMatches() {
    matches = sapoData && sourceResults.length ? matcher.matchSapoProducts(sapoData.products, sourceResults) : [];
    updateStats();
    renderMatches();

    if (!sapoData) return;
    const ready = readyVariantCount();
    const total = sapoData.variants.length;
    const productReady = matchedProductCount();
    const groups = sourceGroups().length;

    if (!sourceResults.length) {
      setStatus(`Đã đọc file Sapo: ${sapoData.products.length} sản phẩm, ${total} biến thể. Bấm QUÉT KHO HD 2026.`, 'ok');
      return;
    }

    if (ready > 0) {
      const missing = Math.max(0, total - ready);
      setStatus(`Đã ghép ${ready}/${total} biến thể thuộc ${productReady}/${sapoData.products.length} sản phẩm. Nguồn thấy ${groups} mẫu/màu. Có thể tạo file cho ${ready} dòng; ${missing} dòng chưa có dữ liệu nguồn sẽ BỎ QUA, không ghi 0.`, ready === total ? 'ok' : '');
    } else {
      setStatus(`Chưa ghép được biến thể nào. Nguồn đang thấy ${groups} mẫu/màu. Xuất báo cáo lỗi nếu quét xong vẫn là 0.`, 'error');
    }
  }

  async function loadExport(file) {
    if (!file) return;
    sapoExportFileName = file.name || '';
    setStatus('Đang đọc file xuất Sapo...');
    try {
      sapoData = await xlsx.parseSapoExport(await file.arrayBuffer());
      const sizeText = `${sapoData.sizeResolved}/${sapoData.sizeTotal} size tự nhận`;
      $('exportState').textContent = `${sapoData.products.length} sản phẩm • ${sapoData.variants.length} biến thể • ${sizeText}`;
      recomputeMatches();
    } catch (error) {
      sapoData = null;
      $('exportState').textContent = 'File không hợp lệ.';
      updateStats();
      setStatus(error.message || String(error), 'error');
    }
  }

  async function loadTemplate(file) {
    if (!file) return;
    sapoTemplateFileName = file.name || '';
    setStatus('Đang kiểm tra file mẫu nhập...');
    try {
      const buffer = await file.arrayBuffer();
      const book = await xlsx.readFirstSheet(buffer);
      const headers = xlsx.headerMap(book.rows[0] || []);
      const inventoryHeader = Object.keys(headers).find((key) => /Tồn kho/i.test(key));
      if (!inventoryHeader || headers['Id phiên bản'] == null) throw new Error('Không đúng mẫu nhập Sapo: thiếu cột Tồn kho hoặc Id phiên bản.');
      templateBuffer = buffer;
      $('templateState').textContent = `Đúng mẫu • cột tồn: ${inventoryHeader}`;
      updateStats();
      setStatus('File mẫu nhập hợp lệ. Tool sẽ dùng nó làm khuôn cột, không dùng các dòng Iphone mẫu.', 'ok');
    } catch (error) {
      templateBuffer = null;
      $('templateState').textContent = 'Mẫu không hợp lệ.';
      updateStats();
      setStatus(error.message || String(error), 'error');
    }
  }

  function noReceiver(error) {
    return /Receiving end does not exist|Could not establish connection/i.test(String(error && error.message ? error.message : error || ''));
  }

  async function injectScanner(tabId) {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['stock-core.js'] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ['dom-stock-parser.js'] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await new Promise((resolve) => setTimeout(resolve, 180));
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
    const current = await chrome.tabs.get(tabId);
    if (current.status === 'complete') return current;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Trang nguồn tải quá 25 giây'));
      }, timeout);
      function listener(id, info, tab) {
        if (id === tabId && info.status === 'complete') {
          clearTimeout(timer);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(tab);
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  async function ensureHdCategoryTab() {
    const tab = await activeTab();
    if (!tab || !tab.id || !String(tab.url || '').startsWith('https://si.aobongda.net/')) {
      throw new Error('Hãy mở si.aobongda.net và đăng nhập trước.');
    }
    const current = new URL(tab.url);
    if (current.pathname !== '/hd-pc36029.html') {
      setStatus('Đang chuyển tab nguồn sang danh mục HD để quét trực tiếp popup mua nhanh...');
      await chrome.tabs.update(tab.id, { url: HD_URL, active: true });
      await waitTabComplete(tab.id);
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    return chrome.tabs.get(tab.id);
  }

  async function runHdScan() {
    $('scanHd').disabled = true;
    $('scanCurrent').disabled = true;
    $('makeImport').disabled = true;
    try {
      if (!sapoData) throw new Error('Chọn file xuất Sapo trước để tool biết cần tìm đội/màu/size nào.');
      const hints = matcher.buildScanHints(sapoData.products);
      const tab = await ensureHdCategoryTab();
      setStatus('Đang quét trực tiếp danh mục HD. Tool sẽ lần lượt bấm nút mua của từng sản phẩm, đọc popup màu → size → tồn. Không click chuột trên trang cho tới khi xong.');
      const response = await sendToTab(tab.id, { type: 'DHL_SCAN_HD_LIVE', hints });
      if (!response || !response.ok) throw new Error(response && response.error ? response.error : 'Không nhận được dữ liệu nguồn');
      sourceResults = Array.isArray(response.result) ? response.result : [];
      await chrome.storage.local.set({ dhlLastSourceResults: sourceResults, dhlLastSourceAt: Date.now() });
      recomputeMatches();
    } catch (error) {
      setStatus(error.message || String(error), 'error');
    } finally {
      $('scanHd').disabled = false;
      $('scanCurrent').disabled = false;
      updateStats();
    }
  }

  async function runCurrentPopupTest() {
    $('scanHd').disabled = true;
    $('scanCurrent').disabled = true;
    try {
      const tab = await activeTab();
      if (!tab || !tab.id || !String(tab.url || '').startsWith('https://si.aobongda.net/')) throw new Error('Hãy mở si.aobongda.net trước.');
      const hints = sapoData ? matcher.buildScanHints(sapoData.products) : [];
      setStatus('Đang đọc popup đang mở...');
      const response = await sendToTab(tab.id, { type: 'DHL_SCAN_CURRENT_POPUP', hints });
      if (!response || !response.ok) throw new Error(response && response.error ? response.error : 'Không nhận được dữ liệu popup');
      sourceResults = [response.result];
      await chrome.storage.local.set({ dhlLastSourceResults: sourceResults, dhlLastSourceAt: Date.now() });
      recomputeMatches();
    } catch (error) {
      setStatus(error.message || String(error), 'error');
    } finally {
      $('scanHd').disabled = false;
      $('scanCurrent').disabled = false;
      updateStats();
    }
  }

  async function makeImport() {
    if (!sapoData || !templateBuffer) return;
    const rows = variantMatches();
    if (!rows.length) {
      setStatus('Chưa có biến thể nào ghép được với tồn nguồn.', 'error');
      return;
    }

    const inventory = Object.create(null);
    for (const row of rows) inventory[String(row.sapo.variantId)] = Number(row.source.available);

    try {
      setStatus(`Đang tạo file nhập cho ${rows.length} biến thể đã ghép...`);
      const out = await xlsx.buildSapoImport(templateBuffer, sapoData, inventory);
      const blob = new Blob([out.bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      a.href = url;
      a.download = `SAPO_NHAP_TON_KHO_${stamp}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setStatus(`Đã tạo ${out.rows} dòng cập nhật tồn. Ví dụ nếu Mexico / S nguồn = 7 thì đúng dòng Mexico-S trong file nhập sẽ có Tồn kho = 7. Các biến thể chưa đọc được nguồn không xuất vào file.`, 'ok');
    } catch (error) {
      setStatus(error.message || String(error), 'error');
    }
  }

  function val(value) {
    if (value == null || value === '') return '—';
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch (_) {}
    }
    return String(value);
  }

  function buildErrorReport() {
    const lines = [];
    const add = (line = '') => lines.push(String(line));
    const groups = sourceGroups();
    const ready = readyVariantCount();

    add('DHL STOCK SYNC - BÁO CÁO LỖI / CHẨN ĐOÁN');
    add('============================================================');
    add(`Thời điểm: ${new Date().toLocaleString('vi-VN')}`);
    add('Phiên bản tool: 0.9.0');
    add(`Trạng thái: ${lastStatusText}`);
    add(`File xuất Sapo: ${sapoExportFileName || '—'}`);
    add(`File mẫu nhập: ${sapoTemplateFileName || '—'}`);
    add('');
    add(`SAPO: ${sapoData ? sapoData.products.length : 0} sản phẩm | ${sapoData ? sapoData.variants.length : 0} biến thể | size ${sapoData ? `${sapoData.sizeResolved}/${sapoData.sizeTotal}` : '0/0'}`);
    add(`NGUỒN: ${sourceResults.length} sản phẩm | ${groups.length} mẫu/màu`);
    add(`GHÉP BIẾN THỂ: ${ready}/${sapoData ? sapoData.variants.length : 0} | SP có dữ liệu: ${matchedProductCount()}/${sapoData ? sapoData.products.length : 0}`);
    add('');
    add('1. CHI TIẾT QUÉT POPUP NGUỒN');
    add('============================================================');
    sourceResults.forEach((product, index) => {
      add(`\n[Nguồn ${index + 1}/${sourceResults.length}] ${val(product.parentName)}`);
      add(`URL: ${val(product.sourceUrl)}`);
      add(`Parent ID: ${val(product.parentId)} | method=${val(product.scanMethod)} | complete=${val(product.complete)} | confidence=${val(product.confidence)} | stop=${val(product.stopReason)}`);
      const d = product.domDiagnostics || {};
      add(`Card tìm thấy: ${val(d.cardFound)}`);
      add(`Nút đã thử: ${val(d.quickCandidates)}`);
      add(`Màu control thấy: ${val(d.colorControls)}`);
      add(`Số màu đọc: ${val(d.colorsRead)} / cần: ${val(d.expectedColorCount)}`);
      add(`Size cần: ${val(d.expectedSizes)}`);
      add(`Size/màu còn thiếu: ${val(d.missingSizes)}`);
      if (product.errors && product.errors.length) add(`Lỗi: ${val(product.errors)}`);
      for (const variant of product.variants || []) add(`  ${variant.color} | ${variant.size} | tồn=${variant.available} | sku=${variant.sku}`);
      if (d.snapshots && d.snapshots.length) {
        add('Snapshot từng màu:');
        for (const snapshot of d.snapshots) add(`  ${snapshot.color}: ${(snapshot.rows || []).map((row) => `${row.size}=${row.stock}`).join(', ') || 'KHÔNG ĐỌC ĐƯỢC'}`);
      }
    });
    add('\n2. GHÉP TỪNG BIẾN THỂ SAPO ↔ NGUỒN');
    add('============================================================');
    matches.forEach((match, index) => {
      const p = match.sapoProduct || {};
      const best = match.best ? `${match.best.parentName} / ${match.best.color} (${Math.round((match.best.score || 0) * 100)}%)` : 'KHÔNG CÓ';
      add(`\n[Sapo ${index + 1}/${matches.length}] ${p.name}`);
      add(`SKU gốc: ${p.skuBase || '—'} | Best: ${best}`);
      for (const vm of match.variantMatches || []) {
        add(`  ${vm.sapo.size} | ${vm.sapo.sku} | Id=${vm.sapo.variantId} → ${vm.source ? `${vm.source.color}/${vm.source.size}/tồn=${vm.source.available}` : `CHƯA CÓ DỮ LIỆU (${vm.reason})`}`);
      }
    });
    return lines.join('\r\n');
  }

  function downloadErrorReport() {
    const blob = new Blob(['\ufeff', buildErrorReport()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
    a.href = url;
    a.download = `DHL_STOCK_SYNC_LOI_${stamp}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    setStatus('Đã tải báo cáo TXT.', 'ok');
  }

  $('sapoExport').addEventListener('change', (event) => loadExport(event.target.files && event.target.files[0]));
  $('sapoTemplate').addEventListener('change', (event) => loadTemplate(event.target.files && event.target.files[0]));
  $('scanHd').addEventListener('click', runHdScan);
  $('scanCurrent').addEventListener('click', runCurrentPopupTest);
  $('exportErrorReport').addEventListener('click', downloadErrorReport);
  $('makeImport').addEventListener('click', makeImport);
  $('filter').addEventListener('input', renderMatches);

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== 'DHL_STOCK_PROGRESS') return;
    const d = message.data || {};
    if (d.stage === 'discovered') setStatus(`Tìm thấy ${d.productTotal} sản phẩm nguồn. Bắt đầu bấm popup từng sản phẩm...`);
    else if (d.stage === 'product') setStatus(`Đang quét ${d.productIndex}/${d.productTotal}: ${d.descriptor && d.descriptor.title ? d.descriptor.title : ''}`);
    else if (d.stage === 'dom-color') setStatus(`Đang đọc ${d.descriptor && d.descriptor.title ? d.descriptor.title : ''} → màu ${d.color} (${d.colorIndex}/${d.colorTotal}) → thấy ${d.rows} size.`);
  });

  (async () => {
    const tab = await activeTab();
    const ok = tab && String(tab.url || '').startsWith('https://si.aobongda.net/');
    $('sourceState').textContent = ok ? 'Nguồn OK' : 'Mở web nguồn';
    if (ok) $('sourceState').style.background = '#eaf8ef';

    const stored = await chrome.storage.local.get(['dhlLastSourceResults', 'dhlLastSourceAt']);
    if (stored.dhlLastSourceResults) {
      sourceResults = stored.dhlLastSourceResults;
      updateStats();
      const when = stored.dhlLastSourceAt ? new Date(stored.dhlLastSourceAt).toLocaleString('vi-VN') : '';
      setStatus(`Đã nạp dữ liệu quét cũ${when ? ` lúc ${when}` : ''}. Chọn 2 file rồi quét lại để lấy tồn mới.`);
    } else {
      updateStats();
    }
  })().catch((error) => setStatus(error.message || String(error), 'error'));
})();
