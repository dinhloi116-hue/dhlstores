(() => {
  'use strict';

  const STORAGE_KEY = 'dhlSavedStockProfilesV1';
  const SELECTED_KEY = 'dhlSelectedStockProfileId';
  const DEFAULT_TABS = ['HD', 'Trẻ em', 'Wika', 'Strivend'];

  const text = (v) => String(v == null ? '' : v).trim();
  const plain = (v) => text(v)
    .toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

  function escapeHtml(value) {
    return text(value).replace(/[&<>\"]/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    }[ch]));
  }

  function matchProfile(profiles, label) {
    const target = plain(label);
    return profiles.find((p) => plain(p && p.name) === target) || null;
  }

  function openManagerFor(label) {
    const body = document.getElementById('profileManageBody');
    const toggle = document.getElementById('profileManageToggle');
    if (body && body.hidden && toggle) toggle.click();

    const input = document.getElementById('profileNameInput');
    if (input) {
      input.value = label;
      input.focus();
    }

    const warehouse = document.getElementById('profileWarehouseFile');
    const catalog = document.getElementById('profileCatalogFile');
    if (warehouse) warehouse.value = '';
    if (catalog) catalog.value = '';

    const hint = document.getElementById('profileManageHint');
    if (hint) hint.textContent = `Hồ sơ ${label} chưa có dữ liệu. Chọn 2 file Sapo một lần rồi bấm LƯU HỒ SƠ. Từ lần sau chỉ cần chọn tab ${label} → QUÉT KHO.`;

    const status = document.getElementById('profileStatus');
    if (status) {
      status.textContent = `${label} chưa được lưu trên máy này. Nạp 2 file một lần để tạo hồ sơ.`;
      status.style.color = '#b45309';
    }
  }

  function clickSavedProfile(profile) {
    if (!profile) return;
    const real = document.querySelector(`[data-profile-id="${CSS.escape(String(profile.id))}"]`);
    if (real) {
      real.click();
      return;
    }
    chrome.storage.local.set({ [SELECTED_KEY]: profile.id }).then(() => location.reload());
  }

  async function render() {
    const host = document.getElementById('savedProfilesMode');
    const original = document.getElementById('profileChips');
    if (!host || !original) return false;

    let quick = document.getElementById('profileQuickTabs');
    if (!quick) {
      quick = document.createElement('div');
      quick.id = 'profileQuickTabs';
      quick.style.margin = '10px 0';
      original.parentElement.insertBefore(quick, original);
    }

    const stored = await chrome.storage.local.get([STORAGE_KEY, SELECTED_KEY]);
    const profiles = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
    const selectedId = text(stored[SELECTED_KEY]);

    const defaultKeys = new Set(DEFAULT_TABS.map(plain));
    const extras = profiles
      .map((p) => text(p && p.name))
      .filter((name) => name && !defaultKeys.has(plain(name)));
    const labels = [...DEFAULT_TABS, ...extras];

    quick.innerHTML = `
      <small style="display:block;margin-bottom:6px;color:#475569"><b>CHỌN NHÓM CẦN QUÉT</b> — tab chưa có dữ liệu sẽ yêu cầu nạp 2 file một lần.</small>
      <div id="profileQuickTabButtons" style="display:flex;gap:7px;flex-wrap:wrap"></div>`;

    const row = quick.querySelector('#profileQuickTabButtons');
    for (const label of labels) {
      const profile = matchProfile(profiles, label);
      const active = Boolean(profile && profile.id === selectedId);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = active ? 'primary' : 'secondary';
      button.style.padding = '8px 12px';
      button.style.minWidth = '72px';
      button.textContent = profile ? label : `${label} +`;
      button.title = profile ? `Chọn hồ sơ ${label}` : `Tạo hồ sơ ${label}`;
      button.addEventListener('click', () => profile ? clickSavedProfile(profile) : openManagerFor(label));
      row.appendChild(button);
    }

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'secondary';
    add.style.padding = '8px 12px';
    add.textContent = '+ HỒ SƠ KHÁC';
    add.addEventListener('click', () => openManagerFor(''));
    row.appendChild(add);

    // Danh sách kỹ thuật cũ vẫn giữ trong DOM để saved-profiles-mode điều khiển,
    // nhưng người dùng chỉ cần thanh tab rõ ràng phía trên.
    original.style.display = 'none';
    return true;
  }

  function install() {
    render().catch(() => {});
    const observer = new MutationObserver(() => render().catch(() => {}));
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 7000);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes[STORAGE_KEY] || changes[SELECTED_KEY]) render().catch(() => {});
    });
  }

  install();
})();
