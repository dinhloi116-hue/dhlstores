(() => {
  'use strict';

  if (globalThis.__DHL_SAFE_CATEGORY_GUARD__) return;
  globalThis.__DHL_SAFE_CATEGORY_GUARD__ = true;

  const ACTION_RE = /thêm vào giỏ|them vao gio|thêm giỏ|them gio|chọn mua|chon mua|add\s*to\s*cart|add.?cart|quick.?buy|quick.?view|buy.?now|đặt hàng|dat hang|order/i;

  function productId(value) {
    const text = String(value || '');
    const match = text.match(/-p(\d+)(?:\.html)?(?:[?#]|$)/i) || text.match(/[?&](?:psId|productId|id)=(\d+)/i);
    return match ? Number(match[1]) : null;
  }

  function compact(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function actionText(anchor) {
    const attrs = ['id', 'class', 'onclick', 'title', 'aria-label', 'data-action', 'data-product-id', 'data-id']
      .map((name) => (anchor.getAttribute && anchor.getAttribute(name)) || '')
      .join(' ');
    return `${compact(anchor.innerText || anchor.textContent)} ${attrs}`;
  }

  function sanitizeAnchor(anchor) {
    if (!anchor || !anchor.matches || !anchor.matches('a[href]')) return false;
    if (anchor.dataset && anchor.dataset.dhlSafeAction === '1') return true;

    let href;
    try {
      href = new URL(anchor.getAttribute('href'), location.href).href;
    } catch (_) {
      return false;
    }

    const id = productId(href);
    if (!id || !ACTION_RE.test(actionText(anchor))) return false;

    if (anchor.dataset) {
      anchor.dataset.dhlSafeAction = '1';
      anchor.dataset.dhlOriginalHref = anchor.getAttribute('href') || '';
      if (!anchor.dataset.productId) anchor.dataset.productId = String(id);
    }

    // Important: the scanner identifies product-detail links by href. Replacing only
    // action anchors with javascript:void(0) keeps the site's click/AJAX handler alive
    // while removing the browser's default navigation to the product detail page.
    anchor.setAttribute('href', 'javascript:void(0)');
    return true;
  }

  function sanitize(root = document) {
    if (!root || !root.querySelectorAll) return;
    for (const anchor of root.querySelectorAll('a[href]')) sanitizeAnchor(anchor);
  }

  sanitize(document);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes || []) {
        if (!node || node.nodeType !== 1) continue;
        if (node.matches && node.matches('a[href]')) sanitizeAnchor(node);
        sanitize(node);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Never stop propagation: supplier AJAX/delegated handlers must still receive the click.
  // We only cancel the browser's default action for anchors that were explicitly sanitized.
  document.addEventListener('click', (event) => {
    const target = event.target && event.target.closest ? event.target.closest('a[data-dhl-safe-action="1"]') : null;
    if (target) event.preventDefault();
  }, false);
})();
