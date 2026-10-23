(() => {
  'use strict';

  const productCreate = globalThis.DHLProductCreateCore;
  if (!productCreate || !Array.isArray(productCreate.HEADERS)) return;

  const STORAGE_KEY = 'dhlStockBranchName';

  function state(text, kind = '') {
    const el = document.getElementById('catalogState');
    if (!el) return;
    el.textContent = String(text || '');
    if (kind === 'error') el.style.color = '#b91c1c';
    else if (kind === 'ok') el.style.color = '#166534';
    else el.style.color = '';
  }

  function branchInput() {
    return document.getElementById('catalogBranchName');
  }

  function branchName() {
    return String((branchInput() && branchInput().value) || '').trim();
  }

  function applyBranchHeader() {
    const branch = branchName();
    if (!branch) return false;
    productCreate.HEADERS[34] = `${branch}_Tồn kho`;
    return true;
  }

  async function restoreBranch() {
    const input = branchInput();
    if (!input) return;
    try {
      const stored = await chrome.storage.local.get([STORAGE_KEY]);
      const value = String((stored && stored[STORAGE_KEY]) || '').trim();
      input.value = value || 'dhl sport';
    } catch (_) {
      input.value = input.value || 'dhl sport';
    }
    applyBranchHeader();
  }

  function install() {
    const section = document.getElementById('catalogMode');
    const scan = document.getElementById('scanCatalogSource');
    const exp = document.getElementById('exportCatalogSource');
    if (!section || !scan || !exp) return false;
    if (exp.dataset.branchGuard === '1') return true;

    const buttons = scan.parentElement;
    if (!document.getElementById('catalogBranchName')) {
      const wrap = document.createElement('div');
      wrap.style.margin = '8px 0 10px';
      wrap.innerHTML = `
        <small style="display:block;margin-bottom:4px;font-weight:600">Chi nhánh tồn kho Sapo</small>
        <input id="catalogBranchName" type="text" placeholder="Ví dụ: dhl sport" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px" />
        <small style="display:block;margin-top:4px">Tên phải đúng y hệt chi nhánh trong Sapo. Tool sẽ tạo cột: &lt;Tên chi nhánh&gt;_Tồn kho.</small>`;
      section.insertBefore(wrap, buttons);

      const input = wrap.querySelector('#catalogBranchName');
      input.addEventListener('input', async () => {
        const value = String(input.value || '').trim();
        if (value) {
          applyBranchHeader();
          try { await chrome.storage.local.set({ [STORAGE_KEY]: value }); } catch (_) {}
        }
      });
    }

    exp.addEventListener('click', async (event) => {
      const branch = branchName();
      if (!branch) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state('Chưa có tên chi nhánh tồn kho Sapo. Tool khóa xuất để tránh file bị Sapo từ chối.', 'error');
        return;
      }
      applyBranchHeader();
      try { await chrome.storage.local.set({ [STORAGE_KEY]: branch }); } catch (_) {}
    }, true);

    exp.dataset.branchGuard = '1';
    restoreBranch();
    return true;
  }

  if (!install()) {
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 5000);
  }
})();
