(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const matcher = globalThis.DHLMatchCore;
  const xlsx = globalThis.DHLXlsxLite;
  if (!matcher || !xlsx) return;

  let sapoData = null;
  let templateBuffer = null;
  let sourceResults = [];
  let matches = [];

  async function activeTab() { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); return tab; }
  function setStatus(text, kind = '') { const el = $('statusBox'); el.textContent = text; el.classList.toggle('error', kind === 'error'); el.classList.toggle('ok', kind === 'ok'); }
  function escapeHtml(text) { return String(text || '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
  function sourceGroups() { return matcher.groupSourceVariants(sourceResults); }
  function readyVariantCount() { return matches.reduce((n, m) => n + (m.complete ? m.variantMatches.length : 0), 0); }
  function fullMatchReady() {
    return Boolean(sapoData && sapoData.products.length && matches.length === sapoData.products.length && matches.every(m => m.complete) && readyVariantCount() === sapoData.variants.length);
  }

  function updateStats() {
    $('sapoProductCount').textContent = sapoData ? sapoData.products.length : 0;
    $('sapoVariantCount').textContent = sapoData ? sapoData.variants.length : 0;
    $('sourceGroupCount').textContent = sourceGroups().length;
    $('matchedCount').textContent = matches.filter(m => m.complete).length;
    $('readyVariantCount').textContent = readyVariantCount();
    $('makeImport').disabled = !(sapoData && templateBuffer && fullMatchReady());
  }

  function renderMatches() {
    const q = $('filter').value.trim().toLowerCase();
    const rows = matches.filter(m => !q || `${m.sapoProduct.name} ${m.sapoProduct.skuBase || ''} ${m.best ? m.best.parentName : ''} ${m.best ? m.best.color : ''}`.toLowerCase().includes(q));
    $('matchBody').innerHTML = rows.map(m => {
      const best = m.best ? `${m.best.parentName} / ${m.best.color}` : '—';
      const sizesOk = m.variantMatches.filter(x => x.source).length;
      const totalSizes = m.sapoProduct.variants.length;
      const score = m.best ? Math.round(m.best.score * 100) : 0;
      const cls = m.complete ? 'ok-row' : 'warn-row';
      const pill = m.complete ? '<span class="pill ok">OK</span>' : '<span class="pill warn">Cần kiểm tra</span>';
      const base = m.sapoProduct.skuBase ? `<br><small>SKU gốc: ${escapeHtml(m.sapoProduct.skuBase)}</small>` : '';
      return `<tr class="${cls}"><td>${escapeHtml(m.sapoProduct.name)}${base}</td><td>${escapeHtml(best)}</td><td class="score">${score}%</td><td>${sizesOk}/${totalSizes}</td><td>${pill}</td></tr>`;
    }).join('');
  }

  function recomputeMatches() {
    matches = sapoData && sourceResults.length ? matcher.matchSapoProducts(sapoData.products, sourceResults) : [];
    updateStats(); renderMatches();
    if (matches.length) {
      const ok = matches.filter(m => m.complete).length, ready = readyVariantCount(), groups = sourceGroups().length;
      if (fullMatchReady()) {
        setStatus(`Ghép đủ ${ok}/${sapoData.products.length} sản phẩm, ${ready}/${sapoData.variants.length} size. Có thể tạo file nhập.`, 'ok');
      } else {
        const sourceNote = groups < sapoData.products.length ? ` Nguồn mới đọc được ${groups} mẫu/màu, nên vẫn còn thiếu màu cần quét.` : '';
        setStatus(`Ghép chắc chắn ${ok}/${sapoData.products.length} sản phẩm, ${ready}/${sapoData.variants.length} size.${sourceNote} Chưa đủ thì KHÔNG cho tạo file nhập.`, 'error');
      }
    }
  }

  async function loadExport(file) {
    if (!file) return;
    setStatus('Đang đọc file xuất Sapo...');
    try {
      sapoData = await xlsx.parseSapoExport(await file.arrayBuffer());
      const sizeText = `${sapoData.sizeResolved}/${sapoData.sizeTotal} size tự nhận`;
      $('exportState').textContent = `${sapoData.products.length} sản phẩm • ${sapoData.variants.length} biến thể • ${sizeText}`;
      recomputeMatches();
      if (!sourceResults.length) {
        const issueText = sapoData.issues && sapoData.issues.length ? ` Có ${sapoData.issues.length} cảnh báo cấu trúc.` : '';
        setStatus(`Đã đọc ${sapoData.products.length} sản phẩm; nhận ${sizeText}. Tool dùng Id sản phẩm + Id phiên bản để giữ đúng dòng, SKU gốc để nhận đội/màu, và size để ghép biến thể.${issueText} Bấm QUÉT KHO HD 2026.`, sapoData.issues && sapoData.issues.length ? 'error' : 'ok');
      }
    } catch (error) { sapoData = null; $('exportState').textContent = 'File không hợp lệ.'; updateStats(); setStatus(error.message || String(error), 'error'); }
  }

  async function loadTemplate(file) {
    if (!file) return;
    setStatus('Đang kiểm tra file mẫu nhập...');
    try {
      const buffer = await file.arrayBuffer(), book = await xlsx.readFirstSheet(buffer), h = xlsx.headerMap(book.rows[0] || []), inv = Object.keys(h).find(k => /Tồn kho/i.test(k));
      if (!inv || h['Id phiên bản'] == null) throw new Error('Không đúng mẫu nhập Sapo: thiếu Tồn kho hoặc Id phiên bản.');
      templateBuffer = buffer;
      $('templateState').textContent = `Đúng mẫu • cột tồn: ${inv}`;
      updateStats(); setStatus('File mẫu nhập hợp lệ.', 'ok');
    } catch (error) { templateBuffer = null; $('templateState').textContent = 'Mẫu không hợp lệ.'; updateStats(); setStatus(error.message || String(error), 'error'); }
  }

  function noReceiver(error) {
    const text = String(error && error.message ? error.message : error || '');
    return /Receiving end does not exist|Could not establish connection/i.test(text);
  }

  async function injectScanner(tabId) {
    setStatus('Đang kết nối lại với trang nguồn...');
    await chrome.scripting.executeScript({ target: { tabId }, files: ['stock-core.js'] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await new Promise(resolve => setTimeout(resolve, 120));
  }

  async function send(type, extra = {}) {
    const tab = await activeTab();
    if (!tab || !tab.id || !String(tab.url || '').startsWith('https://si.aobongda.net/')) throw new Error('Hãy mở si.aobongda.net và đăng nhập trước.');
    const message = { type, ...extra };
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      if (!noReceiver(error)) throw error;
      await injectScanner(tab.id);
      try {
        return await chrome.tabs.sendMessage(tab.id, message);
      } catch (retryError) {
        throw new Error(`Không kết nối được với trang nguồn sau khi tự kết nối lại. Hãy F5 trang si.aobongda.net rồi thử lại. (${retryError.message || retryError})`);
      }
    }
  }

  async function runSourceScan(type) {
    $('scanHd').disabled = true; $('scanCurrent').disabled = true; $('makeImport').disabled = true;
    setStatus(type === 'DHL_SCAN_HD_2026' ? 'Đang quét danh mục HD 2026... giữ tab nguồn mở.' : 'Đang test sản phẩm hiện tại...');
    try {
      const hints = sapoData ? matcher.buildScanHints(sapoData.products) : [];
      const response = await send(type, { hints });
      if (!response || !response.ok) throw new Error(response && response.error ? response.error : 'Không nhận được dữ liệu nguồn');
      sourceResults = Array.isArray(response.result) ? response.result : [response.result];
      await chrome.storage.local.set({ dhlLastSourceResults: sourceResults, dhlLastSourceAt: Date.now() });
      recomputeMatches();
      if (!sapoData) setStatus(`Đã quét ${sourceResults.length} sản phẩm nguồn. Chọn file xuất Sapo để ghép.`, 'ok');
    } catch (error) { setStatus(error.message || String(error), 'error'); }
    finally { $('scanHd').disabled = false; $('scanCurrent').disabled = false; updateStats(); }
  }

  async function makeImport() {
    if (!sapoData || !templateBuffer) return;
    if (!fullMatchReady()) { setStatus('Chưa ghép đủ toàn bộ sản phẩm và size; tool chặn tạo file để tránh cập nhật thiếu.', 'error'); return; }
    const inventory = Object.create(null);
    for (const m of matches) if (m.complete) for (const vm of m.variantMatches) inventory[String(vm.sapo.variantId)] = Number(vm.source.available);
    const count = Object.keys(inventory).length;
    if (!count) { setStatus('Chưa có biến thể nào ghép chắc chắn.', 'error'); return; }
    try {
      setStatus(`Đang tạo file nhập cho ${count} biến thể...`);
      const out = await xlsx.buildSapoImport(templateBuffer, sapoData, inventory);
      const blob = new Blob([out.bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), url = URL.createObjectURL(blob), a = document.createElement('a');
      const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      a.href = url; a.download = `SAPO_NHAP_TON_KHO_${stamp}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
      setStatus(`Đã tạo file nhập ${out.rows} biến thể. File chỉ lấy tồn mới; tên, ảnh, giá, SKU và Id phiên bản được giữ theo file xuất Sapo.`, 'ok');
    } catch (error) { setStatus(error.message || String(error), 'error'); }
  }

  $('sapoExport').addEventListener('change', e => loadExport(e.target.files && e.target.files[0]));
  $('sapoTemplate').addEventListener('change', e => loadTemplate(e.target.files && e.target.files[0]));
  $('scanHd').addEventListener('click', () => runSourceScan('DHL_SCAN_HD_2026'));
  $('scanCurrent').addEventListener('click', () => runSourceScan('DHL_SCAN_CURRENT'));
  $('makeImport').addEventListener('click', makeImport);
  $('filter').addEventListener('input', renderMatches);

  chrome.runtime.onMessage.addListener(message => {
    if (!message || message.type !== 'DHL_STOCK_PROGRESS') return;
    const d = message.data || {};
    if (d.stage === 'discovered') setStatus(`Tìm thấy ${d.productTotal} sản phẩm ĐT 2026 HD. Bắt đầu đọc màu/size/tồn...`);
    else if (d.stage === 'product') setStatus(`Đang quét ${d.productIndex}/${d.productTotal}: ${d.descriptor && d.descriptor.title ? d.descriptor.title : ''}`);
    else if (d.unique != null) setStatus(`Đang đọc biến thể... đã thấy ${d.unique} SKU ở sản phẩm hiện tại.`);
  });

  (async () => {
    const tab = await activeTab(), ok = tab && String(tab.url || '').startsWith('https://si.aobongda.net/');
    $('sourceState').textContent = ok ? 'Nguồn OK' : 'Mở web nguồn'; if (ok) $('sourceState').style.background = '#eaf8ef';
    const stored = await chrome.storage.local.get(['dhlLastSourceResults','dhlLastSourceAt']);
    if (stored.dhlLastSourceResults) { sourceResults = stored.dhlLastSourceResults; updateStats(); const t = stored.dhlLastSourceAt ? new Date(stored.dhlLastSourceAt).toLocaleString('vi-VN') : ''; setStatus(`Đã nạp lần quét nguồn gần nhất${t ? `: ${t}` : ''}. Chọn file Sapo hoặc quét lại.`); }
    else updateStats();
  })().catch(error => setStatus(error.message || String(error), 'error'));
})();
