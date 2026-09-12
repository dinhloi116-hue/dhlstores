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
    if (productIdFromUrl(tab.url)) throw new Error('Bạn đang ở trang CHI TIẾT. Hãy quay lại DANH MỤC rồi quét.');
    return tab;
  }

  async function discoverProducts(tabId) {
    const out = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        function pid(v) {
          const s = String(v || '');
          const m = s.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i) || s.match(/[?&](?:psId|productId|id)=(\d+)/i);
          return m ? Number(m[1]) : null;
        }
        function norm(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
        function visible(el) {
          if (!el || !el.isConnected) return false;
          const cs = getComputedStyle(el), r = el.getBoundingClientRect();
          return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && r.width > 2 && r.height > 2;
        }
        function cardFor(anchor, id) {
          let best = null;
          for (let d = 0, el = anchor; d < 8 && el && el !== document.body; d += 1, el = el.parentElement) {
            const t = norm(el.innerText || el.textContent);
            if (!t || t.length > 3500) continue;
            const ids = new Set();
            for (const a of el.querySelectorAll('a[href]')) {
              try { const x = pid(new URL(a.getAttribute('href'), location.href).href); if (x) ids.add(x); } catch (_) {}
            }
            const actions = [...el.querySelectorAll('a,button,[role="button"],[onclick]')]
              .filter((x) => /thêm vào giỏ|them vao gio|chọn mua|chon mua|mua ngay/i.test(norm(x.innerText || x.textContent)));
            if (ids.has(id) && ids.size <= 2 && actions.length) {
              const score = 100 - ids.size * 20 - t.length / 100;
              if (!best || score > best.score) best = { el, score };
            }
          }
          return best ? best.el : anchor.parentElement;
        }
        function imageUrl(card, anchor) {
          const imgs = [...(anchor ? anchor.querySelectorAll('img') : []), ...(card ? card.querySelectorAll('img') : [])];
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
          if (direct && direct.length > 2 && direct.length < 180 && !/thêm vào giỏ|mua ngay|xem chi tiết/i.test(direct)) return direct;
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
          const id = pid(url.href); if (!id) continue;
          const card = cardFor(a, id);
          const title = titleFor(a, card); if (!title) continue;
          const item = { id, url: url.href, title, imageUrl: imageUrl(card, a) };
          const old = byId.get(id);
          if (!old || title.length > old.title.length || (!old.imageUrl && item.imageUrl)) byId.set(id, item);
        }
        return { items: [...byId.values()], pageTitle: norm((document.querySelector('h1') || {}).textContent) || norm(document.title), pageUrl: location.href };
      }
    });
    return (out && out[0] && out[0].result) || { items: [], pageTitle: '', pageUrl: '' };
  }

  async function scanOnePopup(tabId, descriptor) {
    const out = await chrome.scripting.executeScript({
      target: { tabId },
      args: [descriptor],
      func: async (item) => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const parentId = Number(item.id);
        const parentName = String(item.title || '').replace(/\s+/g, ' ').trim();
        const fallbackImage = String(item.imageUrl || '');

        function norm(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
        function plain(v) { return norm(v).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
        function visible(el) {
          if (!el || !el.isConnected) return false;
          const cs = getComputedStyle(el), r = el.getBoundingClientRect();
          return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && r.width > 2 && r.height > 2;
        }
        function pid(v) {
          const s = String(v || '');
          const m = s.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i) || s.match(/[?&](?:psId|productId|id)=(\d+)/i);
          return m ? Number(m[1]) : null;
        }
        function normalizeSize(v) {
          const raw = norm(v).toUpperCase().replace(/\s+/g,'');
          return ({'2XL':'XXL','3XL':'XXXL','4XL':'XXXXL','5XL':'XXXXXL','FREESIZE':'FREE'})[raw] || raw;
        }
        function parseRow(value) {
          const raw = norm(value), p = plain(raw);
          let sm = raw.match(/^\s*(XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL|XXXXXL|2XL|3XL|4XL|5XL|FREE|FREESIZE|\d{1,3})(?:\s|$)/i);
          if (!sm) sm = raw.match(/(?:^|\bsize\s*[:\-]?\s*)(XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL|XXXXXL|2XL|3XL|4XL|5XL|FREE|FREESIZE|\d{1,3})(?=\s|$|[|,/])/i);
          if (!sm) return null;
          const size = normalizeSize(sm[1]);
          if (/^\d+$/.test(size)) { const n = Number(size); if (n < 1 || n > 60) return null; }
          let stock = null;
          if (/het hang|khong con hang|sold out/.test(p)) stock = 0;
          let m = raw.match(/còn\s*hàng\s*\(\s*(\d+)\s*\)/i); if (m) stock = Number(m[1]);
          if (stock == null) { m = p.match(/con\s*hang[^0-9]{0,12}(\d+)/i); if (m) stock = Number(m[1]); }
          if (stock == null) { m = p.match(/(?:ton(?:\s*kho)?|available|stock)[^0-9]{0,12}(\d+)/i); if (m) stock = Number(m[1]); }
          return stock == null ? null : { size, stock, raw };
        }
        function findPopup() {
          const candidates = [];
          for (const sel of ['[role="dialog"]','dialog','.modal.show','.modal.in','.modal','.modal-content','[class*="modal"]','[class*="popup"]','[class*="dialog"]']) {
            for (const el of document.querySelectorAll(sel)) {
              if (!visible(el)) continue;
              const t = plain(el.innerText || el.textContent);
              if (/ten size|tinh trang ton|nhap so luong cho tung size/.test(t) && t.length < 9000) candidates.push(el);
            }
          }
          candidates.sort((a,b) => norm(a.innerText).length - norm(b.innerText).length);
          return candidates[0] || null;
        }
        async function waitPopup(timeout = 2500) {
          const start = Date.now();
          while (Date.now() - start < timeout) { const p = findPopup(); if (p) return p; await sleep(80); }
          return null;
        }
        function productAnchors() {
          const out = [];
          for (const a of document.querySelectorAll('a[href]')) {
            try { if (pid(new URL(a.getAttribute('href'), location.href).href) === parentId) out.push(a); } catch (_) {}
          }
          return out;
        }
        function findCard() {
          let best = null;
          for (const anchor of productAnchors()) {
            for (let d=0, el=anchor; d<8 && el && el!==document.body; d+=1, el=el.parentElement) {
              const t = norm(el.innerText || el.textContent); if (!t || t.length > 3500) continue;
              const ids = new Set();
              for (const a of el.querySelectorAll('a[href]')) { try { const x = pid(new URL(a.getAttribute('href'), location.href).href); if (x) ids.add(x); } catch (_) {} }
              const acts = [...el.querySelectorAll('a,button,[role="button"],[onclick]')].filter((x) => /thêm vào giỏ|them vao gio|chọn mua|chon mua|mua ngay/i.test(norm(x.innerText || x.textContent)));
              if (ids.has(parentId) && ids.size <= 2 && acts.length) {
                const score = 100 - ids.size*20 - t.length/100;
                if (!best || score > best.score) best = {el,score};
              }
            }
          }
          return best && best.el;
        }
        function quickAction(card) {
          if (!card) return null;
          const nodes = [...card.querySelectorAll('a,button,[role="button"],[onclick],[data-product-id],[data-id]')];
          return nodes.find((x) => /thêm vào giỏ|them vao gio|chọn mua|chon mua|mua ngay/i.test(norm(x.innerText || x.textContent))) || null;
        }
        async function closePopup(root) {
          if (!root) return;
          const btn = [...root.querySelectorAll('button,a,[role="button"]')].find((x) => /^(×|x|đóng|dong|close)$/i.test(norm(x.innerText || x.textContent)) || /close|modal-close/i.test(String(x.className||'')) || x.getAttribute('data-dismiss') === 'modal');
          if (btn) { try { btn.click(); } catch (_) {} }
          document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
          await sleep(120);
        }
        function colorName(input, root) {
          const vals = [];
          if (input.id) { const l = root.querySelector(`label[for="${CSS.escape(input.id)}"]`); if (l) vals.push(norm(l.innerText||l.textContent)); }
          const own = input.closest('label'); if (own) vals.push(norm(own.innerText||own.textContent));
          if (input.parentElement) vals.push(norm(input.parentElement.innerText||input.parentElement.textContent));
          for (const v of [input.getAttribute('data-color'),input.getAttribute('data-name'),input.title,input.getAttribute('aria-label')]) if (v) vals.push(norm(v));
          for (const v of vals) {
            const clean = v.replace(/chọn màu sắc:?/i,'').replace(/\s+/g,' ').trim();
            if (clean && clean.length <= 45 && !/ten size|tinh trang|còn hàng|hết hàng|thêm vào giỏ/i.test(clean)) return clean;
          }
          return '';
        }
        function radios(root) {
          const arr=[], seen=new Set();
          for (const input of root.querySelectorAll('input[type="radio"]')) {
            const name = colorName(input, root); const k = plain(name);
            if (!name || !k || seen.has(k)) continue; seen.add(k); arr.push({name,input});
          }
          return arr;
        }
        function readRows(root) {
          const best = new Map();
          for (const tr of root.querySelectorAll('tr,[role="row"]')) {
            if (!visible(tr)) continue;
            const row = parseRow(tr.innerText || tr.textContent); if (!row) continue;
            if (!best.has(row.size)) best.set(row.size,row);
          }
          return [...best.values()];
        }
        async function stableRows(root, timeout=1800) {
          let best=[], prev='', stable=0; const start=Date.now();
          while (Date.now()-start < timeout) {
            await sleep(90); const r = findPopup() || root; const rows = readRows(r);
            const sig = JSON.stringify(rows.map(x=>[x.size,x.stock]));
            if (rows.length > best.length) best = rows;
            if (sig && sig === prev) stable += 1; else stable = 0;
            prev = sig; if (rows.length && stable >= 2) return rows;
          }
          return best;
        }

        const existing = findPopup(); if (existing) await closePopup(existing);
        const card = findCard();
        const action = quickAction(card);
        if (!action) throw new Error(`Không tìm thấy nút Thêm vào giỏ cho ${parentName}`);
        if (action.matches && action.matches('a')) {
          if (!action.dataset.dhlOriginalHref) action.dataset.dhlOriginalHref = action.getAttribute('href') || '';
          action.setAttribute('href','javascript:void(0)');
          action.dataset.dhlSafeAction='1';
        }
        try { action.scrollIntoView({block:'center',inline:'nearest'}); } catch (_) {}
        try { action.click(); } catch (_) { action.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})); }
        let root = await waitPopup();
        if (!root) throw new Error(`Popup không mở cho ${parentName}`);

        const controls = radios(root);
        const variants=[]; const snapshots=[];
        async function capture(color) {
          root = findPopup() || root;
          const rows = await stableRows(root);
          snapshots.push({color,rows});
          for (const row of rows) variants.push({
            id: parentId*1000 + variants.length + 1,
            parentId,
            sku: `DOM-${parentId}-${plain(color).replace(/[^a-z0-9]+/g,'_') || 'COLOR'}-${row.size}`.toUpperCase(),
            name: `${parentName}${color && color!=='(không màu)' ? ` - ${color}` : ''} - ${row.size}`,
            color: color || '(không màu)',
            size: row.size,
            available: Number(row.stock),
            price: 0,
            image: fallbackImage,
            status: Number(row.stock)>0?2:0,
            scanMethod:'popup-dom-explicit-stock'
          });
        }

        if (controls.length) {
          for (const c of controls) {
            if (!c.input.checked) {
              try { c.input.click(); } catch (_) {}
              c.input.dispatchEvent(new Event('change',{bubbles:true}));
              await sleep(180);
            }
            await capture(c.name);
          }
        } else {
          await capture('(không màu)');
        }

        await closePopup(findPopup() || root);
        const unique = new Map();
        for (const v of variants) { const k=`${plain(v.color)}|${v.size}`; if (!unique.has(k)) unique.set(k,v); }
        const list=[...unique.values()];
        const complete = list.length > 0 && snapshots.every((s)=>s.rows.length>0);
        return {
          parentId,parentName,sourceUrl:String(item.url||location.href),imageUrl:fallbackImage,
          variants:list,complete,confidence:complete?'high':'low',scanMethod:'popup-dom-explicit-stock',
          snapshots,errors:complete?[]:[{message:'Không đọc đủ size/tồn từ popup'}]
        };
      }
    });
    return (out && out[0] && out[0].result) || null;
  }

  async function runScan(limit, store) {
    const tab = await ensureCategoryTab();
    const discovered = await discoverProducts(tab.id);
    if (!discovered.items.length) throw new Error('Không tìm thấy sản phẩm trên trang danh mục.');
    const items = Number.isFinite(limit) ? discovered.items.slice(0, Math.max(1, limit)) : discovered.items;
    const state = document.getElementById('catalogState');
    const results=[];
    for (let i=0;i<items.length;i+=1) {
      if (state) state.textContent = `${limit===1?'TEST NHANH':'Đang quét'} ${i+1}/${items.length}: ${items[i].title} • mở popup an toàn, đọc đúng tồn hiển thị`;
      try { results.push(await scanOnePopup(tab.id, items[i])); }
      catch (error) { results.push({parentId:items[i].id,parentName:items[i].title,sourceUrl:items[i].url,imageUrl:items[i].imageUrl,variants:[],complete:false,confidence:'low',scanMethod:'popup-dom-explicit-stock',errors:[{message:error.message||String(error)}]}); }
      await sleep(120);
    }
    if (store) await chrome.storage.local.set({dhlCatalogResults:results,dhlCatalogSkuSamples:{},dhlCatalogAt:Date.now(),dhlCatalogPageTitle:discovered.pageTitle,dhlCatalogPageUrl:discovered.pageUrl});
    return {results,discovered,itemCount:items.length};
  }

  async function exportProducts() {
    const state=document.getElementById('catalogState');
    try {
      const stored=await chrome.storage.local.get(['dhlCatalogResults']);
      const results=Array.isArray(stored.dhlCatalogResults)?stored.dhlCatalogResults:[];
      if (!results.length || results.some((r)=>!r.complete)) throw new Error('Dữ liệu chưa đủ 100%. Không xuất file để tránh ghi sai tồn.');
      if (results.some((r)=>(r.variants||[]).some((v)=>v.synthesizedFromExplicitOutOfStock))) throw new Error('Có tồn 0 suy đoán. Tool chặn xuất.');
      const out=productCreate.buildWorkbook(results);
      const blob=new Blob([out.bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const url=URL.createObjectURL(blob),a=document.createElement('a'),d=new Date();
      const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      a.href=url;a.download=`SAPO_TAO_SAN_PHAM_MOI_${stamp}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1600);
      state.textContent=`Đã tạo file: ${out.products} sản phẩm/màu • ${out.rows} biến thể. Tồn 0 chỉ đến từ dòng Hết hàng thật trong popup.`;
    } catch(error) { state.textContent=`Lỗi tạo file: ${error.message||String(error)}`; }
  }

  async function quickTest() {
    const scan=document.getElementById('scanCatalogSource'),test=document.getElementById('catalogQuickTest'),exp=document.getElementById('exportCatalogSource'),state=document.getElementById('catalogState');
    test.disabled=true;scan.disabled=true;exp.disabled=true;
    try {
      const {results}=await runScan(1,false); const r=results[0];
      if (!r || !r.complete) throw new Error(r&&r.errors&&r.errors[0]?r.errors[0].message:'Chưa đọc được popup');
      const detail=(r.variants||[]).map((v)=>`${v.size}=${v.available}`).join(', ');
      state.textContent=`TEST OK: ${r.parentName} • ${r.variants.length} biến thể • ${detail}`;
    } catch(error) { state.textContent=`TEST LỖI: ${error.message||String(error)}`; }
    finally { test.disabled=false;scan.disabled=false; }
  }

  async function fullScan() {
    const scan=document.getElementById('scanCatalogSource'),test=document.getElementById('catalogQuickTest'),exp=document.getElementById('exportCatalogSource'),state=document.getElementById('catalogState');
    scan.disabled=true;test.disabled=true;exp.disabled=true;
    try {
      const {results,discovered,itemCount}=await runScan(null,true);
      const completeCount=results.filter((r)=>r.complete).length;
      const variantCount=results.reduce((n,r)=>n+(r.variants||[]).length,0);
      const allComplete=completeCount===itemCount && results.length===itemCount;
      exp.disabled=!allComplete;
      state.textContent=allComplete
        ? `${discovered.pageTitle}: ĐỦ ${completeCount}/${itemCount} sản phẩm • ${variantCount} biến thể. Có thể tạo file Sapo.`
        : `${discovered.pageTitle}: CHƯA ĐỦ ${completeCount}/${itemCount} sản phẩm • ${variantCount} biến thể. Tool KHÓA xuất file.`;
    } catch(error) { state.textContent=`Lỗi: ${error.message||String(error)}`; }
    finally { scan.disabled=false;test.disabled=false; }
  }

  function replaceAndBind(id,label,handler) {
    const old=document.getElementById(id); if(!old)return null;
    const fresh=old.cloneNode(true);fresh.textContent=label;fresh.disabled=false;old.replaceWith(fresh);
    fresh.addEventListener('click',(e)=>{e.preventDefault();handler();});return fresh;
  }

  function install() {
    const scan=document.getElementById('scanCatalogSource'),test=document.getElementById('catalogQuickTest'),exp=document.getElementById('exportCatalogSource'),state=document.getElementById('catalogState');
    if(!scan||!test||!exp)return false;
    if(scan.dataset.popupV3==='1')return true;
    const newScan=replaceAndBind('scanCatalogSource','QUÉT TOÀN BỘ TRANG ĐANG MỞ',fullScan);
    const newTest=replaceAndBind('catalogQuickTest','TEST NHANH 1 SP',quickTest);
    const newExport=replaceAndBind('exportCatalogSource','TẠO FILE SẢN PHẨM SAPO (.XLSX)',exportProducts);
    if(newScan)newScan.dataset.popupV3='1'; if(newExport)newExport.disabled=true;
    if(state)state.textContent='v0.14.5: quét bằng popup thật trên trang, đọc trực tiếp từng dòng size/tồn. KHÔNG suy đoán 0; thiếu dữ liệu thì khóa xuất.';
    return Boolean(newScan&&newTest&&newExport);
  }

  if(!install()) {
    const observer=new MutationObserver(()=>{if(install())observer.disconnect();});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),5000);
  }
})();