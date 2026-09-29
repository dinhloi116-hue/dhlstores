(() => {
  'use strict';

  const JOB_KEY = 'dhlManualScanJobV2';
  const UI_KEY = 'dhlManualScanUiV1';
  let discovery = null;

  const $ = (id) => document.getElementById(id);
  const text = (v) => String(v == null ? '' : v).trim();
  const esc = (v) => text(v).replace(/[&<>\"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  function send(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        const err = chrome.runtime.lastError;
        if (err) { reject(err); return; }
        if (!response) { reject(new Error('Không nhận được phản hồi từ background.')); return; }
        resolve(response);
      });
    });
  }

  function setStatus(message, kind = '') {
    const el = $('manualJobStatus');
    if (!el) return;
    el.textContent = text(message);
    el.className = `manual-job-status ${kind}`;
  }

  function currentScope() {
    return text($('manualJobScope') && $('manualJobScope').value) || 'all';
  }

  function selectedIds() {
    return [...document.querySelectorAll('#manualProductList input[data-product-id]:checked')]
      .map((el) => Number(el.dataset.productId))
      .filter(Boolean);
  }

  function renderProducts() {
    const list = $('manualProductList');
    if (!list) return;
    const items = discovery && Array.isArray(discovery.items) ? discovery.items : [];
    if (!items.length) {
      list.innerHTML = '<small>Chưa nạp danh sách sản phẩm.</small>';
      return;
    }
    const previous = new Set(selectedIds());
    list.innerHTML = items.map((item) => `
      <label class="manual-product-row">
        <input type="checkbox" data-product-id="${Number(item.id) || 0}" ${previous.has(Number(item.id)) ? 'checked' : ''}>
        <span><b>${esc(item.title || `SP ${item.id}`)}</b><small>#${Number(item.id) || 0}</small></span>
      </label>`).join('');

    for (const input of list.querySelectorAll('input[data-product-id]')) {
      input.addEventListener('change', () => {
        if (currentScope() === 'one' && input.checked) {
          for (const other of list.querySelectorAll('input[data-product-id]')) if (other !== input) other.checked = false;
        }
        updateSelectionCount();
      });
    }
    updateSelectionCount();
  }

  function updateSelectionCount() {
    const el = $('manualSelectionCount');
    if (!el) return;
    const total = discovery && Array.isArray(discovery.items) ? discovery.items.length : 0;
    const count = selectedIds().length;
    el.textContent = `${count}/${total} sản phẩm đã chọn`;
  }

  function syncScopeUi() {
    const scope = currentScope();
    const picker = $('manualPicker');
    if (picker) picker.hidden = scope === 'all';
    if (scope === 'one' && selectedIds().length > 1) {
      const keep = selectedIds()[0];
      for (const input of document.querySelectorAll('#manualProductList input[data-product-id]')) input.checked = Number(input.dataset.productId) === keep;
      updateSelectionCount();
    }
    chrome.storage.local.set({ [UI_KEY]: { scope } }).catch(() => {});
  }

  async function discover() {
    const btn = $('manualDiscoverBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'ĐANG NẠP...'; }
    try {
      const response = await send({ type: 'DHL_MANUAL_JOB_DISCOVER' });
      if (!response.ok) throw new Error(response.error || 'Không nạp được danh sách sản phẩm.');
      const old = new Set(selectedIds());
      discovery = response.result || null;
      renderProducts();
      for (const input of document.querySelectorAll('#manualProductList input[data-product-id]')) {
        if (old.has(Number(input.dataset.productId))) input.checked = true;
      }
      if (currentScope() === 'one' && selectedIds().length > 1) {
        const keep = selectedIds()[0];
        for (const input of document.querySelectorAll('#manualProductList input[data-product-id]')) input.checked = Number(input.dataset.productId) === keep;
      }
      updateSelectionCount();
      setStatus(`Đã nhận tab ${text(discovery.profileName) || text(discovery.pageTitle) || 'nguồn'} • ${discovery.items.length} sản phẩm. Khi chạy, hồ sơ tab này sẽ tự được lưu.`, 'ok');
    } catch (error) {
      setStatus(error.message || String(error), 'bad');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'NẠP SP TRANG ĐANG MỞ'; }
    }
  }

  async function startJob() {
    const btn = $('manualStartBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'ĐANG KHỞI ĐỘNG...'; }
    try {
      const scope = currentScope();
      if (!discovery || !text(discovery.pageUrl)) {
        const response = await send({ type: 'DHL_MANUAL_JOB_DISCOVER' });
        if (!response.ok) throw new Error(response.error || 'Hãy mở trang danh mục nguồn cần quét.');
        discovery = response.result;
        if (scope !== 'all') renderProducts();
      }
      const ids = selectedIds();
      if ((scope === 'selected' || scope === 'one') && !ids.length) throw new Error('Hãy chọn sản phẩm cần quét.');
      const response = await send({
        type: 'DHL_MANUAL_JOB_START',
        sourceUrl: discovery.pageUrl,
        pageTitle: discovery.pageTitle,
        productCount: Array.isArray(discovery.items) ? discovery.items.length : 0,
        scope,
        selectedIds: ids
      });
      if (!response.ok) throw new Error(response.error || 'Không khởi động được lượt quét.');
      setStatus(`Đã bắt đầu ${text(discovery.profileName) || 'tab nguồn'}. Hồ sơ được tạo/cập nhật tự động; có thể chuyển tab làm việc khác.`, 'ok');
      await refreshJob();
    } catch (error) {
      setStatus(error.message || String(error), 'bad');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'CHẠY NỀN'; }
    }
  }

  async function stopAfterCurrent() {
    try {
      const response = await send({ type: 'DHL_MANUAL_JOB_STOP' });
      if (!response.ok) throw new Error(response.error || 'Không gửi được lệnh dừng.');
      setStatus('Đã yêu cầu dừng sau sản phẩm hiện tại. Phần đã quét vẫn được lưu.', 'ok');
      await refreshJob();
    } catch (error) {
      setStatus(error.message || String(error), 'bad');
    }
  }

  async function resumeJob() {
    try {
      const response = await send({ type: 'DHL_MANUAL_JOB_RESUME' });
      if (!response.ok) throw new Error(response.error || 'Không tiếp tục được lượt quét.');
      setStatus('Đã tiếp tục lượt quét từ checkpoint.', 'ok');
      await refreshJob();
    } catch (error) {
      setStatus(error.message || String(error), 'bad');
    }
  }

  function scopeLabel(scope) {
    if (scope === 'one') return '1 SP';
    if (scope === 'selected') return 'SP đã chọn';
    return 'Toàn trang';
  }

  function renderJob(job) {
    const progress = $('manualJobProgress');
    const start = $('manualStartBtn');
    const stop = $('manualStopBtn');
    const resume = $('manualResumeBtn');
    const running = Boolean(job && job.running);
    const stopping = Boolean(job && job.status === 'stopping');
    const paused = Boolean(job && job.status === 'paused');

    if (start) start.disabled = running || stopping;
    if (stop) stop.hidden = !(running || stopping);
    if (resume) resume.hidden = !paused;

    if (!job) {
      if (progress) progress.textContent = 'Mở tab danh mục cần đồng bộ rồi bấm CHẠY NỀN.';
      return;
    }

    const total = Number(job.total || 0);
    const index = Number(job.index || 0);
    const errors = Array.isArray(job.errors) ? job.errors.length : 0;
    const parts = [`${scopeLabel(job.scope)} • ${index}/${total || '?'}`];
    if (job.currentProduct && (running || stopping)) parts.push(job.currentProduct);
    if (errors) parts.push(`${errors} lỗi`);
    if (Number(job.rowCount || 0)) parts.push(`${Number(job.rowCount)} dòng`);
    if (progress) progress.textContent = parts.join(' • ');

    if (job.status === 'done') setStatus(`QUÉT XONG ${job.profileName}: ${index}/${total} sản phẩm • hồ sơ tab đã được lưu tự động${job.needsSapoBranch ? ' • chưa có chi nhánh Sapo nên chưa tạo đầu ra' : ''}.`, 'ok');
    else if (job.status === 'paused') setStatus(`ĐÃ DỪNG tại ${index}/${total}. Có thể tiếp tục sau, không quét lại phần đã xong.`, 'ok');
    else if (job.status === 'error') setStatus(`LỖI QUÉT NỀN: ${text(job.lastError)}`, 'bad');
    else if (job.status === 'stopping') setStatus(`Đang hoàn tất sản phẩm hiện tại rồi dừng • ${index}/${total}.`, '');
    else if (running) setStatus(`Đang chạy nền ${index}/${total}${job.currentProduct ? ` • ${job.currentProduct}` : ''}. Bạn có thể làm việc khác.`, '');
  }

  async function refreshJob() {
    try {
      const stored=await chrome.storage.local.get(JOB_KEY);
      renderJob(stored[JOB_KEY]&&typeof stored[JOB_KEY]==='object'?stored[JOB_KEY]:null);
    } catch (_) {}
  }

  function bind() {
    $('manualJobScope')?.addEventListener('change', syncScopeUi);
    $('manualDiscoverBtn')?.addEventListener('click', discover);
    $('manualStartBtn')?.addEventListener('click', startJob);
    $('manualStopBtn')?.addEventListener('click', stopAfterCurrent);
    $('manualResumeBtn')?.addEventListener('click', resumeJob);
    $('manualSelectAllBtn')?.addEventListener('click', () => {
      const scope = currentScope();
      const inputs = [...document.querySelectorAll('#manualProductList input[data-product-id]')];
      if (scope === 'one') {
        inputs.forEach((input, index) => { input.checked = index === 0; });
      } else {
        inputs.forEach((input) => { input.checked = true; });
      }
      updateSelectionCount();
    });
    $('manualSelectNoneBtn')?.addEventListener('click', () => {
      for (const input of document.querySelectorAll('#manualProductList input[data-product-id]')) input.checked = false;
      updateSelectionCount();
    });
  }

  function injectStyle() {
    if ($('manualJobStyle')) return;
    const style = document.createElement('style');
    style.id = 'manualJobStyle';
    style.textContent = `
      #manualJobRunner{margin-top:10px;padding:10px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#0f172a}
      #manualJobRunner .manual-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
      #manualJobRunner .manual-head small{display:block;color:#64748b;margin-top:2px;font-size:10px}
      #manualJobRunner select,#manualJobRunner button{min-height:38px}
      #manualJobRunner select{width:100%;margin-top:7px;padding:7px;border:1px solid #cbd5e1;border-radius:8px;background:#fff}
      #manualJobRunner .manual-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
      #manualJobRunner .manual-actions button{flex:1;min-width:120px}
      #manualPicker{margin-top:8px;padding:8px;border:1px solid #dbeafe;border-radius:8px;background:#fff}
      #manualProductList{max-height:230px;overflow:auto;margin-top:7px;border-top:1px solid #e2e8f0}
      .manual-product-row{display:flex;gap:8px;align-items:flex-start;padding:7px 2px;border-bottom:1px solid #f1f5f9;cursor:pointer}
      .manual-product-row input{margin-top:2px}.manual-product-row span{min-width:0}.manual-product-row b{display:block;font-size:11px;line-height:1.25}.manual-product-row small{display:block;color:#94a3b8;font-size:9px;margin-top:2px}
      .manual-job-status{display:block;margin-top:8px;color:#475569;font-size:11px}.manual-job-status.ok{color:#166534}.manual-job-status.bad{color:#b91c1c}
      #manualJobProgress{display:block;margin-top:4px;color:#64748b;font-size:10px}
    `;
    document.head.appendChild(style);
  }

  async function mount() {
    if ($('manualJobRunner')) return true;
    const host = $('savedProfilesMode');
    if (!host) return false;
    injectStyle();

    const oldScan = $('profileScanBtn');
    if (oldScan) oldScan.style.display = 'none';

    const panel = document.createElement('div');
    panel.id = 'manualJobRunner';
    panel.innerHTML = `
      <div class="manual-head">
        <div><b>QUÉT & ĐỒNG BỘ TAB ĐANG MỞ</b><small>Mở tab danh mục nào thì chạy tab đó. Tool tự tạo/cập nhật hồ sơ và checkpoint sau từng sản phẩm.</small></div>
        <span style="font-size:9px;font-weight:800;color:#64748b">v0.21</span>
      </div>
      <select id="manualJobScope">
        <option value="all">QUÉT TOÀN TRANG</option>
        <option value="selected">QUÉT SP ĐÃ CHỌN</option>
        <option value="one">QUÉT 1 SP ĐÃ CHỌN</option>
      </select>
      <div id="manualPicker" hidden>
        <div class="manual-actions" style="margin-top:0">
          <button id="manualDiscoverBtn" type="button" class="secondary">NẠP SP TRANG ĐANG MỞ</button>
          <button id="manualSelectAllBtn" type="button" class="secondary">CHỌN TẤT CẢ</button>
          <button id="manualSelectNoneBtn" type="button" class="secondary">BỎ CHỌN</button>
        </div>
        <small id="manualSelectionCount" style="display:block;margin-top:6px;color:#64748b">0/0 sản phẩm đã chọn</small>
        <div id="manualProductList"><small>Chưa nạp danh sách sản phẩm.</small></div>
      </div>
      <div class="manual-actions">
        <button id="manualStartBtn" type="button" class="primary">CHẠY NỀN</button>
        <button id="manualStopBtn" type="button" class="report" hidden>DỪNG SAU SP HIỆN TẠI</button>
        <button id="manualResumeBtn" type="button" class="secondary" hidden>TIẾP TỤC</button>
      </div>
      <small id="manualJobStatus" class="manual-job-status">Chưa có lượt quét nền.</small>
      <small id="manualJobProgress">—</small>`;

    const status = $('profileStatus');
    if (status) status.insertAdjacentElement('beforebegin', panel);
    else host.appendChild(panel);
    bind();

    const stored = await chrome.storage.local.get(UI_KEY);
    const scope = stored[UI_KEY] && ['all', 'selected', 'one'].includes(stored[UI_KEY].scope) ? stored[UI_KEY].scope : 'all';
    $('manualJobScope').value = scope;
    syncScopeUi();
    await refreshJob();

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[JOB_KEY]) renderJob(changes[JOB_KEY].newValue || null);
    });
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshJob().catch(()=>{});},{passive:true});
    return true;
  }

  mount().catch(() => {});
})();