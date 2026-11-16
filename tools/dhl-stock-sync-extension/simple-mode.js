(() => {
  'use strict';

  const matcher = globalThis.DHLMatchCore;
  const xlsx = globalThis.DHLXlsxLite;
  const rules = globalThis.DHLShopRules;
  if (!matcher || !xlsx || !rules) return;

  const TARGET_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
  const TEMPLATE_STORAGE_KEY = 'dhlSavedSapoTemplateBase64';
  const TEMPLATE_NAME_KEY = 'dhlSavedSapoTemplateName';
  let localSapoData = null;
  let localExportBuffer = null;
  let localExportName = '';

  function escapeXml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function standardNameForGroup(group) {
    const parent = String((group && group.parentName) || '').trim();
    const color = String((group && group.color) || '').trim();
    return color && !/^\(không màu\)$/i.test(color) ? `${parent} - ${color}` : parent;
  }

  function exactTargetName(product) {
    const current = String((product && product.name) || '').trim();
    if (/^(ĐT|CLB)\b.+\s-\s.+/i.test(current)) return current;
    return rules.sourceNameFromSkuBase((product && product.skuBase) || '');
  }

  function buildVariantMatches(product, group) {
    return (product.variants || []).map((sv) => {
      const size = matcher.normalizeSize(sv.size || sv.sizeFromSku);
      const candidates = (group.variants || []).filter((v) => matcher.normalizeSize(v.size) === size);
      return {
        sapo: sv,
        source: candidates.length === 1 ? candidates[0] : null,
        reason: candidates.length === 1 ? 'exact-name-exact-size' : 'size-missing-or-duplicate'
      };
    });
  }

  // Sau khi tên Sapo đã chuẩn hóa, chỉ ghép TÊN NGUỒN CHÍNH XÁC + SIZE CHÍNH XÁC.
  // Không còn ghép theo họ màu gần giống nên tránh Hà Lan Trắng -> Rêu, Ý Kem -> Xanh Ngọc...
  function patchMatcher() {
    matcher.matchSapoProducts = function matchExactSapoProducts(sapoProducts, sourceResults) {
      const groups = matcher.groupSourceVariants(sourceResults || []);
      const byName = new Map();
      for (const group of groups) {
        const key = rules.plain(standardNameForGroup(group));
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key).push(group);
      }
      const availableNames = [...byName.keys()].map((key) => standardNameForGroup(byName.get(key)[0]));

      return (sapoProducts || []).map((product) => {
        const target = rules.targetNameForProduct(product, availableNames);
        const candidates = target ? (byName.get(rules.plain(target)) || []) : [];
        const bestGroup = candidates.length === 1 ? candidates[0] : null;
        const variantMatches = bestGroup ? buildVariantMatches(product, bestGroup) : [];
        const complete = Boolean(bestGroup && variantMatches.length && variantMatches.every((x) => x.source));
        return {
          sapoProduct: product,
          matched: Boolean(bestGroup),
          best: bestGroup ? { ...bestGroup, score: 1 } : null,
          second: null,
          margin: bestGroup ? 1 : 0,
          variantMatches,
          complete,
          linkMethod: bestGroup ? 'tên nguồn chính xác + size chính xác' : 'unmatched'
        };
      });
    };

    matcher.buildScanHints = function buildExactScanHints(products) {
      const byTeam = new Map();
      for (const product of products || []) {
        const target = exactTargetName(product);
        if (!target) continue;
        const team = matcher.teamOf(target);
        if (!team) continue;
        const color = rules.sourceColorFromStandardName(target);
        if (!color) continue;
        if (!byTeam.has(team)) byTeam.set(team, { team, products: [], colors: [] });
        const sizes = [...new Set((product.variants || []).map((v) => matcher.normalizeSize(v.size || v.sizeFromSku)).filter((s) => TARGET_SIZES.includes(s)))];
        byTeam.get(team).products.push({
          productId: product.productId,
          name: product.name || '',
          skuBase: product.skuBase || '',
          colorHint: color,
          sizes
        });
        if (!byTeam.get(team).colors.includes(color)) byTeam.get(team).colors.push(color);
      }
      return [...byTeam.values()];
    };
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
    }
    return btoa(binary);
  }

  function base64ToUint8(base64) {
    const binary = atob(String(base64 || ''));
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  }

  async function rememberTemplate(file) {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      await chrome.storage.local.set({
        [TEMPLATE_STORAGE_KEY]: arrayBufferToBase64(buffer),
        [TEMPLATE_NAME_KEY]: file.name || 'mau-nhap-sapo.xlsx'
      });
      setTimeout(() => markTemplateSaved(file.name || 'mẫu nhập Sapo'), 350);
    } catch (_) {}
  }

  function markTemplateSaved(name) {
    const input = document.getElementById('sapoTemplate');
    const state = document.getElementById('templateState');
    const step = document.getElementById('templateStep');
    if (!input || !state || !step) return;
    state.textContent = `Đã lưu mẫu: ${name}. Lần sau tool tự nạp, không cần chọn lại.`;
    input.style.display = 'none';
    let changeBtn = document.getElementById('changeSavedTemplate');
    if (!changeBtn) {
      changeBtn = document.createElement('button');
      changeBtn.id = 'changeSavedTemplate';
      changeBtn.type = 'button';
      changeBtn.className = 'secondary';
      changeBtn.textContent = 'THAY MẪU NHẬP';
      changeBtn.style.marginTop = '8px';
      changeBtn.addEventListener('click', () => {
        input.style.display = '';
        input.click();
      });
      step.appendChild(changeBtn);
    }
  }

  async function restoreTemplate() {
    const input = document.getElementById('sapoTemplate');
    if (!input) return;
    try {
      const stored = await chrome.storage.local.get([TEMPLATE_STORAGE_KEY, TEMPLATE_NAME_KEY]);
      const base64 = stored[TEMPLATE_STORAGE_KEY];
      if (!base64) return;
      const bytes = base64ToUint8(base64);
      const file = new File([bytes], stored[TEMPLATE_NAME_KEY] || 'mau-nhap-sapo.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(() => markTemplateSaved(file.name), 450);
    } catch (_) {
      // Nếu trình duyệt chặn DataTransfer, người dùng chỉ cần chọn mẫu một lần bằng tay.
    }
  }

  function setInlineCell(xml, rowNumber, col, value) {
    const rowRe = new RegExp(`(<row\\b[^>]*\\br="${rowNumber}"[^>]*>)([\\s\\S]*?)(<\\/row>)`);
    let changed = false;
    const next = xml.replace(rowRe, (whole, open, body, close) => {
      const ref = `${col}${rowNumber}`;
      const cellRe = new RegExp(`<c\\b[^>]*\\br="${ref}"[^>]*(?:\\/>|>[\\s\\S]*?<\\/c>)`);
      const text = String(value == null ? '' : value);
      const preserve = /^\s|\s$|\n/.test(text) ? ' xml:space="preserve"' : '';
      const cell = `<c r="${ref}" t="inlineStr"><is><t${preserve}>${escapeXml(text)}</t></is></c>`;
      changed = true;
      return cellRe.test(body) ? `${open}${body.replace(cellRe, cell)}${close}` : `${open}${body}${cell}${close}`;
    });
    return { xml: next, changed };
  }

  async function buildRenameWorkbook(exportBuffer, sapoData, renameByProductId) {
    const book = await xlsx.readFirstSheet(exportBuffer.slice(0));
    const nameIndex = sapoData.headerMap['Tên sản phẩm*'];
    if (nameIndex == null) throw new Error('File xuất Sapo thiếu cột Tên sản phẩm*.');
    const nameCol = xlsx.indexToCol(nameIndex);
    let xml = book.xml;
    let changed = 0;

    for (const product of sapoData.products || []) {
      const newName = renameByProductId[String(product.productId)];
      if (!newName || String(product.name || '').trim() === String(newName).trim()) continue;
      const rowNumbers = (product.variants || []).map((v) => Number(v.rowIndex)).filter(Boolean);
      if (!rowNumbers.length) continue;
      const rowNumber = Math.min(...rowNumbers);
      const result = setInlineCell(xml, rowNumber, nameCol, newName);
      xml = result.xml;
      if (result.changed) changed += 1;
    }

    if (!changed) throw new Error('Không có tên sản phẩm nào cần đổi theo danh sách nguồn hiện tại.');
    book.files.set(book.sheetPath, new TextEncoder().encode(xml));
    return { bytes: xlsx.zipStore(book.files), changed };
  }

  function downloadBytes(bytes, fileName) {
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function catalogStandardNames() {
    const stored = await chrome.storage.local.get(['dhlCatalogResults']);
    const results = Array.isArray(stored.dhlCatalogResults) ? stored.dhlCatalogResults : [];
    const groups = matcher.groupSourceVariants(results);
    return [...new Set(groups.map(standardNameForGroup).filter(Boolean))];
  }

  async function refreshRenameButton() {
    const btn = document.getElementById('makeRenameSapo');
    const state = document.getElementById('renameSapoState');
    if (!btn || !state) return;
    const names = await catalogStandardNames();
    btn.disabled = !(localSapoData && localExportBuffer && names.length);
    if (!localSapoData) state.textContent = 'Chọn file xuất Sapo ở bên dưới.';
    else if (!names.length) state.textContent = 'Hãy QUÉT TOÀN BỘ TRANG HD trước để tool có danh sách tên nguồn.';
    else state.textContent = `Sẵn sàng đối chiếu ${localSapoData.products.length} sản phẩm Sapo với ${names.length} tên nguồn.`;
  }

  async function makeRenameFile() {
    const state = document.getElementById('renameSapoState');
    try {
      if (!localSapoData || !localExportBuffer) throw new Error('Chưa chọn file xuất Sapo.');
      const names = await catalogStandardNames();
      if (!names.length) throw new Error('Chưa có danh sách nguồn. Bấm QUÉT TOÀN BỘ TRANG HD trước.');

      const renameByProductId = Object.create(null);
      const unmatched = [];
      let alreadyExact = 0;
      for (const product of localSapoData.products || []) {
        const target = rules.targetNameForProduct(product, names);
        if (!target) {
          unmatched.push(product);
          continue;
        }
        if (rules.plain(product.name) === rules.plain(target)) {
          alreadyExact += 1;
          continue;
        }
        renameByProductId[String(product.productId)] = target;
      }

      const planned = Object.keys(renameByProductId).length;
      if (!planned) {
        state.textContent = `Không có tên nào cần đổi. ${alreadyExact} sản phẩm đã đúng tên nguồn; ${unmatched.length} sản phẩm chưa có đối chiếu.`;
        return;
      }

      const out = await buildRenameWorkbook(localExportBuffer, localSapoData, renameByProductId);
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      downloadBytes(out.bytes, `SAPO_DOI_TEN_THEO_NGUON_${stamp}.xlsx`);
      state.textContent = `Đã tạo file đổi tên ${out.changed} sản phẩm. ${alreadyExact} sản phẩm đã đúng sẵn; ${unmatched.length} sản phẩm chưa có nguồn tương ứng nên giữ nguyên.`;
    } catch (error) {
      state.textContent = `Lỗi: ${error.message || String(error)}`;
    }
  }

  function mountRenameUi() {
    const catalog = document.getElementById('catalogMode');
    if (!catalog || document.getElementById('makeRenameSapo')) return;
    const block = document.createElement('div');
    block.style.marginTop = '10px';
    block.style.paddingTop = '10px';
    block.style.borderTop = '1px solid #bfdbfe';
    block.innerHTML = `
      <button id="makeRenameSapo" class="secondary" style="width:100%" disabled>TẠO FILE ĐỔI TÊN SAPO</button>
      <small id="renameSapoState" style="display:block;margin-top:6px">Chọn file xuất Sapo ở bên dưới.</small>
      <small style="display:block;margin-top:4px">Chỉ đổi Tên sản phẩm*. SKU, ảnh, giá, mô tả, Alias, Id sản phẩm và Id phiên bản giữ nguyên.</small>`;
    catalog.appendChild(block);
    document.getElementById('makeRenameSapo').addEventListener('click', makeRenameFile);
    refreshRenameButton().catch(() => {});
  }

  function mountDailyGuide() {
    const steps = document.querySelector('.steps');
    if (!steps || document.getElementById('dailyGuide')) return;
    const note = document.createElement('section');
    note.id = 'dailyGuide';
    note.className = 'safety-note';
    note.style.borderColor = '#86efac';
    note.style.background = '#f0fdf4';
    note.innerHTML = '<b>DÙNG HẰNG NGÀY</b><span style="display:block;margin-top:5px">1) Xuất sản phẩm từ Sapo → 2) chọn file ở ô 1 → 3) QUÉT KHO → 4) TẠO FILE NHẬP SAPO. Mẫu nhập chỉ chọn một lần, tool sẽ nhớ.</span>';
    steps.parentElement.insertBefore(note, steps);
  }

  function bindInputs() {
    const exportInput = document.getElementById('sapoExport');
    const templateInput = document.getElementById('sapoTemplate');
    if (exportInput) {
      exportInput.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        try {
          const buffer = await file.arrayBuffer();
          localExportBuffer = buffer;
          localExportName = file.name || '';
          localSapoData = await xlsx.parseSapoExport(buffer.slice(0));
        } catch (_) {
          localExportBuffer = null;
          localSapoData = null;
        }
        refreshRenameButton().catch(() => {});
      });
    }
    if (templateInput) {
      templateInput.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        if (file) rememberTemplate(file);
      });
    }
  }

  patchMatcher();
  mountDailyGuide();
  mountRenameUi();
  bindInputs();
  restoreTemplate();

  // Khi catalog-mode vừa quét xong, dữ liệu được lưu vào storage. Theo dõi để tự bật nút đổi tên.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.dhlCatalogResults) refreshRenameButton().catch(() => {});
  });
})();
