const fs=require('fs');
const path=require('path');

const applied=[];

// 1) XLSX: read self-closing blank cells correctly so branch name (E2) is not lost.
{
  const file=path.join(__dirname,'xlsx-lite.js');
  let source=fs.readFileSync(file,'utf8');
  const oldBlock=`      const cellRe=/<(?:[A-Za-z_][\\w.-]*:)?c\\b([^>]*)>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?c>/g;\n      while((cm=cellRe.exec(rm[2]))){\n        const attrs=cm[1],refMatch=attrs.match(/\\br=\"([A-Z]+)\\d+\"/);\n        if(!refMatch)continue;\n        const ci=colToIndex(refMatch[1]),type=(attrs.match(/\\bt=\"([^\"]+)\"/)||[])[1]||'';\n        let value='';\n        if(type==='inlineStr'){\n          value=[...cm[2].matchAll(/<(?:[A-Za-z_][\\w.-]*:)?t\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?t>/g)].map(x=>xmlUnescape(x[1])).join('');\n        }else{\n          const vm=cm[2].match(/<(?:[A-Za-z_][\\w.-]*:)?v\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?v>/);`;
  const newBlock=`      const cellRe=/<(?:[A-Za-z_][\\w.-]*:)?c\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?c>)/g;\n      while((cm=cellRe.exec(rm[2]))){\n        const attrs=cm[1],inner=cm[2]||'',refMatch=attrs.match(/\\br=\"([A-Z]+)\\d+\"/);\n        if(!refMatch)continue;\n        const ci=colToIndex(refMatch[1]),type=(attrs.match(/\\bt=\"([^\"]+)\"/)||[])[1]||'';\n        let value='';\n        if(type==='inlineStr'){\n          value=[...inner.matchAll(/<(?:[A-Za-z_][\\w.-]*:)?t\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?t>/g)].map(x=>xmlUnescape(x[1])).join('');\n        }else{\n          const vm=inner.match(/<(?:[A-Za-z_][\\w.-]*:)?v\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?v>/);`;
  if(source.includes(oldBlock)){
    source=source.replace(oldBlock,newBlock);
    fs.writeFileSync(file,source,'utf8');
    applied.push('xlsx-self-closing-cells');
  }else if(!source.includes("inner=cm[2]||''")){
    throw new Error('RUNTIME PATCH FAILED: xlsx parser block not found');
  }
}

// 2) Scanner: keep the user on the HD category and cycle the SAME stock popup through every product.
// Do not close/remove the reusable modal after every product; that was why only Mexico survived.
{
  const file=path.join(__dirname,'content.js');
  let source=fs.readFileSync(file,'utf8');

  if(!source.includes('single-color-fallback')){
    const old=`    const allControls = colorControls(root);\n    const targetSelection = selectTargetControls(allControls, hint);\n    let controls = targetSelection.controls;\n    if (!controls.length && !expectedColorHints(hint).length && fallbackColor) {\n      controls = [{ name: fallbackColor, el: null, hint: fallbackColor, hintScore: 1 }];\n    }\n`;
    const next=`    const allControls = colorControls(root);\n    const targetSelection = selectTargetControls(allControls, hint);\n    let controls = targetSelection.controls;\n    const fallbackWanted = expectedColorHints(hint);\n    // single-color-fallback\n    if (!controls.length && fallbackColor) {\n      if (!fallbackWanted.length) {\n        controls = [{ name: fallbackColor, el: null, hint: fallbackColor, hintScore: 1 }];\n      } else {\n        const ranked = fallbackWanted.map((wanted) => ({ hint: wanted, score: matcher.scoreColorHint(wanted, fallbackColor) })).sort((a, b) => b.score - a.score);\n        const best = ranked[0];\n        if (best && best.score >= 0.5) {\n          controls = [{ name: fallbackColor, el: null, hint: best.hint, hintScore: best.score }];\n          targetSelection.missingHints = (targetSelection.missingHints || []).filter((value) => value !== best.hint);\n        }\n      }\n    }\n`;
    if(!source.includes(old))throw new Error('RUNTIME PATCH FAILED: single-color block not found');
    source=source.replace(old,next);
    applied.push('single-color-fallback');
  }

  const closeStart=source.indexOf('  async function closeStockPopup(root) {');
  const firstVariantStart=source.indexOf('  async function firstVariant(',closeStart);
  if(closeStart<0||firstVariantStart<0)throw new Error('RUNTIME PATCH FAILED: popup function range not found');

  const popupBlock=`  async function closeStockPopup(root) {\n    const container = modalContainer(root);\n    if (!container) return true;\n    const candidates = [...container.querySelectorAll('button,a,[role="button"],[aria-label],[title],[class*="close"],[data-dismiss="modal"],[data-bs-dismiss="modal"],.btn-close,.close')]\n      .filter(visible)\n      .map((el) => {\n        const p = plain(\`${'${text(el)} ${el.getAttribute(\'aria-label\') || \'\'} ${el.getAttribute(\'title\') || \'\'} ${el.className || \'\'}'}\`);\n        let score = 0;\n        if (el.matches('[data-dismiss="modal"],[data-bs-dismiss="modal"],.btn-close,.close')) score += 180;\n        if (/dong|close/.test(p)) score += 120;\n        if (/^[x×]$/.test(text(el).trim().toLowerCase())) score += 150;\n        return { el, score };\n      })\n      .filter((item) => item.score > 0)\n      .sort((a, b) => b.score - a.score);\n    if (candidates[0]) await clickElement(candidates[0].el);\n    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));\n    await sleep(260);\n    return !findStockRoot();\n  }\n\n  function popupFingerprint(root) {\n    if (!root) return '';\n    const rows = readTargetRows(root, TARGET_SIZES);\n    const colors = colorControls(root).map((x) => dom.colorKey(x.name));\n    const marker = String(root.innerHTML || '').replace(/\\s+/g, ' ').slice(0, 12000);\n    return JSON.stringify({ rows: rows.map((r) => [r.size, Number(r.stock)]), colors, marker });\n  }\n\n  // navigation-guard-v1\n  function inertActionHref(el) {\n    if (!el || !el.matches || !el.matches('a[href]')) return false;\n    try {\n      const url = new URL(el.getAttribute('href'), location.href);\n      return url.host === location.host && Boolean(core.extractProductId(url.href));\n    } catch (_) { return false; }\n  }\n\n  async function clickQuickCandidate(el) {\n    if (!el) return;\n    if (el.matches && el.matches('a[href]')) {\n      const guard = (event) => event.preventDefault();\n      el.addEventListener('click', guard, { capture: true, once: true });\n    }\n    await clickElement(el);\n  }\n\n  async function waitForPopupRefresh(beforeFingerprint, timeout = 3200) {\n    const started = Date.now();\n    while (Date.now() - started < timeout) {\n      await sleep(90);\n      if (location.pathname !== HD_PATH) throw new Error('Trang nguồn đã rời danh mục HD; dừng quét để tránh sai dữ liệu.');\n      const root = findStockRoot();\n      if (!root) continue;\n      const fp = popupFingerprint(root);\n      if (!beforeFingerprint || (fp && fp !== beforeFingerprint)) {\n        await sleep(220);\n        return findStockRoot() || root;\n      }\n    }\n    return null;\n  }\n\n  async function openStockPopup(descriptor) {\n    if (location.pathname !== HD_PATH) throw new Error('Tool chỉ quét popup tại trang danh mục HD, không mở trang chi tiết.');\n    const existing = findStockRoot();\n    const before = popupFingerprint(existing);\n    const card = cardForDescriptor(descriptor);\n    const candidates = quickCandidates(descriptor, card).filter((item) => !inertActionHref(item.el));\n    for (const candidate of candidates) {\n      await clickQuickCandidate(candidate.el);\n      const root = await waitForPopupRefresh(before, 3200);\n      if (root) return { root, cardFound: !!card, candidateCount: candidates.length, reusedPopup: !!existing };\n    }\n    const error = new Error(\`Không bật được popup tồn cho ${'${descriptor.title}'} ngay trên trang danh mục.\`);\n    error.diagnostics = { cardFound: !!card, candidateCount: candidates.length, anchorCount: productAnchors(descriptor).length, categoryOnly: true };\n    throw error;\n  }\n\n`;
  source=source.slice(0,closeStart)+popupBlock+source.slice(firstVariantStart);
  applied.push('reuse-one-popup-for-all-products');

  const oneStart=source.indexOf('  async function scanOneDescriptor(');
  const currentPopupStart=source.indexOf('  async function scanCurrentPopup(',oneStart);
  if(oneStart<0||currentPopupStart<0)throw new Error('RUNTIME PATCH FAILED: scan function range not found');

  const scanBlock=`  async function scanOneDescriptor(descriptor, hints, progress) {\n    let openInfo = null;\n    try {\n      openInfo = await openStockPopup(descriptor);\n      return await readOpenedPopup(descriptor, hints, progress, openInfo);\n    } catch (error) {\n      return {\n        parentId: Number(descriptor.id),\n        parentName: descriptor.title || '',\n        sourceUrl: descriptor.url || location.href,\n        variants: [],\n        complete: false,\n        confidence: 'low',\n        scanMethod: 'sapo-target-color-5-size',\n        stopReason: 'popup-open-error',\n        errors: [{ message: error.message || String(error) }],\n        domDiagnostics: error.diagnostics || {}\n      };\n    }\n  }\n\n  async function scanHdLive(hints, progress) {\n    if (location.pathname !== HD_PATH) throw new Error('Hãy để tab nguồn ở trang danh mục HD.');\n    const links = await discoverHd2026();\n    progress({ stage: 'discovered', productTotal: links.length });\n    const results = [];\n    const stale = findStockRoot();\n    if (stale) await closeStockPopup(stale);\n    for (let i = 0; i < links.length; i += 1) {\n      if (location.pathname !== HD_PATH) throw new Error('Trang nguồn đã rời danh mục HD giữa lúc quét.');\n      const descriptor = links[i];\n      progress({ stage: 'product', productIndex: i + 1, productTotal: links.length, descriptor });\n      results.push(await scanOneDescriptor(descriptor, hints, progress));\n      await sleep(180);\n    }\n    const finalPopup = findStockRoot();\n    if (finalPopup) await closeStockPopup(finalPopup);\n    return results;\n  }\n\n`;
  source=source.slice(0,oneStart)+scanBlock+source.slice(currentPopupStart);
  fs.writeFileSync(file,source,'utf8');
}

console.log('RUNTIME PATCH PASS:',applied.join(' + '));
