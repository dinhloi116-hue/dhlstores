(() => {
  'use strict';

  const PROFILE_KEY = 'dhlSavedStockProfilesV1';
  const SELECTED_KEY = 'dhlSelectedStockProfileId';
  const HISTORY_KEY = 'dhlStockSyncHistoryV1';
  const MAX_HISTORY = 8;

  const text = (v) => String(v == null ? '' : v).trim();
  const escapeHtml = (v) => text(v).replace(/[&<>\"]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));
  const fmt = (ts) => ts ? new Date(ts).toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }) : 'Chưa có';

  async function readState() {
    const s = await chrome.storage.local.get([PROFILE_KEY, SELECTED_KEY, HISTORY_KEY]);
    return {
      profiles: Array.isArray(s[PROFILE_KEY]) ? s[PROFILE_KEY] : [],
      selectedId: text(s[SELECTED_KEY]),
      history: Array.isArray(s[HISTORY_KEY]) ? s[HISTORY_KEY] : []
    };
  }

  async function pushHistory(entry) {
    const s = await readState();
    const fingerprint = `${entry.profile}|${entry.rows}|${entry.at}`;
    const existing = s.history[0];
    if (existing && `${existing.profile}|${existing.rows}|${existing.at}` === fingerprint) return;
    const next = [entry, ...s.history].slice(0, MAX_HISTORY);
    await chrome.storage.local.set({ [HISTORY_KEY]: next });
  }

  function parseExportStatus(raw) {
    const value = text(raw);
    let m = value.match(/^ĐÃ TẠO FILE\s+(.+?):\s*(\d+)\s*dòng\s*•\s*(\d+)\s*dòng tồn = 0\s*•\s*bỏ qua\s*(\d+)/i);
    if (m) return { profile:m[1], rows:Number(m[2]), zero:Number(m[3]), skipped:Number(m[4]) };
    m = value.match(/^Đã xong\s+(.+?)\.\s*File nhập Sapo đã được tạo/i);
    if (m) return { profile:m[1], rows:null, zero:null, skipped:null };
    return null;
  }

  async function renderDashboard() {
    const root = document.getElementById('uiV3Dashboard');
    if (!root) return;
    const s = await readState();
    const selected = s.profiles.find((p) => p.id === s.selectedId) || null;
    const latest = s.history[0] || null;

    const health = s.profiles.length
      ? `${s.profiles.length} hồ sơ đã lưu`
      : 'Chưa có hồ sơ';
    const selectedText = selected
      ? `${escapeHtml(selected.name)} • ${Number(selected.productCount || 0)} SP • ${Number(selected.variantCount || 0)} biến thể`
      : 'Chưa chọn hồ sơ';

    root.innerHTML = `
      <div class="ui-v3-grid">
        <div class="ui-v3-card">
          <span>HỒ SƠ</span>
          <b>${escapeHtml(health)}</b>
          <small>${selectedText}</small>
        </div>
        <div class="ui-v3-card">
          <span>LẦN ĐỒNG BỘ CUỐI</span>
          <b>${latest ? escapeHtml(latest.profile) : 'Chưa có'}</b>
          <small>${latest ? `${fmt(latest.at)}${latest.rows != null ? ` • ${latest.rows} dòng` : ''}` : 'Chưa tạo file nào trong bản mới'}</small>
        </div>
      </div>
      <details class="ui-v3-history" ${s.history.length ? '' : 'hidden'}>
        <summary>Lịch sử gần đây</summary>
        <div class="ui-v3-history-list">
          ${s.history.map((h) => `<div class="ui-v3-history-row"><div><b>${escapeHtml(h.profile)}</b><small>${fmt(h.at)}</small></div><span>${h.rows == null ? 'Đã tạo file' : `${h.rows} dòng`}${h.skipped ? ` • bỏ ${h.skipped}` : ''}</span></div>`).join('')}
        </div>
      </details>`;
  }

  function injectStyle() {
    if (document.getElementById('uiV3Style')) return;
    const style = document.createElement('style');
    style.id = 'uiV3Style';
    style.textContent = `
      body.ui-v2 main{padding:12px!important;max-width:520px;margin:0 auto}
      body.ui-v2 header{margin-bottom:8px}
      body.ui-v2 header h1{font-size:18px;letter-spacing:.2px}
      body.ui-v2 .safety-note{box-shadow:0 1px 2px rgba(15,23,42,.03)}
      #uiV3Dashboard{margin:8px 0 10px}
      .ui-v3-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .ui-v3-card{background:#fff;border:1px solid #dfe7ef;border-radius:10px;padding:10px;display:grid;gap:3px;min-width:0}
      .ui-v3-card span{font-size:9px;font-weight:800;letter-spacing:.7px;color:#64748b}
      .ui-v3-card b{font-size:13px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ui-v3-card small{font-size:10px;color:#64748b;line-height:1.35}
      .ui-v3-history{background:#fff;border:1px solid #dfe7ef;border-radius:10px;margin-top:8px;overflow:hidden}
      .ui-v3-history summary{cursor:pointer;padding:9px 10px;font-size:11px;font-weight:800;color:#334155;list-style:none}
      .ui-v3-history summary::-webkit-details-marker{display:none}
      .ui-v3-history-list{border-top:1px solid #eef2f7}
      .ui-v3-history-row{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:10px;align-items:center}
      .ui-v3-history-row:last-child{border-bottom:0}
      .ui-v3-history-row div{display:grid;gap:2px;min-width:0}
      .ui-v3-history-row b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ui-v3-history-row small{color:#94a3b8}
      .ui-v3-history-row span{color:#475569;white-space:nowrap}
      #profileQuickTabButtons button{min-height:40px!important;border-radius:10px!important}
      #uiV2SyncBtn{min-height:50px!important;border-radius:11px!important;font-size:13px!important;letter-spacing:.2px}
      #profileManageToggle{min-height:40px!important}
      @media(max-width:390px){.ui-v3-grid{grid-template-columns:1fr}.ui-v3-card:nth-child(2){display:none}}
    `;
    document.head.appendChild(style);
  }

  function mountDashboard() {
    if (document.getElementById('uiV3Dashboard')) return true;
    const smart = document.getElementById('uiV2Panel');
    const host = document.getElementById('savedProfilesMode');
    if (!host) return false;
    const box = document.createElement('section');
    box.id = 'uiV3Dashboard';
    if (smart && smart.parentElement === host) smart.insertAdjacentElement('afterend', box);
    else host.insertBefore(box, host.firstChild);
    renderDashboard().catch(() => {});
    return true;
  }

  function watchSuccess() {
    const seen = new Set();
    const inspect = async () => {
      for (const id of ['profileStatus', 'uiV2SmartState']) {
        const el = document.getElementById(id);
        if (!el) continue;
        const parsed = parseExportStatus(el.textContent);
        if (!parsed) continue;
        const sig = `${id}|${text(el.textContent)}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        const now = Date.now();
        await pushHistory({ ...parsed, at: now });
        await renderDashboard();
      }
    };
    const obs = new MutationObserver(() => inspect().catch(() => {}));
    obs.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
    inspect().catch(() => {});
  }

  function compactOldIntro() {
    const main = document.querySelector('main');
    if (!main) return;
    const notes = [...main.querySelectorAll('.safety-note')];
    for (const note of notes) {
      if (note.id === 'savedProfilesMode' || note.id === 'catalogMode') continue;
      const bold = text(note.querySelector('b')?.textContent);
      if (/DÙNG HẰNG NGÀY|ĐẦU RA = FILE NHẬP/i.test(bold)) {
        note.style.display = 'none';
      }
    }
  }

  function install() {
    injectStyle();
    if (!mountDashboard()) {
      const obs = new MutationObserver(() => {
        if (mountDashboard()) obs.disconnect();
      });
      obs.observe(document.documentElement, { childList:true, subtree:true });
      setTimeout(() => obs.disconnect(), 10000);
    }
    compactOldIntro();
    watchSuccess();
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes[PROFILE_KEY] || changes[SELECTED_KEY] || changes[HISTORY_KEY]) renderDashboard().catch(() => {});
    });
    setTimeout(compactOldIntro, 800);
  }

  install();
})();
