const fs=require('fs');
const path=require('path');

const file=path.join(__dirname,'content.js');
let source=fs.readFileSync(file,'utf8');

if(source.includes('async function waitForStockClosed(')){
  console.log('RUNTIME PATCH: scanner popup wait already applied');
  process.exit(0);
}

const oldBlock=`  async function closeStockPopup(root) {
    const container = modalContainer(root);
    if (!container) return;
    const candidates = [...container.querySelectorAll('button,a,[role="button"],[aria-label],[title],[class*="close"]')]
      .filter(visible)
      .map((el) => {
        const p = plain(\`${'${text(el)} ${el.getAttribute(\'aria-label\') || \'\'} ${el.getAttribute(\'title\') || \'\'} ${el.className || \'\'}'}\`);
        let score = 0;
        if (/dong|close|btn close/.test(p)) score += 100;
        if (/^[x×]$/.test(text(el).trim().toLowerCase())) score += 120;
        if (String(el.className || '').toLowerCase().includes('close')) score += 70;
        return { el, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    if (candidates[0]) await clickElement(candidates[0].el);
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    await sleep(100);
  }

  async function openStockPopup(descriptor) {
    const existing = findStockRoot();
    if (existing) await closeStockPopup(existing);
    const card = cardForDescriptor(descriptor);
    const candidates = quickCandidates(descriptor, card);
    for (const candidate of candidates) {
      await clickElement(candidate.el);
      const root = await waitForStockRoot(1500);
      if (root) return { root, cardFound: !!card, candidateCount: candidates.length };
    }
    const error = new Error(\`Không mở được popup tồn cho ${'${descriptor.title}'}. Tool đã thử ${'${candidates.length}'} nút mua nhanh.\`);
    error.diagnostics = { cardFound: !!card, candidateCount: candidates.length, anchorCount: productAnchors(descriptor).length };
    throw error;
  }
`;

const newBlock=`  async function waitForStockClosed(timeout = 1800) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (!findStockRoot()) return true;
      await sleep(80);
    }
    return !findStockRoot();
  }

  async function closeStockPopup(root) {
    const container = modalContainer(root);
    if (!container) return true;
    const candidates = [...container.querySelectorAll('button,a,[role="button"],[aria-label],[title],[class*="close"]')]
      .filter(visible)
      .map((el) => {
        const p = plain(\`${'${text(el)} ${el.getAttribute(\'aria-label\') || \'\'} ${el.getAttribute(\'title\') || \'\'} ${el.className || \'\'}'}\`);
        let score = 0;
        if (/dong|close|btn close/.test(p)) score += 100;
        if (/^[x×]$/.test(text(el).trim().toLowerCase())) score += 120;
        if (String(el.className || '').toLowerCase().includes('close')) score += 70;
        return { el, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    if (candidates[0]) await clickElement(candidates[0].el);
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));

    let closed = await waitForStockClosed(1800);
    if (!closed) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      closed = await waitForStockClosed(900);
    }
    await sleep(120);
    return closed;
  }

  async function openStockPopup(descriptor) {
    const existing = findStockRoot();
    if (existing) {
      const closed = await closeStockPopup(existing);
      if (!closed) {
        const error = new Error(\`Popup sản phẩm trước chưa đóng xong; dừng để tránh đọc nhầm tồn cho ${'${descriptor.title}'}.\`);
        error.diagnostics = { stalePopupBlocked: true };
        throw error;
      }
    }
    const card = cardForDescriptor(descriptor);
    const candidates = quickCandidates(descriptor, card);
    for (const candidate of candidates) {
      await clickElement(candidate.el);
      await sleep(180);
      const root = await waitForStockRoot(1800);
      if (root) return { root, cardFound: !!card, candidateCount: candidates.length };
    }
    const error = new Error(\`Không mở được popup tồn cho ${'${descriptor.title}'}. Tool đã thử ${'${candidates.length}'} nút mua nhanh.\`);
    error.diagnostics = { cardFound: !!card, candidateCount: candidates.length, anchorCount: productAnchors(descriptor).length };
    throw error;
  }
`;

if(!source.includes(oldBlock)){
  throw new Error('RUNTIME PATCH FAILED: không tìm thấy khối close/open popup cũ trong content.js');
}

source=source.replace(oldBlock,newBlock);
fs.writeFileSync(file,source,'utf8');
console.log('RUNTIME PATCH PASS: chờ popup cũ đóng hẳn trước khi đọc sản phẩm kế tiếp');
