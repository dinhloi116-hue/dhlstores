(() => {
  'use strict';

  const xlsx = globalThis.DHLXlsxLite;
  const matcher = globalThis.DHLMatchCore;
  const stockImport = globalThis.DHLStockImportCore;
  if (!xlsx || !matcher || !stockImport) return;

  const STORAGE_KEY = 'dhlSavedStockProfilesV1';
  const SELECTED_KEY = 'dhlSelectedStockProfileId';
  let profiles = [];
  let selectedId = '';
  let activeData = null;
  let latestSource = [];
  let scannedForSelected = false;

  const $ = (id) => document.getElementById(id);
  const text = (v) => String(v == null ? '' : v).trim();

  function plain(value) {
    return text(value)
      .toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\bkhong in(?: ten so)?\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function displaySize(variant) {
    if (!variant) return '';
    if (variant.displaySize) return text(variant.displaySize);
    const raw = text(variant.rawProductLabel);
    const hit = raw.match(/\/\s*Size\s*[:\-]?\s*(\d{1,3})/i);
    if (hit) return hit[1];
    const attr = text(variant.sizeFromAttribute || variant.size);
    const attrHit = attr.match(/(?:^|\b)SIZE\s*[:\-]?\s*(\d{1,3})/i);
    if (attrHit) return attrHit[1];
    return attr;
  }

  function rowKey(name, size) {
    return `${plain(name)}|${plain(size)}`;
  }

  function bytesToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
    }
    return btoa(binary);
  }

  function base64ToBuffer(value) {
    const binary = atob(String(value || ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function makeId(name) {
    const base = plain(name).replace(/\s+/g, '-') || 'profile';
    return `${base}-${Date.now().toString(36)}`;
  }

  function currentProfile() {
    return profiles.find((p) => p.id === selectedId) || null;
  }

  async function loadStore() {
    const stored = await chrome.storage.local.get([STORAGE_KEY, SELECTED_KEY]);
    profiles = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
    selectedId = text(stored[SELECTED_KEY]);
    if (!profiles.some((p) => p.id === selectedId)) selectedId = profiles[0] ? profiles[0].id : '';
  }

  async function saveStore() {
    await chrome.storage.local.set({ [STORAGE_KEY]: profiles, [SELECTED_KEY]: selectedId });
  }

  function catalogSkuIndex(catalogData) {
    const unique = new Map();
    const duplicates = new Set();
    for (const variant of (catalogData && catalogData.variants) || []) {
      const sku = text(variant && variant.sku);
      if (!sku) continue;
      const key = rowKey(variant.name, displaySize(variant));
      if (!key || key === '|') continue;
      if (unique.has(key) && unique.get(key).sku !== sku) duplicates.add(key);
      else unique.set(key, {
        sku,
        variantId: variant.variantId,
        productId: variant.productId,
        name: variant.name,
        size: displaySize(variant)
      });
    }
    for (const key of duplicates) unique.delete(key);
    return { map: unique, duplicates };
  }

  function skuCoverage(warehouseData, catalogData) {
    const index = catalogSkuIndex(catalogData);
    let matched = 0;
    const missing = [];
    for (const variant of (warehouseData && warehouseData.variants) || []) {
      const key = rowKey(variant.name, displaySize(variant));
      if (index.map.has(key)) matched += 1;
      else missing.push(`${variant.name} / Size ${displaySize(variant)}`);
    }
    return {
      matched,
      total: warehouseData && warehouseData.variants ? warehouseData.variants.length : 0,
      missing,
      duplicates: index.duplicates.size
    };
  }

  async function parseProfile(profile) {
    if (!profile || !profile.warehouseBase64 || !profile.catalogBase64) throw new Error('Hồ sơ chưa đủ 2 file Sapo.');
    const warehouseData = await xlsx.parseSapoExport(base64ToBuffer(profile.warehouseBase64));
    const catalogData = await xlsx.parseSapoExport(base64ToBuffer(profile.catalogBase64));
    if (!warehouseData || warehouseData.inputType !== 'warehouse') throw new Error('File TỒN KHO đã lưu không đúng loại.');
    if (catalogData && catalogData.inputType === 'warehouse') throw new Error('File DANH SÁCH đã lưu đang là file tồn kho.');
    const withSku = (catalogData.variants || []).filter((v) => text(v && v.sku)).length;
    if (!withSku) throw new Error('File DANH SÁCH đã lưu không có SKU.');
    const coverage = skuCoverage(warehouseData, catalogData);
    return { warehouseData, catalogData, coverage };
  }

  function status(message, kind = '') {
    const el = $('profileStatus');
    if (!el) return;
    el.textContent = String(message || '');
    el.style.color = kind === 'error' ? '#b91c1c' : kind === 'ok' ? '#166534' : '#475569';
  }

  function setBusy(busy) {
    for (const id of ['profileScanBtn', 'profileExportBtn', 'profileSaveBtn', 'profileDeleteBtn']) {
      const el = $(id);
      if (el) el.disabled = Boolean(busy) || (id === 'profileExportBtn' && !scannedForSelected);
    }
  }

  function renderProfiles() {
    const box = $('profileChips');
    if (!box) return;
    if (!profiles.length) {
      box.innerHTML = '<small style="display:block;color:#64748b">Chưa có hồ sơ. Bấm “THÊM / CẬP NHẬT HỒ SƠ” và nạp 2 file một lần.</small>';
      return;
    }
    box.innerHTML = profiles.map((p) => {
      const active = p.id === selectedId;
      const label = String(p.name || 'Hồ sơ');
      return `<button type="button" data-profile-id="${p.id}" class="${active ? 'primary' : 'secondary'}" style="padding:8px 12px;min-width:72px">${label.replace(/[&<>\"]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]))}</button>`;
    }).join('');
    for (const btn of box.querySelectorAll('[data-profile-id]')) {
      btn.addEventListener('click', () => selectProfile(btn.dataset.profileId));
    }
  }

  function renderActiveSummary() {
    const profile = currentProfile();
    const name = $('activeProfileName');
    const meta = $('activeProfileMeta');
    if (name) name.textContent = profile ? profile.name : 'Chưa chọn';
    if (!profile) {
      if (meta) meta.textContent = 'Tạo hồ sơ HD / Trẻ em / Wika… một lần rồi dùng lại hằng ngày.';
      return;
    }
    const branch = text(profile.branchName) || '—';
    if (meta) meta.textContent = `${profile.productCount || 0} SP • ${profile.variantCount || 0} biến thể • chi nhánh ${branch} • cập nhật ${new Date(profile.updatedAt || Date.now()).toLocaleString('vi-VN')}`;
  }

  async function selectProfile(id) {
    selectedId = id;
    latestSource = [];
    scannedForSelected = false;
    activeData = null;
    await saveStore();
    renderProfiles();
    renderActiveSummary();
    const exportBtn = $('profileExportBtn');
    if (exportBtn) exportBtn.disabled = true;
    const p = currentProfile();
    if (!p) {
      status('Chưa có hồ sơ được chọn.');
      return;
    }
    try {
      status(`Đang mở hồ sơ ${p.name}...`);
      activeData = await parseProfile(p);
      const c = activeData.coverage;
      if (c.matched !== c.total) {
        status(`Hồ sơ ${p.name} cần cập nhật: mới nối được ${c.matched}/${c.total} SKU giữa 2 file.`, 'error');
      } else {
        status(`Đã chọn ${p.name}: ${c.matched}/${c.total} SKU sẵn sàng. Mở đúng tab nguồn rồi bấm QUÉT KHO.`, 'ok');
      }
    } catch (error) {
      status(`Không mở được hồ sơ ${p.name}: ${error.message || String(error)}`, 'error');
    }
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
    await new Promise((resolve) => setTimeout(resolve, 160));
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

  async function ensureCategoryTab() {
    const tab = await activeTab();
    if (!tab || !tab.id || !String(tab.url || '').startsWith('https://si.aobongda.net/')) {
      throw new Error('Hãy mở đúng tab danh mục trên si.aobongda.net trước.');
    }
    const url = new URL(tab.url);
    if (/-p\d+(?:\.html)?$/i.test(url.pathname)) throw new Error('Bạn đang ở trang chi tiết sản phẩm. Hãy mở trang danh mục.');
    return tab;
  }

  function matchedRows() {
    if (!activeData || !latestSource.length) return [];
    const matches = matcher.matchSapoProducts(activeData.warehouseData.products, latestSource);
    const rows = [];
    for (const match of matches) {
      for (const vm of match.variantMatches || []) {
        if (vm && vm.sapo && vm.source) rows.push({ match, ...vm });
      }
    }
    return rows;
  }

  function officialImportRows() {
    if (!activeData) return { rows: [], missingSku: [] };
    const index = catalogSkuIndex(activeData.catalogData).map;
    const result = [];
    const missingSku = [];
    for (const row of matchedRows()) {
      const stock = Number(row.source.available);
      if (!Number.isFinite(stock) || stock < 0) continue;
      const size = displaySize(row.sapo);
      const lookup = index.get(rowKey(row.sapo.name, size));
      if (!lookup) {
        missingSku.push(`${row.sapo.name || ''} / Size ${size}`);
        continue;
      }
      result.push({
        variantName: text(row.sapo.rawProductLabel || `${row.sapo.name || ''}${size ? ` / Size ${size}` : ''}`),
        sku: lookup.sku,
        stock,
        standardName: text(row.sapo.name),
        size,
        variantId: lookup.variantId,
        productId: lookup.productId
      });
    }
    return { rows: result, missingSku };
  }

  async function scanSelectedProfile() {
    const profile = currentProfile();
    if (!profile) {
      status('Chọn một hồ sơ trước khi quét.', 'error');
      return;
    }
    setBusy(true);
    scannedForSelected = false;
    latestSource = [];
    try {
      if (!activeData) activeData = await parseProfile(profile);
      const coverage = activeData.coverage;
      if (coverage.matched !== coverage.total) throw new Error(`Hồ sơ chưa đủ SKU: ${coverage.matched}/${coverage.total}. Hãy cập nhật 2 file.`);
      const tab = await ensureCategoryTab();
      const hints = matcher.buildScanHints(activeData.warehouseData.products);
      status(`Đang quét tab đang mở bằng hồ sơ ${profile.name}...`);
      const response = await sendToTab(tab.id, { type: 'DHL_SCAN_HD_LIVE', hints });
      if (!response || !response.ok) throw new Error(response && response.error ? response.error : 'Không nhận được dữ liệu nguồn');
      latestSource = Array.isArray(response.result) ? response.result : [];
      const prepared = officialImportRows();
      scannedForSelected = prepared.rows.length > 0;
      const groups = matcher.groupSourceVariants(latestSource).length;
      if (!prepared.rows.length) throw new Error(`Đã thấy ${groups} mẫu/màu nhưng chưa ghép được dòng nào với hồ sơ ${profile.name}.`);
      profile.lastSourceUrl = String(tab.url || '');
      profile.lastSourceAt = Date.now();
      await saveStore();
      status(`QUÉT XONG ${profile.name}: ${prepared.rows.length}/${activeData.warehouseData.variants.length} biến thể ghép được • ${groups} mẫu/màu nguồn. Có thể tạo file nhập Sapo.`, 'ok');
    } catch (error) {
      scannedForSelected = false;
      status(`LỖI QUÉT: ${error.message || String(error)}`, 'error');
    } finally {
      setBusy(false);
      const exportBtn = $('profileExportBtn');
      if (exportBtn) exportBtn.disabled = !scannedForSelected;
    }
  }

  function download(bytes, fileName) {
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  async function exportSelectedProfile() {
    const profile = currentProfile();
    if (!profile || !activeData || !scannedForSelected) {
      status('Hãy quét kho bằng hồ sơ đang chọn trước.', 'error');
      return;
    }
    setBusy(true);
    try {
      const prepared = officialImportRows();
      if (!prepared.rows.length) throw new Error('Không có dòng nào đủ Tên + Size + SKU + tồn nguồn để xuất.');
      const branch = text(activeData.warehouseData.warehouseBranchName || profile.branchName);
      if (!branch) throw new Error('Không đọc được tên chi nhánh Sapo từ hồ sơ.');
      const out = stockImport.buildOfficialInventoryWorkbook(xlsx, prepared.rows, branch);
      if (out.templateSignature !== 'SAPO-INVENTORY-TEMPLATE-V2') throw new Error('Bộ tạo file nhập tồn chưa đúng phiên bản.');
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const safeName = text(profile.name).replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
      download(out.bytes, `SAPO_NHAP_TON_KHO_${safeName}_${stamp}.xlsx`);
      const skipped = Math.max(0, activeData.warehouseData.variants.length - prepared.rows.length);
      status(`ĐÃ TẠO FILE ${profile.name}: ${out.rows} dòng • ${out.zeroCount} dòng tồn = 0 • bỏ qua ${skipped} dòng không thuộc tab vừa quét.`, 'ok');
    } catch (error) {
      status(`LỖI TẠO FILE: ${error.message || String(error)}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function saveProfileFromForm() {
    const name = text($('profileNameInput') && $('profileNameInput').value);
    const warehouseFile = $('profileWarehouseFile') && $('profileWarehouseFile').files && $('profileWarehouseFile').files[0];
    const catalogFile = $('profileCatalogFile') && $('profileCatalogFile').files && $('profileCatalogFile').files[0];
    if (!name) {
      status('Nhập tên hồ sơ, ví dụ HD, Trẻ em, Wika.', 'error');
      return;
    }
    setBusy(true);
    try {
      const old = currentProfile();
      let warehouseBase64 = old && old.id === selectedId ? old.warehouseBase64 : '';
      let catalogBase64 = old && old.id === selectedId ? old.catalogBase64 : '';
      let warehouseName = old && old.id === selectedId ? old.warehouseName : '';
      let catalogName = old && old.id === selectedId ? old.catalogName : '';

      if (warehouseFile) {
        const buffer = await warehouseFile.arrayBuffer();
        const parsed = await xlsx.parseSapoExport(buffer.slice(0));
        if (!parsed || parsed.inputType !== 'warehouse') throw new Error('File 1 phải là “Danh sách quản lý kho phiên bản sản phẩm”.');
        warehouseBase64 = bytesToBase64(buffer);
        warehouseName = warehouseFile.name;
      }
      if (catalogFile) {
        const buffer = await catalogFile.arrayBuffer();
        const parsed = await xlsx.parseSapoExport(buffer.slice(0));
        if (parsed && parsed.inputType === 'warehouse') throw new Error('File 2 phải là products_export có SKU, không phải file tồn kho.');
        if (!(parsed.variants || []).some((v) => text(v && v.sku))) throw new Error('File products_export không có SKU.');
        catalogBase64 = bytesToBase64(buffer);
        catalogName = catalogFile.name;
      }
      if (!warehouseBase64 || !catalogBase64) throw new Error('Hồ sơ mới cần đủ 2 file: TỒN KHO + DANH SÁCH products_export.');

      const temp = { warehouseBase64, catalogBase64 };
      const parsed = await parseProfile(temp);
      if (parsed.coverage.matched !== parsed.coverage.total) {
        const sample = parsed.coverage.missing.slice(0, 3).join('; ');
        throw new Error(`2 file mới nối được ${parsed.coverage.matched}/${parsed.coverage.total} SKU. ${sample ? `Ví dụ thiếu: ${sample}` : ''}`);
      }

      const existing = profiles.find((p) => p.id === selectedId);
      const profile = {
        id: existing ? existing.id : makeId(name),
        name,
        warehouseName,
        catalogName,
        warehouseBase64,
        catalogBase64,
        branchName: text(parsed.warehouseData.warehouseBranchName),
        productCount: parsed.warehouseData.products.length,
        variantCount: parsed.warehouseData.variants.length,
        updatedAt: Date.now(),
        lastSourceUrl: existing ? existing.lastSourceUrl || '' : '',
        lastSourceAt: existing ? existing.lastSourceAt || 0 : 0
      };
      if (existing) Object.assign(existing, profile);
      else profiles.push(profile);
      selectedId = profile.id;
      activeData = parsed;
      latestSource = [];
      scannedForSelected = false;
      await saveStore();
      renderProfiles();
      renderActiveSummary();
      $('profileManageBody').hidden = true;
      status(`ĐÃ LƯU HỒ SƠ ${name}: ${parsed.coverage.matched}/${parsed.coverage.total} SKU. Từ giờ không cần nạp lại 2 file cho đến khi sản phẩm thay đổi.`, 'ok');
    } catch (error) {
      status(`LỖI LƯU HỒ SƠ: ${error.message || String(error)}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedProfile() {
    const profile = currentProfile();
    if (!profile) return;
    if (!confirm(`Xóa hồ sơ “${profile.name}” khỏi tool? File trên máy/Sapo không bị xóa.`)) return;
    profiles = profiles.filter((p) => p.id !== profile.id);
    selectedId = profiles[0] ? profiles[0].id : '';
    activeData = null;
    latestSource = [];
    scannedForSelected = false;
    await saveStore();
    renderProfiles();
    renderActiveSummary();
    if (selectedId) await selectProfile(selectedId);
    else status('Đã xóa hồ sơ. Tạo hồ sơ mới khi cần.');
  }

  function showManager() {
    const body = $('profileManageBody');
    if (!body) return;
    body.hidden = !body.hidden;
    if (!body.hidden) {
      const p = currentProfile();
      $('profileNameInput').value = p ? p.name : '';
      $('profileWarehouseFile').value = '';
      $('profileCatalogFile').value = '';
      $('profileManageHint').textContent = p
        ? `Đang sửa ${p.name}. Có thể chỉ chọn file cần thay; file còn lại giữ nguyên.`
        : 'Hồ sơ mới: chọn đủ 2 file. Sau khi lưu, tool nhớ trên máy này.';
    }
  }

  function mount() {
    if ($('savedProfilesMode')) return;
    const main = document.querySelector('main');
    if (!main) return;

    for (const el of [document.querySelector('.steps'), $('statusBox'), document.querySelector('.stats'), document.querySelector('.toolbar'), document.querySelector('.table-wrap')]) {
      if (el) el.style.display = 'none';
    }
    const oldState = $('oneFileState');
    if (oldState) oldState.style.display = 'none';

    const headerText = document.querySelector('header p');
    if (headerText) headerText.textContent = 'Chọn hồ sơ đã lưu → mở đúng tab nguồn → quét → tải file nhập Sapo';
    const intro = main.querySelector('.safety-note');
    if (intro && intro.id !== 'catalogMode') {
      const b = intro.querySelector('b');
      const s = intro.querySelector('span');
      if (b) b.textContent = 'DÙNG HẰNG NGÀY: KHÔNG CẦN NẠP LẠI EXCEL';
      if (s) s.textContent = '2 file Sapo được lưu theo từng hồ sơ trên chính máy này. Chỉ cập nhật hồ sơ khi có thêm/xóa/đổi sản phẩm hoặc SKU.';
    }

    const section = document.createElement('section');
    section.id = 'savedProfilesMode';
    section.className = 'safety-note';
    section.style.borderColor = '#86efac';
    section.style.background = '#f0fdf4';
    section.innerHTML = `
      <b>ĐỒNG BỘ TỒN KHO NHANH</b>
      <small style="display:block;margin-top:4px;color:#475569">1) Chọn hồ sơ → 2) mở đúng tab HD/Trẻ em/Wika… trên web nguồn → 3) quét → 4) tạo file nhập Sapo.</small>
      <div id="profileChips" style="display:flex;gap:7px;flex-wrap:wrap;margin:10px 0"></div>
      <div style="padding:9px;border:1px solid #bbf7d0;border-radius:8px;background:#fff">
        <div><b>Đang chọn: <span id="activeProfileName">Chưa chọn</span></b></div>
        <small id="activeProfileMeta" style="display:block;margin-top:3px;color:#64748b"></small>
      </div>
      <div style="display:flex;gap:8px;margin-top:9px;flex-wrap:wrap">
        <button id="profileScanBtn" type="button" class="primary" style="flex:1;min-width:130px">QUÉT KHO TAB ĐANG MỞ</button>
        <button id="profileExportBtn" type="button" class="success" style="flex:1;min-width:130px" disabled>TẠO FILE NHẬP SAPO</button>
      </div>
      <small id="profileStatus" style="display:block;margin-top:8px;color:#475569">Đang tải hồ sơ đã lưu...</small>
      <button id="profileManageToggle" type="button" class="secondary" style="width:100%;margin-top:10px">THÊM / CẬP NHẬT HỒ SƠ</button>
      <div id="profileManageBody" hidden style="margin-top:9px;padding:10px;border:1px dashed #94a3b8;border-radius:8px;background:#fff">
        <label style="display:block"><b>Tên hồ sơ</b><input id="profileNameInput" type="text" placeholder="VD: HD, Trẻ em, Wika" style="width:100%;box-sizing:border-box;margin-top:4px" /></label>
        <label style="display:block;margin-top:8px"><b>File 1 — TỒN KHO (file chính)</b><input id="profileWarehouseFile" type="file" accept=".xlsx" style="width:100%;margin-top:4px" /></label>
        <label style="display:block;margin-top:8px"><b>File 2 — DANH SÁCH products_export (SKU/ID)</b><input id="profileCatalogFile" type="file" accept=".xlsx" style="width:100%;margin-top:4px" /></label>
        <small id="profileManageHint" style="display:block;margin-top:7px;color:#64748b"></small>
        <div style="display:flex;gap:8px;margin-top:9px">
          <button id="profileSaveBtn" type="button" class="primary" style="flex:1">LƯU HỒ SƠ</button>
          <button id="profileDeleteBtn" type="button" class="report" style="flex:1">XÓA HỒ SƠ</button>
        </div>
      </div>`;

    const catalog = $('catalogMode');
    if (catalog && catalog.parentElement === main) main.insertBefore(section, catalog);
    else {
      const footer = main.querySelector('footer');
      if (footer) main.insertBefore(section, footer);
      else main.appendChild(section);
    }

    $('profileScanBtn').addEventListener('click', scanSelectedProfile);
    $('profileExportBtn').addEventListener('click', exportSelectedProfile);
    $('profileManageToggle').addEventListener('click', showManager);
    $('profileSaveBtn').addEventListener('click', saveProfileFromForm);
    $('profileDeleteBtn').addEventListener('click', deleteSelectedProfile);

    loadStore().then(async () => {
      renderProfiles();
      renderActiveSummary();
      if (selectedId) await selectProfile(selectedId);
      else status('Chưa có hồ sơ. Tạo HD / Trẻ em / Wika một lần, sau đó dùng lại hằng ngày.');
    }).catch((error) => status(`Không đọc được hồ sơ đã lưu: ${error.message || String(error)}`, 'error'));
  }

  mount();
})();
