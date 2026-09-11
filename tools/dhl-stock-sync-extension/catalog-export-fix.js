(() => {
  'use strict';

  const TARGET_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

  function plain(value) {
    return String(value || '').toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function sampleColor(sampleName) {
    const parts = String(sampleName || '').split(/\s+-\s+/).map((x) => x.trim()).filter(Boolean);
    return parts.length >= 3 ? parts[parts.length - 2] : '';
  }

  function groupRows(catalogResults, sampleSkuByParent) {
    const rows = [];
    for (const product of catalogResults || []) {
      const byColor = new Map();
      for (const variant of product.variants || []) {
        const color = String(variant.color || '(không màu)').trim();
        const key = plain(color) || '(khong mau)';
        if (!byColor.has(key)) byColor.set(key, { color, variants: [] });
        byColor.get(key).variants.push(variant);
      }
      const sample = (sampleSkuByParent || {})[String(product.parentId)] || {};
      const refColor = sampleColor(sample.name);
      if (!byColor.size) {
        rows.push({
          parentId: product.parentId,
          parentName: product.parentName,
          color: '',
          standardName: product.parentName,
          sampleSku: sample.code || '',
          sampleColor: refColor,
          sampleSkuMatchesColor: false,
          stock: {}
        });
        continue;
      }
      for (const group of byColor.values()) {
        const stock = Object.create(null);
        for (const v of group.variants) stock[String(v.size || '').toUpperCase()] = Number(v.available);
        rows.push({
          parentId: product.parentId,
          parentName: product.parentName,
          color: group.color,
          standardName: group.color ? `${product.parentName} - ${group.color}` : product.parentName,
          sampleSku: sample.code || '',
          sampleColor: refColor,
          sampleSkuMatchesColor: Boolean(refColor && plain(refColor) === plain(group.color)),
          stock
        });
      }
    }
    return rows;
  }

  function csvCell(value) {
    const text = String(value == null ? '' : value);
    return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  async function exportSplitColumns() {
    const stored = await chrome.storage.local.get(['dhlCatalogResults', 'dhlCatalogSkuSamples']);
    const rows = groupRows(stored.dhlCatalogResults || [], stored.dhlCatalogSkuSamples || {});
    if (!rows.length) {
      alert('Chưa có dữ liệu danh sách nguồn. Hãy quét danh sách trước.');
      return;
    }

    const headers = ['Parent ID', 'Tên sản phẩm nguồn', 'Màu nguồn', 'Tên chuẩn đề xuất Sapo', 'SKU mẫu nguồn', 'Màu của SKU mẫu', 'SKU mẫu đúng màu?', 'S', 'M', 'L', 'XL', 'XXL'];
    const lines = ['sep=;', headers.map(csvCell).join(';')];
    for (const row of rows) {
      lines.push([
        row.parentId,
        row.parentName,
        row.color,
        row.standardName,
        row.sampleSku,
        row.sampleColor,
        row.sampleSkuMatchesColor ? 'Có' : 'Không/chưa chắc',
        ...TARGET_SIZES.map((size) => row.stock[size] == null ? '' : row.stock[size])
      ].map(csvCell).join(';'));
    }

    const blob = new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    a.href = url;
    a.download = `DANH_SACH_NGUON_HD_TACH_COT_${stamp}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function replaceExportButton() {
    const oldBtn = document.getElementById('exportCatalogSource');
    if (!oldBtn || oldBtn.dataset.splitColumnsFixed === '1') return;
    const btn = oldBtn.cloneNode(true);
    btn.dataset.splitColumnsFixed = '1';
    btn.textContent = 'XUẤT CSV TÁCH CỘT';
    oldBtn.replaceWith(btn);
    btn.addEventListener('click', exportSplitColumns);
  }

  replaceExportButton();
  const observer = new MutationObserver(replaceExportButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
