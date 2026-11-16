(() => {
  'use strict';

  const productCreate = globalThis.DHLProductCreateCore;
  if (!productCreate) return;

  const SOURCE_ORIGIN = 'https://si.aobongda.net';
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  function productIdFromUrl(value) {
    const s = String(value || '');
    const m = s.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i) || s.match(/[?&](?:psId|productId|id)=(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  async function ensureCategoryTab() {
    const tab = await activeTab();
    if (!tab || !tab.id || !String(tab.url || '').startsWith(`${SOURCE_ORIGIN}/`)) {
      throw new Error('Hãy mở đúng trang DANH MỤC trên si.aobongda.net trước.');
    }
    if (productIdFromUrl(tab.url)) {
      throw new Error('Bạn đang ở trang CHI TIẾT sản phẩm. Hãy quay lại DANH MỤC rồi quét.');
    }
    return tab;
  }

  async function discoverProducts(tabId) {
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        function pid(value) {
          const s = String(value || '');
          const m = s.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i) || s.match(/[?&](?:psId|productId|id)=(\d+)/i);
          return m ? Number(m[1]) : null;
        }
        function norm(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
        function cardFor(anchor) {
          let best = anchor.parentElement;
          for (let d = 0, el = anchor; d < 7 && el && el !== document.body; d += 1, el = el.parentElement) {
            const t = norm(el.innerText || el.textContent);
            if (!t || t.length > 3500) continue;
            if (/thêm vào giỏ|het hang|hết hàng|\d{2,3},?\d{3}đ/i.test(t)) best = el;
          }
          return best;
        }
        function imageUrl(card, anchor) {
          const imgs = [];
          if (anchor) imgs.push(...anchor.querySelectorAll('img'));
          if (card) imgs.push(...card.querySelectorAll('img'));
          for (const img of imgs) {
            for (const attr of ['data-src','data-original','data-lazy-src','data-srcset','srcset','src']) {
              let raw = img.getAttribute(attr) || '';
              if (attr.includes('srcset')) raw = raw.split(',')[0].trim().split(/\s+/)[0] || '';
              if (!raw || /^data:|^blob:/i.test(raw)) continue;
              try {
                const u = new URL(raw, location.href);
                if (/loading|placeholder|logo|icon|sprite|zalo|facebook|youtube/i.test(u.href)) continue;
                return u.href;
              } catch (_) {}
            }
          }
          return '';
        }
        function titleFor(anchor, card) {
          const direct = norm(anchor.innerText || anchor.textContent);
          if (direct && direct.length > 2 && direct.length < 180 && !/^(thêm vào giỏ|mua ngay|xem chi tiết)$/i.test(direct)) return direct;
          const img = anchor.querySelector('img');
          const alt = norm(img && (img.alt || img.title));
          if (alt && alt.length < 180) return alt;
          const h = card && card.querySelector('h2,h3,h4,.product-name,[class*="product-name"],[class*="name"]');
          const t = norm(h && (h.innerText || h.textContent));
          return t && t.length < 180 ? t : '';
        }
        const byId = new Map();
        for (const a of document.querySelectorAll('a[href]')) {
          let url;
          try { url = new URL(a.getAttribute('href'), location.href); } catch (_) { continue; }
          if (url.host !== location.host) continue;
          const id = pid(url.href);
          if (!id) continue;
          const card = cardFor(a);
          const title = titleFor(a, card);
          if (!title) continue;
          const cardText = norm(card && (card.innerText || card.textContent));
          const item = {
            id,
            url: url.href,
            title,
            imageUrl: imageUrl(card, a),
            outOfStock: /(^|\s)hết hàng(\s|$)|(^|\s)het hang(\s|$)/i.test(cardText)
          };
          const old = byId.get(id);
          if (!old || title.length > old.title.length || (!old.imageUrl && item.imageUrl)) byId.set(id, item);
        }
        return {
          items: [...byId.values()],
          pageTitle: norm((document.querySelector('h1') || {}).textContent) || norm(document.title),
          pageUrl: location.href
        };
      }
    });
    return (injected && injected[0] && injected[0].result) || { items: [], pageTitle: '', pageUrl: '' };
  }

  async function scanProductDetail(tabId, descriptor) {
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      args: [descriptor],
      func: async (item) => {
        const parentId = Number(item.id);
        const parentName = String(item.title || '').replace(/\s+/g, ' ').trim();
        const fallbackImage = String(item.imageUrl || '');
        const outOfStock = Boolean(item.outOfStock);

        function text(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
        function plain(v) {
          return text(v).toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
        }
        function normalizeSize(v) {
          const raw = text(v).toUpperCase().replace(/\s+/g, '');
          return ({'2XL':'XXL','3XL':'XXXL','4XL':'XXXXL','5XL':'XXXXXL','FREE':'FREESIZE','FREESIZE':'FREESIZE'})[raw] || raw;
        }
        function exactSize(v) {
          const raw = text(v).toUpperCase().replace(/\s+/g, '');
          if (/^(XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL|XXXXXL|2XL|3XL|4XL|5XL|FREE|FREESIZE)$/.test(raw)) return normalizeSize(raw);
          if (/^\d{1,3}$/.test(raw)) {
            const n = Number(raw);
            if (n >= 1 && n <= 60) return String(n);
          }
          return '';
        }
        function extractSize(value) {
          const raw = text(value);
          let m = raw.match(/(?:^|[\s\-\/])(FREESIZE|FREE|XXXXXL|XXXXL|XXXL|XXL|XL|2XL|3XL|4XL|5XL|L|M|S|XS|XXS|\d{1,3})(?:\s*)$/i);
          return m ? exactSize(m[1]) : '';
        }
        function stockOf(d) {
          for (const key of ['available','quantity','stock','inventory','remain','remainQuantity']) {
            const n = Number(d && d[key]);
            if (Number.isFinite(n) && n >= 0) return n;
          }
          return null;
        }
        function variantId(d) {
          for (const key of ['id','psId','productId','childId','variantId']) {
            const n = Number(d && d[key]);
            if (Number.isFinite(n) && n > 0) return n;
          }
          return 0;
        }
        function skuOf(d) { return text(d && (d.code || d.sku || d.productCode || d.barcode)); }
        function nameOf(d) { return text(d && (d.name || d.productName || d.title)); }
        function sizeOf(d) {
          return exactSize(d && (d.size || d.sizeName || d.optionSize || d.attributeSize)) || extractSize(`${nameOf(d)} ${skuOf(d)}`);
        }
        function colorOf(d) {
          const explicit = text(d && (d.color || d.colorName || d.colour || d.optionColor));
          if (explicit) return explicit;
          const parts = nameOf(d).split(/\s+-\s+/).map((x) => x.trim()).filter(Boolean);
          if (parts.length >= 3 && extractSize(parts[parts.length - 1])) return parts[parts.length - 2];
          if (parts.length >= 2) return parts[parts.length - 1];
          return '(không màu)';
        }
        function sameProduct(name) {
          const a = plain(parentName);
          const b = plain(String(name || '').split(/\s+-\s+/)[0]);
          if (!a || !b) return true;
          if (a.includes(b) || b.includes(a)) return true;
          const stop = new Set(['clb','dt','tre','em','hd','wc','world','cup','ao','bo','quan','bong','da','2024','2025','2026','2027','24','25','26','27']);
          const aa = a.split(' ').filter((x) => x.length > 1 && !stop.has(x));
          const bb = new Set(b.split(' ').filter((x) => x.length > 1 && !stop.has(x)));
          if (!aa.length) return true;
          return aa.filter((x) => bb.has(x)).length / aa.length >= 0.6;
        }
        async function fetchVariant(psId) {
          try {
            const r = await fetch(`/product/child?psId=${encodeURIComponent(psId)}`, {credentials:'include',cache:'no-store',headers:{Accept:'application/json, text/plain, */*'}});
            if (!r.ok) return null;
            const json = await r.json();
            const d = json && (json.data || json.result || json);
            if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
            const size = sizeOf(d);
            const stock = stockOf(d);
            if (!size || stock == null) return null;
            const name = nameOf(d);
            return {
              id: variantId(d) || Number(psId),
              parentId,
              sku: skuOf(d),
              name: name || `${parentName} - ${colorOf(d)} - ${size}`,
              color: colorOf(d),
              size,
              available: Number(stock),
              price: Number(d.price || 0) || 0,
              image: text(d.image || d.imageUrl || d.avatar || fallbackImage),
              status: Number(stock) > 0 ? 2 : 0,
              rawName: name
            };
          } catch (_) { return null; }
        }

        const detailResponse = await fetch(String(item.url), {credentials:'include',cache:'no-store'});
        if (!detailResponse.ok) throw new Error(`Không tải được trang chi tiết (${detailResponse.status})`);
        const html = await detailResponse.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const candidateIds = new Set([parentId]);
        const sizes = new Set();
        const colors = new Set();

        function addId(value) {
          const m = String(value || '').match(/\b(\d{5,})\b/);
          if (m) candidateIds.add(Number(m[1]));
        }
        function context(el) {
          const attrs = ['id','class','name','title','aria-label','data-name','data-type','data-option']
            .map((n) => (el.getAttribute && el.getAttribute(n)) || '').join(' ');
          const parentText = el.parentElement ? text(el.parentElement.innerText || el.parentElement.textContent).slice(0,120) : '';
          return `${attrs} ${text(el.innerText || el.textContent)} ${parentText}`;
        }

        for (const el of doc.querySelectorAll('*')) {
          const ctx = plain(context(el));
          const sizeCtx = /(^| )(size|kich co|kich thuoc|variant|phien ban)( |$)/.test(ctx);
          const colorCtx = /(^| )(mau|color|colour)( |$)/.test(ctx);
          if (sizeCtx) {
            const candidates = [el.getAttribute('value'), el.getAttribute('data-size'), el.getAttribute('data-value'), text(el.innerText || el.textContent)];
            for (const v of candidates) {
              const s = exactSize(v);
              if (s) sizes.add(s);
            }
          }
          if (colorCtx) {
            const c = text(el.getAttribute('data-color') || el.getAttribute('data-value') || el.getAttribute('title') || el.innerText || el.textContent);
            if (c && c.length <= 40 && !exactSize(c) && !/^\d+$/.test(c)) colors.add(c);
          }
          for (const attr of ['data-psid','data-child-id','data-variant-id','data-product-id','data-id']) {
            const v = el.getAttribute && el.getAttribute(attr);
            if (v && (sizeCtx || colorCtx || /psid|child|variant/i.test(attr))) addId(v);
          }
          if ((sizeCtx || colorCtx) && el.getAttribute) addId(el.getAttribute('value'));
        }

        for (const re of [
          /(?:psId|psid|childId|child_id|variantId|variant_id)\s*[:=]\s*["']?(\d{5,})/g,
          /product\/child\?psId=(\d{5,})/g,
          /data-(?:psid|child-id|variant-id)=["'](\d{5,})["']/g
        ]) {
          let m;
          while ((m = re.exec(html))) candidateIds.add(Number(m[1]));
        }

        const unique = new Map();
        function addVariant(v) {
          if (!v || !sameProduct(v.rawName || v.name)) return false;
          const key = `${plain(v.color)}|${normalizeSize(v.size)}`;
          if (!key || unique.has(key)) return false;
          unique.set(key, v);
          return true;
        }

        const ids = [...candidateIds].filter((x) => Number.isFinite(x) && x > 0).slice(0, 140);
        for (const id of ids) {
          const v = await fetchVariant(id);
          addVariant(v);
        }

        // If detail HTML only exposed one child id, probe around the real child id as a fallback.
        if (unique.size <= 1) {
          const seeds = [...unique.values()].map((v) => Number(v.id)).filter((x) => Number.isFinite(x) && x > 0);
          if (!seeds.length) seeds.push(parentId);
          const probe = new Set();
          for (const seed of seeds) for (let d = -3; d <= 36; d += 1) if (seed + d > 0) probe.add(seed + d);
          for (const id of probe) {
            if (candidateIds.has(id)) continue;
            const v = await fetchVariant(id);
            addVariant(v);
            if (sizes.size > 1 && unique.size >= sizes.size) break;
          }
        }

        // If the whole product is explicitly marked Hết hàng, missing listed sizes are safely 0.
        if (outOfStock && sizes.size) {
          const known = [...unique.values()];
          const baseColor = known[0] ? known[0].color : (colors.values().next().value || '(không màu)');
          const baseImage = known[0] ? known[0].image : fallbackImage;
          for (const size of sizes) {
            const key = `${plain(baseColor)}|${normalizeSize(size)}`;
            if (!unique.has(key)) {
              unique.set(key, {
                id: 0,
                parentId,
                sku: '',
                name: `${parentName}${baseColor && baseColor !== '(không màu)' ? ` - ${baseColor}` : ''} - ${size}`,
                color: baseColor,
                size,
                available: 0,
                price: 0,
                image: baseImage,
                status: 0,
                rawName: parentName,
                synthesizedFromExplicitOutOfStock: true
              });
            }
          }
        }

        const variants = [...unique.values()];
        const explicitSizeCount = sizes.size;
        const coveredSizes = new Set(variants.map((v) => normalizeSize(v.size))).size;
        const complete = variants.length > 0 && (explicitSizeCount === 0 || coveredSizes >= explicitSizeCount);
        return {
          parentId,
          parentName,
          sourceUrl: String(item.url || location.href),
          imageUrl: fallbackImage,
          variants,
          complete,
          confidence: complete ? 'high' : (variants.length ? 'medium' : 'low'),
          scanMethod: 'detail-html-child-ids-no-click',
          candidateIdCount: candidateIds.size,
          explicitSizeCount,
          coveredSizes,
          outOfStock,
          errors: complete ? [] : [{message:`Chưa đủ biến thể: ${coveredSizes}/${explicitSizeCount || '?' } size`}]
        };
      }
    });
    return (injected && injected[0] && injected[0].result) || null;
  }

  async function runScan(limit, store) {
    const tab = await ensureCategoryTab();
    const discovered = await discoverProducts(tab.id);
    if (!discovered.items.length) throw new Error('Không tìm thấy sản phẩm trên trang danh mục.');
    let items = discovered.items;
    if (limit === 1) items = [items.find((x) => !x.outOfStock) || items[0]];
    else if (Number.isFinite(limit)) items = items.slice(0, Math.max(1, limit));

    const results = [];
    const state = document.getElementById('catalogState');
    for (let i = 0; i < items.length; i += 1) {
      if (state) state.textContent = `${limit === 1 ? 'TEST NHANH' : 'Đang quét'} ${i + 1}/${items.length}: ${items[i].title} • đọc trang chi tiết + ID biến thể, KHÔNG CLICK`;
      const result = await scanProductDetail(tab.id, items[i]);
      if (result) results.push(result);
      await sleep(30);
    }

    if (store) {
      await chrome.storage.local.set({
        dhlCatalogResults: results,
        dhlCatalogSkuSamples: {},
        dhlCatalogAt: Date.now(),
        dhlCatalogPageTitle: discovered.pageTitle,
        dhlCatalogPageUrl: discovered.pageUrl
      });
    }
    return {results, discovered, itemCount: items.length};
  }

  async function exportProducts() {
    const state = document.getElementById('catalogState');
    try {
      const stored = await chrome.storage.local.get(['dhlCatalogResults']);
      const results = Array.isArray(stored.dhlCatalogResults) ? stored.dhlCatalogResults : [];
      if (!results.length || results.some((r) => !r.complete)) throw new Error('Dữ liệu chưa đủ 100%, tool không cho xuất file thiếu sản phẩm/size.');
      const out = productCreate.buildWorkbook(results);
      const blob = new Blob([out.bytes], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const url = URL.createObjectURL(blob), a = document.createElement('a'), d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      a.href = url; a.download = `SAPO_TAO_SAN_PHAM_MOI_${stamp}.xlsx`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1600);
      if (state) state.textContent = `Đã tạo file: ${out.products} sản phẩm/màu • ${out.rows} biến thể.`;
    } catch (error) {
      if (state) state.textContent = `Lỗi tạo file: ${error.message || String(error)}`;
    }
  }

  async function quickTest() {
    const scanBtn = document.getElementById('scanCatalogSource');
    const testBtn = document.getElementById('catalogQuickTest');
    const exportBtn = document.getElementById('exportCatalogSource');
    const state = document.getElementById('catalogState');
    testBtn.disabled = true; scanBtn.disabled = true; exportBtn.disabled = true;
    try {
      const {results} = await runScan(1, false);
      const r = results[0];
      if (!r || !r.complete) throw new Error(r && r.errors && r.errors[0] ? r.errors[0].message : 'Chưa đọc đủ biến thể');
      state.textContent = `TEST OK: ${r.parentName} • ${r.variants.length} biến thể • ${r.coveredSizes}/${r.explicitSizeCount || r.coveredSizes} size • không click, không nhảy trang.`;
    } catch (error) {
      state.textContent = `TEST LỖI: ${error.message || String(error)}`;
    } finally {
      testBtn.disabled = false; scanBtn.disabled = false;
    }
  }

  async function fullScan() {
    const scanBtn = document.getElementById('scanCatalogSource');
    const testBtn = document.getElementById('catalogQuickTest');
    const exportBtn = document.getElementById('exportCatalogSource');
    const state = document.getElementById('catalogState');
    scanBtn.disabled = true; testBtn.disabled = true; exportBtn.disabled = true;
    try {
      const {results, discovered, itemCount} = await runScan(null, true);
      const completeCount = results.filter((r) => r.complete).length;
      const variantCount = results.reduce((n, r) => n + (r.variants || []).length, 0);
      const groups = productCreate.makeRows(results).groups.length;
      const allComplete = completeCount === itemCount && results.length === itemCount;
      exportBtn.disabled = !allComplete;
      state.textContent = allComplete
        ? `${discovered.pageTitle}: ĐỦ ${completeCount}/${itemCount} sản phẩm • ${groups} mẫu/màu • ${variantCount} biến thể. Có thể tạo file Sapo.`
        : `${discovered.pageTitle}: CHƯA ĐỦ ${completeCount}/${itemCount} sản phẩm • ${groups} mẫu/màu • ${variantCount} biến thể. Tool KHÓA xuất file để tránh thiếu dữ liệu.`;
    } catch (error) {
      state.textContent = `Lỗi: ${error.message || String(error)}`;
    } finally {
      scanBtn.disabled = false; testBtn.disabled = false;
    }
  }

  function replaceAndBind(id, label, handler) {
    const old = document.getElementById(id);
    if (!old) return null;
    const fresh = old.cloneNode(true);
    fresh.textContent = label;
    fresh.disabled = false;
    old.replaceWith(fresh);
    fresh.addEventListener('click', (e) => { e.preventDefault(); handler(); });
    return fresh;
  }

  function install() {
    const scan = document.getElementById('scanCatalogSource');
    const test = document.getElementById('catalogQuickTest');
    const exp = document.getElementById('exportCatalogSource');
    const state = document.getElementById('catalogState');
    if (!scan || !test || !exp) return false;
    if (scan.dataset.detailApiV2 === '1') return true;

    const newScan = replaceAndBind('scanCatalogSource', 'QUÉT TOÀN BỘ TRANG ĐANG MỞ', fullScan);
    const newTest = replaceAndBind('catalogQuickTest', 'TEST NHANH 1 SP', quickTest);
    const newExport = replaceAndBind('exportCatalogSource', 'TẠO FILE SẢN PHẨM SAPO (.XLSX)', exportProducts);
    if (newScan) newScan.dataset.detailApiV2 = '1';
    if (newExport) newExport.disabled = true;
    if (state) state.textContent = 'v0.14.4: quét trang chi tiết bằng fetch + lấy ID biến thể, KHÔNG click. Nếu chưa đủ sản phẩm/size thì khóa xuất file.';
    return Boolean(newScan && newTest && newExport);
  }

  if (!install()) {
    const observer = new MutationObserver(() => { if (install()) observer.disconnect(); });
    observer.observe(document.documentElement, {childList:true, subtree:true});
    setTimeout(() => observer.disconnect(), 5000);
  }
})();
