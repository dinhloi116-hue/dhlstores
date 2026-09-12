const fs=require('fs');
const path=require('path');

const file=path.join(__dirname,'content.js');
let source=fs.readFileSync(file,'utf8');

function replaceBetween(startMarker,endMarker,replacement,label){
  const start=source.indexOf(startMarker);
  if(start<0)throw new Error(`CATEGORY LOOP PATCH FAILED: thiếu ${label} start`);
  const end=source.indexOf(endMarker,start);
  if(end<0)throw new Error(`CATEGORY LOOP PATCH FAILED: thiếu ${label} end`);
  source=source.slice(0,start)+replacement+'\n\n  '+source.slice(end);
}

replaceBetween(
  'async function clickElement(el) {',
  'function isSelectedColor(name, root) {',
`async function clickElement(el) {
    if (!el) return;
    try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (_) {}
    try {
      if (el.matches && el.matches('a[href]')) {
        // NO-DETAIL-NAV: giữ nguyên handler AJAX của site nhưng chặn href mở trang chi tiết.
        el.addEventListener('click', (event) => event.preventDefault(), { capture: true, once: true });
      }
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      el.click();
    } catch (_) {}
    if (el.matches && el.matches('input')) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }`,
  'clickElement'
);

replaceBetween(
  'function quickCandidates(descriptor, card) {',
  'function modalContainer(root) {',
`function quickCandidates(descriptor, card) {
    const id = String(descriptor.id);
    const selectors = 'button,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid],[data-variant-id],[class*="cart"],[class*="buy"],[class*="quick"],[class*="add"],a[href]';
    const pools = [];
    if (card) pools.push(...card.querySelectorAll(selectors));
    pools.push(...document.querySelectorAll(`[data-id="${CSS.escape(id)}"],[data-product-id="${CSS.escape(id)}"],[data-product="${CSS.escape(id)}"],[data-psid="${CSS.escape(id)}"]`));

    const out = [];
    const seen = new Set();
    for (const el of pools) {
      if (!el || seen.has(el) || !el.isConnected) continue;
      seen.add(el);
      const attrs = ['id', 'class', 'onclick', 'href', 'data-id', 'data-product-id', 'data-product', 'data-psid', 'data-variant-id', 'title', 'aria-label']
        .map((name) => (el.getAttribute && el.getAttribute(name)) || '').join(' ');
      const p = plain(`${text(el)} ${attrs}`);
      const isAnchor = el.matches && el.matches('a[href]');
      let hrefProductId = 0;
      if (isAnchor) {
        try { hrefProductId = core.extractProductId(new URL(el.getAttribute('href'), location.href).href) || 0; } catch (_) {}
      }
      const actionish = /them vao gio|them gio|chon mua|chon size|dat hang|add.?to.?cart|addcart|cart|quick.?buy|quick.?view|buy.?now|order/.test(p);
      if (isAnchor && hrefProductId && !actionish) continue;

      let score = 0;
      if (attrs.includes(id)) score += 180;
      if (/them vao gio|them gio|chon mua|chon size|dat hang/.test(p)) score += 160;
      if (/add.?to.?cart|addcart|cart|quick.?buy|quick.?view|buy.?now|order/.test(p)) score += 120;
      if (card && card.contains(el)) score += 45;
      if (el.matches && el.matches('button,[role="button"],[onclick]')) score += 25;
      if (!visible(el)) score -= 10;
      if (score >= 80) out.push({ el, score });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, 12);
  }`,
  'quickCandidates'
);

replaceBetween(
  'async function openStockPopup(descriptor) {',
  'async function firstVariant(parentId, parentName) {',
`async function openStockPopup(descriptor) {
    if (location.pathname !== HD_PATH) throw new Error('Tool chỉ quét popup trên trang danh mục HD, không quét trang chi tiết.');

    const existing = findStockRoot();
    const beforeFingerprint = existing ? `${rowsSignature(readTargetRows(existing, TARGET_SIZES))}|${colorControls(existing).map((x) => dom.colorKey(x.name)).join(',')}` : '';
    const expectedFirst = await firstVariant(Number(descriptor.id), descriptor.title || '');
    const expectedColorKey = expectedFirst && expectedFirst.color ? dom.colorKey(expectedFirst.color) : '';

    const card = cardForDescriptor(descriptor);
    if (!card) {
      const error = new Error(`Không tìm thấy card trên trang danh mục cho ${descriptor.title}.`);
      error.diagnostics = { cardFound: false, anchorCount: productAnchors(descriptor).length };
      throw error;
    }
    try {
      card.scrollIntoView({ block: 'center', inline: 'nearest' });
      card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, cancelable: true, view: window }));
      card.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
    } catch (_) {}
    await sleep(100);

    const candidates = quickCandidates(descriptor, card);
    for (const candidate of candidates) {
      if (location.pathname !== HD_PATH) throw new Error('Trang đã rời danh mục HD; dừng để tránh quét sai sản phẩm.');
      await clickElement(candidate.el);
      const started = Date.now();
      while (Date.now() - started < 2800) {
        await sleep(100);
        if (location.pathname !== HD_PATH) throw new Error('Nút mua nhanh đã làm trang rời danh mục HD; đã chặn quét tiếp.');
        const root = findStockRoot();
        if (!root) continue;
        const controls = colorControls(root);
        const currentFingerprint = `${rowsSignature(readTargetRows(root, TARGET_SIZES))}|${controls.map((x) => dom.colorKey(x.name)).join(',')}`;
        const colorOk = !expectedColorKey || controls.some((x) => dom.colorKey(x.name) === expectedColorKey) || dom.colorKey(text(root)).includes(expectedColorKey);
        const changed = !existing || currentFingerprint !== beforeFingerprint;
        // REUSE-POPUP-LOOP: không đóng popup giữa các sản phẩm; click card kế tiếp để AJAX thay nội dung modal.
        if (colorOk && (changed || Date.now() - started >= 850)) {
          await sleep(140);
          return { root, cardFound: true, candidateCount: candidates.length, reusedPopup: !!existing };
        }
      }
    }
    const error = new Error(`Không mở/cập nhật được popup tồn cho ${descriptor.title}. Tool đã thử ${candidates.length} nút mua nhanh trên đúng card.`);
    error.diagnostics = { cardFound: true, candidateCount: candidates.length, anchorCount: productAnchors(descriptor).length, reusedPopup: !!existing };
    throw error;
  }`,
  'openStockPopup'
);

replaceBetween(
  'async function scanOneDescriptor(descriptor, hints, progress) {',
  'async function scanHdLive(hints, progress) {',
`async function scanOneDescriptor(descriptor, hints, progress) {
    try {
      const openInfo = await openStockPopup(descriptor);
      return await readOpenedPopup(descriptor, hints, progress, openInfo);
    } catch (error) {
      return {
        parentId: Number(descriptor.id),
        parentName: descriptor.title || '',
        sourceUrl: descriptor.url || location.href,
        variants: [],
        complete: false,
        confidence: 'low',
        scanMethod: 'sapo-target-color-5-size',
        stopReason: 'popup-open-error',
        errors: [{ message: error.message || String(error) }],
        domDiagnostics: error.diagnostics || {}
      };
    }
  }`,
  'scanOneDescriptor'
);

replaceBetween(
  'async function scanHdLive(hints, progress) {',
  'async function scanCurrentPopup(hints, progress) {',
`async function scanHdLive(hints, progress) {
    if (location.pathname !== HD_PATH) throw new Error('Hãy để tab nguồn ở trang danh mục HD. Tool sẽ không mở trang chi tiết.');
    const links = await discoverHd2026();
    progress({ stage: 'discovered', productTotal: links.length });
    const results = [];
    for (let i = 0; i < links.length; i += 1) {
      if (location.pathname !== HD_PATH) throw new Error('Trang nguồn đã rời danh mục HD trong lúc quét.');
      const descriptor = links[i];
      progress({ stage: 'product', productIndex: i + 1, productTotal: links.length, descriptor });
      results.push(await scanOneDescriptor(descriptor, hints, progress));
      await sleep(140);
    }
    try { const root = findStockRoot(); if (root) await closeStockPopup(root); } catch (_) {}
    return results;
  }`,
  'scanHdLive'
);

if(!source.includes('REUSE-POPUP-LOOP')||!source.includes('NO-DETAIL-NAV'))throw new Error('CATEGORY LOOP PATCH FAILED: marker missing');
fs.writeFileSync(file,source,'utf8');

const popupFile=path.join(__dirname,'popup.js');
let popup=fs.readFileSync(popupFile,'utf8');
popup=popup.replace(/const VERSION = '[^']+';/,"const VERSION = '0.13.3';");
fs.writeFileSync(popupFile,popup,'utf8');

console.log('CATEGORY LOOP PATCH PASS: quét tuần tự toàn bộ card, tái sử dụng popup, không mở trang chi tiết, version 0.13.3');
