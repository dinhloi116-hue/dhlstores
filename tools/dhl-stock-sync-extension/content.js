(() => {
  'use strict';

  const core = globalThis.DHLStockCore;
  const dom = globalThis.DHLDomStockParser;
  const matcher = globalThis.DHLMatchCore;
  if (!core || !dom || !matcher) return;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const TARGET_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
  const TEAM_PATTERNS = [
    ['bo dao nha', 'portugal'], ['tay ban nha', 'spain'], ['nhat ban', 'japan'], ['nhat', 'japan'],
    ['ha lan', 'netherlands'], ['argentina', 'argentina'], ['brazil', 'brazil'], ['mexico', 'mexico'],
    ['croatia', 'croatia'], ['crotia', 'croatia'], ['phap', 'france'], ['duc', 'germany'],
    ['anh', 'england'], ['bi', 'belgium'], ['y', 'italy']
  ];

  function plain(value) {
    return dom.plain(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function text(el) {
    return core.normalizeText((el && (el.innerText || el.textContent)) || '');
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2;
  }

  function teamKey(value) {
    const p = ` ${plain(value)} `;
    for (const [pattern, key] of TEAM_PATTERNS) if (p.includes(` ${pattern} `)) return key;
    return '';
  }

  function hintForTitle(title, hints) {
    const key = teamKey(title);
    return key ? (hints || []).find((hint) => hint && hint.team === key) || null : null;
  }

  function targetSizesForHint(hint) {
    const requested=[];
    const seen=new Set();
    for(const product of (hint&&hint.products)||[]){
      for(const value of product.sizes||[]){
        const size=dom.normalizeSize(value);
        if(size&&!seen.has(size)){seen.add(size);requested.push(size);}
      }
    }
    return requested;
  }

  function detectedSizesFromRoot(root){
    const out=[],seen=new Set();
    if(!root)return out;
    for(const tr of root.querySelectorAll('tr,[role="row"]')){
      if(!visible(tr))continue;
      const hit=dom.extractSizeStock(text(tr));
      if(!hit)continue;
      const size=dom.normalizeSize(hit.size);
      if(size&&!seen.has(size)){seen.add(size);out.push(size);}
    }
    if(!out.length){
      for(const el of root.querySelectorAll('li,div,p,span')){
        if(!visible(el)||el.childElementCount>10)continue;
        const hit=dom.extractSizeStock(text(el));
        if(!hit)continue;
        const size=dom.normalizeSize(hit.size);
        if(size&&!seen.has(size)){seen.add(size);out.push(size);}
      }
    }
    return out;
  }

    function productTitleFromDocument(doc = document) {
    for (const selector of ['h1', '[itemprop="name"]', '.product-name', '.detail-title', '[class*="product-name"]', '[class*="product-title"]']) {
      const el = doc.querySelector(selector);
      if (el) {
        const value = core.normalizeText(el.textContent);
        if (value) return value;
      }
    }
    return core.normalizeText(doc.title).replace(/\s*[-|].*$/, '');
  }

  function titleForProductAnchor(a) {
    const direct=core.normalizeText(a&&a.textContent);
    if(direct&&direct.length>2&&direct.length<200&&!/^(đăng nhập ngay|xem chi tiết|mua ngay)$/i.test(direct))return direct;
    const img=a&&a.querySelector&&a.querySelector('img');
    const alt=core.normalizeText(img&&(img.alt||img.title));
    return alt&&alt.length<200?alt:'';
  }

  function findProductLinksInDocument(doc=document,baseUrl=location.href){
    const base=new URL(baseUrl,location.href),seen=new Map();
    for(const a of doc.querySelectorAll('a[href]')){
      try{
        const url=new URL(a.getAttribute('href'),base);
        if(url.host!==location.host)continue;
        const id=core.extractProductId(url.href),title=titleForProductAnchor(a);
        if(!id||!title)continue;
        const current=seen.get(id);
        if(!current||title.length>current.title.length)seen.set(id,{id,url:url.href,title,categoryPath:location.pathname});
      }catch(_){}
    }
    return[...seen.values()];
  }

  async function discoverCurrentCategory(){
    const links=findProductLinksInDocument(document,location.href);
    if(!links.length)throw new Error('Không tìm thấy sản phẩm trên trang danh mục đang mở');
    return links;
  }

    function stockMarker(value) {
    return /nhap so luong cho tung size|ten size|tinh trang ton|con hang|het hang|ton kho/.test(plain(value));
  }

  function colorMarker(value) {
    return /chon mau|mau sac|chon mau sac/.test(plain(value));
  }

  function findStockRoot() {
    const tables = [...document.querySelectorAll('table,[role="table"]')]
      .filter((table) => visible(table) && /ten size|tinh trang ton|con hang|het hang/.test(plain(text(table))));

    for (const table of tables) {
      let best = table;
      let colorContainer = null;
      for (let depth = 0, el = table.parentElement; depth < 8 && el && el !== document.body; depth += 1, el = el.parentElement) {
        const value = text(el);
        if (!value || value.length > 6500) break;
        best = el;
        if (colorMarker(value)) {
          colorContainer = el;
          break;
        }
      }
      return colorContainer || best;
    }

    const selectors = ['[role="dialog"]', 'dialog', '.modal.show', '.modal.in', '.modal', '.modal-content', '[class*="modal"]', '[class*="popup"]', '[class*="dialog"]'];
    const candidates = [];
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (!visible(el)) continue;
        const value = text(el);
        if (value.length < 6500 && stockMarker(value)) candidates.push(el);
      }
    }
    candidates.sort((a, b) => text(a).length - text(b).length);
    return candidates[0] || null;
  }

  async function waitForStockRoot(timeout = 3500) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const root = findStockRoot();
      if (root) return root;
      await sleep(100);
    }
    return null;
  }

  function readTargetRows(root,targetSizes){
    if(!root)return[];
    const order=(targetSizes&&targetSizes.length?targetSizes:detectedSizesFromRoot(root)).map(dom.normalizeSize).filter(Boolean);
    const wanted=new Set(order),rows=[];
    for(const tr of root.querySelectorAll('tr,[role="row"]')){
      if(!visible(tr))continue;
      const hit=dom.extractSizeStock(text(tr));if(!hit)continue;
      const size=dom.normalizeSize(hit.size);
      if(!wanted.size||wanted.has(size))rows.push({size,stock:Number(hit.stock),raw:text(tr)});
    }
    if(!rows.length){
      const values=[];
      for(const el of root.querySelectorAll('li,div,p,span')){
        if(!visible(el)||el.childElementCount>10)continue;
        const value=text(el);if(value&&value.length<=220&&dom.extractSizeStock(value))values.push(value);
      }
      for(const row of dom.parseRowTexts(values)){
        const size=dom.normalizeSize(row.size);
        if(!wanted.size||wanted.has(size))rows.push({...row,size});
      }
    }
    const unique=new Map();for(const row of rows)if(!unique.has(row.size))unique.set(row.size,row);
    const finalOrder=order.length?order:[...unique.keys()];
    return finalOrder.filter(size=>unique.has(size)).map(size=>unique.get(size));
  }

    function rowsSignature(rows) {
    return JSON.stringify((rows || []).map((row) => [row.size, Number(row.stock)]));
  }

  function hasAllTargetRows(rows, targetSizes) {
    const wanted = new Set((targetSizes || TARGET_SIZES).map(dom.normalizeSize));
    return rows.length === wanted.size && [...wanted].every((size) => rows.some((row) => row.size === size));
  }

  async function stableTargetRows(root, targetSizes, timeout = 1500) {
    let best = [];
    let previous = '';
    let stable = 0;
    const started = Date.now();
    while (Date.now() - started < timeout) {
      await sleep(90);
      const currentRoot = findStockRoot() || root;
      const rows = readTargetRows(currentRoot, targetSizes);
      const signature = rowsSignature(rows);
      if (rows.length > best.length) best = rows;
      if (signature && signature === previous) stable += 1;
      else stable = 0;
      previous = signature;
      if (hasAllTargetRows(rows, targetSizes) && stable >= 1) return rows;
      if (rows.length > 0 && stable >= 3) return rows;
    }
    return best;
  }

  function labelForInput(input, root) {
    const candidates = [];
    if (input.id) {
      const selector = `label[for="${CSS.escape(input.id)}"]`;
      const label = root.querySelector(selector) || document.querySelector(selector);
      if (label) candidates.push(text(label));
    }
    const own = input.closest('label');
    if (own) candidates.push(text(own));
    for (const el of [input.nextElementSibling, input.previousElementSibling, input.parentElement]) if (el) candidates.push(text(el));
    for (const value of [input.dataset && input.dataset.color, input.dataset && input.dataset.name, input.title, input.getAttribute('aria-label')]) {
      if (value) candidates.push(core.normalizeText(value));
    }

    for (const candidate of candidates) {
      const clean = core.normalizeText(candidate);
      if (clean.length <= 45 && dom.looksLikeColorName(clean)) return clean;
    }
    return '';
  }

  function colorControls(root) {
    if (!root) return [];
    const radios = [];
    const seen = new Set();

    for (const input of root.querySelectorAll('input[type="radio"]')) {
      const name = labelForInput(input, root);
      const key = dom.colorKey(name);
      if (!name || !key || seen.has(key)) continue;
      seen.add(key);
      radios.push({ name, el: input });
    }
    if (radios.length) return radios;

    for (const el of root.querySelectorAll('[data-color]')) {
      const name = core.normalizeText(el.getAttribute('data-color'));
      const key = dom.colorKey(name);
      if (!name || !key || seen.has(key) || !dom.looksLikeColorName(name)) continue;
      seen.add(key);
      radios.push({ name, el });
    }
    return radios;
  }

  function findColorControl(name, root) {
    const key = dom.colorKey(name);
    return colorControls(root).find((item) => dom.colorKey(item.name) === key) || null;
  }

  function expectedColorHints(hint) {
    return [...new Set(((hint && hint.colors) || []).map((value) => core.normalizeText(value)).filter(Boolean))];
  }

  function selectTargetControls(allControls, hint) {
    const wanted = expectedColorHints(hint);
    if (!wanted.length) return { controls: allControls, missingHints: [] };

    const pairs = [];
    for (let hi = 0; hi < wanted.length; hi += 1) {
      for (let ci = 0; ci < allControls.length; ci += 1) {
        const score = matcher.scoreColorHint(wanted[hi], allControls[ci].name);
        if (score > 0) pairs.push({ hi, ci, score });
      }
    }
    pairs.sort((a, b) => b.score - a.score);

    const usedHints = new Set();
    const usedControls = new Set();
    const selected = [];
    for (const pair of pairs) {
      if (pair.score < 0.5 || usedHints.has(pair.hi) || usedControls.has(pair.ci)) continue;
      usedHints.add(pair.hi);
      usedControls.add(pair.ci);
      selected.push({ ...allControls[pair.ci], hint: wanted[pair.hi], hintScore: pair.score });
    }

    const missingHints = wanted.filter((_, index) => !usedHints.has(index));
    return { controls: selected, missingHints };
  }

  async function clickElement(el) {
    if (!el) return;
    try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (_) {}
    try { el.click(); } catch (_) {}
    if (el.matches && el.matches('input')) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function isSelectedColor(name, root) {
    const control = findColorControl(name, root);
    if (!control || !control.el) return false;
    if ('checked' in control.el) return Boolean(control.el.checked);
    return control.el.getAttribute('aria-checked') === 'true' || /\b(active|selected|checked)\b/i.test(String(control.el.className || ''));
  }

  async function switchColorAndRead(name, root, targetSizes, previousSignature = '') {
    let currentRoot = findStockRoot() || root;
    const control = findColorControl(name, currentRoot);
    if (!control) return [];

    const alreadySelected = isSelectedColor(name, currentRoot);
    if (!alreadySelected) await clickElement(control.el);

    const started = Date.now();
    let best = [];
    let seenSelected = alreadySelected;
    while (Date.now() - started < 2600) {
      await sleep(110);
      currentRoot = findStockRoot() || currentRoot;
      if (isSelectedColor(name, currentRoot)) seenSelected = true;
      const rows = readTargetRows(currentRoot, targetSizes);
      if (rows.length > best.length) best = rows;
      const signature = rowsSignature(rows);
      const elapsed = Date.now() - started;

      if (seenSelected && hasAllTargetRows(rows, targetSizes)) {
        if (alreadySelected || signature !== previousSignature || elapsed >= 650) {
          await sleep(120);
          return stableTargetRows(currentRoot, targetSizes, 700);
        }
      }
    }
    return best;
  }

  function productAnchors(descriptor) {
    const out = [];
    for (const a of document.querySelectorAll('a[href]')) {
      try {
        const url = new URL(a.getAttribute('href'), location.href);
        if (core.extractProductId(url.href) === Number(descriptor.id)) out.push(a);
      } catch (_) {}
    }
    return out;
  }

  function cardForDescriptor(descriptor) {
    const anchors = productAnchors(descriptor);
    let best = null;
    for (const anchor of anchors) {
      let el = anchor;
      for (let depth = 0; depth < 8 && el; depth += 1, el = el.parentElement) {
        if (!el || el === document.body) break;
        const value = text(el);
        if (!value || value.length > 3500) continue;
        const productLinks = [...el.querySelectorAll('a[href]')].filter((a) => {
          try { return !!core.extractProductId(new URL(a.getAttribute('href'), location.href).href); } catch (_) { return false; }
        });
        const clickables = el.querySelectorAll('button,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid],[class*="cart"],[class*="buy"],[class*="quick"]').length;
        if (productLinks.length <= 3 && clickables) {
          const score = (productLinks.length === 1 ? 100 : 60) - value.length / 100;
          if (!best || score > best.score) best = { el, score };
        }
      }
    }
    return best ? best.el : (anchors[0] ? anchors[0].parentElement : null);
  }

  function quickCandidates(descriptor, card) {
    const id = String(descriptor.id);
    const selectors = 'button,a,[role="button"],[onclick],[data-id],[data-product-id],[data-product],[data-psid],[data-variant-id],[class*="cart"],[class*="buy"],[class*="quick"],[class*="add"]';
    const pools = [];
    if (card) pools.push(...card.querySelectorAll(selectors));
    pools.push(...document.querySelectorAll(`[data-id="${CSS.escape(id)}"],[data-product-id="${CSS.escape(id)}"],[data-product="${CSS.escape(id)}"],[data-psid="${CSS.escape(id)}"]`));

    const out = [];
    const seen = new Set();
    for (const el of pools) {
      if (!el || seen.has(el) || !visible(el)) continue;
      seen.add(el);
      const attrs = ['id', 'class', 'onclick', 'href', 'data-id', 'data-product-id', 'data-product', 'data-psid', 'data-variant-id', 'title', 'aria-label']
        .map((name) => (el.getAttribute && el.getAttribute(name)) || '').join(' ');
      const p = plain(`${text(el)} ${attrs}`);
      let score = 0;
      if (attrs.includes(id)) score += 140;
      if (/them vao gio|them gio|chon mua|chon size|dat hang/.test(p)) score += 120;
      if (/add.?to.?cart|addcart|cart|quick.?buy|quick.?view|buy.?now|order/.test(p)) score += 70;
      if (card && card.contains(el)) score += 25;
      if (el.matches('button,[role="button"],[onclick]')) score += 15;
      if (score > 0) out.push({ el, score });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, 10);
  }

  function modalContainer(root) {
    return root ? (root.closest('[role="dialog"],dialog,.modal,[class*="modal"],[class*="popup"],[class*="dialog"]') || root) : null;
  }

  async function closeStockPopup(root) {
    const container = modalContainer(root);
    if (!container) return true;
    const candidates = [...container.querySelectorAll('button,a,[role="button"],[aria-label],[title],[class*="close"],[data-dismiss="modal"],[data-bs-dismiss="modal"],.btn-close,.close')]
      .filter(visible)
      .map((el) => {
        const p = plain(`${text(el)} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.className || ''}`);
        let score = 0;
        if (el.matches('[data-dismiss="modal"],[data-bs-dismiss="modal"],.btn-close,.close')) score += 180;
        if (/dong|close/.test(p)) score += 120;
        if (/^[x×]$/.test(text(el).trim().toLowerCase())) score += 150;
        return { el, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    if (candidates[0]) await clickElement(candidates[0].el);
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    await sleep(260);
    return !findStockRoot();
  }

  function popupFingerprint(root) {
    if (!root) return '';
    const rows = readTargetRows(root, detectedSizesFromRoot(root));
    const colors = colorControls(root).map((x) => dom.colorKey(x.name));
    const marker = String(root.innerHTML || '').replace(/\s+/g, ' ').slice(0, 12000);
    return JSON.stringify({ rows: rows.map((r) => [r.size, Number(r.stock)]), colors, marker });
  }

  // navigation-guard-v1
  function inertActionHref(el) {
    if (!el || !el.matches || !el.matches('a[href]')) return false;
    try {
      const url = new URL(el.getAttribute('href'), location.href);
      return url.host === location.host && Boolean(core.extractProductId(url.href));
    } catch (_) { return false; }
  }

  async function clickQuickCandidate(el) {
    if (!el) return;
    if (el.matches && el.matches('a[href]')) {
      const guard = (event) => event.preventDefault();
      el.addEventListener('click', guard, { capture: true, once: true });
    }
    await clickElement(el);
  }

  async function waitForPopupRefresh(beforeFingerprint, expectedPath, timeout = 3200) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      await sleep(90);
      if (expectedPath && location.pathname !== expectedPath) throw new Error('Trang nguồn đã rời danh mục đang quét; dừng để tránh sai dữ liệu.');
      const root = findStockRoot();
      if (!root) continue;
      const fp = popupFingerprint(root);
      if (!beforeFingerprint || (fp && fp !== beforeFingerprint)) {
        await sleep(220);
        return findStockRoot() || root;
      }
    }
    return null;
  }

  async function openStockPopup(descriptor) {
    const expectedPath=descriptor.categoryPath||location.pathname;
    if (location.pathname !== expectedPath) throw new Error('Tool chỉ quét trên đúng trang danh mục đang mở.');
    const existing = findStockRoot();
    const before = popupFingerprint(existing);
    const card = cardForDescriptor(descriptor);
    const candidates = quickCandidates(descriptor, card).filter((item) => !inertActionHref(item.el));
    for (const candidate of candidates) {
      await clickQuickCandidate(candidate.el);
      const root = await waitForPopupRefresh(before, expectedPath, 3200);
      if (root) return { root, cardFound: !!card, candidateCount: candidates.length, reusedPopup: !!existing };
    }
    const error = new Error(`Không bật được popup tồn cho ${descriptor.title} ngay trên trang danh mục.`);
    error.diagnostics = { cardFound: !!card, candidateCount: candidates.length, anchorCount: productAnchors(descriptor).length, categoryOnly: true };
    throw error;
  }

  async function firstVariant(parentId, parentName) {
    try {
      const response = await fetch(`/product/child?psId=${encodeURIComponent(parentId)}`, {
        credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json, text/plain, */*' }
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data && data.data ? core.normalizeVariant(data.data, parentId, parentName) : null;
    } catch (_) {
      return null;
    }
  }

  function makeVariant(parentId, parentName, color, row, index) {
    const cleanColor = core.normalizeText(color) || '(không màu)';
    const size = dom.normalizeSize(row.size);
    return {
      id: Number(parentId) * 1000 + index + 1,
      parentId: Number(parentId),
      sku: `DOM-${parentId}-${dom.colorKey(cleanColor).replace(/\s+/g, '_') || 'COLOR'}-${size}`.toUpperCase(),
      name: `${parentName} - ${cleanColor} - ${size}`,
      color: cleanColor,
      size,
      available: Number(row.stock),
      price: 0,
      image: '',
      status: Number(row.stock) > 0 ? 2 : 0,
      scanMethod: 'category-target-color-size'
    };
  }

  async function readOpenedPopup(descriptor, hints, progress, openInfo = null) {
    const root = (openInfo && openInfo.root) || findStockRoot();
    if (!root) throw new Error('Chưa có popup tồn kho đang mở');

    const parentId = Number(descriptor.id || core.extractProductId(location.href));
    const parentName = core.normalizeText(descriptor.title || productTitleFromDocument() || `#${parentId}`);
    const hint = hintForTitle(parentName, hints);
    const hintedSizes = targetSizesForHint(hint);
    const neededSizes = hintedSizes.length ? hintedSizes : detectedSizesFromRoot(root);
    const first = await firstVariant(parentId, parentName);
    const fallbackColor = first && first.color ? first.color : '';

    const allControls = colorControls(root);
    const targetSelection = selectTargetControls(allControls, hint);
    let controls = targetSelection.controls;
    const fallbackWanted = expectedColorHints(hint);
    // single-color-fallback
    if (!controls.length && fallbackColor) {
      if (!fallbackWanted.length) {
        controls = [{ name: fallbackColor, el: null, hint: fallbackColor, hintScore: 1 }];
      } else {
        const ranked = fallbackWanted.map((wanted) => ({ hint: wanted, score: matcher.scoreColorHint(wanted, fallbackColor) })).sort((a, b) => b.score - a.score);
        const best = ranked[0];
        if (best && best.score >= 0.5) {
          controls = [{ name: fallbackColor, el: null, hint: best.hint, hintScore: best.score }];
          targetSelection.missingHints = (targetSelection.missingHints || []).filter((value) => value !== best.hint);
        }
      }
    }

    const variants = [];
    const snapshots = [];
    let previousSignature = '';

    for (let index = 0; index < controls.length; index += 1) {
      const target = controls[index];
      let rows = [];
      let currentRoot = findStockRoot() || root;
      if (target.el) {
        rows = await switchColorAndRead(target.name, currentRoot, neededSizes, previousSignature);
      } else {
        rows = await stableTargetRows(currentRoot, neededSizes);
      }
      previousSignature = rowsSignature(rows);

      snapshots.push({ color: target.name, hint: target.hint || '', hintScore: target.hintScore || 0, rows });
      progress({
        stage: 'dom-color',
        descriptor,
        color: target.name,
        colorIndex: index + 1,
        colorTotal: controls.length,
        rows: rows.length,
        targetRows: neededSizes.length,
        targetSizes: neededSizes
      });
      rows.forEach((row) => variants.push(makeVariant(parentId, parentName, target.name, row, variants.length)));
    }

    const unique = new Map();
    for (const variant of variants) {
      const key = `${dom.colorKey(variant.color)}|${dom.normalizeSize(variant.size)}`;
      if (!unique.has(key)) unique.set(key, variant);
    }

    const list = [...unique.values()];
    const colorKeys = [...new Set(list.map((variant) => dom.colorKey(variant.color)).filter(Boolean))];
    const missing = [];
    for (const color of colorKeys) {
      for (const size of neededSizes) {
        if (!list.some((variant) => dom.colorKey(variant.color) === color && variant.size === size)) missing.push(`${color}/${size}`);
      }
    }

    const expectedHints = expectedColorHints(hint);
    const complete = expectedHints.length
      ? targetSelection.missingHints.length === 0 && colorKeys.length === expectedHints.length && missing.length === 0
      : Boolean(list.length) && missing.length === 0;

    const result = {
      parentId,
      parentName,
      variants: list,
      errors: [],
      requestCount: 1,
      stopReason: complete ? 'target-colors-5-size-complete' : 'target-colors-5-size-partial',
      confidence: list.length ? (complete ? 'high' : 'medium') : 'low',
      complete,
      scanMethod: 'category-target-color-size',
      sourceUrl: location.href,
      expectedFromSapo: expectedHints.length * neededSizes.length,
      domDiagnostics: {
        stockUiFound: true,
        cardFound: openInfo ? openInfo.cardFound : null,
        candidateCount: openInfo ? openInfo.candidateCount : null,
        allColorControls: allControls.map((item) => item.name),
        targetColorHints: expectedHints,
        selectedColorControls: controls.map((item) => item.name),
        missingColorHints: targetSelection.missingHints,
        colorsRead: colorKeys.length,
        expectedColorCount: expectedHints.length,
        expectedSizes: neededSizes,
        ignoredSizes: [],
        missingSizes: missing,
        snapshots
      }
    };
    result.validation = core.validateScanResult(result);
    return result;
  }

  async function scanOneDescriptor(descriptor, hints, progress) {
    let openInfo = null;
    try {
      openInfo = await openStockPopup(descriptor);
      return await readOpenedPopup(descriptor, hints, progress, openInfo);
    } catch (error) {
      return {
        parentId: Number(descriptor.id),
        parentName: descriptor.title || '',
        sourceUrl: descriptor.url || location.href,
        variants: [],
        complete: false,
        confidence: 'low',
        scanMethod: 'category-target-color-size',
        stopReason: 'popup-open-error',
        errors: [{ message: error.message || String(error) }],
        domDiagnostics: error.diagnostics || {}
      };
    }
  }

  async function scanHdLive(hints,progress){
    const categoryPath=location.pathname;
    const links=await discoverCurrentCategory();
    links.forEach(item=>{item.categoryPath=categoryPath;});
    progress({stage:'discovered',productTotal:links.length,categoryPath});
    const results=[];
    const stale=findStockRoot();if(stale)await closeStockPopup(stale);
    for(let i=0;i<links.length;i+=1){
      if(location.pathname!==categoryPath)throw new Error('Trang nguồn đã rời danh mục đang quét.');
      const descriptor=links[i];
      progress({stage:'product',productIndex:i+1,productTotal:links.length,descriptor});
      results.push(await scanOneDescriptor(descriptor,hints,progress));
      await sleep(180);
    }
    const finalPopup=findStockRoot();if(finalPopup)await closeStockPopup(finalPopup);
    return results;
  }

    async function scanCurrentPopup(hints, progress) {
    const root = findStockRoot();
    if (!root) throw new Error('Hãy mở popup chọn màu/size của một sản phẩm trước rồi bấm Test popup đang mở.');
    const parentId = core.extractParentIdFromHtml(document.documentElement.innerHTML, core.extractProductId(location.href));
    const descriptor = { id: parentId || core.extractProductId(location.href) || 0, title: productTitleFromDocument(), url: location.href };
    return readOpenedPopup(descriptor, hints, progress, { root, cardFound: null, candidateCount: null });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) return;
    const hints = Array.isArray(message.hints) ? message.hints : [];
    const progress = (data) => chrome.runtime.sendMessage({ type: 'DHL_STOCK_PROGRESS', data }).catch(() => {});

    if (message.type === 'DHL_DISCOVER_HD_2026') {
      discoverHd2026().then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'DHL_SCAN_HD_LIVE') {
      scanHdLive(hints, progress).then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'DHL_SCAN_CURRENT_POPUP' || message.type === 'DHL_SCAN_CURRENT_DOM' || message.type === 'DHL_SCAN_CURRENT') {
      scanCurrentPopup(hints, progress).then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
  });
})();
